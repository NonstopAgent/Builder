import { API_BASE_URL } from "./config";
import { Project, Task } from "../types";

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const res = await fetch(`${API_BASE_URL}/projects`);
    if (!res.ok) throw new Error("Failed to list projects");
    return res.json();
  },

  create: async (name: string, description?: string): Promise<Project> => {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error("Failed to create project");
    return res.json();
  },

  get: async (projectId: string): Promise<Project> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    if (!res.ok) throw new Error("Failed to get project");
    return res.json();
  },

  getTasks: async (projectId: string): Promise<Task[]> => {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`);
    if (!res.ok) throw new Error("Failed to get project tasks");
    return res.json();
  },
};
