"""Implementation of the SuperBuilderAgent.

The agent generates a 3-step plan based on the task goal and
completes one step per invocation. This is a stub for future
integration with real planning models.
"""
from datetime import datetime
from typing import Any, Dict, List

from ..models import Step


class SuperBuilderAgent:
    """Very small task planner/executor stub."""

    def __init__(self) -> None:
        # No heavy initialization required yet.
        pass

    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Create a plan if needed and complete a single step."""

        # Create a plan if it doesn't exist yet.
        if not task.get("plan"):
            plan_descriptions = self._create_plan(task.get("goal", ""))
            task["plan"] = [Step(description=d).dict() for d in plan_descriptions]
            task["status"] = "in_progress"
            task["current_step"] = 0

        # Complete the current step (if there is one left).
        idx = int(task.get("current_step", 0))
        if idx < len(task["plan"]):
            step = task["plan"][idx]
            if step.get("status") == "pending":
                step["status"] = "completed"
                step["result"] = f"Executed step: {step['description']}"
                idx += 1
                task["current_step"] = idx

        # Update task status and timestamp.
        task["status"] = "completed" if idx >= len(task["plan"]) else "in_progress"
        task["updated_at"] = datetime.utcnow().isoformat()
        return task

    def _create_plan(self, goal: str) -> List[str]:
        """Return a deterministic three-step plan description list."""

        cleaned_goal = goal.strip() or "the task"
        return [
            f"Analyze the goal: {cleaned_goal}",
            f"Design and implement a solution for: {cleaned_goal}",
            f"Test and review the solution for: {cleaned_goal}",
        ]


def get_agent() -> SuperBuilderAgent:
    """Factory function for the default agent implementation."""

    return SuperBuilderAgent()
