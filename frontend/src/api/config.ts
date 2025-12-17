// frontend/src/api/config.ts

// Determine if we are in development or production
const isDevelopment = import.meta.env.MODE === 'development';

// Use environment variable if available, otherwise fallback to Railway in production
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (isDevelopment
    ? "http://localhost:8000"
    : "https://builder-production-3ed2.up.railway.app"
  );

export const BACKEND_URL = API_BASE_URL;
