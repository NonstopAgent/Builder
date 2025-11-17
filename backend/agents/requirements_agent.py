"""Clarifying-question agent for the multi-agent Super Builder system."""

from __future__ import annotations

from typing import List

from ..models import ClarifyingQuestion, Specification


DEFAULT_QUESTION_BANK: List[ClarifyingQuestion] = [
    ClarifyingQuestion(
        prompt="Who is the target audience and what problem are we solving for them?",
        category="audience",
        priority=5,
    ),
    ClarifyingQuestion(
        prompt="What is the primary call-to-action or success metric?",
        category="success",
        priority=5,
    ),
    ClarifyingQuestion(
        prompt="Are there brand guidelines, visual preferences, or examples you admire?",
        category="design",
        priority=4,
    ),
    ClarifyingQuestion(
        prompt="List must-have features and any nice-to-have additions.",
        category="features",
        priority=4,
    ),
    ClarifyingQuestion(
        prompt="What performance, accessibility, or compliance requirements do we need to respect?",
        category="quality",
        priority=4,
    ),
    ClarifyingQuestion(
        prompt="What integrations or data sources are required (analytics, CRM, payments, etc.)?",
        category="integrations",
        priority=3,
    ),
    ClarifyingQuestion(
        prompt="Are there constraints around timeline, hosting, or technology choices?",
        category="constraints",
        priority=3,
    ),
]


class RequirementsAgent:
    """Generates clarifying questions and aggregates them into a specification."""

    def __init__(self, question_bank: List[ClarifyingQuestion] | None = None) -> None:
        self.question_bank = question_bank or DEFAULT_QUESTION_BANK

    async def generate_questions(self, initial_goal: str) -> List[ClarifyingQuestion]:
        """Return a prioritized list of questions tailored to the provided goal."""

        goal_hint = initial_goal.lower()
        customized: List[ClarifyingQuestion] = []
        for question in sorted(self.question_bank, key=lambda q: q.priority, reverse=True):
            if "landing" in goal_hint and question.category == "performance":
                customized.append(
                    ClarifyingQuestion(
                        prompt="Do we need lighthouse performance targets or CDN/edge delivery?",
                        category="performance",
                        priority=question.priority,
                    )
                )
            customized.append(question)
        return customized

    async def gather_requirements(self, initial_goal: str) -> Specification:
        """Simulate gathering requirements and produce a structured specification."""

        questions = await self.generate_questions(initial_goal)
        notes = [f"Pending user input: {question.prompt}" for question in questions]
        return Specification(goal=initial_goal, notes=notes)
