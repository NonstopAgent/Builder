# Super Builder Testing & Improvement Plan

This document explains how to **test**, **stabilize**, and **improve** the updated Super Builder stack (backend + frontend + agents).

---

## 🔍 Critical Issues Found

### 1. Backend Dependencies Missing / Bloated

**Problem**

- `requirements.txt` contained heavy frameworks that are **never imported** anywhere in the codebase, for example:

  ```text
  langchain>=0.1.0
  langgraph>=0.0.1
  chromadb>=0.4.0
  redis>=5.0.0
  celery>=5.3.0
  sqlalchemy>=2.0.0
  alembic>=1.12.0
  playwright>=1.40.0
  opentelemetry-api>=1.19.0
  opentelemetry-sdk>=1.19.0
  ```

**Impact**

* 🟡 Slows down installs
* 🟡 Increases risk of version conflicts
* 🟡 Makes the project “look” more complex than it is

**Fix**

* Keep only what is actually required by the backend:

  ```text
  fastapi
  uvicorn[standard]
  pydantic>=2.0.0
  python-dotenv>=1.0.0
  openai>=0.27.0
  anthropic>=0.40.0
  httpx>=0.27.0
  pytest>=7.4.0
  pytest-asyncio>=0.21.0
  ```

* This is automated by `fix_critical_issues.py` (see below).

---

### 2. Type / Model Inconsistencies

**Problem**

* Some frontend types don’t exactly match the backend models:

  * `Task` vs FastAPI `Task` response model
  * `Step` vs backend step dict shape
* Minor mismatches (e.g. `projectId` vs `project_id`, optional fields, etc.) cause:

  * TypeScript compile errors
  * “undefined” values in UI
  * Weird bugs when rendering lists

**Impact**

* 🔴 Can completely break the frontend build
* 🔴 Harder to maintain / reason about request payloads

**Fix**

* Normalize the data model across:

  * `backend/models.py`
  * `frontend/src/types.ts`
  * `frontend/src/api/tasks.ts`
* Confirm:

  * `Task.current_step` can be `number | null`
  * `Task.project_id` and `projectId` are handled consistently at the boundary
* The script `fix_critical_issues.py` and tests in `test_backend.py` help enforce this.

---

### 3. Frontend `package.json` Mismatch

**Problem**

* Frontend code uses libraries that are **not** declared in `package.json`, for example:

  * `axios`
  * `zustand` or other state libs
  * `@types/node` for dev
* There are placeholder / unused packages left over from older iterations.

**Impact**

* 🟡 Fresh installs fail (`module not found`)
* 🟡 CI builds / Vercel deployments randomly break

**Fix**

* Ensure `frontend/package.json` correctly lists:

  * All actually used deps (react, react-dom, axios, vite, typescript, etc.)
  * Pruned devDependencies
* `fix_critical_issues.py` writes a sane default `package.json` if it detects obvious issues.

---

## ✅ Fix Script: `fix_critical_issues.py`

The script:

1. Cleans up `requirements.txt` with the minimal set of backend deps.
2. Ensures `frontend/package.json` has a **valid** modern React/Vite setup.
3. Writes or updates small helper files:

   * `TYPE_CONSISTENCY_PATCH.md` – notes to line up backend/FE types.
   * `QUICK_FIX_GUIDE.md` – short “what to do if” reference.

You run it from **project root**:

```bash
python fix_critical_issues.py
```

Then:

```bash
pip install -r requirements.txt
cd frontend
npm install
```

---

## 🧪 Test Coverage Plan

### 1. Backend Smoke Tests (FastAPI)

File: `test_backend.py`

Goals:

* Confirm the backend starts and the main endpoints work:

  * `GET /health`
  * `GET /tasks`
  * `POST /tasks`
  * `POST /tasks/{id}/run`
  * `POST /tasks/{id}/run-all`
  * `GET /tasks/{id}/steps`
  * `GET /tasks/{id}/logs`
  * `GET /files`
  * `GET /files/content`

We use `fastapi.testclient.TestClient` so tests are fast and local.

Run:

```bash
pytest test_backend.py -v
```

---

### 2. Agent Integration (Manual / Optional)

Because the Claude agent depends on external API keys, we treat this mostly as **manual**:

* Set `BUILDER_AGENT=claude`

* Set `ANTHROPIC_API_KEY=...`

* Create a test task:

  ```bash
  curl -X POST http://localhost:8000/tasks \
    -H "Content-Type: application/json" \
    -d '{"goal":"Create a hello world Python script","type":"build"}'
  ```

* Run:

  ```bash
  curl -X POST http://localhost:8000/tasks/1/run-all
  ```

* Check:

  * Task ends in `status: "completed"`
  * Files created in workspace (e.g. `hello_world.py`)

---

## 🔁 Regression Testing Checklist

After **any** major change:

1. **Backend**

   * `pytest test_backend.py -v`
   * Manual `curl` to `/health` and `/tasks`

2. **Frontend**

   * `npm run build` in `frontend`
   * Load the app:

     * Create a task
     * Run it
     * Inspect logs + plan
     * Browse files

3. **Agent Mode Switch**

   * Set `BUILDER_AGENT=super`
   * Then `BUILDER_AGENT=claude`
   * Ensure both modes at least:

     * Return `/health` without error
     * Can create and list tasks

---

## 🧭 Improvement Roadmap

### Short-Term (stability)

* [ ] Keep dependencies **minimal** and documented.
* [ ] Add more backend tests around:

  * Error cases (missing files, invalid task IDs).
  * File writes via `/files/content`.
* [ ] Add a basic end-to-end test:

  * Start uvicorn in a separate process
  * Hit endpoints using `httpx`

### Medium-Term (DX / UX)

* [ ] Frontend: show clearer error messages if a task fails.
* [ ] Frontend: display step metadata (file names, previews).
* [ ] Backend: better structured logs that are easier to consume.

### Long-Term (product)

* [ ] Multi-agent support (Claude, OpenAI, etc.) configurable per task.
* [ ] Workspace templates (Django project, Next.js app, etc.).
* [ ] Better observability (logging, trace IDs, etc.).

---

## 🧾 Summary

* We removed **dead weight** dependencies.
* We added a script to align `requirements.txt` and `package.json`.
* We provided **tests** and a **checklist** so the system can be safely iterated on.
* We paved the way for more reliable agent-powered development.

Run:

```bash
python fix_critical_issues.py
pytest test_backend.py -v
```

…before deploying or making big changes.
This keeps Super Builder fast, lean, and much easier to trust. 🚀
