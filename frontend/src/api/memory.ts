import { MemoryItem } from "../types";

const BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";

export async function fetchMemory(taskId: string | null): Promise<MemoryItem[]> {
  const url =
    taskId != null
      ? `${BASE_URL}/memory?task_id=${encodeURIComponent(taskId)}`
      : `${BASE_URL}/memory`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch memory: ${res.status}`);
  return res.json();
}

interface CreateMemoryPayload {
  task_id?: string | null;
  content: string;
  tags?: string[];
  importance?: string;
}

export async function createMemory(
  payload: CreateMemoryPayload
): Promise<MemoryItem> {
  const res = await fetch(`${BASE_URL}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create memory: ${res.status}`);
  return res.json();
}
