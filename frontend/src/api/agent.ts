import { apiClient } from "./client";
import { ChatMessage } from "../types";

export type AgentMode = "simple" | "collab";

export interface AgentResponse {
  mode: AgentMode;
  reply: string;
  log?: string;
}

export async function sendAgentMessage(messages: ChatMessage[]): Promise<AgentResponse> {
  const payload = {
    messages: messages.map(({ role, content }) => ({ role, content })),
  };

  const { data } = await apiClient.post<AgentResponse>("/agent", payload);
  return data;
}
