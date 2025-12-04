// frontend/src/api/config.ts

 task-engine-fixes
// Determine if we are in development or production
const isDevelopment = import.meta.env.MODE === 'development';

// Use environment variable if available, otherwise fallback to localhost in dev
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDevelopment ? "http://localhost:8000" : "");

// We use the same localhost backend for now
export const API_BASE_URL = "http://localhost:8000";
 main
export const BACKEND_URL = API_BASE_URL;
