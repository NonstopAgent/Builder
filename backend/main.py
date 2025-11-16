"""
FastAPI backend for the Super Builder application.

This module defines the REST API used by the front-end and tooling to
create sessions, manage tasks and execute them via the autonomous
SuperBuilderAgent. The API persists tasks to a JSON file on disk
to survive restarts. Additional endpoints may be added as the system
grows (e.g. for logging, messaging or file management).

The current implementation intentionally keeps things simple:

* Tasks are stored in a single JSON file via ``load_tasks`` and
  ``save_tasks`` helpers.
* Each call to ``/session/{session_id}/tasks/{task_id}/run``
  executes one step of the task via the agent to ensure safe,
  incremental progress.
* A dedicated endpoint exists to retrieve the plan for a task.

Future iterations should expand on this foundation with proper task
queues, authentication, streaming of agent output and comprehensive
error handling.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from typing import List, Dict, Any, Optional

from .models import CreateTaskRequest, Task, MessageRequest, MessageResponse
from .storage import load_tasks, save_tasks
from .agents import get_agent


app = FastAPI(title="Super Builder Backend")

# Allow all origins for simplicity (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for chat sessions
sessions_store: Dict[str, List[Dict[str, str]]] = {}


@app.get("/health", summary="Health check")
async def health() -> Dict[str, str]:
    """Return a simple health status."""
    return {"status": "ok"}


@app.post("/session", response_model=Dict[str, str])
async def create_session() -> Dict[str, str]:
    """Create a new chat session and return its identifier."""
    session_id = str(uuid4())
    sessions_store[session_id] = []
    return {"session_id": session_id}


@app.get("/session/{session_id}")
async def get_session_state(session_id: str) -> Dict[str, Any]:
    """Return the current list of tasks for the given session."""
    tasks: List[Task] = load_tasks()
    return {"tasks": [task.dict(by_alias=True) for task in tasks]}


@app.post("/session/{session_id}/tasks", response_model=Task)
async def create_task(session_id: str, req: CreateTaskRequest) -> Task:
    """Create a new task and persist it to disk."""
    tasks: List[Task] = load_tasks()
    new_id = max((int(t.id) for t in tasks), default=0) + 1
    new_task = Task(
        id=new_id,
        type=req.type,
        goal=req.goal,
        project_id=req.project_id,
        status="queued",
        plan=[],
        current_step=0,
    )
    tasks.append(new_task)
    save_tasks(tasks)
    return new_task


@app.post("/session/{session_id}/tasks/{task_id}/run")
async def run_task(session_id: str, task_id: int) -> Dict[str, Any]:
    """Run one step of the specified task via the agent."""
    tasks: List[Task] = load_tasks()
    task_obj: Optional[Task] = next((t for t in tasks if int(t.id) == task_id), None)
    if task_obj is None:
        raise HTTPException(status_code=404, detail="Task not found")

    agent = get_agent()
    task_payload = task_obj.dict(by_alias=True)
    updated_payload = agent.execute_task(task_payload)
    updated_task = Task(**updated_payload)

    for idx, existing in enumerate(tasks):
        if int(existing.id) == task_id:
            tasks[idx] = updated_task
            break
    save_tasks(tasks)
    return updated_task.dict(by_alias=True)


@app.get("/session/{session_id}/tasks/{task_id}", response_model=Task)
async def get_task(session_id: str, task_id: int) -> Task:
    """Retrieve a task by its unique ID."""
    tasks: List[Task] = load_tasks()
    task_obj = next((t for t in tasks if int(t.id) == task_id), None)
    if task_obj is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task_obj


@app.get("/session/{session_id}/tasks/{task_id}/plan")
async def get_task_plan(session_id: str, task_id: int) -> Dict[str, Any]:
    """Return only the execution plan for a given task."""
    tasks: List[Task] = load_tasks()
    task_obj = next((t for t in tasks if int(t.id) == task_id), None)
    if task_obj is None:
        raise HTTPException(status_code=404, detail="Task not found")
    plan_data = [step.dict() for step in task_obj.plan]
    return {"plan": plan_data}


@app.post("/session/{session_id}/message", response_model=MessageResponse)
async def send_message(session_id: str, req: MessageRequest) -> MessageResponse:
    """Echo the user's message in a chat session."""
    if session_id not in sessions_store:
        raise HTTPException(status_code=404, detail="Session not found")
    message = req.message
    response_text = f"Echo: {message}"
    sessions_store[session_id].append({"user": message, "assistant": response_text})
    return MessageResponse(session_id=session_id, message=message, response=response_text)
