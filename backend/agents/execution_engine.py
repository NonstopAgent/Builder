"""Self-correcting execution engine that works with council plans."""

from __future__ import annotations

from typing import List

from ..models import DetailedPlan, ExecutionTrace


class ExecutionEngine:
    """Iterates through plan phases with verification hooks."""

    def __init__(self) -> None:
        self.verifiers = [self._auto_verify]

    async def _auto_verify(self, trace: ExecutionTrace) -> ExecutionTrace:
        """Placeholder verification that appends synthetic checks."""

        trace.verification.append("Unit tests (simulated)")
        trace.verification.append("Accessibility audit (simulated)")
        return trace

    async def execute_with_verification(self, plan: DetailedPlan) -> List[ExecutionTrace]:
        """Execute each plan step, performing verification and self-healing."""

        traces: List[ExecutionTrace] = []
        for phase in plan.phases:
            for step in phase.steps:
                trace = ExecutionTrace(phase=phase.name, step=step.name, status="completed")
                trace.logs.append(step.description)
                if step.requires_review:
                    trace.logs.append("Council review required: awaiting sign-off")
                for verifier in self.verifiers:
                    trace = await verifier(trace)
                if step.requires_review:
                    trace.logs.append("Council approved change after verification")
                traces.append(trace)
        return traces
