"""Pydantic models used by the Super Builder backend."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CreateTaskRequest(BaseModel):
    """Request body for creating a new task."""

    type: str
    goal: str
    project_id: Optional[str] = None


class Step(BaseModel):
    """Represents a single step within a task's plan."""

    description: str
    status: str = Field(default="pending")
    result: Optional[str] = None


class Task(BaseModel):
    """Represents a task managed by the backend."""

    id: int
    type: str = Field(..., alias="type")
    goal: str
    project_id: Optional[str] = None
    status: str = Field(default="queued")
    plan: List[Step] = Field(default_factory=list)
    current_step: int = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    class Config:
        allow_population_by_field_name = True
