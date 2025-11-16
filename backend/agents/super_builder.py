"""Implementation of the SuperBuilderAgent.

The SuperBuilderAgent is responsible for executing tasks on behalf of
the Super Builder system. It provides a simple planning and execution
loop that updates the task state step by step. For now the
implementation is intentionally naive – it does not integrate with
external AI services yet, but it demonstrates the structure and
flow that such an agent might follow.

Future enhancements should replace the `_create_plan` method with
calls to a planner model (e.g. Claude or ChatGPT) and should
augment `execute_task` to perform real work via tool invocations and
file system operations.
"""

from __future__ import annotations

from typing import Dict, Any, List, Optional
from datetime import datetime

import os
import json
import logging
from ..models import Step
from ..utils import file_ops

try:
    import openai  # type: ignore
except ImportError:
    openai = None


logger = logging.getLogger(__name__)


class SuperBuilderAgent:
    """A minimal autonomous agent to execute tasks for the Super Builder.

    The agent maintains a simple lifecycle for a task: when first run
    it generates a plan consisting of a few high-level steps derived
    from the task goal. Subsequent calls mark each pending step as
    completed, recording a placeholder result for transparency. When
    all steps have been executed the task status is updated to
    ``completed``.
    """

    def __init__(self) -> None:
        """Initialize the agent.

        In future iterations this constructor could accept configuration
        parameters such as the OpenAI model name, temperature, etc. For
        now it merely sets up a logger.
        """
        # Placeholder for future configuration
        self.model_name = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")

    def _call_openai(self, prompt: str, max_tokens: int = 256) -> Optional[str]:
        """Invoke the OpenAI ChatCompletion API with the given prompt.

        If the ``openai`` package is not available or an API error occurs,
        this function returns ``None``. The caller should handle a ``None``
        response and implement a fallback strategy.
        """
        if openai is None:
            logger.warning("openai package is not installed; falling back to static planning")
            return None
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY environment variable not set; falling back to static planning")
            return None
        try:
            openai.api_key = api_key
            response = openai.ChatCompletion.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates concise plans and execution logs."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.5,
                n=1,
            )
            content = response.choices[0].message["content"]
            return content.strip()
        except Exception as exc:  # noqa: BLE001
            logger.error("Error calling OpenAI API: %s", exc, exc_info=True)
            return None

    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single step of the provided task.

        This method implements a single-step execution loop. It will
        generate an initial plan if none exists, then mark the next
        pending step as completed. A simple placeholder result is
        recorded for each completed step. Timestamps and task status
        fields are updated accordingly.
        """
        # Ensure the plan exists; if empty create a new plan
        if not task.get("plan"):
            plan_descriptions = self._create_plan(task.get("goal", ""))
            task["plan"] = [Step(description=desc).dict() for desc in plan_descriptions]
            task["status"] = "in_progress"
            task["current_step"] = 0

        # Identify the current step index; default to 0 if missing
        current_index: int = int(task.get("current_step", 0))

        # Process the current step if it exists and is pending
        if current_index < len(task["plan"]):
            step: Dict[str, Any] = task["plan"][current_index]
            if step.get("status") == "pending":
                # Allow custom handling for specific command-like steps.
                description_lower = step["description"].lower()
                handled = False

                # Read file
                if description_lower.startswith("read file"):
                    parts = step["description"].split(":", 1)
                    if len(parts) == 2:
                        relative_path = parts[1].strip()
                        try:
                            content = file_ops.read_file(relative_path)
                            step["result"] = content
                            step.setdefault("logs", []).append(f"Read {relative_path} successfully.")
                            task.setdefault("logs", []).append(f"Read {relative_path} successfully.")
                        except Exception as exc:
                            error_msg = str(exc)
                            step.setdefault("error", error_msg)
                            step.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                            task.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                        handled = True

                # Write file
                elif description_lower.startswith("write file"):
                    parts = step["description"].split(":", 1)
                    if len(parts) == 2:
                        relative_path = parts[1].strip()
                        metadata = step.get("metadata", {})
                        content = None
                        if isinstance(metadata, dict):
                            content = metadata.get("content")
                        if content is None:
                            error_msg = "No content provided in metadata for write file"
                            step.setdefault("error", error_msg)
                            step.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                            task.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                        else:
                            try:
                                file_ops.write_file(relative_path, content)
                                step["result"] = f"Wrote content to {relative_path}"
                                step.setdefault("logs", []).append(f"Wrote {relative_path} successfully.")
                                task.setdefault("logs", []).append(f"Wrote {relative_path} successfully.")
                            except Exception as exc:
                                error_msg = str(exc)
                                step.setdefault("error", error_msg)
                                step.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                                task.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                        handled = True

                # Diff file
                elif description_lower.startswith("diff file"):
                    parts = step["description"].split(":", 1)
                    if len(parts) == 2:
                        relative_path = parts[1].strip()
                        metadata = step.get("metadata", {})
                        new_content = None
                        # accept both "content" and "new_content"
                        if isinstance(metadata, dict):
                            new_content = metadata.get("content") or metadata.get("new_content")
                        if new_content is None:
                            error_msg = "No new content provided in metadata for diff file"
                            step.setdefault("error", error_msg)
                            step.setdefault("logs", []).append(f"Error diffing {relative_path}: {error_msg}")
                            task.setdefault("logs", []).append(f"Error diffing {relative_path}: {error_msg}")
                        else:
                            try:
                                original_content = file_ops.read_file(relative_path)
                            except Exception as exc:
                                error_msg = str(exc)
                                step.setdefault("error", error_msg)
                                step.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                                task.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                            else:
                                diff_lines = file_ops.diff_text(original_content, new_content)
                                step["result"] = "\n".join(diff_lines)
                                step.setdefault("logs", []).append(f"Generated diff for {relative_path}.")
                                task.setdefault("logs", []).append(f"Generated diff for {relative_path}.")
                        handled = True

                # List directory
                elif description_lower.startswith("list dir"):
                    parts = step["description"].split(":", 1)
                    # If a path is provided after the colon, use it; otherwise list the root
                    relative_path = parts[1].strip() if len(parts) == 2 else ""
                    try:
                        entries = file_ops.list_dir(relative_path)
                        step["result"] = json.dumps(entries)
                        dir_label = relative_path if relative_path else "."
                        step.setdefault("logs", []).append(f"Listed directory {dir_label} successfully.")
                        task.setdefault("logs", []).append(f"Listed directory {dir_label} successfully.")
                    except Exception as exc:
                        error_msg = str(exc)
                        dir_label = relative_path if relative_path else "."
                        step.setdefault("error", error_msg)
                        step.setdefault("logs", []).append(f"Error listing directory {dir_label}: {error_msg}")
                        task.setdefault("logs", []).append(f"Error listing directory {dir_label}: {error_msg}")
                    handled = True

                # Default: use OpenAI or fallback
                if not handled:
                    prompt = (
                        f"You are executing the following step as part of a build/planning task.\n"
                        f"Goal: {task.get('goal', '')}\n"
                        f"Step: {step['description']}\n\n"
                        "Please describe what actions you would take to perform this step and summarize the result concisely."
                    )
                    assistant_reply = self._call_openai(prompt, max_tokens=256)
                    if assistant_reply:
                        step.setdefault("logs", []).append(assistant_reply)
                        step["result"] = assistant_reply
                        task.setdefault("logs", []).append(assistant_reply)
                    else:
                        fallback = f"Executed step: {step['description']}"
                        step.setdefault("logs", []).append(fallback)
                        step["result"] = fallback
                        task.setdefault("logs", []).append(fallback)

                # Mark the step as completed and move to the next
                step["status"] = "completed"
                current_index += 1
                task["current_step"] = current_index

        # Update task status
        if current_index >= len(task["plan"]):
            task["status"] = "completed"
        else:
            task["status"] = "in_progress"
        task["updated_at"] = datetime.utcnow().isoformat()

        return task

    def _create_plan(self, goal: str) -> List[str]:
        """Generate a multi-step plan for the given task goal."""
        cleaned_goal = goal.strip() or "the task"
        plan_prompt = (
            "You are an autonomous software development assistant tasked with "
            "breaking down high-level goals into concrete, incremental steps.\n"
            f"Goal: {cleaned_goal}\n"
            "Provide a JSON array of step descriptions (strings). Each step should "
            "be actionable and concise. Do not include numbering or any additional commentary."
        )
        assistant_reply = self._call_openai(plan_prompt, max_tokens=256)
        if assistant_reply:
            try:
                plan_list = json.loads(assistant_reply)
                if isinstance(plan_list, list) and all(isinstance(item, str) for item in plan_list):
                    return plan_list
            except json.JSONDecodeError:
                lines = [line.strip("- ").strip() for line in assistant_reply.split("\n") if line.strip()]
                if lines:
                    return lines
        # Fallback plan
        return [
            f"Analyze the goal: {cleaned_goal}",
            f"Design and implement a solution for: {cleaned_goal}",
            f"Test and review the solution for: {cleaned_goal}",
        ]


def get_agent() -> SuperBuilderAgent:
    """Factory function to obtain a SuperBuilderAgent."""
    return SuperBuilderAgent()
