import json
from pathlib import Path

# Path to the tasks.json file relative to this backend directory
TASKS_FILE = Path(__file__).resolve().parent.parent / 'tasks.json'

def load_tasks():
    """
    Load tasks from the tasks.json file.
    Returns an empty list if the file does not exist or the JSON is invalid.
    """
    if TASKS_FILE.exists():
        try:
            with open(TASKS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_tasks(tasks):
    """
    Save tasks to the tasks.json file.
    """
    with open(TASKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, indent=2)
