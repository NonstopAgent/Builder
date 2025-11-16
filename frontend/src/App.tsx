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

type TabId = "chat" | "plan" | "logs" | "workspace";

const App: React.FC = () => {
  // Core state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Forms
  const [goalInput, setGoalInput] = useState("");
  const [typeInput, setTypeInput] = useState("build");
  const [chatInput, setChatInput] = useState("");

  // Loading flags
  const [initializing, setInitializing] = useState(true);
  const [creatingTask, setCreatingTask] = useState(false);
  const [runningTask, setRunningTask] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  // Chat + logs
  const [messages, setMessages] = useState<MessagePair[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLogs | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Workspace
  const [workspaceEntries, setWorkspaceEntries] = useState<WorkspaceEntry[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [selectedFilePath, setSelectedFilePath] = useState("");
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // UI
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Derived
  const selectedTask: Task | undefined =
    selectedTaskId != null ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const canRun =
    selectedTask &&
    !runningTask &&
    !runningAll &&
    selectedTask.status !== "completed" &&
    selectedTask.status !== "failed";

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const sid = await createSession();
        setSessionId(sid);
        const state = await getSessionState(sid);
        setTasks(state.tasks || []);
      } catch (err) {
        console.error("Failed to initialize:", err);
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    loadDirectory("");
  }, []);

  useEffect(() => {
    if (selectedTaskId != null) {
      loadTaskLogs(selectedTaskId);
    } else {
      setTaskLogs(null);
    }
  }, [selectedTaskId]);

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

  const statusChip = (status: string) => {
    const base = "px-2 py-0.5 rounded-full text-[11px] border";
    switch (status) {
      case "completed":
        return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-400/40`;
      case "in_progress":
        return `${base} bg-amber-500/10 text-amber-300 border-amber-400/40`;
      case "failed":
        return `${base} bg-rose-500/10 text-rose-300 border-rose-400/40`;
      default:
        return `${base} bg-slate-800 text-slate-300 border-slate-600`;
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
      setActiveTab("plan");
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
      console.error("Failed to run task all:", err);
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
      console.error("Failed to load logs:", err);
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
      console.error("Failed to load workspace:", err);
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
      console.error("Failed to read file:", err);
    }
  };

  const goUpDirectory = () => {
    if (!currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    loadDirectory(parts.join("/"));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="h-10 w-10 rounded-full border-2 border-slate-600 border-t-blue-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Starting your Builder session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100 flex">
      {/* LEFT SIDEBAR ------------------------------------------------------- */}
      <aside className="w-72 border-r border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Builder
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm font-semibold">Super Console</span>
            <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
              Session
            </span>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-slate-800 space-y-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            New Task
          </div>
          <input
            className="w-full rounded-md bg-slate-900/70 border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="What do you want to build?"
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

        <div className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wide text-slate-400">
          Tasks
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {tasks.length === 0 && (
            <div className="text-xs text-slate-500 px-2">
              No tasks yet. Describe something above and let the agent handle it.
            </div>
          )}
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                setSelectedTaskId(task.id);
                setActiveTab("plan");
              }}
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
                <span className={statusChip(task.status)}>{task.status}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400 line-clamp-2">{task.goal}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CHAT-STYLE AREA ---------------------------------------------- */}
      <main className="flex-1 flex justify-center">
        <div className="max-w-5xl w-full flex flex-col">
          {/* HEADER */}
          <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur">
            {selectedTask ? (
              <>
                <div className="space-y-0.5">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Task #{selectedTask.id}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-100 truncate max-w-md">
                      {selectedTask.goal}
                    </div>
                    <span className={statusChip(selectedTask.status)}>
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
                    {runningTask ? "Running…" : "Run Step"}
                  </button>
                  <button
                    onClick={handleRunTaskAll}
                    disabled={!canRun || runningAll}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 transition"
                  >
                    {runningAll ? "Running All…" : "Run All"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">
                Create a task on the left, then select it to start building.
              </div>
            )}
          </header>

          {/* TABS */}
          <div className="border-b border-slate-800 px-6 flex gap-4 text-xs">
            {(["chat", "plan", "logs", "workspace"] as TabId[]).map((tab) => {
              const label =
                tab === "chat"
                  ? "Conversation"
                  : tab === "plan"
                  ? "Plan"
                  : tab === "logs"
                  ? "Logs"
                  : "Workspace";
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 border-b-2 -mb-px ${
                    active
                      ? "border-blue-500 text-slate-100"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 flex flex-col">
            {/* TAB: CHAT ---------------------------------------------------- */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {!selectedTask && messages.length === 0 && (
                    <div className="text-sm text-slate-500">
                      This is a lightweight chat stream (like notes). The real building happens
                      through tasks and plans.
                    </div>
                  )}

                  {selectedTask && (
                    <div className="text-xs text-slate-400">
                      You’re viewing chat for session {" "}
                      <span className="text-slate-200 font-mono">{sessionId}</span>. Use this
                      area for quick notes or instructions alongside your tasks.
                    </div>
                  )}

                  {messages.map((m, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-end">
                        <div className="max-w-xl rounded-2xl bg-blue-600 text-xs px-4 py-2 text-white">
                          {m.user}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-xl rounded-2xl bg-slate-800 text-xs px-4 py-2 text-slate-100">
                          {m.assistant}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat input bar like ChatGPT */}
                <div className="border-t border-slate-800 px-4 py-3">
                  <div className="max-w-3xl mx-auto flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg bg-slate-900/80 border border-slate-700 px-4 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Send a message (for notes / echo)…"
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
                      className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500 transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB: PLAN ---------------------------------------------------- */}
            {activeTab === "plan" && (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {!selectedTask && (
                  <div className="text-sm text-slate-500">
                    No task selected. Choose one from the left to view its plan.
                  </div>
                )}
                {selectedTask && selectedTask.plan.length === 0 && (
                  <div className="text-sm text-slate-500">
                    No plan yet. Click <span className="font-semibold">Run Step</span> or {" "}
                    <span className="font-semibold">Run All</span> to let the agent draft a plan.
                  </div>
                )}
                {selectedTask &&
                  selectedTask.plan.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-[11px] text-slate-300">
                            {idx + 1}
                          </span>
                          <span className={`text-xs font-semibold ${stepStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-100">{step.description}</div>
                      {step.error && (
                        <div className="mt-1 text-xs text-rose-300">Error: {step.error}</div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* TAB: LOGS ---------------------------------------------------- */}
            {activeTab === "logs" && (
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
                {!selectedTask && (
                  <div className="text-sm text-slate-500">
                    Select a task on the left to inspect its logs.
                  </div>
                )}
                {selectedTask && logsLoading && (
                  <div className="text-slate-500">Loading logs...</div>
                )}
                {selectedTask && !logsLoading && !taskLogs && (
                  <div className="text-slate-500">
                    No logs yet. Run a step to generate some activity.
                  </div>
                )}
                {taskLogs && (
                  <>
                    <section>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                        Task Logs
                      </div>
                      <div className="border border-slate-800 rounded-md bg-slate-900/60 px-3 py-2 max-h-40 overflow-y-auto space-y-1">
                        {taskLogs.task_logs.length === 0 && (
                          <div className="text-slate-500">No task-level logs yet.</div>
                        )}
                        {taskLogs.task_logs.map((log, i) => (
                          <div key={i} className="text-slate-200">
                            • {log}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                        Step Logs
                      </div>
                      <div className="space-y-2">
                        {taskLogs.step_logs.length === 0 && (
                          <div className="text-slate-500">No step logs available.</div>
                        )}
                        {taskLogs.step_logs.map((s, i) => (
                          <div
                            key={i}
                            className="border border-slate-800 rounded-md bg-slate-900/60 px-3 py-2 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-[11px] text-slate-300">
                                {s.step_index + 1}
                              </span>
                              <span className={`text-[11px] font-semibold ${stepStatusColor(s.status)}`}>
                                {s.status}
                              </span>
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
                    </section>
                  </>
                )}
              </div>
            )}

            {/* TAB: WORKSPACE ----------------------------------------------- */}
            {activeTab === "workspace" && (
              <div className="flex-1 flex flex-col px-6 py-4 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Workspace
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="truncate max-w-[160px]">{currentDir || "/"}</span>
                    <button
                      onClick={goUpDirectory}
                      className="px-2 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-[11px]"
                    >
                      Up
                    </button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
                  {/* Directory tree */}
                  <div className="border border-slate-800 rounded-md bg-slate-900/60 overflow-y-auto p-2">
                    {workspaceLoading && (
                      <div className="text-slate-500 mb-1">Loading workspace…</div>
                    )}
                    {workspaceEntries.map((entry) => (
                      <button
                        key={entry.name}
                        onClick={() =>
                          entry.type === "directory"
                            ? loadDirectory(
                                currentDir ? `${currentDir}/${entry.name}` : entry.name
                              )
                            : openFile(
                                currentDir ? `${currentDir}/${entry.name}` : entry.name
                              )
                        }
                        className="w-full text-left px-2 py-1 rounded-md hover:bg-slate-800 flex items-center gap-2"
                      >
                        <span>{entry.type === "directory" ? "📁" : "📄"}</span>
                        <span className="truncate">{entry.name}</span>
                      </button>
                    ))}
                    {workspaceEntries.length === 0 && !workspaceLoading && (
                      <div className="text-slate-500">Workspace is empty.</div>
                    )}
                  </div>

                  {/* File preview */}
                  <div className="border border-slate-800 rounded-md bg-slate-900/60 overflow-y-auto p-2">
                    {selectedFilePath ? (
                      <>
                        <div className="text-[11px] text-slate-400 mb-2">
                          {selectedFilePath}
                        </div>
                        <pre className="text-[11px] whitespace-pre-wrap">
                          {selectedFileContent}
                        </pre>
                      </>
                    ) : (
                      <div className="text-slate-500">
                        Select a file on the left to preview its contents.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
