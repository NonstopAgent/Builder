import importlib
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

anthropic_spec = importlib.util.find_spec("anthropic")
if anthropic_spec:
    anthropic = importlib.import_module("anthropic")
else:
    anthropic = None  # type: ignore

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class ClaudeAgent:
    """
    Claude-powered agent for planning and executing tasks.

    This agent:

    - Generates multi-step plans for a given goal
    - Executes one step at a time with real file operations
    - Logs activity on both the task and the step
    - Can fall back to static planning when the Anthropic client is unavailable
    """

    def __init__(self) -> None:
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest")
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self._client: Optional["anthropic.Anthropic"] = None

        if anthropic is not None and api_key:
            try:
                self._client = anthropic.Anthropic(api_key=api_key)
                logger.info("ClaudeAgent initialized with model %s", self.model)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Failed to initialize Anthropic client: %s", exc)
                self._client = None
        else:
            if anthropic is None:
                logger.warning("anthropic package is not installed, ClaudeAgent in fallback mode")
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY not set, ClaudeAgent in fallback mode")

    # ------------------------------------------------------------------ #
    # Low-level Claude call
    # ------------------------------------------------------------------ #

    def _call_claude(self, system_prompt: str, user_prompt: str, max_tokens: int = 800) -> Optional[str]:
        """
        Call Claude and return plain text, or None if the call fails or the
        client is not configured.
        """
        if self._client is None:
            return None

        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            for block in response.content:
                if getattr(block, "type", None) == "text":
                    return block.text
            return str(response)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Claude API call failed: %s", exc)
            return None

    # ------------------------------------------------------------------ #
    # Planning
    # ------------------------------------------------------------------ #

    def _parse_steps_from_text(self, text: str) -> List[str]:
        """
        Parse bullet/numbered steps from Claude's response text.
        """
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        steps: List[str] = []
        for ln in lines:
            if ln[0].isdigit():
                parts = ln.split(".", 1)
                if len(parts) == 2 and parts[1].strip():
                    steps.append(parts[1].strip())
                    continue
            if ln.startswith(("-", "*", "•")):
                steps.append(ln.lstrip("-*• ").strip())
                continue
            if len(steps) < 8:
                steps.append(ln)
        return steps

    def _static_plan(self, goal: str) -> List[str]:
        cleaned = goal.strip() or "the requested task"
        return [
            f"Analyze the goal and clarify requirements for: {cleaned}",
            f"Design and implement a solution for: {cleaned}",
            f"Test, review, and refine the solution for: {cleaned}",
        ]

    def _create_plan(self, goal: str) -> List[str]:
        """
        Generate a list of human-readable step descriptions for the goal.
        Uses Claude when available, otherwise falls back to a static plan.
        """
        goal = goal.strip()
        if not goal:
            return self._static_plan("the requested task")

        system_prompt = (
            "You are a senior software engineer and project planner. "
            "Given a single development goal, break it into 3–7 concrete, "
            "sequential steps that a coding agent could execute. "
            "Each step should be short, action-focused, and specific. "
            "Format each step clearly with actions like: create file, write code, test, etc."
        )
        user_prompt = (
            "Goal:\n"
            f"{goal}\n\n"
            "Respond ONLY with a list of steps, one per line. "
            "You may use bullet points or numbered steps. "
            "Be specific about file operations."
        )

        text = self._call_claude(system_prompt, user_prompt, max_tokens=1200)
        if not text:
            logger.info("Claude unavailable, using static plan")
            return self._static_plan(goal)

        steps = self._parse_steps_from_text(text)
        if not steps:
            logger.info("Claude returned no parseable steps, using static plan")
            return self._static_plan(goal)
        return steps

    # ------------------------------------------------------------------ #
    # Step execution with real tools
    # ------------------------------------------------------------------ #

    def _execute_step_with_tools(self, step: Dict[str, Any], task_goal: str) -> Dict[str, Any]:
        """
        Execute a step using real file operations and tools.
        """
        from backend.utils.file_ops import list_dir, read_file, write_file
        from backend.tools.github import GitHubTools

        description = step.get("description", "").lower()
        step_logs = step.get("logs", [])

        # Check for GitHub-specific tasks
        if "github" in description:
            gh_tools = GitHubTools()

            # Simple heuristic for now - can be replaced with LLM decision
            # Update regex to support owner/repo (including slash)
            repo_match = re.search(r"repo\s+([\w\-\.]+/?[\w\-\.]*)", description)

            if "read" in description:
                # Expecting description like "Read file x from repo y"
                file_match = re.search(r"file\s+([\w\-\./]+)", description)
                if repo_match and file_match:
                    content = gh_tools.read_file(repo_match.group(1), file_match.group(1))
                    step["result"] = f"GitHub Read Result: {content[:100]}..."
                    step_logs.append(f"Read GitHub file {file_match.group(1)}")
                else:
                    step["result"] = "Could not parse repo or file from description"

            elif "commit" in description or "update" in description:
                 # Expecting description like "Update file x in repo y with message z"
                 file_match = re.search(r"file\s+([\w\-\./]+)", description)
                 if repo_match and file_match:
                     # For content, we'd typically ask the LLM to generate it, but here we assume
                     # the agent has already generated content or we need to ask for it.
                     # For this simple "tool use" step, let's ask Claude to generate the content to be written.

                     system_prompt = "You are a coding assistant. Generate the file content to be committed."
                     user_prompt = f"Goal: {task_goal}\nStep: {description}\n\nProvide only the file content."
                     content = self._call_claude(system_prompt, user_prompt)

                     if content:
                         msg = f"Update {file_match.group(1)}" # Simple commit message
                         res = gh_tools.update_file(repo_match.group(1), file_match.group(1), content, msg)
                         step["result"] = res
                         step_logs.append(res)
                     else:
                         step["result"] = "Failed to generate content for commit"
                 else:
                     step["result"] = "Could not parse repo or file for commit"

            elif "create pr" in description or "pull request" in description:
                 # This needs more params, would be better served by a structured tool call
                 step["result"] = "PR creation requires more structured input"
            # Add more specific handlers as needed

        # Fallback to local file ops (existing logic)
        elif "create" in description and "file" in description:
            system_prompt = (
                "You are a code generation assistant. Generate clean, well-documented code "
                "based on the step description and overall goal."
            )
            user_prompt = (
                f"Overall Goal: {task_goal}\n\n"
                f"Current Step: {step['description']}\n\n"
                "Generate the complete file content. Include all necessary code, "
                "imports, and documentation. Respond ONLY with the file content, "
                "no explanations or markdown formatting."
            )

            content = self._call_claude(system_prompt, user_prompt, max_tokens=4000)

            if content:
                filename = self._extract_filename(step["description"])
                if filename:
                    try:
                        write_file(filename, content)
                        step_logs.append(f"Created file: {filename}")
                        step["result"] = f"Successfully created {filename}"
                        step["metadata"] = {"filename": filename, "size": len(content)}
                    except Exception as exc:
                        step["error"] = f"Failed to create file: {exc}"
                        step_logs.append(f"Error: {exc}")
                else:
                    step["result"] = "Generated content but couldn't determine filename"
                    step_logs.append("Warning: Could not extract filename from step description")
            else:
                step["result"] = "Could not generate file content (Claude unavailable)"
                step_logs.append("Warning: File generation skipped")

        elif "read" in description and "file" in description:
            filename = self._extract_filename(step["description"])
            if filename:
                try:
                    content = read_file(filename)
                    step["result"] = f"Read {len(content)} characters from {filename}"
                    step_logs.append(f"Successfully read {filename}")
                    step["metadata"] = {"filename": filename, "content_preview": content[:200]}
                except Exception as exc:
                    step["error"] = f"Failed to read file: {exc}"
                    step_logs.append(f"Error: {exc}")
            else:
                step["result"] = "Could not determine which file to read"
                step_logs.append("Warning: Filename not found in description")

        elif "list" in description or "explore" in description:
            try:
                entries = list_dir("")
                step["result"] = f"Found {len(entries)} items in workspace"
                step_logs.append(f"Listed workspace: {len(entries)} items")
                step["metadata"] = {"entries": [e["name"] for e in entries[:10]]}
            except Exception as exc:
                step["error"] = f"Failed to list directory: {exc}"
                step_logs.append(f"Error: {exc}")

        else:
            system_prompt = "You are a software development assistant executing a step in a larger task."
            user_prompt = (
                f"Overall Goal: {task_goal}\n\n"
                f"Current Step: {step['description']}\n\n"
                "Describe what should be done for this step and what the expected outcome is. "
                "Be specific and actionable. Keep it under 200 words."
            )

            guidance = self._call_claude(system_prompt, user_prompt, max_tokens=400)
            if guidance:
                step["result"] = guidance
                step_logs.append(f"Step guidance: {guidance[:100]}...")
            else:
                step["result"] = f"Completed step: {step['description']}"
                step_logs.append("Step completed (no specific actions)")

        step["logs"] = step_logs
        step["updated_at"] = _now_iso()

        return step

    def _extract_filename(self, text: str) -> Optional[str]:
        """
        Try to extract a filename from step description.
        """
        patterns = [
            r"create\s+(?:file\s+)?[\"']?([a-zA-Z0-9_\-./]+\.[a-z]+)[\"']?",
            r"file\s+[\"']?([a-zA-Z0-9_\-./]+\.[a-z]+)[\"']?",
            r"[\"']([a-zA-Z0-9_\-./]+\.[a-z]+)[\"']",
            r"(\w+\.(py|js|ts|tsx|jsx|html|css|json|md|txt))",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        return None

    # ------------------------------------------------------------------ #
    # Task execution
    # ------------------------------------------------------------------ #

    def execute_task(self, task_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point used by the backend.

        Expects a dict that matches the Task model. Mutates and returns it.

        Behavior:
        - If there is no plan yet, generate one and mark task as in_progress.
        - Otherwise, complete the current step with real tool execution:
          * mark step as 'completed'
          * append logs
          * advance current_step index
          * mark task 'completed' when all steps are done.
        """
        task = dict(task_dict)
        task.setdefault("logs", [])
        task.setdefault("status", "queued")
        task.setdefault("plan", [])
        task.setdefault("current_step", None)

        if not task.get("created_at"):
            task["created_at"] = _now_iso()
        task["updated_at"] = _now_iso()

        plan: List[Dict[str, Any]] = task.get("plan") or []

        if not plan:
            goal = task.get("goal") or ""
            descriptions = self._create_plan(goal)

            steps: List[Dict[str, Any]] = []
            for desc in descriptions:
                steps.append(
                    {
                        "description": desc,
                        "status": "pending",
                        "logs": [],
                        "error": None,
                        "metadata": {},
                        "created_at": _now_iso(),
                        "updated_at": _now_iso(),
                    }
                )

            task["plan"] = steps
            task["current_step"] = 0 if steps else None
            task["status"] = "in_progress"
            task["logs"].append(f"[{_now_iso()}] Plan created with {len(steps)} steps by ClaudeAgent.")
            return task

        current_idx = task.get("current_step")
        if current_idx is None:
            task["status"] = "completed"
            task["logs"].append(f"[{_now_iso()}] Task marked completed; no active step.")
            return task

        if current_idx < 0 or current_idx >= len(plan):
            task["status"] = "completed"
            task["current_step"] = None
            task["logs"].append(f"[{_now_iso()}] current_step index out of range; forcing task to completed.")
            return task

        step = plan[current_idx]
        step = self._execute_step_with_tools(step, task.get("goal", ""))

        step["status"] = "completed"
        step["updated_at"] = _now_iso()

        completion_msg = f"[{_now_iso()}] Completed step {current_idx + 1}: {step.get('description', '')}"
        task["logs"].append(completion_msg)

        if current_idx + 1 < len(plan):
            task["current_step"] = current_idx + 1
            task["status"] = "in_progress"
        else:
            task["current_step"] = None
            task["status"] = "completed"
            task["logs"].append(f"[{_now_iso()}] All steps completed by ClaudeAgent.")

        task["plan"][current_idx] = step
        task["updated_at"] = _now_iso()
        return task


def get_agent() -> ClaudeAgent:
    """
    Factory function to keep parity with backend.agents.super_builder.get_agent.
    """
    return ClaudeAgent()
