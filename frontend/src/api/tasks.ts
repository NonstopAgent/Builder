import { apiClient } from "./client";
import { Step, Task, TaskType } from "../types";

export interface CreateTaskPayload {
  goal: string;
  type: TaskType;
}

export const fetchTasks = async (): Promise<Task[]> => {
  const response = await apiClient.get<Task[]>("/tasks");
  return response.data;
};

export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const response = await apiClient.post<Task>("/tasks", payload);
  return response.data;
};

export const runTask = async (taskId: string): Promise<void> => {
  await apiClient.post(`/tasks/${taskId}/run`);
};

export const runAllTasks = async (): Promise<void> => {
  await apiClient.post(`/tasks/run-all`);
};

export const fetchTaskSteps = async (taskId: string): Promise<Step[]> => {
  const response = await apiClient.get<Step[]>(`/tasks/${taskId}/steps`);
  return response.data;
};

export const fetchTaskLogs = async (taskId: string): Promise<string[]> => {
  const response = await apiClient.get<string[]>(`/tasks/${taskId}/logs`);
  return response.data;
};
