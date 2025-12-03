import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createTask, fetchTaskById, fetchTaskLogs, fetchTasks, runAllTasks, runTask, sendAgentMessage } from "./api";
import { ChatMessage, Task, TaskType } from "./types";
import { useUIStore } from "./store/useStore";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPanel } from "./components/layout/ChatPanel";
import { ToolPanel } from "./components/layout/ToolPanel";
import { ProjectDashboard } from "./components/ProjectDashboard";
import { PanelRightClose, PanelRightOpen, FolderKanban } from "lucide-react";
import "./index.css";

const App = () => {
  const { tabs, currentProjectId } = useUIStore();
  const [viewMode, setViewMode] = useState<"chat" | "projects">("chat");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [collaborationLog, setCollaborationLog] = useState<string>("");
  const [toolsOpen, setToolsOpen] = useState(true);

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);

  useEffect(() => {
    const lastTaskId = window.localStorage.getItem("lastTaskId");

    async function init() {
      try {
        setIsLoadingTasks(true);
        const loadedTasks = await fetchTasks(30);
        setTasks(loadedTasks);

        let initialTaskId = lastTaskId;
        if (!initialTaskId && loadedTasks.length > 0) {
          initialTaskId = loadedTasks[0].id;
        }

        if (initialTaskId) {
          setSelectedTaskId(initialTaskId);
          try {
            const fullTask = await fetchTaskById(initialTaskId);
            const hydratedMessages = (fullTask.messages ?? []).map((message, index) => ({
              id: message.id ?? `${initialTaskId}-${index}`,
              role: message.role,
              content: message.content,
              timestamp: message.createdAt ?? fullTask.updatedAt ?? new Date().toISOString(),
            }));
            setMessages(hydratedMessages);
            setCollaborationLog(fullTask.collaborationLog ?? "");
          } catch (err) {
            console.error("Failed to load initial task", err);
          }
        }
      } catch (err) {
        console.error("Failed to initialize tasks", err);
      } finally {
        setIsLoadingTasks(false);
      }
    }

    void init();
  }, []);

  const createTaskMutation = useMutation({
    mutationFn: ({ goal, type }: { goal: string; type: TaskType }) => createTask({ goal, type }),
    onSuccess: (task) => {
      setTasks((prev) => [task, ...prev]);
      setSelectedTaskId(task.id);
      setMessages([]);
      window.localStorage.setItem("lastTaskId", task.id);
    },
  });

  const runTaskMutation = useMutation({
    mutationFn: (taskId: string) => runTask(taskId),
    onSuccess: () => {
      setTerminalLogs((prev) => [...prev, `Started task ${selectedTaskId}`]);
      refetchLogs();
    },
  });

  const runAllMutation = useMutation({
    mutationFn: runAllTasks,
    onSuccess: () => setTerminalLogs((prev) => [...prev, "Running all tasks"]),
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["task-logs", selectedTaskId],
    queryFn: () => fetchTaskLogs(selectedTaskId as string),
    enabled: !!selectedTaskId,
    refetchInterval: selectedTask?.status === "in_progress" ? 2000 : false,
  });

  useEffect(() => {
    setTerminalLogs(logs);
  }, [logs]);

  const handleRunTask = () => {
    if (!selectedTaskId) return;
    runTaskMutation.mutate(selectedTaskId);
  };

  const handleRunAll = () => {
    runAllMutation.mutate();
  };

  const handleSendMessage = async (message: string) => {
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: now,
    };

    let targetTaskId = selectedTaskId;

    try {
      // Create a task if there isn't one yet
      if (!targetTaskId) {
        const task = await createTaskMutation.mutateAsync({
          goal: message,
          type: "build",
        });
        targetTaskId = task.id;
        setSelectedTaskId(task.id);
        setTerminalLogs([]);
      }

      if (!targetTaskId) {
        throw new Error("No task id available for this chat");
      }

      const updatedMessages = [...messages, userMessage];

      // Show the user message immediately
      setMessages(updatedMessages);

      // Call the agent with taskId so backend can store memory
      const response = await sendAgentMessage({
        task_id: targetTaskId,
        messages: updatedMessages.map(({ role, content }) => ({ role, content })),
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      const mergedMessages = [...updatedMessages, assistantMessage];
      setMessages(mergedMessages);

      window.localStorage.setItem("lastTaskId", targetTaskId);
      setTasks((prev) =>
        prev
          .map((task) =>
            task.id === targetTaskId
              ? { ...task, updatedAt: new Date().toISOString() }
              : task
          )
          .sort((a, b) =>
            (b.updatedAt ?? b.createdAt ?? "") > (a.updatedAt ?? a.createdAt ?? "")
              ? 1
              : -1
          )
      );

      if (response.log) {
        setCollaborationLog(response.log);
        setTasks((prev) =>
          prev.map((task) =>
            task.id === targetTaskId
              ? { ...task, collaborationLog: response.log }
              : task
          )
        );
      }
    } catch (error) {
      // Fallback: never leave the user hanging
      const fallbackTaskId = targetTaskId ?? selectedTaskId ?? `local-${Date.now()}`;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Something went wrong sending that to the agent. Check the backend logs or refresh and try again.",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage, assistantMessage];

      setMessages(updatedMessages);

      if (!selectedTaskId) {
        setSelectedTaskId(fallbackTaskId);
      }
    }
  };

  const handleNewChat = async () => {
    setTerminalLogs([]);
    setPreviewHtml("");
    setCollaborationLog("");

    try {
      const task = await createTaskMutation.mutateAsync({
        goal: "New build",
        type: "build",
      });

      setSelectedTaskId(task.id);
      setMessages([]);
      window.localStorage.setItem("lastTaskId", task.id);
    } catch (error) {
      setSelectedTaskId(null);
    }
  };

  const handleSelectTask = async (taskId: string) => {
    setSelectedTaskId(taskId);
    window.localStorage.setItem("lastTaskId", taskId);
    try {
      const fullTask = await fetchTaskById(taskId);
      setTasks((prev) => {
        const filtered = prev.filter((task) => task.id !== taskId);
        return [fullTask, ...filtered].sort((a, b) =>
          (b.updatedAt ?? b.createdAt ?? "") > (a.updatedAt ?? a.createdAt ?? "") ? 1 : -1
        );
      });
      const hydratedMessages = (fullTask.messages ?? []).map((message, index) => ({
        id: message.id ?? `${taskId}-${index}`,
        role: message.role,
        content: message.content,
        timestamp: message.createdAt ?? fullTask.updatedAt ?? new Date().toISOString(),
      }));
      setMessages(hydratedMessages);
      setCollaborationLog(fullTask.collaborationLog ?? "");
    } catch (err) {
      console.error("Failed to load task", err);
    }
  };

  const shouldShowTools = Boolean(
    selectedTaskId && (terminalLogs.length > 0 || !!previewHtml || tabs.length > 0 || collaborationLog)
  );

  return (
    <div className="relative h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="h-12 border-b border-gray-800 bg-gray-950 flex items-center px-4 justify-between shrink-0">
            <div className="font-bold text-lg flex items-center gap-2">
                SuperBuilder
            </div>
            <div className="flex gap-4">
                <button
                    onClick={() => setViewMode("chat")}
                    className={`px-3 py-1 rounded text-sm ${viewMode === "chat" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                    Chat
                </button>
                 <button
                    onClick={() => setViewMode("projects")}
                    className={`px-3 py-1 rounded text-sm flex items-center gap-2 ${viewMode === "projects" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                    <FolderKanban size={16} />
                    Projects
                </button>
            </div>
        </div>

      {viewMode === "projects" ? (
         <div className="flex-1 overflow-hidden">
             <ProjectDashboard />
         </div>
      ) : (
          <div className="flex-1 flex overflow-hidden">
              <Sidebar
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                onSelect={handleSelectTask}
                onNewChat={handleNewChat}
                isLoading={isLoadingTasks}
              />

              <div className="flex-1 flex flex-col min-w-0">
                <ChatPanel
                  messages={messages}
                  logs={terminalLogs}
                  onSend={handleSendMessage}
                  selectedTask={selectedTask}
                />
              </div>

              {shouldShowTools && toolsOpen && (
                <ToolPanel
                  previewHtml={previewHtml}
                  terminalLogs={terminalLogs}
                  selectedTaskId={selectedTaskId}
                  selectedTask={selectedTask ?? undefined}
                  collaborationLog={collaborationLog}
                />
              )}

              {shouldShowTools && (
                <button
                  onClick={() => setToolsOpen((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full border border-slate-700 bg-slate-950/90 shadow-lg flex items-center justify-center hover:bg-slate-900 hover:border-sky-500 text-slate-300 hover:text-sky-400 transition-colors"
                  title={toolsOpen ? "Hide tools" : "Show tools"}
                >
                  {toolsOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              )}
          </div>
      )}
    </div>
  );
};

export default App;
