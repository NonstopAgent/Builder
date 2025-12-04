// frontend/src/api/config.ts

// Determine if we are in development or production
const isDevelopment = import.meta.env.MODE === 'development';

// Use environment variable if available, otherwise fallback to localhost in dev
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDevelopment ? "http://localhost:8000" : "");
export const BACKEND_URL = API_BASE_URL;
