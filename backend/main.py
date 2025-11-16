import os
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.models import (
    CreateTaskRequest,
    Task,
    MessageRequest,
    MessageResponse,
)
from backend.storage import load_tasks, save_tasks, upsert_task
from backend.agents.super_builder import get_agent as get_super_builder_agent
from backend.agents.claude_agent import get_agent as get_claude_agent
from backend.utils.file_ops import list_dir, read_file, WORKSPACE_DIR

APP_VERSION = "0.2.0"

# --------------------------------------------------------------------------- #
# Agent selection
# --------------------------------------------------------------------------- #

AGENT_MODE = os.getenv("BUILDER_AGENT", "super").lower().strip()


def _get_agent():
    """
    Select which agent implementation to use based on BUILDER_AGENT env var.

    BUILDER_AGENT=super   -> backend.agents.super_builder
    BUILDER_AGENT=claude  -> backend.agents.claude_agent
    """
    if AGENT_MODE == "claude":
        return get_claude_agent()
    # default
    return get_super_builder_agent()


# --------------------------------------------------------------------------- #
# FastAPI app
# --------------------------------------------------------------------------- #

app = FastAPI(
    title="Super Builder Backend",
    version=APP_VERSION,
    description=(
        "Task + plan + workspace backend for the Super Builder system. "
        "Supports multiple agent implementations (SuperBuilder / Claude)."
    ),
)

# Allow frontend dev server + Railway etc.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for simple chat per session
SESSIONS_STORE: Dict[str, List[Dict[str, str]]] = {}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _ensure_session(session_id: str) -> None:
    if session_id not in SESSIONS_STORE:
        SESSIONS_STORE[session_id] = []


def _find_task(task_id: int) -> Task:
    tasks = load_tasks()
    for t in tasks:
        if t.id == task_id:
            return t
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


def _update_and_save_task(updated_task: Task) -> Task:
    upsert_task(updated_task)
    return updated_task


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #


@app.get("/health")
def health() -> Dict[str, Any]:
    """
    Simple health check including current agent mode and workspace path.
    """
    return {
        "status": "ok",
        "version": APP_VERSION,
        "agent": AGENT_MODE,
        "workspace": str(WORKSPACE_DIR),
    }


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #


@app.post("/session")
def create_session() -> Dict[str, str]:
    """
    Create a new chat session and return its identifier.
    """
    session_id = str(uuid.uuid4())
    SESSIONS_STORE[session_id] = []
    return {"session_id": session_id}


@app.get("/session/{session_id}")
def get_session_state(session_id: str) -> Dict[str, Any]:
    """
    Return current state for a session.

    Right now this just returns all tasks plus any stored messages.
    In the future you can scope tasks to the session.
    """
    _ensure_session(session_id)
    tasks = load_tasks()
    messages = SESSIONS_STORE.get(session_id, [])
    return {
        "session_id": session_id,
        "tasks": [t.dict(by_alias=True) for t in tasks],
        "messages": messages,
    }


# --------------------------------------------------------------------------- #
# Tasks
# --------------------------------------------------------------------------- #


@app.post("/session/{session_id}/tasks", response_model=Task)
def create_task(session_id: str, request: CreateTaskRequest) -> Task:
    """
    Create a new task associated with this session.

    For now tasks are global; the session_id is recorded in logs only.
    """
    _ensure_session(session_id)
    tasks = load_tasks()
    next_id = max((t.id for t in tasks), default=0) + 1

    task = Task(
        id=next_id,
        type=request.type,
        goal=request.goal,
        project_id=request.project_id,
        status="queued",
        plan=[],
        logs=[f"[session:{session_id}] Task created."],
    )
    tasks.append(task)
    save_tasks(tasks)
    return task


@app.get("/session/{session_id}/tasks/{task_id}", response_model=Task)
def get_task(session_id: str, task_id: int) -> Task:
    _ensure_session(session_id)
    return _find_task(task_id)


@app.post("/session/{session_id}/tasks/{task_id}/run", response_model=Task)
def run_task_once(session_id: str, task_id: int) -> Task:
    """
    Run a single planning/execution step on the task using the selected agent.
    """
    _ensure_session(session_id)
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict(by_alias=True)
    updated_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**updated_payload)
    return _update_and_save_task(updated_task)


@app.post("/session/{session_id}/tasks/{task_id}/run_all", response_model=Task)
def run_task_all(session_id: str, task_id: int) -> Task:
    """
    Run the task until completion, calling the agent in a loop.
    """
    _ensure_session(session_id)
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict(by_alias=True)
    while task_payload.get("status") not in ("completed", "failed"):
        task_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**task_payload)
    return _update_and_save_task(updated_task)


@app.get("/session/{session_id}/tasks/{task_id}/plan")
def get_task_plan(session_id: str, task_id: int) -> Dict[str, Any]:
    _ensure_session(session_id)
    task = _find_task(task_id)
    return {"plan": [step.dict() for step in task.plan]}


@app.get("/session/{session_id}/tasks/{task_id}/logs")
def get_task_logs(session_id: str, task_id: int) -> Dict[str, Any]:
    _ensure_session(session_id)
    task = _find_task(task_id)

    step_logs: List[Dict[str, Any]] = []
    for idx, step in enumerate(task.plan):
        step_logs.append(
            {
                "step_index": idx,
                "description": step.description,
                "status": step.status,
                "logs": step.logs,
                "error": step.error,
            }
        )

    return {
        "task_id": task.id,
        "task_logs": task.logs,
        "step_logs": step_logs,
    }


# --------------------------------------------------------------------------- #
# Simple Chat
# --------------------------------------------------------------------------- #


@app.post("/session/{session_id}/message", response_model=MessageResponse)
def send_message(session_id: str, request: MessageRequest) -> MessageResponse:
    """
    Simple echo-style chat endpoint. This is intentionally basic; the
    main intelligence lives in the agents that operate on tasks.
    """
    _ensure_session(session_id)
    response_text = f"Echo: {request.message}"
    SESSIONS_STORE[session_id].append({"user": request.message, "assistant": response_text})
    return MessageResponse(session_id=session_id, message=request.message, response=response_text)


# --------------------------------------------------------------------------- #
# Workspace / file explorer (read-only)
# --------------------------------------------------------------------------- #


@app.get("/workspace/list")
def list_workspace_dir(path: str = Query("", description="Relative path inside workspace")) -> Dict[str, Any]:
    """
    List a directory inside the workspace. The workspace root is fixed;
    attempts to escape it will raise an error in file_ops.
    """
    try:
        entries = list_dir(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Directory not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"entries": entries}


@app.get("/workspace/file/{file_path:path}")
def read_workspace_file(file_path: str) -> Dict[str, Any]:
    """
    Read the contents of a file from the workspace.
    """
    try:
        content = read_file(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"path": file_path, "content": content}
