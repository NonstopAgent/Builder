"""Pydantic models for the Super Builder backend.

These models define the schema for tasks and steps as exposed by the
REST API.  They now support capturing logs, errors, and metadata
generated during execution.

"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, Field


class CreateTaskRequest(BaseModel):
    """Request body for creating a new task."""

    type: str
    goal: str
    project_id: Optional[str] = None


class Step(BaseModel):
    """Represents a single step within a task's plan."""

    description: str
    status: str = Field(default="pending", description="The step status: pending or completed")
    result: Optional[str] = Field(default=None, description="Optional result of the step execution")

    # New fields for richer context
    logs: List[str] = Field(
        default_factory=list,
        description="Ordered list of log messages generated during step execution",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if step execution fails or encounters an exception",
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional metadata associated with the step (e.g. file paths, diff summaries)",
    )


class Task(BaseModel):
    """Represents a task managed by the backend."""

    id: int
    type: str = Field(..., alias="type")
    goal: str
    project_id: Optional[str] = None
    status: str = Field(default="queued", description="Overall task status")
    plan: List[Step] = Field(default_factory=list, description="Ordered list of plan steps")
    current_step: int = Field(default=0, description="Index of the current step in the plan")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO timestamp when the task was created")
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO timestamp when the task was last updated")

    # New fields to capture task-level logs and errors
    logs: List[str] = Field(
        default_factory=list,
        description="High-level logs for the task, such as planner outputs and summaries",
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if the task fails during execution",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary metadata captured during task lifecycle",
    )

    # 🔥 Full conversation history for this task (simple role/content pairs)
    messages: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Chat history associated with this task (role/content pairs).",
    )

    class Config:
        allow_population_by_field_name = True


class MessageRequest(BaseModel):
    session_id: str
    message: str


class MessageResponse(BaseModel):
    session_id: str
    message: str
    response: str


class AnswerSubmission(BaseModel):
    question_id: str
    answer: str


class RequirementsSession(BaseModel):
    session_id: str
    initial_goal: str
    questions: List[ClarifyingQuestion]
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    specification: Dict[str, Any] = Field(default_factory=dict)


class ClarifyingQuestion(BaseModel):
    """Represents a targeted question asked during requirements gathering."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    category: str
    priority: int = Field(default=1, description="Higher values indicate greater urgency")


class Specification(BaseModel):
    """Structured representation of requirements for a user goal."""

    goal: str
    audience: Optional[str] = None
    primary_cta: Optional[str] = None
    inspirations: List[str] = Field(default_factory=list)
    brand_guidelines: Optional[str] = None
    must_haves: List[str] = Field(default_factory=list)
    nice_to_haves: List[str] = Field(default_factory=list)
    performance_requirements: Optional[str] = None
    integrations: List[str] = Field(default_factory=list)
    compliance: List[str] = Field(default_factory=list)
    success_metrics: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


class PlanStep(BaseModel):
    """Individual executable step within a development phase."""

    name: str
    description: str
    requires_review: bool = False
    verification: List[str] = Field(default_factory=list)


class PlanPhase(BaseModel):
    """Grouping of related steps and checks."""

    name: str
    steps: List[PlanStep]
    verification: List[str] = Field(default_factory=list)


class DetailedPlan(BaseModel):
    """High-level roadmap produced by the council."""

    phases: List[PlanPhase]


class AgentOpinion(BaseModel):
    """Captures an individual agent's position during council debate."""

    agent: str
    role: str
    proposal: str
    concerns: List[str] = Field(default_factory=list)


class DebateRound(BaseModel):
    """One round of council discussion on a topic."""

    topic: str
    opinions: List[AgentOpinion]


class CouncilDecision(BaseModel):
    """Outcome of council deliberation including consensus and dissent."""

    consensus: str
    rationale: List[str] = Field(default_factory=list)
    dissent: List[str] = Field(default_factory=list)


class DebateResult(BaseModel):
    """Aggregated record of council debate."""

    rounds: List[DebateRound]
    decision: CouncilDecision


class ExecutionTrace(BaseModel):
    """Trace entry for each executed step with verification results."""

    phase: str
    step: str
    status: str
    logs: List[str] = Field(default_factory=list)
    verification: List[str] = Field(default_factory=list)


class CouncilOpinion(BaseModel):
    agent_role: str
    proposal: str
    concerns: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = 0.7


class CouncilRound(BaseModel):
    round_number: int
    topic: str
    opinions: List[CouncilOpinion]


class CouncilDebateRequest(BaseModel):
    prd: str


class CouncilDebateResult(BaseModel):
    prd: str
    rounds: List[CouncilRound]
    final_architecture: str
    consensus_reached: bool
    participating_agents: List[str]
    key_decisions: List[str] = Field(default_factory=list)
