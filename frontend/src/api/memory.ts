import { BACKEND_URL } from "./config";
import { MemoryItem } from "../types";

export async function fetchMemory(taskId: string | null): Promise<MemoryItem[]> {
  const url =
    taskId != null
      ? `${BACKEND_URL}/memory?task_id=${encodeURIComponent(taskId)}`
      : `${BACKEND_URL}/memory`;
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
  const res = await fetch(`${BACKEND_URL}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create memory: ${res.status}`);
  return res.json();
}
