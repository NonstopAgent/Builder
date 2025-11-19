import { apiClient } from "./client";
import { Step, Task, TaskType } from "../types";

export interface CreateTaskPayload {
  goal: string;
  type: TaskType;
  projectId?: string | null;
}

export interface RequirementsSessionStart {
  goal: string;
}

export interface AnswerSubmission {
  question_id: string;
  answer: string;
}

export const fetchTasks = async (): Promise<Task[]> => {
  const response = await apiClient.get<Task[]>("/tasks");
  return response.data;
};

export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const response = await apiClient.post<Task>("/tasks", payload);
  return response.data;
};

export const createTaskWithCouncil = async (
  payload: CreateTaskPayload & { prd: string; architecture?: string; requirements?: any }
): Promise<Task> => {
  const response = await apiClient.post<Task>("/tasks/create-with-council", payload);
  return response.data;
};

export const runTaskStep = async (taskId: string | number): Promise<Task> => {
  const response = await apiClient.post<Task>(`/tasks/${taskId}/run`);
  return response.data;
};

export const runTaskToCompletion = async (taskId: string | number): Promise<Task> => {
  const response = await apiClient.post<Task>(`/tasks/${taskId}/run-all`);
  return response.data;
};

export const runTask = runTaskToCompletion;

export const runAllTasks = async (): Promise<void> => {
  await apiClient.post(`/tasks/run-all`);
};

export const fetchTaskSteps = async (taskId: string | number): Promise<Step[]> => {
  const response = await apiClient.get<{ steps: Step[] }>(`/tasks/${taskId}/steps`);
  return response.data.steps;
};

export const fetchTaskLogs = async (taskId: string | number): Promise<string[]> => {
  const response = await apiClient.get<string[]>(`/tasks/${taskId}/logs`);
  return response.data;
};

export const startRequirements = async (goal: string) => {
  const response = await apiClient.post("/requirements/start", { goal });
  return response.data;
};

export const submitAnswer = async (sessionId: string, submission: AnswerSubmission) => {
  const response = await apiClient.post(`/requirements/${sessionId}/answer`, submission);
  return response.data;
};

export const finalizeRequirements = async (sessionId: string) => {
  const response = await apiClient.post(`/requirements/${sessionId}/finalize`);
  return response.data;
};

export const getRequirementsSession = async (sessionId: string) => {
  const response = await apiClient.get(`/requirements/${sessionId}`);
  return response.data;
};

export const startCouncilDebate = async (prd: string) => {
  const response = await apiClient.post("/council/debate", { prd });
  return response.data;
};

export const getDebateDetails = async (debateId: string) => {
  const response = await apiClient.get(`/council/debate/${debateId}`);
  return response.data;
};

export const getExecutionStatus = async (taskId: string | number) => {
  const response = await apiClient.get(`/execution/${taskId}/status`);
  return response.data;
};
