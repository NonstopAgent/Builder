# Deployment Notes

- Vercel should build the Vite React frontend from the `frontend` directory.
- The build command is `npm run build` (Vite will emit the production bundle).
- The build output directory is `frontend/dist` and is served as a static site.

## Important Configuration

When deploying the frontend (e.g., on Vercel) separately from the backend (e.g., on Railway), you **must** set the environment variable:

- `VITE_API_BASE_URL`: The full URL of your backend deployment (e.g., `https://my-backend.railway.app`).

If this variable is not set, the frontend will attempt to connect to itself (relative path), resulting in 404 errors. The application includes a configuration check that will alert you if this variable is missing in production.

## Persistence

- **Tasks & Projects:** Persisted to `tasks.json` and `projects.json`.
- **Memory & Sessions:** Persisted to `memory.json` and `sessions.json`.

**Note:** If deploying to a serverless/ephemeral environment (like standard Railway or Vercel functions) without a persistent volume, these JSON files will be reset on every redeploy. For production persistence, ensure your hosting provider supports persistent storage or upgrade the backend to use a database (Roadmap item).
