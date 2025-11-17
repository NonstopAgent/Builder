import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error?.response?.data?.message || error.message || "Unknown error";
    return Promise.reject(new Error(message));
  }
);

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
};
