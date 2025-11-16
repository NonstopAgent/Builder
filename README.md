# Builder – Super Builder Backend & Dashboard

Super Builder is an AI-powered development assistant that:

- Tracks **tasks** and **multi-step plans**
- Uses an **agent** (SuperBuilder or Claude) to execute steps
- Works inside a safe **workspace/** directory
- Exposes a REST **API** via FastAPI
- Provides a React + Vite + Tailwind **dashboard** to control everything

You can run it locally or on Railway, then point ChatGPT / Codex / other tools at it.

---

## Features

- ✅ FastAPI backend with OpenAPI docs (`/docs`)
- ✅ Pluggable agents:
  - `super` – simple agent with static planning
  - `claude` – Anthropic Claude–powered planner
- ✅ Task lifecycle:
  - Create task → plan → execute steps → complete
- ✅ Step-level logs and errors
- ✅ Workspace explorer (safe read-only view of `workspace/`)
- ✅ React dashboard (tasks, logs, chat, workspace)
- ✅ Ready for Railway deployment

---

## Repo Structure

```text
backend/
  agents/
    super_builder.py
    claude_agent.py       # NEW – Claude-powered agent
  models.py
  storage.py
  planner.py
  worker.py
  utils/
    file_ops.py
frontend/
  src/
    App.tsx
    api.ts
  ... (Vite + Tailwind boilerplate)
workspace/
  (created by setup_workspace.py)
tasks.json
requirements.txt
setup_workspace.py
quick_start.sh
.env.example
README.md
RAILWAY_DEPLOY.md
EXAMPLE_TASKS.md
SETUP_CHECKLIST.md
```

---

## Quick Start (Backend Only)

```bash
# 1. Create and activate virtualenv
python3 -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create workspace
python setup_workspace.py

# 4. Create .env from template
cp .env.example .env
# Edit .env and put your ANTHROPIC_API_KEY

# 5. Run backend
uvicorn backend.main:app --reload
```

Now open:

* API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Running the Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Then visit [http://localhost:5173](http://localhost:5173).

You should see:

* “Super Builder” title
* Sidebar with tasks
* “Create Task” form
* Panels for plan, logs, chat, and workspace explorer

---

## Configuration

### Agent selection

Set in `.env`:

```bash
BUILDER_AGENT=claude  # or "super"
```

* `super`  – uses `backend.agents.super_builder`
* `claude` – uses `backend.agents.claude_agent` (Anthropic)

### Anthropic / Claude

```bash
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

If the key or package is missing, ClaudeAgent falls back to a static planner.

---

## Example Workflow

1. Start backend + frontend.

2. Create a new task in the UI:

   * **Type:** `build`
   * **Goal:** `Create a Python script that prints "Hello, world!"`

3. Click **Create Task**, then select it in the sidebar.

4. Click **Run All Steps**:

   * Agent creates a multi-step plan.
   * Executes each step, logging activity.
   * When done, status becomes `completed`.

5. In the **Workspace Explorer**, you should see:

   * A new file (e.g. `workspace/examples/hello_world.py` or similar).

6. Run the generated script:

   ```bash
   python workspace/examples/hello_world.py
   ```

---

## Deployment

For full Railway deployment instructions, see:

* [`RAILWAY_DEPLOY.md`](./RAILWAY_DEPLOY.md)

It covers:

* Connecting GitHub repo
* Environment variables
* Build & start commands
* Health checks
* Optional frontend hosting on Vercel / Netlify

---

## More Docs

* [`EXAMPLE_TASKS.md`](./EXAMPLE_TASKS.md) – ready-made tasks to try
* [`SETUP_CHECKLIST.md`](./SETUP_CHECKLIST.md) – step-by-step setup checklist
* API schema: [http://localhost:8000/docs](http://localhost:8000/docs) (when backend running)

---

## License

You own this project. Use, modify, or extend it however you like.
