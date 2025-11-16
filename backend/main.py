"""FastAPI backend for the Super Builder platform.

This module exposes minimal API endpoints for creating sessions,
posting messages and reading session state.  Plans, tools and
autonomy engine will be implemented in later tasks.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pathlib import Path
from typing import List, Optional
import json

app = FastAPI(title="Super Builder Backend", version="0.1.0")

# Path to the tasks.json file relative to this file
TASKS_PATH = Path(__file__).resolve().parents[1] / "tasks.json"


class SessionCreate(BaseModel):
    goal: str
    project_id: Optional[str] = None


def read_tasks() -> List[dict]:
    """Read the task list from the tasks.json file.

    Returns an empty list if the file does not exist.
    """
    if not TASKS_PATH.exists():
        return []
    with open(TASKS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def write_tasks(tasks: List[dict]) -> None:
    """Write the task list back to the tasks.json file."""
    with open(TASKS_PATH, "w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)


@app.post("/api/session")
def create_session(request: SessionCreate) -> dict:
    """Create a new build session.

    A session corresponds to a top‑level task in tasks.json.  The goal
    and optional project_id from the request are used to populate the
    new task.  The id is derived by incrementing the maximum existing
    task id.
    """
    tasks = read_tasks()
    new_id = max((task.get("id", 0) for task in tasks), default=0) + 1
    task = {
        "id": new_id,
        "status": "todo",
        "goal": request.goal,
        "project_id": request.project_id,
        "notes": [],
    }
    tasks.append(task)
    write_tasks(tasks)
    return {"session_id": new_id}


@app.post("/api/session/{session_id}/message")
def post_message(session_id: int, message: dict) -> dict:
    """Handle a message for a session.

    Placeholder implementation. In later phases, this endpoint will
    forward messages to the agent, record them in logs and return
    streaming responses.
    """
    # Future implementation will interact with the agent runtime
    return {"acknowledged": True}


@app.get("/api/session/{session_id}/state")
def get_state(session_id: int) -> dict:
    """Retrieve the state for a given session.

    Returns the task dictionary if found; otherwise raises a 404.
    """
    tasks = read_tasks()
    for task in tasks:
        if task.get("id") == session_id:
            return task
    raise HTTPException(status_code=404, detail="Session not found")
