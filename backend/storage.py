"""Helpers for persisting and retrieving task data."""

import json
from pathlib import Path
from typing import Any, Dict, List

TASKS_FILE = Path(__file__).resolve().parent.parent / "tasks.json"


def load_tasks() -> List[Dict[str, Any]]:
    """Load tasks from the tasks.json file."""

    if TASKS_FILE.exists():
        try:
            with TASKS_FILE.open("r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []


def save_tasks(tasks: List[Dict[str, Any]]) -> None:
    """Persist tasks to the tasks.json file."""

    with TASKS_FILE.open("w", encoding="utf-8") as f:
        json.dump(tasks, f, indent=2)
