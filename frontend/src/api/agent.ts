import { apiClient } from "./client";
import { ChatMessage } from "../types";

export type AgentMode = "simple" | "collab";

export interface AgentResponse {
  mode: AgentMode;
  reply: string;
  log?: string;
}

// 🔥 Attach taskId so backend can store messages under that task
export async function sendAgentMessage(
  taskId: string | number,
  messages: ChatMessage[]
): Promise<AgentResponse> {
  const numericTaskId =
    typeof taskId === "string" ? parseInt(taskId, 10) : taskId;

  const payload = {
    task_id: numericTaskId,
    messages: messages.map(({ role, content }) => ({ role, content })),
  };

  const { data } = await apiClient.post<AgentResponse>("/agent", payload);
  return data;
}
