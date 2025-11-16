import axios from 'axios';

const API_BASE: string = (import.meta as any).env.VITE_API_URL ||
  'https://builder-production-3ed2.up.railway.app';

export async function createSession(): Promise<string> {
  const { data } = await axios.post(`${API_BASE}/session`);
  return data.session_id;
}

export async function getSessionState(sessionId: string): Promise<any[]> {
  const { data } = await axios.get(`${API_BASE}/session/${sessionId}`);
  return data.tasks;
}

export async function createTask(
  sessionId: string,
  type: string,
  goal: string,
  projectId?: string | null,
): Promise<any> {
  const payload: any = { type, goal };
  if (projectId) {
    payload.project_id = projectId;
  }
  const { data } = await axios.post(`${API_BASE}/session/${sessionId}/tasks`, payload);
  return data;
}

export async function runTask(sessionId: string, taskId: number): Promise<any> {
  const { data } = await axios.post(
    `${API_BASE}/session/${sessionId}/tasks/${taskId}/run`,
    {},
  );
  return data;
}

export async function getTaskPlan(sessionId: string, taskId: number): Promise<any[]> {
  const { data } = await axios.get(
    `${API_BASE}/session/${sessionId}/tasks/${taskId}/plan`,
  );
  return data.plan;
}

export async function sendMessage(sessionId: string, message: string): Promise<any> {
  const { data } = await axios.post(
    `${API_BASE}/session/${sessionId}/message`,
    { session_id: sessionId, message },
  );
  return data;
}
