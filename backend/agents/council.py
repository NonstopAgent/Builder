"""Development council that orchestrates multi-agent debates."""

from __future__ import annotations

from typing import List

from ..models import AgentOpinion, CouncilDecision, DebateResult, DebateRound, DetailedPlan, PlanPhase, PlanStep, Specification


DEFAULT_AGENT_PROFILES = [
    ("Architect", "System design"),
    ("Security", "Vulnerability analysis"),
    ("UX", "User experience"),
    ("Performance", "Scalability"),
    ("Code Quality", "Best practices"),
]


class DevelopmentCouncil:
    """Coordinates specialized agents to create a debated plan."""

    def __init__(self, agent_profiles: List[tuple[str, str]] | None = None) -> None:
        self.agent_profiles = agent_profiles or DEFAULT_AGENT_PROFILES

    async def _round_one(self, spec: Specification) -> DebateRound:
        opinions = [
            AgentOpinion(
                agent=name,
                role=role,
                proposal=f"Initial approach for goal '{spec.goal}'.",
                concerns=["Validate dependencies", "Confirm hosting model"],
            )
            for name, role in self.agent_profiles
        ]
        return DebateRound(topic="Initial approaches", opinions=opinions)

    async def _round_two(self, spec: Specification) -> DebateRound:
        opinions = [
            AgentOpinion(
                agent="Security",
                role="Vulnerability analysis",
                proposal="Enforce input validation, CSP headers, and secrets management.",
                concerns=["Add rate limiting", "Plan logging redaction"],
            ),
            AgentOpinion(
                agent="Performance",
                role="Scalability",
                proposal="Prefer edge-friendly frameworks and lazy loading for heavy assets.",
                concerns=["Budget cold start times", "Monitor lighthouse scores"],
            ),
        ]
        return DebateRound(topic="Critique and risk analysis", opinions=opinions)

    async def _round_three(self, spec: Specification) -> DebateRound:
        opinions = [
            AgentOpinion(
                agent="Architect",
                role="System design",
                proposal="Adopt Next.js with TypeScript, Tailwind, and automated testing harness.",
                concerns=["Confirm analytics SDK choices"],
            )
        ]
        return DebateRound(topic="Consensus building", opinions=opinions)

    async def _build_plan(self, spec: Specification) -> DetailedPlan:
        foundation = PlanPhase(
            name="Foundation",
            steps=[
                PlanStep(
                    name="Initialize project",
                    description="Bootstrap Next.js + TypeScript workspace with linting and formatting",
                ),
                PlanStep(
                    name="Design system",
                    description="Configure Tailwind theme based on brand preferences",
                    requires_review=True,
                ),
                PlanStep(
                    name="Testing harness",
                    description="Install Jest, Testing Library, and Playwright for E2E coverage",
                ),
            ],
        )

        core_components = PlanPhase(
            name="Core Components",
            steps=[
                PlanStep(name="Navbar", description="Responsive navigation with mobile drawer"),
                PlanStep(name="Hero", description="Animated hero with CTA and optimized media", requires_review=True),
                PlanStep(name="Features", description="Grid of differentiators with iconography"),
                PlanStep(
                    name="Social Proof",
                    description="Testimonials and logo row sourced from structured content",
                    verification=["Accessibility audit", "Visual regression"],
                ),
                PlanStep(name="Contact", description="Validated contact form with rate limiting", requires_review=True),
            ],
            verification=["Lighthouse >90", "WCAG 2.1 AA"],
        )

        polish = PlanPhase(
            name="Polish & Optimization",
            steps=[
                PlanStep(name="Micro-interactions", description="Motion and hover states for delight"),
                PlanStep(name="SEO", description="Meta tags, schema.org, and analytics events"),
                PlanStep(name="Performance", description="Code splitting and asset optimization"),
            ],
        )

        return DetailedPlan(phases=[foundation, core_components, polish])

    async def debate(self, spec: Specification) -> DebateResult:
        """Run three lightweight debate rounds and produce a plan and decision."""

        rounds = [
            await self._round_one(spec),
            await self._round_two(spec),
            await self._round_three(spec),
        ]

        decision = CouncilDecision(
            consensus="Proceed with the proposed architecture and phased delivery plan.",
            rationale=[
                "Balances performance and security requirements",
                "Aligns UX and accessibility goals with rapid iteration",
            ],
            dissent=["Validate integration specifics once user answers clarifying questions."],
        )

        return DebateResult(rounds=rounds, decision=decision)

    async def produce_plan(self, spec: Specification) -> DetailedPlan:
        """Expose the consolidated plan after debate."""

        await self.debate(spec)
        return await self._build_plan(spec)
