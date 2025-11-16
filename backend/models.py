# backend/models.py
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class CreateTaskRequest(BaseModel):
    type: str
    goal: str
    project_id: Optional[str] = None

class Step(BaseModel):
    description: str
    status: str = "pending"
    result: Optional[str] = None

class Task(BaseModel):
    id: int
    type: str = Field(..., alias="type")
    goal: str
    project_id: Optional[str] = None
    status: str = "queued"
    plan: List[Step] = []
    current_step: int = 0
    created_at: str = datetime.utcnow().isoformat()
    updated_at: str = datetime.utcnow().isoformat()
