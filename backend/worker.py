import time
import logging
import traceback
from .storage import load_tasks, upsert_task
from .agents.claude_agent import get_agent

logger = logging.getLogger(__name__)

def run_worker_loop(poll_seconds: int = 5):
    """
    Continuous worker loop that picks up tasks and executes them.
    It looks for tasks with status 'queued' or 'in_progress'.
    """
    logger.info("Worker started. Polling for tasks...")
    agent = get_agent()

    while True:
        try:
            tasks = load_tasks()
            # Sort by created_at to process oldest first, or prioritize in_progress
            # Simple priority: in_progress first, then queued.

            target_task = None

            # 1. Continue in_progress tasks
            for task in tasks:
                if task.status == "in_progress":
                    target_task = task
                    break

            # 2. Pick up queued tasks
            if not target_task:
                for task in tasks:
                    if task.status == "queued":
                        target_task = task
                        break

            if target_task:
                logger.info(f"Processing task {target_task.id}: {target_task.goal[:50]}...")

                # Execute one step (or plan generation)
                task_dict = target_task.dict()
                updated_dict = agent.execute_task(task_dict)

                # Convert back to Task object and save
                # We need to be careful with the conversion if fields mismatch,
                # but models.py should handle it.
                from backend.models import Task
                updated_task = Task(**updated_dict)
                upsert_task(updated_task)

                if updated_task.status == "completed":
                    logger.info(f"Task {target_task.id} completed.")
                else:
                    logger.info(f"Task {target_task.id} updated (status: {updated_task.status}).")

                # Sleep briefly to avoid hammering CPU if loop is tight
                time.sleep(1)
            else:
                # No tasks found
                time.sleep(poll_seconds)

        except Exception as e:
            logger.error(f"Worker exception: {e}")
            traceback.print_exc()
            time.sleep(poll_seconds)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_worker_loop()
