"""FastAPI backend for the Super Builder application."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from typing import Any, Dict

from .models import CreateTaskRequest, Task
from .storage import load_tasks, save_tasks
from .agents import get_agent

app = FastAPI(title="Super Builder Backend")

# Allow all origins (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/session")
def create_session() -> Dict[str, str]:
    """Create a new session and return its UUID."""

    session_id = str(uuid4())
    return {"session_id": session_id}


@app.get("/api/session/{session_id}")
def get_session_state(session_id: str) -> Dict[str, Any]:
    """Return the current list of tasks for the given session."""

    tasks = load_tasks()
    return {"tasks": tasks}


@app.post("/api/session/{session_id}/tasks", response_model=Task)
def create_task(session_id: str, req: CreateTaskRequest) -> Task:
    """Create a new task and append it to the tasks list."""

    tasks = load_tasks()
    new_id = max((t["id"] for t in tasks), default=0) + 1
    new_task = Task(
        id=new_id,
        type=req.type,
        goal=req.goal,
        project_id=req.project_id,
        status="queued",
        plan=[],
        current_step=0,
    ).dict(by_alias=True)
    tasks.append(new_task)
    save_tasks(tasks)
    return new_task


@app.post("/api/session/{session_id}/tasks/{task_id}/run")
def run_task(session_id: str, task_id: int) -> Dict[str, Any]:
    """Execute a single step of the specified task via the agent."""

    tasks = load_tasks()
    task_data = next((t for t in tasks if t["id"] == task_id), None)
    if task_data is None:
        raise HTTPException(status_code=404, detail="Task not found")
    agent = get_agent()
    updated_task = agent.execute_task(task_data)
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks[i] = updated_task
            break
    save_tasks(tasks)
    return updated_task


@app.get("/api/session/{session_id}/tasks/{task_id}", response_model=Task)
def get_task(session_id: str, task_id: int) -> Task:
    """Return a specific task by ID."""

    tasks = load_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)


@app.get("/api/session/{session_id}/tasks/{task_id}/plan")
def get_task_plan(session_id: str, task_id: int) -> Dict[str, Any]:
    """Return the plan (list of steps) for a specific task."""

    tasks = load_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"plan": task.get("plan", [])}
