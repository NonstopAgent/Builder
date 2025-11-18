"""
Basic backend tests for Super Builder.

These tests assume:
- Backend code lives at backend/main.py
- FastAPI app is named `app` in backend.main
"""
from __future__ import annotations

from typing import Any, Dict

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("BUILDER_AGENT", "super")

from backend.main import app  # noqa: E402

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_task_payload(goal: str = "Test goal", type_: str = "build") -> Dict[str, Any]:
    return {
        "goal": goal,
        "type": type_,
        "project_id": None,
    }


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

def test_health_ok() -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "ok"
    assert "version" in data
    assert "agent" in data
    assert "workspace" in data


# ---------------------------------------------------------------------------
# Tasks (direct /tasks API)
# ---------------------------------------------------------------------------

def test_list_tasks_initial() -> None:
    resp = client.get("/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_create_task_and_fetch() -> None:
    payload = _create_task_payload("Create hello world script", "build")
    resp = client.post("/tasks", json=payload)
    assert resp.status_code == 200
    task = resp.json()
    assert "id" in task
    assert task["goal"] == payload["goal"]
    assert task["status"] in ("queued", "in_progress")

    task_id = task["id"]

    resp2 = client.get(f"/tasks/{task_id}")
    assert resp2.status_code == 200
    fetched = resp2.json()
    assert fetched["id"] == task_id
    assert fetched["goal"] == payload["goal"]


def test_run_task_step_and_plan_generation() -> None:
    payload = _create_task_payload("Generate a simple plan", "build")
    resp = client.post("/tasks", json=payload)
    assert resp.status_code == 200
    task = resp.json()
    task_id = task["id"]

    resp2 = client.post(f"/tasks/{task_id}/run")
    assert resp2.status_code == 200
    updated = resp2.json()

    assert isinstance(updated.get("plan"), list)
    assert len(updated["plan"]) >= 1
    assert updated["status"] in ("in_progress", "completed")

    resp3 = client.get(f"/tasks/{task_id}/steps")
    assert resp3.status_code == 200
    data = resp3.json()
    assert "steps" in data
    assert isinstance(data["steps"], list)


def test_run_task_all_and_logs() -> None:
    payload = _create_task_payload("Run to completion", "build")
    resp = client.post("/tasks", json=payload)
    assert resp.status_code == 200
    task = resp.json()
    task_id = task["id"]

    resp2 = client.post(f"/tasks/{task_id}/run-all")
    assert resp2.status_code == 200
    updated = resp2.json()

    assert updated["status"] in ("completed", "failed")
    assert "logs" in updated
    assert isinstance(updated["logs"], list)

    resp3 = client.get(f"/tasks/{task_id}/logs")
    assert resp3.status_code == 200
    logs = resp3.json()
    assert isinstance(logs, list)


# ---------------------------------------------------------------------------
# File endpoints
# ---------------------------------------------------------------------------

def test_files_list_root() -> None:
    resp = client.get("/files")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if data:
        entry = data[0]
        assert "name" in entry
        assert "type" in entry
        assert "path" in entry


def test_files_read_nonexistent() -> None:
    resp = client.get("/files/content", params={"path": "this-file-does-not-exist.txt"})
    assert resp.status_code in (400, 404)


def test_files_write_and_read_roundtrip() -> None:
    test_filename = "test_backend_roundtrip.txt"
    test_content = "hello from test_backend"

    resp = client.post("/files/content", json={"path": test_filename, "content": test_content})
    assert resp.status_code == 200
    data = resp.json()
    assert data["path"].endswith(test_filename)

    resp2 = client.get("/files/content", params={"path": test_filename})
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["content"] == test_content


# ---------------------------------------------------------------------------
# Session-based endpoints (smoke test)
# ---------------------------------------------------------------------------

def test_session_task_flow() -> None:
    resp = client.post("/session")
    assert resp.status_code == 200
    session_id = resp.json().get("session_id")
    assert session_id

    payload = {"goal": "Session-based task", "type": "build", "project_id": None}
    resp2 = client.post(f"/session/{session_id}/tasks", json=payload)
    assert resp2.status_code == 200
    task = resp2.json()
    task_id = task["id"]

    resp3 = client.post(f"/session/{session_id}/tasks/{task_id}/run")
    assert resp3.status_code == 200

    resp4 = client.get(f"/session/{session_id}/tasks/{task_id}/plan")
    assert resp4.status_code == 200
    plan_data = resp4.json()
    assert "plan" in plan_data

    resp5 = client.get(f"/session/{session_id}/tasks/{task_id}/logs")
    assert resp5.status_code == 200
    logs_data = resp5.json()
    assert "task_logs" in logs_data
    assert "step_logs" in logs_data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
