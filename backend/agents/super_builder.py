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

        Parameters
        ----------
        prompt: str
            The prompt to send to the language model.
        max_tokens: int
            The maximum number of tokens to generate in the response.

        Returns
        -------
        Optional[str]
            The content of the assistant's reply, or ``None`` if the call
            failed.
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

        Parameters
        ----------
        task: dict
            A task dictionary adhering to the schema defined in
            ``backend.models.Task``. It must contain at least
            ``goal``, ``plan``, ``current_step`` and ``status`` keys.

        Returns
        -------
        dict
            The updated task dictionary after planning/execution.
        """
        # Ensure the plan exists; if empty create a new plan
        if not task.get("plan"):
            plan_descriptions = self._create_plan(task.get("goal", ""))
            # Build Step objects with default fields
            task["plan"] = [
                Step(description=desc).dict()
                for desc in plan_descriptions
            ]
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
                # Check for "Read file: <path>" pattern to read file contents from the workspace
                if description_lower.startswith("read file"):
                    parts = step["description"].split(":", 1)
                    if len(parts) == 2:
                        relative_path = parts[1].strip()
                        try:
                            content = file_ops.read_file(relative_path)
                            step["result"] = content
                            step.setdefault("logs", []).append(f"Read {relative_path} successfully.")
                            task.setdefault("logs", []).append(f"Read {relative_path} successfully.")
                        except Exception as exc:  # noqa: BLE001
                            error_msg = str(exc)
                            step.setdefault("error", error_msg)
                            step.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                            task.setdefault("logs", []).append(f"Error reading {relative_path}: {error_msg}")
                        handled = True
                # Check for "Write file: <path>" pattern to write file contents to the workspace
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
                            except Exception as exc:  # noqa: BLE001
                                error_msg = str(exc)
                                step.setdefault("error", error_msg)
                                step.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                                task.setdefault("logs", []).append(f"Error writing {relative_path}: {error_msg}")
                        handled = True
                # If the step was not handled by custom logic, use OpenAI or fallback execution
                if not handled:
                    # Attempt to execute the step via OpenAI to generate a result/logs
                    prompt = (
                        f"You are executing the following step as part of a build/planning task.\n"
                        f"Goal: {task.get('goal', '')}\n"
                        f"Step: {step['description']}\n\n"
                        "Please describe what actions you would take to perform this step and summarize the result concisely."
                    )
                    assistant_reply = self._call_openai(prompt, max_tokens=256)
                    if assistant_reply:
                        # Record the AI-generated result and log
                        step.setdefault("logs", []).append(assistant_reply)
                        step["result"] = assistant_reply
                        # Also append the reply to the task-level logs
                        task.setdefault("logs", []).append(assistant_reply)
                    else:
                        # Fallback: record a simple placeholder result
                        fallback = f"Executed step: {step['description']}"
                        step.setdefault("logs", []).append(fallback)
                        step["result"] = fallback
                        task.setdefault("logs", []).append(fallback)
                # Mark the step as completed and advance the index
                step["status"] = "completed"
                current_index += 1
                task["current_step"] = current_index

        # Update overall task status based on remaining pending steps
        if current_index >= len(task["plan"]):
            task["status"] = "completed"
        else:
            task["status"] = "in_progress"

        # Update the timestamp fields
        task["updated_at"] = datetime.utcnow().isoformat()

        return task

    def _create_plan(self, goal: str) -> List[str]:
        """Generate a multi-step plan for the given task goal.

        This method first attempts to call an LLM (via the OpenAI API) to
        produce a series of high-level steps tailored to the goal. The
        expected response is a JSON array of short strings, each
        describing a step. If the API call fails or the response
        cannot be parsed, a static three-step plan is returned as a
        fallback.

        Parameters
        ----------
        goal: str
            The overall objective of the task.

        Returns
        -------
        list of str
            A list containing descriptions for each planned step.
        """
        cleaned_goal = goal.strip() or "the task"
        # Attempt to use OpenAI to generate a plan
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
                # Try to parse the response as JSON
                plan_list = json.loads(assistant_reply)
                if isinstance(plan_list, list) and all(isinstance(item, str) for item in plan_list):
                    return plan_list
            except json.JSONDecodeError:
                # Not valid JSON; attempt to split by newline or semicolon
                lines = [line.strip("- ").strip() for line in assistant_reply.split("\n") if line.strip()]
                if lines:
                    return lines
        # Fallback to a generic three-step plan
        return [
            f"Analyze the goal: {cleaned_goal}",
            f"Design and implement a solution for: {cleaned_goal}",
            f"Test and review the solution for: {cleaned_goal}",
        ]


def get_agent() -> SuperBuilderAgent:
    """Factory function to obtain a SuperBuilderAgent.

    Returns
    -------
    SuperBuilderAgent
        A new instance of the agent ready to execute tasks.
    """
    return SuperBuilderAgent()
