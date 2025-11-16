import time
from .storage import load_tasks, upsert_task
from .planner import generate_plan_for_task
from .models import Task

def run_worker_loop(poll_seconds: int = 10):
    """
    Simplistic worker that iterates over tasks once per poll interval.
    Generates a plan for any 'todo' task, marks it done, and writes it back.
    """
    while True:
        tasks = load_tasks()
        for task in tasks:
            if task.status == "todo":
                task.plan = generate_plan_for_task(task)
                task.status = "done"
                upsert_task(task)
        time.sleep(poll_seconds)
