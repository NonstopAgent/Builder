# Super Builder Setup Checklist

Complete step-by-step checklist to get your Super Builder running.

---

## 📋 Pre-Setup

- [ ] Python **3.8+** installed
- [ ] Node.js **16+** installed (for frontend)
- [ ] Git installed
- [ ] Code editor ready (VS Code recommended)
- [ ] Terminal / command prompt open in the repo root

---

## 🔧 Backend Setup

### Step 1 – Get the Files

- [ ] All new files from this conversation added:

  ```text
  builder/
    backend/
      agents/
        claude_agent.py          # NEW
      ... existing backend files ...
    requirements.txt             # UPDATED
    setup_workspace.py           # NEW
    quick_start.sh               # NEW
    .env.example                 # NEW
    README.md                    # UPDATED
    RAILWAY_DEPLOY.md            # NEW
    EXAMPLE_TASKS.md             # NEW
    SETUP_CHECKLIST.md           # YOU ARE HERE
  ```

### Step 2 – Install Dependencies

```bash
python3 -m venv venv
# On Mac/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

pip install -r requirements.txt
```

* [ ] Virtual environment created
* [ ] Dependencies installed without errors
* [ ] Optional check:

```bash
python -c "import anthropic; print('OK')"
```

### Step 3 – Setup Workspace

```bash
python setup_workspace.py
```

* [ ] `workspace/` directory created
* [ ] Example files exist in `workspace/`
* [ ] No errors during setup

### Step 4 – Configure Environment

```bash
cp .env.example .env
# Edit .env and add your API key
# Use nano, vim, VS Code, etc.
```

* [ ] `.env` file created
* [ ] `ANTHROPIC_API_KEY` added (from [https://console.anthropic.com](https://console.anthropic.com))
* [ ] Key starts with `sk-ant-`
* [ ] `BUILDER_AGENT` set to `claude` or `super`

### Step 5 – Test Backend

```bash
uvicorn backend.main:app --reload
# In another terminal:
curl http://localhost:8000/health
```

Expected JSON:

```json
{
  "status": "ok",
  "version": "0.2.0",
  "agent": "claude",
  "workspace": "/path/to/builder/workspace"
}
```

* [ ] Server starts without errors
* [ ] Health check returns `"status": "ok"`
* [ ] `"agent"` matches your BUILDER_AGENT
* [ ] No warnings about missing API key (if using Claude)

---

## 🎨 Frontend Setup

### Step 6 – Install Frontend Dependencies

```bash
cd frontend
npm install
```

* [ ] `node_modules/` created
* [ ] No install errors

### Step 7 – Configure Frontend

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:8000
```

* [ ] `frontend/.env` created
* [ ] `VITE_API_URL` points to backend

### Step 8 – Start Frontend

```bash
cd frontend
npm run dev
```

* [ ] Vite dev server starts successfully
* [ ] Opens at [http://localhost:5173](http://localhost:5173)
* [ ] No red errors in browser console

### Step 9 – Test Frontend

Open [http://localhost:5173](http://localhost:5173):

* [ ] Page loads without errors
* [ ] "Super Builder" title visible
* [ ] Left sidebar shows "Tasks"
* [ ] "Create Task" form is visible

---

## ✅ Verification Tests

### Test 1 – Create a Session (via API)

```bash
curl -X POST http://localhost:8000/session
```

* [ ] Returns a `session_id`
* [ ] Session ID looks like a UUID

### Test 2 – Create a Task (via frontend)

1. In the frontend:

   * Enter goal: `Create a Python script that prints "Hello, World!"`
   * Select type: `build`
   * Click **Create Task**.

* [ ] Task appears in sidebar
* [ ] Task has ID, goal, and status
* [ ] Status is `queued` or `in_progress`

### Test 3 – Run a Task

* [ ] Click the new task
* [ ] Click **Run All Steps**

Check:

* [ ] Status changes to `in_progress`
* [ ] Plan appears with steps
* [ ] Steps execute one by one
* [ ] Status eventually becomes `completed`
* [ ] Logs panel shows activity

### Test 4 – Check Workspace

In the "Workspace Explorer" panel:

* [ ] Can navigate directories
* [ ] Can see created files
* [ ] Can click and view file contents
* [ ] Generated script is visible

### Test 5 – Run Generated Code

If a script like `hello_world.py` was created:

```bash
python workspace/hello_world.py
```

* [ ] Script exists
* [ ] Script runs without errors
* [ ] Output is correct

---

## 🚀 Optional: Deploy to Railway

### Step 10 – Prepare for Deployment

* [ ] All code committed to Git
* [ ] Pushed to GitHub
* [ ] `.env` is in `.gitignore` (it should be)

### Step 11 – Railway Setup

* [ ] Railway account created
* [ ] New project created from GitHub repo
* [ ] Environment variables added:

  ```text
  ANTHROPIC_API_KEY=sk-ant-...
  ANTHROPIC_MODEL=claude-3-5-sonnet-latest
  BUILDER_AGENT=claude
  PORT=8000
  ```

### Step 12 – Deploy

* [ ] Railway build succeeds
* [ ] App is running
* [ ] Public domain works
* [ ] Health check responds at `https://your-app.up.railway.app/health`

### Step 13 – Deploy Frontend (Vercel / Netlify)

* [ ] Vercel or Netlify project created
* [ ] Connected to GitHub repo
* [ ] `VITE_API_URL` set to Railway backend URL
* [ ] Deploy succeeds
* [ ] Frontend loads and connects to backend

---

## 🔍 Troubleshooting Checklist

**Backend won’t start**

* [ ] Virtual environment activated?
* [ ] `pip install -r requirements.txt` completed without errors?
* [ ] Python version is 3.8+?
* [ ] Port 8000 not already in use?

**“Claude API not available”**

* [ ] `.env` file exists?
* [ ] `ANTHROPIC_API_KEY` is set?
* [ ] Key is valid at [https://console.anthropic.com](https://console.anthropic.com)?
* [ ] No typos in variable name?

**Frontend can’t connect**

* [ ] Backend is running?
* [ ] `VITE_API_URL` is correct?
* [ ] CORS settings allow the frontend origin?

**Workspace errors**

* [ ] `workspace/` directory exists?
* [ ] `python setup_workspace.py` was run?
* [ ] File permissions are OK?

**Tasks don’t execute**

* [ ] API key set (for Claude)?
* [ ] Check task logs (via `/logs` or frontend)?
* [ ] Try **Run Next Step** instead of **Run All**?
* [ ] Check backend logs for errors?

---

## 📊 Success Criteria

You are fully set up when:

* [ ] Backend health check shows `"status": "ok"`
* [ ] `"agent"` matches your expected mode (`super` or `claude`)
* [ ] Frontend loads without errors
* [ ] You can create tasks through the UI
* [ ] Tasks execute and update their status
* [ ] Workspace explorer shows generated files
* [ ] Generated code runs successfully

---

## 🎯 Next Steps

1. Try the example tasks in `EXAMPLE_TASKS.md`.
2. Customize `claude_agent.py` with new step types and tools.
3. Deploy to Railway (see `RAILWAY_DEPLOY.md`).
4. Start using Super Builder to help you build real projects.

You’re ready. 🚀
