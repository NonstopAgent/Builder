from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid

from .storage import load_tasks, save_tasks

app = FastAPI(title="Super Builder Backend")

class MessageRequest(BaseModel):
    message: dict

@app.post("/api/session")
def create_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

@app.get("/api/session/{session_id}")
def get_session_state(session_id: str):
    tasks = load_tasks()
    return {"tasks": tasks}

@app.post("/api/session/{session_id}/message")
def post_message(session_id: str, req: MessageRequest):
    # Placeholder: store or forward message
    return {"status": "received", "message": req.message}
