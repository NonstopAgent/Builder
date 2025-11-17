"""Lightweight knowledge graph abstraction for cross-project insights."""

from __future__ import annotations

from typing import List


class KnowledgeGraph:
    """Stores learnings and re-surfaces them for new projects."""

    def __init__(self) -> None:
        self.events: List[str] = []

    async def record(self, insight: str) -> None:
        """Persist a new insight for later retrieval."""

        self.events.append(insight)

    async def find_similar_projects(self, goal: str) -> List[str]:
        """Return placeholder identifiers of similar projects."""

        return [f"similar-to-{goal}-1", f"similar-to-{goal}-2"]

    async def extract_successful_patterns(self, _projects: List[str]) -> List[str]:
        """Return commonly successful strategies observed across projects."""

        return ["Edge caching for landing pages", "Pre-rendered FAQs boost SEO"]

    async def apply_learnings(self, goal: str) -> List[str]:
        """Combine similarity search and pattern extraction into a helper."""

        projects = await self.find_similar_projects(goal)
        patterns = await self.extract_successful_patterns(projects)
        await self.record(f"Applied patterns to {goal}: {', '.join(patterns)}")
        return patterns
