// frontend/src/api/config.ts

// Prefer VITE_API_URL (what you have set in Vercel),
// but also support VITE_BACKEND_URL just in case.
export const BACKEND_URL =
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_BACKEND_URL ??
  "http://localhost:8000";
