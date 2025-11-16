import React, { useEffect, useState } from "react";
import {
  createSession,
  getSessionState,
  createTask,
  runTask,
  runTaskAll,
  sendMessage,
  getTaskLogs,
  listWorkspace,
  readWorkspaceFile,
} from "./api";

type Step = {
  description: string;
  status: string;
  logs?: string[];
  error?: string | null;
};

type Task = {
  id: number;
  type: string;
  goal: string;
  status: string;
  current_step?: number | null;
  plan: Step[];
};

type MessagePair = {
  user: string;
  assistant: string;
};

type WorkspaceEntry = {
  name: string;
  type: "file" | "directory";
};

type TaskLogs = {
  task_logs: string[];
  step_logs: {
    step_index: number;
    description: string;
    status: string;
    logs: string[];
    error?: string | null;
  }[];
};

const App: React.FC = () => {
  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // New task form
  const [goalInput, setGoalInput] = useState("");
  const [typeInput, setTypeInput] = useState("build");

  // Loading flags
  const [initializing, setInitializing] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);
  const [runningTask, setRunningTask] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<MessagePair[]>([]);

  // Logs
  const [taskLogs, setTaskLogs] = useState<TaskLogs | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Workspace
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceEntry[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Initial session + tasks
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const newSessionId = await createSession();
        setSessionId(newSessionId);

        const state = await getSessionState(newSessionId);
        setTasks(state.tasks || []);
      } catch (err) {
        console.error("Failed to initialize session:", err);
      } finally {
        setInitializing(false);
      }
    };

    bootstrap();
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const refreshTasks = async () => {
    if (!sessionId) return;
    try {
      const state = await getSessionState(sessionId);
      setTasks(state.tasks || []);
    } catch (err) {
      console.error("Failed to refresh tasks:", err);
    }
  };

  const selectedTask: Task | undefined =
    selectedTaskId != null ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const canRun =
    selectedTask &&
    !runningTask &&
    !runningAll &&
    selectedTask.status !== "completed" &&
    selectedTask.status !== "failed";

  // ---------------------------------------------------------------------------
  // Task actions
  // ---------------------------------------------------------------------------

  const handleCreateTask = async () => {
    if (!sessionId || !goalInput.trim()) return;
    setCreatingTask(true);
    try {
      const newTask = await createTask(sessionId, typeInput, goalInput.trim());
      setTasks((prev) => [...prev, newTask]);
      setGoalInput("");
      setSelectedTaskId(newTask.id);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleRunTask = async () => {
    if (!sessionId || selectedTaskId == null || !canRun) return;
    setRunningTask(true);
    try {
      await runTask(sessionId, selectedTaskId);
      await refreshTasks();
      await loadTaskLogs(selectedTaskId);
    } catch (err) {
      console.error("Failed to run task:", err);
    } finally {
      setRunningTask(false);
    }
  };

  const handleRunTaskAll = async () => {
    if (!sessionId || selectedTaskId == null || !canRun) return;
    setRunningAll(true);
    try {
      await runTaskAll(sessionId, selectedTaskId);
      await refreshTasks();
      await loadTaskLogs(selectedTaskId);
    } catch (err) {
      console.error("Failed to run task to completion:", err);
    } finally {
      setRunningAll(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Logs
  // ---------------------------------------------------------------------------

  const loadTaskLogs = async (taskId: number) => {
    if (!sessionId) return;
    setLogsLoading(true);
    try {
      const logs = await getTaskLogs(sessionId, taskId);
      setTaskLogs(logs);
    } catch (err) {
      console.error("Failed to load task logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Chat
  // ---------------------------------------------------------------------------

  const handleSendMessage = async () => {
    if (!sessionId || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    try {
      const response = await sendMessage(sessionId, msg);
      setMessages((prev) => [...prev, { user: msg, assistant: response.response }]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------------

  const loadDirectory = async (path: string) => {
    setWorkspaceLoading(true);
    try {
      const res = await listWorkspace(path);
      setWorkspaceEntries(res.entries || []);
      setCurrentDir(path);
      setSelectedFilePath("");
      setSelectedFileContent("");
    } catch (err) {
      console.error("Failed to list workspace:", err);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const openFile = async (path: string) => {
    try {
      const res = await readWorkspaceFile(path);
      setSelectedFilePath(res.path);
      setSelectedFileContent(res.content);
    } catch (err) {
      console.error("Failed to read workspace file:", err);
    }
  };

  const goUpDirectory = () => {
    if (!currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    loadDirectory(parts.join("/"));
  };

  // Load root workspace on first mount
  useEffect(() => {
    loadDirectory("");
  }, []);

  // When selected task changes, pull logs
  useEffect(() => {
    if (selectedTaskId != null) {
      loadTaskLogs(selectedTaskId);
    }
  }, [selectedTaskId]);

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40";
      case "in_progress":
        return "bg-amber-500/20 text-amber-300 border border-amber-400/40";
      case "failed":
        return "bg-rose-500/20 text-rose-300 border border-rose-400/40";
      case "queued":
      case "todo":
      default:
        return "bg-slate-700/50 text-slate-200 border border-slate-500/60";
    }
  };

  const stepStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-300";
      case "in_progress":
        return "text-amber-300";
      case "failed":
        return "text-rose-300";
      default:
        return "text-slate-300";
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-slate-500 border-t-blue-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Spinning up your Builder session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* LEFT SIDEBAR */}
      <aside className="w-72 border-r border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
        <div className="px-5 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Builder</div>
            <div className="text-lg font-semibold text-slate-100">Super Console</div>
          </div>
          <div className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
            Session
          </div>
        </div>

        <div className="px-5 py-4 border-b border-slate-800 space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">New Task</div>
          <input
            className="w-full rounded-md bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe what you want to build..."
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
          <select
            className="w-full rounded-md bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={typeInput}
            onChange={(e) => setTypeInput(e.target.value)}
          >
            <option value="build">Build</option>
            <option value="plan">Plan</option>
            <option value="modify">Modify</option>
          </select>
          <button
            onClick={handleCreateTask}
            disabled={creatingTask || !goalInput.trim()}
            className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-sm font-medium py-2 transition"
          >
            {creatingTask ? "Creating..." : "Create Task"}
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 text-xs uppercase tracking-wide text-slate-400">
          Tasks
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {tasks.length === 0 && (
            <div className="text-xs text-slate-500 px-3">
              No tasks yet. Create something on the left and let the agent build it.
            </div>
          )}
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition border ${
                selectedTaskId === task.id
                  ? "bg-slate-800 border-blue-500/70"
                  : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  #{task.id} · {task.type}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor(
                    task.status
                  )}`}
                >
                  {task.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-400 line-clamp-2">{task.goal}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN + RIGHT PANELS */}
      <div className="flex-1 flex">
        {/* CENTER – Task Detail + Chat */}
        <main className="flex-1 flex flex-col border-r border-slate-800">
          <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/70 backdrop-blur">
            {selectedTask ? (
              <>
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">
                    Active Task · #{selectedTask.id}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-100 truncate max-w-md">
                      {selectedTask.goal}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(
                        selectedTask.status
                      )}`}
                    >
                      {selectedTask.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRunTask}
                    disabled={!canRun || runningTask}
                    className="px-3 py-1.5 rounded-md bg-slate-800 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500 transition"
                  >
                    {runningTask ? "Running..." : "Run Next Step"}
                  </button>
                  <button
                    onClick={handleRunTaskAll}
                    disabled={!canRun || runningAll}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 transition"
                  >
                    {runningAll ? "Running All..." : "Run All Steps"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">
                Select a task from the left to see its plan and logs.
              </div>
            )}
          </header>

          <div className="flex-1 grid grid-rows-2 gap-0">
            {/* PLAN + STEPS */}
            <section className="border-b border-slate-800 overflow-y-auto bg-slate-950/50">
              <div className="px-6 py-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Plan & Steps
                </div>
                {selectedTask && (
                  <div className="text-[11px] text-slate-500">
                    {selectedTask.plan?.length || 0} steps ·{" "}
                    {selectedTask.current_step != null
                      ? `Current: ${selectedTask.current_step + 1}`
                      : "No active step"}
                  </div>
                )}
              </div>
              <div className="px-6 pb-4 space-y-2">
                {!selectedTask && (
                  <div className="text-xs text-slate-500">
                    No task selected. Choose a task on the left or create a new one.
                  </div>
                )}
                {selectedTask && selectedTask.plan.length === 0 && (
                  <div className="text-xs text-slate-500">
                    No plan yet. Click <span className="font-semibold">Run Next Step</span> or{" "}
                    <span className="font-semibold">Run All Steps</span> to let the agent plan.
                  </div>
                )}
                {selectedTask &&
                  selectedTask.plan.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[11px] text-slate-300">
                            {idx + 1}
                          </span>
                          <span className={`font-medium ${stepStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-200 mb-1">{step.description}</div>
                      {step.error && (
                        <div className="text-[11px] text-rose-300 mt-1">
                          Error: {step.error}
                        </div>
                      )}
                      {step.logs && step.logs.length > 0 && (
                        <details className="mt-1">
                          <summary className="text-[11px] text-slate-400 cursor-pointer">
                            Step logs ({step.logs.length})
                          </summary>
                          <ul className="mt-1 space-y-1 text-[11px] text-slate-400">
                            {step.logs.map((log, i) => (
                              <li key={i}>• {log}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  ))}
              </div>
            </section>

            {/* CHAT */}
            <section className="flex flex-col bg-slate-950">
              <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Chat (for quick notes / echo)
                </div>
                <div className="text-[10px] text-slate-500">
                  This is a simple echo chat; main intelligence is in tasks.
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
                {messages.length === 0 && (
                  <div className="text-xs text-slate-500">
                    Send a message below to log notes or quick prompts for yourself.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-end">
                      <div className="max-w-xs rounded-lg bg-blue-600 text-xs px-3 py-2 text-white">
                        {m.user}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-xs rounded-lg bg-slate-800 text-xs px-3 py-2 text-slate-100">
                        {m.assistant}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800 px-4 py-3 flex items-center gap-2">
                <input
                  className="flex-1 rounded-md bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Type a note or message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="rounded-md bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500 transition"
                >
                  Send
                </button>
              </div>
            </section>
          </div>
        </main>

        {/* RIGHT – Agent Console + Workspace */}
        <aside className="w-96 flex flex-col bg-slate-950">
          {/* Agent Console */}
          <section className="border-b border-slate-800 h-1/2 flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Agent Console
              </div>
              <div className="text-[10px] text-slate-500">
                {logsLoading ? "Loading logs..." : selectedTask ? `Task #${selectedTask.id}` : "No task"}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 text-xs">
              {!selectedTask && (
                <div className="text-slate-500">
                  Select a task to view agent logs and step details.
                </div>
              )}
              {selectedTask && !taskLogs && (
                <div className="text-slate-500">
                  Logs not loaded yet. Run a step or click the task again.
                </div>
              )}
              {taskLogs && (
                <>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                    Task Logs
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-800 rounded-md bg-slate-900/60 px-3 py-2">
                    {taskLogs.task_logs.length === 0 && (
                      <div className="text-slate-500">No task-level logs yet.</div>
                    )}
                    {taskLogs.task_logs.map((log, i) => (
                      <div key={i} className="text-slate-300">
                        • {log}
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-3 mb-1">
                    Step Logs
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {taskLogs.step_logs.length === 0 && (
                      <div className="text-slate-500 text-xs">No step logs available.</div>
                    )}
                    {taskLogs.step_logs.map((s, i) => (
                      <div
                        key={i}
                        className="border border-slate-800 rounded-md bg-slate-900/60 px-3 py-2 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[11px] text-slate-300">
                              {s.step_index + 1}
                            </span>
                            <span className={`text-[11px] font-medium ${stepStatusColor(s.status)}`}>
                              {s.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-200">{s.description}</div>
                        {s.error && (
                          <div className="text-[11px] text-rose-300">Error: {s.error}</div>
                        )}
                        {s.logs && s.logs.length > 0 && (
                          <ul className="mt-1 space-y-1 text-[11px] text-slate-400">
                            {s.logs.map((log, j) => (
                              <li key={j}>• {log}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Workspace */}
          <section className="h-1/2 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-400">Workspace</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="truncate max-w-[120px]">{currentDir || "/"}</span>
                <button
                  onClick={goUpDirectory}
                  className="px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  Up
                </button>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2">
              <div className="border-r border-slate-800 overflow-y-auto px-3 py-2 text-xs">
                {workspaceLoading && (
                  <div className="text-slate-500 mb-2">Loading workspace...</div>
                )}
                {workspaceEntries.map((entry) => (
                  <button
                    key={entry.name}
                    className="w-full text-left px-2 py-1 rounded-md hover:bg-slate-800 flex items-center gap-2"
                    onClick={() =>
                      entry.type === "directory"
                        ? loadDirectory(currentDir ? `${currentDir}/${entry.name}` : entry.name)
                        : openFile(currentDir ? `${currentDir}/${entry.name}` : entry.name)
                    }
                  >
                    <span className="text-[11px] text-slate-400">
                      {entry.type === "directory" ? "📁" : "📄"}
                    </span>
                    <span className="truncate">{entry.name}</span>
                  </button>
                ))}
                {workspaceEntries.length === 0 && !workspaceLoading && (
                  <div className="text-slate-500">Workspace is empty.</div>
                )}
              </div>
              <div className="overflow-y-auto px-3 py-2 text-xs">
                {selectedFilePath ? (
                  <>
                    <div className="text-[11px] text-slate-400 mb-1">{selectedFilePath}</div>
                    <pre className="bg-slate-900 rounded-md border border-slate-800 px-3 py-2 text-[11px] whitespace-pre-wrap">
                      {selectedFileContent}
                    </pre>
                  </>
                ) : (
                  <div className="text-slate-500 text-xs">
                    Select a file on the left to preview its contents.
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default App;
