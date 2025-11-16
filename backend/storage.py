import json
from pathlib import Path
from typing import List, Optional
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
    serialized = [task.dict() for task in tasks]
    with TASKS_FILE.open("w", encoding="utf-8") as f:
        json.dump(serialized, f, indent=2)

def get_task_by_id(task_id: int) -> Optional[Task]:
    """Return a Task by its ID or None if not found."""
    tasks = load_tasks()
    for task in tasks:
        if task.id == task_id:
            return task
    return None

def upsert_task(task: Task) -> None:
    """Update a task if it exists or append it otherwise."""
    tasks = load_tasks()
    updated = False
    for idx, existing in enumerate(tasks):
        if existing.id == task.id:
            tasks[idx] = task
            updated = True
            break
    if not updated:
        tasks.append(task)
    save_tasks(tasks)
