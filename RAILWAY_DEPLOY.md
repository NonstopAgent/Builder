# Railway Deployment Guide – Super Builder

This guide walks you through deploying the **backend** to Railway.

---

## 1. Prerequisites

- GitHub repo with this project
- Railway account: <https://railway.app>
- Anthropic API key (optional but recommended)

---

## 2. Connect Repo to Railway

1. Go to Railway dashboard.
2. Click **New Project → Deploy from GitHub repo**.
3. Select your `Builder` repo.
4. Railway will create a new service (e.g. `builder-production`).

---

## 3. Configure Service

### 3.1 Environment Variables

In the service **Variables** tab, add:

```text
BUILDER_AGENT=claude          # or "super"
ANTHROPIC_API_KEY=sk-ant-...  # from console.anthropic.com
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
PORT=8000
```

> Railway injects `PORT`, but setting `8000` keeps things consistent with local dev.

### 3.2 Build & Start Commands

**Build**: usually Railway auto-detects Python. If you need to set it:

* Build command:
  `pip install -r requirements.txt`

**Start**:

```text
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

You can also rely on the `Procfile`:

```text
web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

---

## 4. Networking

In the **Settings → Networking** section:

* Generate a domain for port **8000** (or `$PORT` if Railway allows).
* Example public URL:
  `https://builder-production-xxxx.up.railway.app`

---

## 5. Verify Deployment

Once the service is running:

1. Open:

   ```text
   https://your-domain.up.railway.app/health
   ```

   You should see JSON like:

   ```json
   {
     "status": "ok",
     "version": "0.2.0",
     "agent": "claude",
     "workspace": "/app/workspace"
   }
   ```

2. Open API docs:

   ```text
   https://your-domain.up.railway.app/docs
   ```

   Swagger UI should load with all endpoints.

---

## 6. Frontend Deployment (Optional)

You can host the frontend (Vite React app) on:

### Option A: Vercel

1. Push frontend code to the same repo.

2. Create a new Vercel project from GitHub.

3. Set environment variable:

   ```text
   VITE_API_URL=https://your-domain.up.railway.app
   ```

4. Use the default Vite build settings (`npm run build`).

5. Deploy.

### Option B: Netlify

1. New site from GitHub.

2. Build command: `npm run build`

3. Publish directory: `dist`

4. Env var:

   ```text
   VITE_API_URL=https://your-domain.up.railway.app
   ```

5. Deploy and test.

---

## 7. Troubleshooting

* **502 / Application failed to respond**

  * Check deploy logs.
  * Confirm `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
  * Ensure `PORT` env var matches Railway’s configuration.

* **Health endpoint returns 500**

  * Check that `workspace/` exists.
  * Run `setup_workspace.py` locally and commit the directory, or let your Dockerfile do it.

* **Claude not used**

  * `/health` shows `"agent": "super"`:

    * Set `BUILDER_AGENT=claude`.
  * Logs show missing API key:

    * Set `ANTHROPIC_API_KEY` in variables.
    * Redeploy.

---

You should now have a live, public Super Builder backend you can hit from:

* The frontend
* Your own scripts
* ChatGPT / Codex tools
