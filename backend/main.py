from fastapi import FastAPI, HTTPException
from typing import List
from .models import Task, CreateTaskRequest, MessageRequest, MessageResponse
from .storage import load_tasks, save_tasks, get_task_by_id, upsert_task
import uuid

app = FastAPI(title="Super Builder Agent Backend", version="0.1.0")

@app.get("/health", summary="Health check")
async def health():
    return {"status": "ok"}

# Task APIs

@app.get("/tasks", response_model=List[Task])
async def list_tasks():
    """Return all tasks in tasks.json."""
    return load_tasks()

@app.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: int):
    task = get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/tasks", response_model=Task)
async def create_task(req: CreateTaskRequest):
    """Create a new task with the next available ID."""
    tasks = load_tasks()
    next_id = (max((t.id for t in tasks), default=0) + 1)
    task = Task(id=next_id, status="todo", goal=req.goal, notes=req.notes)
    tasks.append(task)
    save_tasks(tasks)
    return task

@app.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: int, task: Task):
    """Update an existing task. ID in body must match path."""
    if task.id != task_id:
        raise HTTPException(status_code=400, detail="Task ID mismatch")
    upsert_task(task)
    return task

# Session/Chat endpoints

sessions_store = {}

@app.post("/session", response_model=dict)
async def create_session():
    """Start a new chat session."""
    session_id = str(uuid.uuid4())
    sessions_store[session_id] = []
    return {"session_id": session_id}

@app.post("/session/{session_id}/message", response_model=MessageResponse)
async def send_message(session_id: str, req: MessageRequest):
    """Echo back the user's message (stub)."""
    if session_id not in sessions_store:
        raise HTTPException(status_code=404, detail="Session not found")
    message = req.message
    # TODO: integrate with agent and planner
    response = f"Echo: {message}"
    sessions_store[session_id].append({"user": message, "assistant": response})
    return MessageResponse(session_id=session_id, message=message, response=response)
