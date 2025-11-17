# Super Builder Updates – November 2025

This document describes the key changes introduced in the latest Super Builder update.

---

## 1. New Claude-Powered Agent (`ClaudeAgent`)

**File:** `backend/agents/claude_agent.py`

### What it does

- Uses **Anthropic Claude** (e.g., `claude-3-5-sonnet-latest`) to:
  - Break a task `goal` into a **multi-step plan**
  - Execute each step with **real file tools**
  - Log rich, human-readable progress to the task and steps
- Has robust fallbacks when the Anthropic client or API key is missing:
  - Uses a simple static 3-step plan
  - Still allows tasks to run without remote calls

### Key behaviors

- First call to `execute_task(task)` when `task.plan` is empty:
  - Calls Claude to create 3–7 steps
  - Stores them under `task.plan`
  - Sets `current_step = 0`, `status = "in_progress"`
- Subsequent calls:
  - Executes one step at a time
  - Updates `step.status`, `step.logs`, `step.metadata`
  - Advances `current_step` until the task is `completed`

### File tools

Within `_execute_step_with_tools`:

- **Create file**:
  - If step description mentions creating a file, Claude generates full file contents.
  - File name is extracted from the description via regex.
  - Uses `write_file` from `backend.utils.file_ops`.
- **Read file**:
  - If step describes reading a file, it loads content and stores a preview.
- **List workspace**:
  - If step describes listing/exploring workspace, it uses `list_dir("")` and stores a short summary.

If none of the above match, Claude provides high-level guidance text for the step.

---

## 2. Agent Selection via `BUILDER_AGENT`

**File:** `backend/main.py`

New environment-controlled agent selection:

```python
AGENT_MODE = os.getenv("BUILDER_AGENT", "super").lower().strip()

def _get_agent():
    if AGENT_MODE == "claude":
        return get_claude_agent()
    return get_super_builder_agent()
```

* `BUILDER_AGENT=super` → existing Super Builder agent
* `BUILDER_AGENT=claude` → new `ClaudeAgent`

Reported in:

```http
GET /health
```

Response includes: `"agent": "super"` or `"agent": "claude"`.

---

## 3. Direct Task API (Sessionless)

Previously, tasks were primarily used via session-scoped endpoints.
Now there is a cleaner **direct** task API:

### New endpoints

* `GET /tasks` → list all tasks
* `POST /tasks` → create a task
* `GET /tasks/{task_id}` → get a task
* `POST /tasks/{task_id}/run` → run one step
* `POST /tasks/{task_id}/run-all` → run until completion
* `POST /tasks/run-all` → run all pending tasks
* `GET /tasks/{task_id}/steps` → get the plan
* `GET /tasks/{task_id}/logs` → get combined logs

These endpoints make it much easier for the frontend (and tools like Codex) to manage tasks without having to create or track sessions.

The **legacy** session-based endpoints still exist:

* `/session/{session_id}/tasks/...`
* `/session/{session_id}/message`

So existing workflows don’t break.

---

## 4. Unified File API for Frontend

New file API endpoints:

* `GET /files?path=...`
  → Returns a flat list of entries with `name`, `type`, `path`.
* `GET /files/content?path=...`
  → Returns `{ path, content }`.
* `POST /files/content` with `{ path, content }`
  → Writes file and echoes back `{ path, content }`.

Frontend helpers:

* **File:** `frontend/src/api/files.ts`

  * `listFiles(path?: string): Promise<FileEntry[]>`
  * `readFile(path: string): Promise<FileContent>`
  * `writeFile(path: string, content: string): Promise<FileContent>`

This gives the UI a simple way to:

* Display a workspace tree / file list
* Open files in an editor
* Save changes back to the workspace

---

## 5. Updated Frontend Task API

**File:** `frontend/src/api/tasks.ts`

The tasks API on the frontend now maps directly to the new backend endpoints:

* `fetchTasks()` → `GET /tasks`
* `createTask()` → `POST /tasks`
* `runTaskStep()` → `POST /tasks/{id}/run`
* `runTaskToCompletion()` → `POST /tasks/{id}/run-all`
* `runAllTasks()` → `POST /tasks/run-all`
* `fetchTaskSteps()` → `GET /tasks/{id}/steps`
* `fetchTaskLogs()` → `GET /tasks/{id}/logs`

This simplifies the frontend data flow and avoids mixing in session-specific logic.

---

## 6. Installation Helper Script

**File:** `install_updates.sh`

A new script is included to make applying these updates easier:

* Creates a backup directory (`backup_YYYYMMDD_HHMMSS`)
* Copies:

  * `backend_main.py` → `backend/main.py`
  * `claude_agent.py` → `backend/agents/claude_agent.py`
  * `frontend_api_tasks.ts` → `frontend/src/api/tasks.ts`
  * `frontend_api_files.ts` → `frontend/src/api/files.ts`
* Optionally installs/updates the `anthropic` Python package
* Ensures `.env` exists and warns if `ANTHROPIC_API_KEY` is missing
* Verifies that all key files exist after the update

Run it from the project root:

```bash
chmod +x install_updates.sh
./install_updates.sh
```

---

## 7. Backwards Compatibility & Fallbacks

* If **Anthropic is not installed** or `ANTHROPIC_API_KEY` is missing:

  * `ClaudeAgent` logs a warning and switches to fallback mode.
  * It uses static, simple plans and avoids API calls.
* If you want the original behavior:

  * Set `BUILDER_AGENT=super` and restart the backend.

---

## 8. Recommended Usage

1. Configure `.env`:

   ```env
   BUILDER_AGENT=claude
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Run the install script:

   ```bash
   ./install_updates.sh
   ```

3. Restart backend & frontend.

4. Create tasks via the UI or:

   ```bash
   curl -X POST http://localhost:8000/tasks \
     -H "Content-Type: application/json" \
     -d '{"goal": "Create a Python script that prints "Hello World"","type":"build"}'
   ```

5. Run tasks and inspect generated files + logs.

The system is now ready for **real development workflows**: planning, code generation, file edits, and step-by-step execution via Claude.
