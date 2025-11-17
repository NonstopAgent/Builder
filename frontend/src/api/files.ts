import { apiClient } from "./client";
import { FileContent, FileEntry } from "../types";

export const listFiles = async (path = ""): Promise<FileEntry[]> => {
  const response = await apiClient.get<FileEntry[]>("/files", { params: { path } });
  return response.data;
};

export const readFile = async (path: string): Promise<FileContent> => {
  const response = await apiClient.get<FileContent>("/files/content", { params: { path } });
  return response.data;
};

export const writeFile = async (path: string, content: string): Promise<FileContent> => {
  const response = await apiClient.post<FileContent>("/files/content", { path, content });
  return response.data;
};
