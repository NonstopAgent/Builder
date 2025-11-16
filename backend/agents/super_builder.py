"""Implementation of the SuperBuilderAgent.

The agent now attempts to call the OpenAI API to generate multi-step
plans and execute individual steps.  Logs and errors are captured on
each Step.

"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime
import os
import json
import logging

from ..models import Step

try:
    import openai  # type: ignore
except ImportError:
    openai = None

logger = logging.getLogger(__name__)


class SuperBuilderAgent:
    """An autonomous agent to execute tasks for the Super Builder."""

    def __init__(self) -> None:
        """Initialize the agent with optional configuration."""
        self.model_name = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")

    def _call_openai(self, prompt: str, max_tokens: int = 256) -> Optional[str]:
        """Invoke the OpenAI ChatCompletion API with the given prompt."""
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
        """Execute a single step of the provided task."""
        # Create a plan if none exists
        if not task.get("plan"):
            plan_descriptions = self._create_plan(task.get("goal", ""))
            task["plan"] = [
                Step(description=desc).dict()
                for desc in plan_descriptions
            ]
            task["status"] = "in_progress"
            task["current_step"] = 0

        # Identify the current step
        current_index: int = int(task.get("current_step", 0))

        # Process the current step if pending
        if current_index < len(task["plan"]):
            step: Dict[str, Any] = task["plan"][current_index]
            if step.get("status") == "pending":
                # Build a prompt describing the step and goal
                prompt = (
                    "You are executing the following step as part of a build/planning task.\n"
                    f"Goal: {task.get('goal', '')}\n"
                    f"Step: {step['description']}\n\n"
                    "Please describe what actions you would take to perform this step and summarize the result concisely."
                )
                assistant_reply = self._call_openai(prompt, max_tokens=256)
                if assistant_reply:
                    step.setdefault("logs", []).append(assistant_reply)
                    step["result"] = assistant_reply
                    # Also append the reply to the task-level logs
                    task.setdefault("logs", []).append(assistant_reply)
                else:
                    fallback = f"Executed step: {step['description']}"
                    step.setdefault("logs", []).append(fallback)
                    step["result"] = fallback
                    task.setdefault("logs", []).append(fallback)
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
        # Fallback to a generic three-step plan
        return [
            f"Analyze the goal: {cleaned_goal}",
            f"Design and implement a solution for: {cleaned_goal}",
            f"Test and review the solution for: {cleaned_goal}",
        ]


def get_agent() -> SuperBuilderAgent:
    """Factory function to obtain a SuperBuilderAgent."""
    return SuperBuilderAgent()
