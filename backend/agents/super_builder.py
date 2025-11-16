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

from typing import Dict, Any, List
from datetime import datetime

from ..models import Step


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
        # In a more sophisticated implementation, the agent might
        # maintain internal state or configuration here.
        pass

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
            task["plan"] = [Step(description=desc).dict() for desc in plan_descriptions]
            task["status"] = "in_progress"
            task["current_step"] = 0

        # Identify the current step index; default to 0 if missing
        current_index: int = int(task.get("current_step", 0))

        # Process the current step if it exists and is pending
        if current_index < len(task["plan"]):
            step: Dict[str, Any] = task["plan"][current_index]
            if step.get("status") == "pending":
                # Mark the step as completed and record a placeholder result
                step["status"] = "completed"
                step["result"] = f"Executed step: {step['description']}"
                # Advance the current step index
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
        """Generate a simple plan given the task goal.

        The current implementation returns a fixed three-step plan
        tailored to the provided goal. In the future this method
        should interface with a dedicated planning model to produce
        an appropriate sequence of steps.

        Parameters
        ----------
        goal: str
            The overall objective of the task.

        Returns
        -------
        list of str
            A list containing descriptions for each planned step.
        """
        # Strip and fall back to generic goal if empty
        cleaned_goal = goal.strip() or "the task"
        return [
            f"Analyze the goal: {cleaned_goal}",
            f"Design and implement a solution for: {cleaned_goal}",
            f"Test and review the solution for: {cleaned_goal}",
        ]


def get_agent() -> "SuperBuilderAgent":
    """Factory function to obtain a SuperBuilderAgent."""
    return SuperBuilderAgent()
