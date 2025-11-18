# Super Builder – Update Installation Guide

This guide explains how to install and use the latest Super Builder updates, including the new Claude-powered agent and enhanced task/file APIs.

---

## 1. Prerequisites

You should already have:

- A working clone of the Super Builder project
- Python 3.9+ (or similar)
- Node.js + npm (for the frontend)
- A virtual environment (recommended) in `venv/`
- Anthropic API key (if you want to use Claude)

---

## 2. Files Included in This Update

The update bundle typically contains:

- `backend_main.py`  
  → New backend entry, becomes `backend/main.py`
- `claude_agent.py`  
  → New Claude-powered agent, becomes `backend/agents/claude_agent.py`
- `frontend_api_tasks.ts`  
  → New frontend task API, becomes `frontend/src/api/tasks.ts`
- `frontend_api_files.ts`  
  → New frontend file API, becomes `frontend/src/api/files.ts`
- `install_updates.sh`  
  → Helper script to apply updates
- `UPDATES.md`  
  → Detailed changelog and technical notes
- `QUICK_REFERENCE.md`  
  → High-level usage cheat sheet

---

## 3. Applying the Update (Recommended: Script Method)

### Step 1 – Copy files into project root

Place all of the following update files in the **project root** (same directory as `requirements.txt`):

- `backend_main.py`
- `claude_agent.py`
- `frontend_api_tasks.ts`
- `frontend_api_files.ts`
- `install_updates.sh`
- `UPDATES.md`
- `QUICK_REFERENCE.md`

You should see something like:

```text
.
├── backend/
├── frontend/
├── requirements.txt
├── install_updates.sh
├── backend_main.py
├── claude_agent.py
├── frontend_api_tasks.ts
├── frontend_api_files.ts
└── ...
```

### Step 2 – Make the script executable

```bash
chmod +x install_updates.sh
```

### Step 3 – Run the script

```bash
./install_updates.sh
```

What the script does:

1. **Creates a backup** folder (e.g. `backup_20251117_153012`) and copies:

   * `backend/main.py`
   * `backend/agents/claude_agent.py`
   * `frontend/src/api/tasks.ts`
   * `frontend/src/api/files.ts`
2. **Copies new files** into place:

   * `backend_main.py` → `backend/main.py`
   * `claude_agent.py` → `backend/agents/claude_agent.py`
   * `frontend_api_tasks.ts` → `frontend/src/api/tasks.ts`
   * `frontend_api_files.ts` → `frontend/src/api/files.ts`
3. **Checks Python dependencies**:

   * Attempts to install/update the `anthropic` package.
4. **Checks `.env` file**:

   * If `.env` doesn’t exist but `.env.example` does, it copies the template.
   * Warns if `ANTHROPIC_API_KEY` is missing.
5. **Verifies installation**:

   * Confirms that all updated files exist.

If anything fails, you still have the old versions in the `backup_...` directory.

---

## 4. Manual Installation (If You Prefer Not to Use the Script)

If you want to perform the update by hand:

1. **Backup existing files**:

   ```bash
   mkdir backup_manual
   cp backend/main.py backup_manual/main.py.bak
   cp backend/agents/claude_agent.py backup_manual/claude_agent.py.bak 2>/dev/null || true
   cp frontend/src/api/tasks.ts backup_manual/tasks.ts.bak 2>/dev/null || true
   cp frontend/src/api/files.ts backup_manual/files.ts.bak 2>/dev/null || true
   ```

2. **Copy new files**:

   ```bash
   cp backend_main.py backend/main.py
   mkdir -p backend/agents
   cp claude_agent.py backend/agents/claude_agent.py

   mkdir -p frontend/src/api
   cp frontend_api_tasks.ts frontend/src/api/tasks.ts
   cp frontend_api_files.ts frontend/src/api/files.ts
   ```

3. **Install/update `anthropic` package**:

   ```bash
   # Activate your venv if you have one
   source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true

   pip install --upgrade anthropic
   ```

4. **Update environment variables**:

   Create or edit `.env` in your project root:

   ```env
   BUILDER_AGENT=claude           # or super, if you want the original agent
   ANTHROPIC_API_KEY=sk-ant-...   # required for ClaudeAgent
   ANTHROPIC_MODEL=claude-3-5-sonnet-latest
   ```

---

## 5. Starting the System

### Backend

From the project root:

```bash
# Activate venv if needed
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null || true

uvicorn backend.main:app --reload
```

Verify:

```bash
curl http://localhost:8000/health
```

Expected JSON (example):

```json
{
  "status": "ok",
  "version": "0.2.0",
  "agent": "claude",
  "workspace": "/path/to/workspace"
}
```

### Frontend

From the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

---

## 6. Quick Functional Test

### 6.1 Create a task

```bash
curl -X POST http://localhost:8000/tasks \
  -H "Content-Type: application/json" \
  -d '{"goal": "Create a Python script that prints "Hello World"","type":"build"}'
```

You should get back a `Task` JSON with status `"queued"`.

### 6.2 Plan the task

```bash
curl -X POST http://localhost:8000/tasks/1/run
```

After this call, the task should have:

* `status`: `"in_progress"`
* A `plan` array with several steps
* `current_step`: `0`

### 6.3 Execute all steps

```bash
curl -X POST http://localhost:8000/tasks/1/run-all
```

When finished, the task should have:

* `status`: `"completed"` (or `"failed"` if something went wrong)
* All steps marked `"completed"`

### 6.4 Inspect generated files

Use the file endpoints:

```bash
curl "http://localhost:8000/files?path="
curl "http://localhost:8000/files/content?path=some/file.py"
```

---

## 7. Troubleshooting

* **Backend won’t start / import error**
  Check that `backend/main.py` and `backend/agents/claude_agent.py` were copied correctly.

* **Claude not working / fallback mode**
  Ensure:

  * `anthropic` Python package is installed.
  * `ANTHROPIC_API_KEY` is set and valid.
  * `BUILDER_AGENT=claude` in `.env`.

* **Frontend errors calling backend**
  Confirm the backend URL in your frontend `apiClient` configuration, and make sure CORS is allowed (the backend currently allows `*`).

---

## 8. Where to Learn More

* **`UPDATES.md`** – Detailed description of new features and behavior.
* **`QUICK_REFERENCE.md`** – Day-to-day usage cheat sheet (endpoints, workflows).
* **Backend source** – `backend/main.py`, `backend/agents/claude_agent.py`
* **Frontend API** – `frontend/src/api/tasks.ts`, `frontend/src/api/files.ts`

---

**Need help?**
Use the Quick Reference as your day-to-day guide, and `UPDATES.md` if you need deeper technical context while working in Codex.
