# backend/main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from .models import CreateTaskRequest, Task, Step
from .storage import load_tasks, save_tasks
from .agents.super_builder import get_agent
from typing import List, Dict, Any, Optional

app = FastAPI(title="Super Builder Backend")

# Allow all origins for simplicity (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/session")
def create_session() -> Dict[str, str]:
    """
    Create a new session. Returns a UUID.
    """
    session_id = str(uuid4())
    return {"session_id": session_id}

@app.get("/api/session/{session_id}")
def get_session_state(session_id: str) -> Dict[str, Any]:
    """
    Return the current task list for the given session.
    """
    tasks: List[Dict[str, Any]] = load_tasks()
    return {"tasks": tasks}

@app.post("/api/session/{session_id}/tasks", response_model=Task)
def create_task(session_id: str, req: CreateTaskRequest) -> Task:
    """
    Create a new task and add it to the tasks list.
    """
    tasks: List[Dict[str, Any]] = load_tasks()
    new_id = max([task["id"] for task in tasks], default=0) + 1
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
def run_task(session_id: str, task_id: int):
    """
    Run one step of the specified task using the autonomous agent.
    """
    tasks: List[Dict[str, Any]] = load_tasks()
    task_data: Optional[Dict[str, Any]] = next((t for t in tasks if t["id"] == task_id), None)
    if task_data is None:
        raise HTTPException(status_code=404, detail="Task not found")
    agent = get_agent()
    # Perform a single-step execution for safety.
    updated_task = agent.execute_task(task_data)
    # Update tasks list
    for i, t in enumerate(tasks):
        if t["id"] == task_id:
            tasks[i] = updated_task
            break
    save_tasks(tasks)
    return updated_task

@app.get("/api/session/{session_id}/tasks/{task_id}", response_model=Task)
def get_task(session_id: str, task_id: int) -> Task:
    """
    Return a specific task by ID.
    """
    tasks: List[Dict[str, Any]] = load_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)
