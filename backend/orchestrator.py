import os
from typing import Any, Dict, List, Literal, Optional

import httpx
from fastapi import HTTPException
from pydantic import BaseModel

OPENAI_URL = "https://api.openai.com/v1/chat/completions"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


class ConversationMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class AgentOrchestrationResponse(BaseModel):
    mode: Literal["simple", "collab"]
    reply: str
    log: Optional[str] = None


async def orchestrate(messages: List[ConversationMessage]) -> AgentOrchestrationResponse:
    if not messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    user_message = messages[-1].content

    async with httpx.AsyncClient(timeout=60) as client:
        intent = await _detect_intent(user_message, openai_key, client)

        if intent == "simple":
            reply = await _openai_chat(messages, openai_key, client)
            return AgentOrchestrationResponse(mode="simple", reply=reply)

        collab = await _collaborative_build(messages, openai_key, client)
        return AgentOrchestrationResponse(mode="collab", reply=collab["final"], log=collab["log"])


async def _detect_intent(user_text: str, openai_key: str, client: httpx.AsyncClient) -> str:
    payload = {
        "model": "gpt-4.1-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an intent detector. Reply with exactly one word: 'simple' if the user is just "
                    "chatting or asking a question, or 'build' if the user is asking to build/create/design "
                    "code, apps, games, agents, or multi-step projects."
                ),
            },
            {"role": "user", "content": user_text},
        ],
    }

    response = await client.post(
        OPENAI_URL,
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    raw = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip().lower()
    return "build" if "build" in raw else "simple"


async def _openai_chat(
    messages: List[ConversationMessage], openai_key: str, client: httpx.AsyncClient
) -> str:
    payload = {
        "model": "gpt-4.1",
        "messages": [m.model_dump() for m in messages],
    }

    response = await client.post(
        OPENAI_URL,
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "No response.")


async def _collaborative_build(
    messages: List[ConversationMessage], openai_key: str, client: httpx.AsyncClient
) -> Dict[str, Any]:
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not configured")

    user_message = messages[-1].content

    plan = await _openai_plan_for_claude(user_message, openai_key, client)
    claude_notes = await _claude_review_plan(user_message, plan, anthropic_key, client)
    final_reply = await _openai_final_build(user_message, plan, claude_notes, openai_key, client)

    log = f"--- PLAN (ChatGPT) ---\n{plan}\n\n--- CLAUDE NOTES ---\n{claude_notes}".strip()

    return {"final": final_reply, "log": log}


async def _openai_plan_for_claude(
    user_message: str, openai_key: str, client: httpx.AsyncClient
) -> str:
    payload = {
        "model": "gpt-4.1",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the primary architect AI. Create a clear step-by-step plan plus a short brief for "
                    "another AI reviewer. Keep the structure crisp and actionable."
                ),
            },
            {"role": "user", "content": user_message},
        ],
    }

    response = await client.post(
        OPENAI_URL,
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


async def _claude_review_plan(
    user_message: str, plan: str, anthropic_key: str, client: httpx.AsyncClient
) -> str:
    payload = {
        "model": "claude-3-5-sonnet-latest",
        "max_tokens": 4096,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are Claude, collaborating with another AI to improve their plans. Offer sharp, high-signal "
                    "feedback, spot risks, and propose better architecture."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"User request:\n{user_message}\n\nOriginal plan:\n{plan}\n\nImprove this plan, add missing steps, "
                    "and propose code or architecture strategies."
                ),
            },
        ],
    }

    response = await client.post(
        ANTHROPIC_URL,
        headers={
            "content-type": "application/json",
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
        },
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    return (data.get("content") or [{}])[0].get("text", "")


async def _openai_final_build(
    user_message: str, plan: str, claude_notes: str, openai_key: str, client: httpx.AsyncClient
) -> str:
    payload = {
        "model": "gpt-4.1",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the final builder AI. Use your own plan plus the reviewer notes to produce the best possible "
                    "answer. Include concrete code, folder structures, and step-by-step actions when relevant."
                ),
            },
            {"role": "user", "content": f"User's request:\n{user_message}"},
            {"role": "assistant", "content": f"Your original plan:\n{plan}"},
            {"role": "assistant", "content": f"Reviewer notes:\n{claude_notes}"},
        ],
    }

    response = await client.post(
        OPENAI_URL,
        headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
        json=payload,
    )
    response.raise_for_status()
    data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
