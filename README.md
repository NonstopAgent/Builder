# Super Builder

Super Builder is an experiment exploring how autonomous agents can plan and execute
multi-step software tasks. The project currently contains a small FastAPI backend
that stores tasks, generates a simple plan, and executes the plan one step at a time.
The frontend and autonomy engine have not been implemented yet.

## Repository structure

| Path | Description |
| --- | --- |
| `backend/` | FastAPI backend, Pydantic models, agents, and persistence helpers. |
| `plans/` | Placeholder directory where future high-level plans will be stored. |
| `workspace/` | Scratch space for generated files or experiment artifacts. |
| `tasks.json` | Simple JSON document describing the high-level project roadmap. |

## Running the backend

1. Create a Python 3.10+ virtual environment and install dependencies:
   ```bash
   pip install fastapi uvicorn pydantic
   ```
2. Start the API server:
   ```bash
   uvicorn backend.main:app --reload
   ```
3. Use your favorite HTTP client to call the endpoints:
   - `POST /api/session` to start a new session.
   - `POST /api/session/{session_id}/tasks` to create a task.
   - `POST /api/session/{session_id}/tasks/{task_id}/run` to run one step.
   - `GET /api/session/{session_id}/tasks/{task_id}/plan` to inspect the plan.

The backend persists tasks in `tasks.json`. Because the current agent is a stub,
each run simply completes the next step in a three-step plan derived from the task goal.
