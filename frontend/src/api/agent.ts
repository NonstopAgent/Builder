import { BACKEND_URL } from "./config";
import type { AgentRequest, AgentResponse } from "../types";

export async function sendAgentMessage(
  payload: AgentRequest
): Promise<AgentResponse> {
  const url = `${BACKEND_URL}/agent`;

  console.log('[Super Builder] Sending agent request to:', url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('[Super Builder] Agent request failed:', {
      url,
      status: res.status,
      statusText: res.statusText,
      hint: res.status === 404
        ? 'Backend not found. Check if Railway service is running and URL is correct.'
        : res.status === 500
        ? 'Backend error. Check Railway logs for details.'
        : 'Unknown error. Check Network tab for more details.',
    });
    throw new Error(`Agent request failed with status ${res.status}`);
  }

  return res.json();
}
