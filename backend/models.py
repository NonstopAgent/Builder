"""Pydantic models for the Super Builder backend.

These models define the schema for tasks and steps as exposed by the
REST API.  They now support capturing logs, errors, and metadata
generated during execution.

"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

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

    class Config:
        allow_population_by_field_name = True


class MessageRequest(BaseModel):
    session_id: str
    message: str


class MessageResponse(BaseModel):
    session_id: str
    message: str
    response: str
