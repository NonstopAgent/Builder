from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class Task(BaseModel):
    id: int
    status: str
    goal: str
    notes: Optional[str] = None
    plan: Optional[List[Dict]] = None
    current_step: int = 0

class CreateTaskRequest(BaseModel):
    goal: str = Field(..., description="High level goal for the task")
    notes: Optional[str] = Field(None, description="Additional notes or requirements")

class MessageRequest(BaseModel):
    session_id: str
    message: str

class MessageResponse(BaseModel):
    session_id: str
    message: str
    response: str
