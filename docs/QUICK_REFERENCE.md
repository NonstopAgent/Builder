# Super Builder – Quick Reference

This is your **cheat sheet** for how the updated Super Builder system works.

---

## 1. High-Level Overview

Super Builder is a small, focused stack that gives you:

- A **FastAPI backend** that manages:
  - Tasks (goals, plans, steps, logs)
  - Session-based chat (simple)
  - Workspace / file explorer (read/write)
- A **pluggable AI agent layer**:
  - `super_builder` agent (original)
  - `ClaudeAgent` (new) – uses Anthropic Claude with real file tools
- A **React frontend** that talks to the backend via:
  - `frontend/src/api/tasks.ts`
  - `frontend/src/api/files.ts`

You can switch which agent powers the system with an environment variable.

---

## 2. Key Environment Variables

Set these in `.env`:

```env
# Which agent to use:
#   super  -> legacy Super Builder agent
#   claude -> new ClaudeAgent (file tools + planning)
BUILDER_AGENT=claude

# Required when using ClaudeAgent
ANTHROPIC_API_KEY=sk-ant-...

# Optional override for the Claude model
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

---

## 3. Backend Entry Point

**File:** `backend/main.py`
**App:** `FastAPI` app named `app`

Run locally:

```bash
uvicorn backend.main:app --reload
```

Health check:

```bash
GET /health
```

Returns:

```json
{
  "status": "ok",
  "version": "0.2.0",
  "agent": "claude",
  "workspace": "/app/workspace"
}
```

---

## 4. Task Model (Conceptual)

A `Task` represents a single goal + multi-step plan.

Rough shape (simplified):

```ts
type Step = {
  description: string;
  status: "pending" | "completed" | "failed";
  logs: string[];
  error: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

type Task = {
  id: number;
  type: "build" | "fix" | "explore" | string;
  goal: string;
  project_id?: string | null;
  status: "queued" | "in_progress" | "completed" | "failed";
  plan: Step[];
  current_step: number | null;
  logs: string[];
  created_at: string;
  updated_at: string;
};
```

---

## 5. Backend Task Endpoints (Direct, No Session Required)

These are the main endpoints used by the frontend.

### List all tasks

```http
GET /tasks
```

Returns: `Task[]`

---

### Create a task

```http
POST /tasks
Content-Type: application/json

{
  "goal": "Create a Python script that prints 'Hello World'",
  "type": "build",
  "project_id": null
}
```

Returns: `Task` (status = `"queued"`)

The first time you **run** the task, the agent will generate a **plan**.

---

### Get a single task

```http
GET /tasks/{task_id}
```

Returns: `Task`

---

### Run one step of a task

```http
POST /tasks/{task_id}/run
```

Behavior:

* If the task has **no plan yet**:

  * Agent (e.g., Claude) generates a multi-step plan
  * `current_step` set to `0`
  * `status = "in_progress"`
* If a plan exists:

  * Executes the **current step** (with real tools in `ClaudeAgent`)
  * Marks that step `completed`
  * Moves `current_step` to the next step
  * Marks task `completed` when all steps are done

Returns: updated `Task`

---

### Run a task until completion

```http
POST /tasks/{task_id}/run-all
```

* Loops calling the agent until `status` is `"completed"` or `"failed"`
* Good for one-off, fire-and-forget tasks

Returns: final `Task`

---

### Run all pending tasks

```http
POST /tasks/run-all
```

* Finds tasks with status `"queued"` or `"in_progress"`
* Runs each to completion via the agent loop
* Returns a small summary JSON

---

### Get task steps (plan only)

```http
GET /tasks/{task_id}/steps
```

Returns:

```json
{
  "task_id": 1,
  "steps": [ /* Step[] */ ]
}
```

---

### Get task logs (combined)

```http
GET /tasks/{task_id}/logs
```

Returns:

```json
[
  "Log line 1",
  "...",
  "--- Step 1: Description ---",
  "step log...",
  "ERROR: ...",
  "--- Step 2: ... ---"
]
```

This flattens task logs and each step’s logs for easy display.

---

## 6. Session-Based Task Endpoints (Legacy)

These add `/session/{session_id}/...` in front of the same basic operations:

* `POST /session/{session_id}/tasks`
* `GET /session/{session_id}/tasks/{task_id}`
* `POST /session/{session_id}/tasks/{task_id}/run`
* `POST /session/{session_id}/tasks/{task_id}/run_all`
* `GET /session/{session_id}/tasks/{task_id}/plan`
* `GET /session/{session_id}/tasks/{task_id}/logs`

There’s also a simple chat endpoint:

```http
POST /session/{session_id}/message
```

This is mostly a toy echo chat for now.

---

## 7. Workspace / File APIs

Workspace root is defined in `backend.utils.file_ops.WORKSPACE_DIR`.

### List files (simple explorer)

```http
GET /files?path=relative/path
```

Returns:

```json
[
  {
    "name": "backend",
    "type": "dir",
    "path": "backend"
  },
  {
    "name": "requirements.txt",
    "type": "file",
    "path": "requirements.txt"
  }
]
```

---

### Read file contents

```http
GET /files/content?path=backend/main.py
```

Returns:

```json
{
  "path": "backend/main.py",
  "content": "..."
}
```

---

### Write file contents

```http
POST /files/content
Content-Type: application/json

{
  "path": "backend/main.py",
  "content": "new file content here"
}
```

Returns:

```json
{
  "path": "backend/main.py",
  "content": "new file content here"
}
```

---

## 8. Frontend API Helpers

**File:** `frontend/src/api/tasks.ts`

Available functions:

* `fetchTasks(): Promise<Task[]>`
* `createTask(payload: { goal, type, projectId? }): Promise<Task>`
* `runTaskStep(taskId): Promise<Task>`
* `runTaskToCompletion(taskId): Promise<Task>`
* `runAllTasks(): Promise<void>`
* `fetchTaskSteps(taskId): Promise<Step[]>`
* `fetchTaskLogs(taskId): Promise<string[]>`

**File:** `frontend/src/api/files.ts`

Available functions:

* `listFiles(path?: string): Promise<FileEntry[]>`
* `readFile(path: string): Promise<FileContent>`
* `writeFile(path: string, content: string): Promise<FileContent>`

---

## 9. Typical Workflow

1. **Create a task**

   ```ts
   const task = await createTask({ goal: "Scaffold a FastAPI app", type: "build" });
   ```

2. **Generate plan**

   ```ts
   const planned = await runTaskStep(task.id);
   // planned.plan now has steps, planned.current_step = 0
   ```

3. **Execute each step (manual control)**

   ```ts
   let current = planned;
   while (current.status !== "completed" && current.status !== "failed") {
     current = await runTaskStep(current.id);
   }
   ```

   Or just:

   ```ts
   const finished = await runTaskToCompletion(task.id);
   ```

4. **Inspect logs + steps**

   ```ts
   const steps = await fetchTaskSteps(task.id);
   const logs = await fetchTaskLogs(task.id);
   ```

5. **Browse generated files**

   ```ts
   const files = await listFiles("");
   const fileContent = await readFile("backend/main.py");
   ```

That’s the system in a nutshell.
