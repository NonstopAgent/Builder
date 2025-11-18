"""Clarifying-question agent for the multi-agent Super Builder system."""

from __future__ import annotations

from typing import Any, Dict, List
import uuid

from ..models import ClarifyingQuestion, RequirementsSession, Specification


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

    async def generate_clarifying_questions(self, initial_goal: str) -> List[ClarifyingQuestion]:
        """Return clarifying questions with stable identifiers for tracking answers."""

        questions = await self.generate_questions(initial_goal)
        enriched: List[ClarifyingQuestion] = []
        for idx, question in enumerate(questions, start=1):
            enriched.append(
                ClarifyingQuestion(
                    id=question.id or str(uuid.uuid4()),
                    prompt=question.prompt,
                    category=question.category,
                    priority=question.priority + (len(questions) - idx),
                )
            )
        return enriched

    async def process_answer(
        self, question: str, answer: str, session: RequirementsSession
    ) -> Dict[str, Any]:
        """Update the session specification based on an answer and generate follow-ups."""

        spec = dict(session.specification) or {"goal": session.initial_goal, "notes": []}
        question_obj = next((q for q in session.questions if q.id == question), None)
        category = question_obj.category if question_obj else "general"

        # Aggregate answers under their category
        if category not in spec:
            spec[category] = []
        if isinstance(spec[category], list):
            spec[category].append(answer)
        else:
            spec[category] = [spec[category], answer]

        spec.setdefault("notes", []).append(
            f"Q: {question_obj.prompt if question_obj else question}\nA: {answer}"
        )

        followup_questions: List[ClarifyingQuestion] = []
        if "integration" in answer.lower() or category == "integrations":
            followup_questions.append(
                ClarifyingQuestion(
                    id=str(uuid.uuid4()),
                    prompt="Which APIs or data sources should we prioritize integrating first?",
                    category="integrations",
                    priority=5,
                )
            )

        return {"specification": spec, "followup_questions": followup_questions}

    async def gather_requirements(self, initial_goal: str) -> Specification:
        """Simulate gathering requirements and produce a structured specification."""

        questions = await self.generate_questions(initial_goal)
        notes = [f"Pending user input: {question.prompt}" for question in questions]
        return Specification(goal=initial_goal, notes=notes)

    async def generate_prd(self, session: RequirementsSession) -> str:
        """Create a lightweight PRD string from gathered specification data."""

        lines = [f"Product Requirements for: {session.initial_goal}", ""]
        for category, entries in session.specification.items():
            if category == "notes":
                continue
            lines.append(f"## {category.title()}")
            if isinstance(entries, list):
                lines.extend([f"- {item}" for item in entries])
            else:
                lines.append(f"- {entries}")
            lines.append("")
        if session.specification.get("notes"):
            lines.append("## Notes")
            lines.extend([f"- {n}" for n in session.specification["notes"]])
        return "\n".join(lines)
