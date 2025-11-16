import json
from pathlib import Path
from typing import List
from .models import Task

# Path to tasks.json relative to repository root
TASKS_FILE = Path(__file__).resolve().parent.parent / "tasks.json"


def load_tasks() -> List[Task]:
    """Load tasks from tasks.json, returning a list of Task objects."""
    if not TASKS_FILE.exists():
        return []
    with TASKS_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return [Task(**item) for item in data]


def save_tasks(tasks: List[Task]) -> None:
    """Persist tasks back to tasks.json."""
    serialized = [task.dict(by_alias=True) for task in tasks]
    with TASKS_FILE.open("w", encoding="utf-8") as f:
        json.dump(serialized, f, indent=2)
