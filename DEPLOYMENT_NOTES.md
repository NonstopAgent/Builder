# Deployment Notes

- Vercel should build the Vite React frontend from the `frontend` directory.
- The build command is `npm run build` (Vite will emit the production bundle).
- The build output directory is `frontend/dist` and is served as a static site.
