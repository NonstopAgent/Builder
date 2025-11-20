import axios from "axios";
import { BACKEND_URL } from "./config";

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
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
