import os
import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

from backend.models import (
    AnswerSubmission,
    ClarifyingQuestion,
    CouncilDebateRequest,
    CouncilDebateResult,
    CreateTaskRequest,
    MemoryItem,
    Message,
    MessageRequest,
    MessageResponse,
    RequirementsSession,
    Task,
)
from backend.orchestrator import (
    AgentOrchestrationResponse,
    ConversationMessage,
    orchestrate,
)
from backend.agents.requirements_agent import RequirementsAgent
from backend.agents.council import DevelopmentCouncil
from backend.agents.execution_engine import ExecutionEngine
from backend.storage import load_tasks, save_tasks, upsert_task
from backend.agents.super_builder import get_agent as get_super_builder_agent
from backend.agents.claude_agent import get_agent as get_claude_agent
from backend.utils.file_ops import WORKSPACE_DIR, list_dir, read_file
from uuid import uuid4

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
REQUIREMENTS_SESSIONS: Dict[str, RequirementsSession] = {}
COUNCIL_DEBATES: Dict[str, CouncilDebateResult] = {}
MEMORY_STORE: dict[str, MemoryItem] = {}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _ensure_session(session_id: str) -> None:
    if session_id not in SESSIONS_STORE:
        SESSIONS_STORE[session_id] = []


def _find_task(task_id: str) -> Task:
    tasks = load_tasks()
    for t in tasks:
        if str(t.id) == str(task_id):
            return t
    raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


def _update_and_save_task(updated_task: Task) -> Task:
    upsert_task(updated_task)
    return updated_task


def add_memory_item(
    content: str,
    task_id: str | None = None,
    tags: list[str] | None = None,
    importance: str = "normal",
) -> MemoryItem:
    mem = MemoryItem(
        id=str(uuid4()),
        task_id=task_id,
        content=content,
        tags=tags or [],
        importance=importance,
        created_at=datetime.utcnow(),
        last_used_at=None,
    )
    MEMORY_STORE[mem.id] = mem
    return mem


def list_memory_items(task_id: str | None = None) -> list[MemoryItem]:
    items: Iterable[MemoryItem] = MEMORY_STORE.values()
    if task_id is not None:
        items = [m for m in items if m.task_id == task_id or m.task_id is None]
    return sorted(items, key=lambda m: m.created_at, reverse=True)


def search_memory_items(query: str, task_id: str | None = None) -> list[MemoryItem]:
    query_lower = query.lower()
    items = list_memory_items(task_id=task_id)
    results: list[MemoryItem] = []
    for item in items:
        haystack = " ".join([item.content] + item.tags).lower()
        if query_lower in haystack:
            results.append(item)
    return results


# --------------------------------------------------------------------------- #
# Requirements gathering
# --------------------------------------------------------------------------- #


@app.get("/memory", response_model=List[MemoryItem])
async def get_memory(task_id: Optional[str] = None) -> List[MemoryItem]:
    """
    List memory items. If task_id is provided, return task-specific
    + global items. Otherwise return all memory.
    """

    return list_memory_items(task_id=task_id)


class MemoryCreateRequest(BaseModel):
    task_id: Optional[str] = None
    content: str
    tags: List[str] = []
    importance: str = "normal"


@app.post("/memory", response_model=MemoryItem)
async def create_memory(payload: MemoryCreateRequest = Body(...)) -> MemoryItem:
    """
    Create a new memory item. Used when the user clicks 'Save to memory'
    from the UI.
    """

    mem = add_memory_item(
        content=payload.content,
        task_id=payload.task_id,
        tags=payload.tags,
        importance=payload.importance,
    )
    return mem


class MemorySearchRequest(BaseModel):
    task_id: Optional[str] = None
    query: str


@app.post("/memory/search", response_model=List[MemoryItem])
async def search_memory(payload: MemorySearchRequest) -> List[MemoryItem]:
    """
    Naive text search over memory content + tags.
    """

    return search_memory_items(query=payload.query, task_id=payload.task_id)


@app.post("/requirements/start", response_model=Dict[str, Any])
async def start_requirements_gathering(request: Dict[str, str]):
    """
    Start interactive requirements gathering.
    Returns session ID and initial clarifying questions.
    """

    goal = request.get("goal", "")
    if not goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")

    agent = RequirementsAgent()
    questions = await agent.generate_clarifying_questions(goal)

    session = RequirementsSession(
        session_id=str(uuid.uuid4()),
        initial_goal=goal,
        questions=questions,
        answers=[],
        specification={},
    )

    REQUIREMENTS_SESSIONS[session.session_id] = session

    return {
        "session_id": session.session_id,
        "goal": goal,
        "questions": [q.dict() for q in questions],
        "total_questions": len(questions),
    }


@app.post("/requirements/{session_id}/answer", response_model=Dict[str, Any])
async def submit_answer(session_id: str, submission: AnswerSubmission):
    """
    Submit answer to a requirements question.
    System may generate follow-up questions.
    """

    if session_id not in REQUIREMENTS_SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    session = REQUIREMENTS_SESSIONS[session_id]
    agent = RequirementsAgent()

    result = await agent.process_answer(
        question=submission.question_id, answer=submission.answer, session=session
    )

    session.answers.append(
        {
            "question_id": submission.question_id,
            "answer": submission.answer,
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
    session.specification = result["specification"]

    followup_questions: List[ClarifyingQuestion] = result.get("followup_questions", [])
    if followup_questions:
        session.questions.extend(followup_questions)

    REQUIREMENTS_SESSIONS[session_id] = session

    answered_count = len(session.answers)
    total_count = len(session.questions)

    return {
        "session_id": session_id,
        "specification": session.specification,
        "followup_questions": [q.dict() for q in followup_questions],
        "progress": {
            "answered": answered_count,
            "total": total_count,
            "percentage": (answered_count / total_count * 100) if total_count > 0 else 0,
        },
        "is_complete": answered_count >= total_count,
    }


@app.post("/requirements/{session_id}/finalize", response_model=Dict[str, Any])
async def finalize_requirements(session_id: str):
    """
    Finalize requirements and generate comprehensive PRD.
    """

    if session_id not in REQUIREMENTS_SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    session = REQUIREMENTS_SESSIONS[session_id]
    agent = RequirementsAgent()

    prd = await agent.generate_prd(session)

    return {
        "session_id": session_id,
        "prd": prd,
        "specification": session.specification,
    }


@app.get("/requirements/{session_id}", response_model=Dict[str, Any])
async def get_requirements_session(session_id: str):
    """
    Get current state of requirements gathering session.
    """

    if session_id not in REQUIREMENTS_SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    session = REQUIREMENTS_SESSIONS[session_id]

    return {
        "session_id": session.session_id,
        "goal": session.initial_goal,
        "questions": [q.dict() for q in session.questions],
        "answers": session.answers,
        "specification": session.specification,
        "progress": {
            "answered": len(session.answers),
            "total": len(session.questions),
        },
    }


# --------------------------------------------------------------------------- #
# Council debate
# --------------------------------------------------------------------------- #


@app.post("/council/debate", response_model=Dict[str, Any])
async def start_council_debate(request: CouncilDebateRequest):
    """
    Initiate multi-agent council debate on implementation approach.
    This is a long-running operation that conducts 3 rounds of debate.
    """

    council = DevelopmentCouncil()
    debate_id = str(uuid.uuid4())

    try:
        result = await council.conduct_debate(request.prd)

        COUNCIL_DEBATES[debate_id] = result

        return {
            "debate_id": debate_id,
            "status": "completed",
            "rounds": len(result.rounds),
            "consensus_reached": result.consensus_reached,
            "architecture_document": result.final_architecture,
            "debate_summary": {
                "participating_agents": result.participating_agents,
                "total_opinions": sum(len(r.opinions) for r in result.rounds),
                "key_decisions": result.key_decisions,
            },
        }
    except Exception as exc:  # pragma: no cover - defensive catch for async calls
        raise HTTPException(status_code=500, detail=f"Debate failed: {str(exc)}")


@app.get("/council/debate/{debate_id}", response_model=Dict[str, Any])
async def get_debate_details(debate_id: str):
    """
    Get detailed information about a council debate.
    """

    if debate_id not in COUNCIL_DEBATES:
        raise HTTPException(status_code=404, detail="Debate not found")

    result = COUNCIL_DEBATES[debate_id]

    return {
        "debate_id": debate_id,
        "prd": result.prd,
        "rounds": [
            {
                "round_number": r.round_number,
                "topic": r.topic,
                "opinions": [
                    {
                        "agent": o.agent_role,
                        "proposal": o.proposal,
                        "concerns": o.concerns,
                        "recommendations": o.recommendations,
                        "confidence": o.confidence,
                    }
                    for o in r.opinions
                ],
            }
            for r in result.rounds
        ],
        "final_architecture": result.final_architecture,
        "consensus_reached": result.consensus_reached,
    }


# --------------------------------------------------------------------------- #
# Enhanced Task Creation with Council
# --------------------------------------------------------------------------- #


@app.post("/tasks/create-with-council", response_model=Task)
async def create_task_with_council(request: Dict[str, Any]):
    """
    Create a task with full requirements gathering and council debate.
    This is the "premium" task creation flow.
    """

    if "goal" not in request:
        raise HTTPException(status_code=400, detail="Goal is required")

    if "prd" not in request:
        req_agent = RequirementsAgent()
        questions = await req_agent.generate_clarifying_questions(request["goal"])

        return {
            "step": "requirements",
            "message": "Please answer these questions first",
            "questions": [q.dict() for q in questions],
        }

    council = DevelopmentCouncil()
    debate_result = await council.conduct_debate(request["prd"])

    tasks = load_tasks()
    numeric_ids = [int(t.id) for t in tasks if str(t.id).isdigit()]
    next_id = str(max(numeric_ids) + 1) if numeric_ids else str(uuid.uuid4())

    task = Task(
        id=next_id,
        title=request.get("goal"),
        type=request.get("type", "build"),
        goal=request["goal"],
        status="queued",
        plan=[],
        logs=[
            f"Requirements gathered: {len(request.get('requirements', []))} questions answered",
            f"Council debate completed with {len(debate_result.participating_agents)} agents",
            f"Architecture document generated: {len(debate_result.final_architecture)} characters",
        ],
        metadata={
            "prd": request["prd"],
            "architecture": debate_result.final_architecture,
            "debate_id": str(uuid.uuid4()),
        },
    )

    tasks.append(task)
    save_tasks(tasks)

    return task


# --------------------------------------------------------------------------- #
# Execution status
# --------------------------------------------------------------------------- #


@app.get("/execution/{task_id}/status", response_model=Dict[str, Any])
async def get_execution_status(task_id: str):
    """
    Get real-time execution status with verification results.
    """

    task = _find_task(task_id)

    return {
        "task_id": task_id,
        "status": task.status,
        "current_step": task.current_step,
        "total_steps": len(task.plan),
        "progress_percentage": (task.current_step / len(task.plan) * 100) if task.plan else 0,
        "recent_logs": task.logs[-10:] if task.logs else [],
        "verification_results": task.metadata.get("verification_results", [])
        if hasattr(task, "metadata")
        else [],
    }


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
# AI Orchestration (ChatGPT + Claude)
# --------------------------------------------------------------------------- #


class AgentChatRequest(BaseModel):
    task_id: Optional[str] = None
    messages: List[ConversationMessage]


@app.post("/agent", response_model=AgentOrchestrationResponse)
async def agent_chat(request: AgentChatRequest) -> AgentOrchestrationResponse:
    """
    Smart chat endpoint that routes between simple responses and collaborative
    build flow (OpenAI + Anthropic).

    Now also attaches the conversation and reply to a Task if task_id is provided,
    so chats are persisted across refreshes.
    """
    messages_for_llm: List[ConversationMessage] = []

    if request.task_id is not None:
        task_id_str = str(request.task_id)
        relevant_memory = list_memory_items(task_id=task_id_str)[:10]

        memory_preamble = ""
        if relevant_memory:
            memory_lines = []
            for item in relevant_memory:
                memory_lines.append(f"- {item.content}")
                item.last_used_at = datetime.utcnow()
            memory_preamble = (
                "Here are important notes and context you should remember about this user and task:\n"
                + "\n".join(memory_lines)
                + "\n\n"
            )

        if memory_preamble:
            messages_for_llm.append(
                ConversationMessage(role="system", content=memory_preamble)
            )

    messages_for_llm.extend(request.messages)

    try:
        response = await orchestrate(messages_for_llm)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)

    # ✅ Persist conversation as task memory if we know which task this is for
    if request.task_id is not None:
        tasks = load_tasks()
        for task in tasks:
            if str(task.id) == str(request.task_id):
                # Store the entire conversation plus the latest assistant reply
                task.messages = [
                    Message(**m.model_dump()) for m in request.messages
                ] + [
                    Message(
                        id=str(uuid.uuid4()),
                        role="assistant",
                        content=response.reply,
                        created_at=datetime.utcnow(),
                    )
                ]
                task.updated_at = datetime.utcnow()
                upsert_task(task)
                break

    return response


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
# Direct Task Endpoints (for frontend compatibility)
# --------------------------------------------------------------------------- #


@app.get("/tasks", response_model=List[Task])
async def list_all_tasks(limit: int = Query(30, ge=1, le=100)) -> List[Task]:
    """
    Get up to `limit` tasks ordered by most recently updated.
    """
    tasks = load_tasks()
    tasks.sort(key=lambda t: t.updated_at, reverse=True)
    return tasks[:limit]


@app.post("/tasks", response_model=Task)
def create_task_direct(request: CreateTaskRequest) -> Task:
    """
    Create a new task without requiring a session.
    """
    tasks = load_tasks()

    numeric_ids = [int(t.id) for t in tasks if str(t.id).isdigit()]
    next_id = str(max(numeric_ids) + 1) if numeric_ids else str(uuid.uuid4())

    task = Task(
        id=next_id,
        title=request.goal,
        type=request.type,
        goal=request.goal,
        project_id=request.project_id,
        status="queued",
        plan=[],
        logs=["Task created."],
    )
    tasks.append(task)
    save_tasks(tasks)
    return task


@app.get("/tasks/{task_id}", response_model=Task)
async def get_task_direct(task_id: str) -> Task:
    """
    Get a specific task by ID.
    """
    return _find_task(task_id)


@app.post("/tasks/{task_id}/run", response_model=Task)
def run_task_direct(task_id: str) -> Task:
    """
    Run a single planning/execution step on the task using the selected agent.
    """
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict()
    updated_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**updated_payload)
    return _update_and_save_task(updated_task)


@app.post("/tasks/{task_id}/run-all", response_model=Task)
def run_task_all_direct(task_id: str) -> Task:
    """
    Run the task until completion, calling the agent in a loop.
    """
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict()
    while task_payload.get("status") not in ("completed", "failed"):
        task_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**task_payload)
    return _update_and_save_task(updated_task)


@app.post("/tasks/run-all")
def run_all_tasks() -> Dict[str, Any]:
    """
    Run all pending tasks.
    """
    tasks = load_tasks()
    agent = _get_agent()
    completed = 0

    for task in tasks:
        if task.status in ("queued", "in_progress"):
            task_payload = task.dict()
            while task_payload.get("status") not in ("completed", "failed"):
                task_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
            updated_task = Task(**task_payload)
            _update_and_save_task(updated_task)
            completed += 1

    return {"message": f"Processed {completed} tasks", "total": len(tasks)}


@app.get("/tasks/{task_id}/steps")
def get_task_steps_direct(task_id: str) -> Dict[str, Any]:
    """
    Get the steps/plan for a specific task.
    """
    task = _find_task(task_id)
    return {"task_id": task.id, "steps": [step.dict() for step in task.plan]}


@app.get("/tasks/{task_id}/logs")
def get_task_logs_direct(task_id: str) -> List[str]:
    """
    Get logs for a specific task.
    """
    task = _find_task(task_id)

    # Combine task logs and step logs
    all_logs = list(task.logs)
    for idx, step in enumerate(task.plan):
        all_logs.append(f"\n--- Step {idx + 1}: {step.description} ---")
        all_logs.extend(step.logs)
        if step.error:
            all_logs.append(f"ERROR: {step.error}")

    return all_logs


# --------------------------------------------------------------------------- #
# Session-based Task Endpoints (legacy support)
# --------------------------------------------------------------------------- #


@app.post("/session/{session_id}/tasks", response_model=Task)
def create_task(session_id: str, request: CreateTaskRequest) -> Task:
    """
    Create a new task associated with this session.

    For now tasks are global; the session_id is recorded in logs only.
    """
    _ensure_session(session_id)
    tasks = load_tasks()
    numeric_ids = [int(t.id) for t in tasks if str(t.id).isdigit()]
    next_id = str(max(numeric_ids) + 1) if numeric_ids else str(uuid.uuid4())

    task = Task(
        id=next_id,
        title=request.goal,
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
def get_task(session_id: str, task_id: str) -> Task:
    _ensure_session(session_id)
    return _find_task(task_id)


@app.post("/session/{session_id}/tasks/{task_id}/run", response_model=Task)
def run_task_once(session_id: str, task_id: str) -> Task:
    """
    Run a single planning/execution step on the task using the selected agent.
    """
    _ensure_session(session_id)
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict()
    updated_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**updated_payload)
    return _update_and_save_task(updated_task)


@app.post("/session/{session_id}/tasks/{task_id}/run_all", response_model=Task)
def run_task_all(session_id: str, task_id: str) -> Task:
    """
    Run the task until completion, calling the agent in a loop.
    """
    _ensure_session(session_id)
    task = _find_task(task_id)
    agent = _get_agent()

    task_payload = task.dict()
    while task_payload.get("status") not in ("completed", "failed"):
        task_payload = agent.execute_task(task_payload)  # type: ignore[arg-type]
    updated_task = Task(**task_payload)
    return _update_and_save_task(updated_task)


@app.get("/session/{session_id}/tasks/{task_id}/plan")
def get_task_plan(session_id: str, task_id: str) -> Dict[str, Any]:
    _ensure_session(session_id)
    task = _find_task(task_id)
    return {"plan": [step.dict() for step in task.plan]}


@app.get("/session/{session_id}/tasks/{task_id}/logs")
def get_task_logs(session_id: str, task_id: str) -> Dict[str, Any]:
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


# --------------------------------------------------------------------------- #
# File API endpoints (for frontend file operations)
# --------------------------------------------------------------------------- #


@app.get("/files")
def list_files(path: str = Query("", description="Relative path inside workspace")) -> List[Dict[str, Any]]:
    """
    List files in workspace directory.
    """
    try:
        entries = list_dir(path)
        return [
            {
                "name": e["name"],
                "type": e["type"],
                "path": f"{path}/{e['name']}" if path else e["name"],
            }
            for e in entries
        ]
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Directory not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/files/content")
def read_file_content(path: str = Query(..., description="File path")) -> Dict[str, str]:
    """
    Read file content from workspace.
    """
    try:
        content = read_file(path)
        return {"path": path, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/files/content")
def write_file_content(payload: Dict[str, str]) -> Dict[str, str]:
    """
    Write file content to workspace.
    """
    from backend.utils.file_ops import write_file

    path = payload.get("path")
    content = payload.get("content")

    if not path or content is None:
        raise HTTPException(status_code=400, detail="Missing path or content")

    try:
        write_file(path, content)
        return {"path": path, "content": content}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

