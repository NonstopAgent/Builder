import { BACKEND_URL } from "./config";
import type { AgentRequest, AgentResponse } from "../types";

export async function sendAgentMessage(
  payload: AgentRequest
): Promise<AgentResponse> {
  const res = await fetch(`${BACKEND_URL}/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Agent request failed with status ${res.status}`);
  }

  return res.json();
}
