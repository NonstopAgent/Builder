import json
from pathlib import Path
from typing import List
from .models import Task, Project

# Path to tasks.json relative to repository root
TASKS_FILE = Path(__file__).resolve().parent.parent / "tasks.json"
PROJECTS_FILE = Path(__file__).resolve().parent.parent / "projects.json"


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
        json.dump(serialized, f, indent=2, default=str)


def upsert_task(task: Task) -> None:
    """Update an existing task or insert it if it doesn't exist."""
    tasks = load_tasks()

    for idx, existing in enumerate(tasks):
        if existing.id == task.id:
            tasks[idx] = task
            break
    else:
        tasks.append(task)

    save_tasks(tasks)


def load_projects() -> List[Project]:
    """Load projects from projects.json, returning a list of Project objects."""
    if not PROJECTS_FILE.exists():
        return []
    try:
        with PROJECTS_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return [Project(**item) for item in data]
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def save_projects(projects: List[Project]) -> None:
    """Persist projects back to projects.json."""
    serialized = [project.dict(by_alias=True) for project in projects]
    with PROJECTS_FILE.open("w", encoding="utf-8") as f:
        json.dump(serialized, f, indent=2, default=str)


def upsert_project(project: Project) -> None:
    """Update an existing project or insert it if it doesn't exist."""
    projects = load_projects()

    for idx, existing in enumerate(projects):
        if existing.id == project.id:
            projects[idx] = project
            break
    else:
        projects.append(project)

    save_projects(projects)
