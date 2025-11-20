export type TaskType = "build" | "plan" | "modify";

export type TaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Step {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  logs?: string[];
  error?: string | null;
}

export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface MemoryItem {
  id: string;
  task_id?: string | null;
  content: string;
  tags: string[];
  importance: "low" | "normal" | "high" | string;
  created_at: string;
  last_used_at?: string | null;
}

export interface Task {
  id: string;
  title?: string;
  goal: string;
  type: TaskType;
  status: TaskStatus;
  steps?: Step[];
  createdAt?: string;
  updatedAt?: string;
  logs?: string[];
  messages?: Message[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: string;
}

export interface FileContent {
  path: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  category: string;
  priority: number;
}

export interface RequirementsSessionState {
  session_id: string;
  goal: string;
  questions: ClarifyingQuestion[];
  answers: { question_id: string; answer: string; timestamp: string }[];
  specification: Record<string, unknown>;
  progress: { answered: number; total: number; percentage?: number };
}

export interface Tab {
  id: string;
  path: string;
  label: string;
  language?: string;
  content: string;
  isDirty?: boolean;
}
