import os
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    import anthropic
except ImportError:  # Fallback if the package is not installed
    anthropic = None  # type: ignore

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class ClaudeAgent:
    """
    Claude-powered agent for planning and executing tasks.

    This agent:

    - Generates multi-step plans for a given goal
    - Executes one step at a time
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
            # Anthropic responses have `content` as a list of blocks; use first text block
            for block in response.content:
                if getattr(block, "type", None) == "text":
                    return block.text
            # Fallback: string representation
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
            # Strip leading bullets like "1.", "-", "*", etc.
            if ln[0].isdigit():
                # e.g. "1. Do X"
                parts = ln.split(".", 1)
                if len(parts) == 2 and parts[1].strip():
                    steps.append(parts[1].strip())
                    continue
            if ln.startswith(("-", "*", "•")):
                steps.append(ln.lstrip("-*• ").strip())
                continue
            # Fallback: treat as a step if we don't have many yet
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
            "Each step should be short, action-focused, and specific."
        )
        user_prompt = (
            "Goal:\n"
            f"{goal}\n\n"
            "Respond ONLY with a list of steps, one per line. "
            "You may use bullet points or numbered steps."
        )

        text = self._call_claude(system_prompt, user_prompt)
        if not text:
            logger.info("Claude unavailable, using static plan")
            return self._static_plan(goal)

        steps = self._parse_steps_from_text(text)
        if not steps:
            logger.info("Claude returned no parseable steps, using static plan")
            return self._static_plan(goal)
        return steps

    # ------------------------------------------------------------------ #
    # Task execution
    # ------------------------------------------------------------------ #

    def execute_task(self, task_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point used by the backend.

        Expects a dict that matches the Task model. Mutates and returns it.

        Behavior:
        - If there is no plan yet, generate one and mark task as in_progress.
        - Otherwise, complete the current step:
          * mark step as 'completed'
          * append logs
          * advance current_step index
          * mark task 'completed' when all steps are done.
        """
        task = dict(task_dict)  # shallow copy to avoid surprises
        task.setdefault("logs", [])
        task.setdefault("status", "queued")
        task.setdefault("plan", [])
        task.setdefault("current_step", None)

        # Normalize timestamps
        if not task.get("created_at"):
            task["created_at"] = _now_iso()
        task["updated_at"] = _now_iso()

        plan: List[Dict[str, Any]] = task.get("plan") or []

        # Case 1: no plan yet -> create with Claude
        if not plan:
            goal = task.get("goal") or ""
            descriptions = self._create_plan(goal)

            steps: List[Dict[str, Any]] = []
            for idx, desc in enumerate(descriptions):
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

        # Case 2: we have a plan -> advance one step
        current_idx = task.get("current_step")
        if current_idx is None:
            # No active step but plan exists; treat as already finished
            task["status"] = "completed"
            task["logs"].append(f"[{_now_iso()}] Task marked completed; no active step.")
            return task

        if current_idx < 0 or current_idx >= len(plan):
            task["status"] = "completed"
            task["current_step"] = None
            task["logs"].append(
                f"[{_now_iso()}] current_step index out of range; forcing task to completed."
            )
            return task

        step = plan[current_idx]
        step_logs: List[str] = step.get("logs") or []
        step_status = step.get("status", "pending")

        # Mark this step as completed (for now, we don't call tools)
        step_status = "completed"
        step["status"] = step_status
        step["updated_at"] = _now_iso()
        completion_msg = f"[{_now_iso()}] Completed step {current_idx + 1}: {step.get('description', '')}"
        step_logs.append(completion_msg)
        step["logs"] = step_logs

        # Record at task level as well
        task["logs"].append(completion_msg)

        # Advance to next step or mark task as completed
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
