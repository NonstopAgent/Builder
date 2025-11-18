# Vercel Deployment Fix – Frontend Dependency Conflicts

Your Vercel preview deployments were failing with:

- `npm ERR! ERESOLVE unable to resolve dependency tree`

This means the `frontend/package.json` had dependencies with incompatible or strict peer dependency requirements.

---

## What Was Changed

### 1. Frontend `package.json` Cleanup

We replaced `frontend/package.json` with a lean, compatible setup:

- React upgraded to **18.3.1**
- React DOM upgraded to **18.3.1**
- Types aligned:

  - `@types/react` → 18.3.4  
  - `@types/react-dom` → 18.3.0  

- Tooling aligned:

  - Vite → 5.x
  - TypeScript → 5.x
  - Vitest → 2.x
  - `@vitejs/plugin-react-swc` for React + Vite

This removes old / conflicting versions that caused the peer dependency resolution errors during `npm install` on Vercel.

---

### 2. `.npmrc` to Relax Peer Dep Conflicts

Added `frontend/.npmrc`:

```ini
legacy-peer-deps=true
strict-peer-dependencies=false
```

This tells npm to:

* Install even when peer dependency versions don’t perfectly match.
* Avoid hard failures (`ERESOLVE`) during `npm install` on Vercel.

---

### 3. Vercel Build Configuration

Created a `vercel.json` in the project root to make Vercel:

* Use the `frontend/` directory as the app.
* Run the correct build steps.
* Expose the backend API URL to the frontend via `VITE_API_URL`.

Key parts:

```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "env": {
    "VITE_API_URL": "https://YOUR-RAILWAY-BACKEND-URL"
  }
}
```

You must replace `https://YOUR-RAILWAY-BACKEND-URL` with your actual Railway backend URL.

---

## How to Apply the Fix

From your project root:

```bash
# 1. Replace frontend package.json with the fixed version
#    (copy the JSON from this doc into frontend/package.json)

# 2. Create .npmrc inside frontend
#    (copy the .npmrc contents into frontend/.npmrc)

# 3. Place vercel.json in the project root
#    (copy the vercel.json contents into ./vercel.json)

# 4. Clean install the frontend locally
cd frontend
rm -rf node_modules package-lock.json
npm install

# 5. Test the build locally
npm run build
```

If `npm run build` succeeds locally, commit and push:

```bash
git add .
git commit -m "fix: resolve Vercel deployment dependency conflicts"
git push
```

Vercel will then run:

* `npm install` (using the new `.npmrc` behavior)
* `npm run build` (on the cleaned-up dependency tree)

---

## Quick Checklist

* [ ] `frontend/package.json` matches the fixed version here
* [ ] `frontend/.npmrc` exists with `legacy-peer-deps=true`
* [ ] `vercel.json` exists in the repo root
* [ ] `VITE_API_URL` points to your live backend URL
* [ ] `npm run build` works locally in `frontend/`

Once these are true, your preview deployments should stop failing with `ERESOLVE` errors.
