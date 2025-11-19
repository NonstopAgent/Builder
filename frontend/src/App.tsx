import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, fetchTaskLogs, fetchTasks, runAllTasks, runTask, sendAgentMessage } from "./api";
import { ChatMessage, Task, TaskType } from "./types";
import { useUIStore } from "./store/useStore";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPanel } from "./components/layout/ChatPanel";
import { ToolPanel } from "./components/layout/ToolPanel";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import "./index.css";

const App = () => {
  const queryClient = useQueryClient();
  const { selectedTaskId, setSelectedTaskId, tabs } = useUIStore();
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [collaborationLog, setCollaborationLog] = useState<string>("");
  const [toolsOpen, setToolsOpen] = useState(true);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);

  useEffect(() => {
    setChatHistory((prev) => {
      const updated: Record<string, ChatMessage[]> = { ...prev };

      tasks.forEach((task) => {
        // If backend has real messages stored, use them
        if (task.messages && task.messages.length > 0) {
          updated[task.id] = task.messages.map((m, index) => ({
            id: `${task.id}-${index}`,
            role: m.role,
            content: m.content,
            timestamp: task.createdAt ?? new Date().toISOString(),
          }));
        } else if (!updated[task.id]) {
          // Fallback: simple "task created" intro if no messages yet
          updated[task.id] = [
            {
              id: `${task.id}-intro`,
              role: "assistant",
              content: `Task created: ${task.goal}`,
              timestamp: task.createdAt,
            },
          ];
        }
      });

      return updated;
    });
  }, [tasks]);

  const createTaskMutation = useMutation({
    mutationFn: ({ goal, type }: { goal: string; type: TaskType }) => createTask({ goal, type }),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) => [task, ...old]);
      setSelectedTaskId(task.id);
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

      const existingMessages = chatHistory[targetTaskId] ?? [];
      const updatedMessages = [...existingMessages, userMessage];

      // Show the user message immediately
      setChatHistory((prev) => ({
        ...prev,
        [targetTaskId!]: updatedMessages,
      }));

      // Call the agent with taskId so backend can store memory
      const response = await sendAgentMessage(targetTaskId, updatedMessages);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => {
        const existing = prev[targetTaskId!] ?? updatedMessages;
        return {
          ...prev,
          [targetTaskId!]: [...existing, assistantMessage],
        };
      });

      if (response.log) {
        setCollaborationLog(response.log);
      }
    } catch (error) {
      // Fallback: never leave the user hanging
      const fallbackTaskId =
        targetTaskId ?? selectedTaskId ?? `local-${Date.now()}`;

      const existingMessages =
        (fallbackTaskId && chatHistory[fallbackTaskId]) ?? [];
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Something went wrong sending that to the agent. Check the backend logs or refresh and try again.",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...existingMessages, userMessage, assistantMessage];

      setChatHistory((prev) => ({
        ...prev,
        [fallbackTaskId]: updatedMessages,
      }));

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
      setChatHistory((prev) => ({
        ...prev,
        [task.id]: prev[task.id] ?? [],
      }));
    } catch (error) {
      setSelectedTaskId(undefined);
    }
  };

  const activeMessages = selectedTaskId ? chatHistory[selectedTaskId] ?? [] : [];

  const shouldShowTools = Boolean(
    selectedTaskId && (terminalLogs.length > 0 || !!previewHtml || tabs.length > 0 || collaborationLog)
  );

  return (
    <div className="relative h-screen w-screen bg-slate-950 text-slate-100 flex overflow-hidden">
      <Sidebar
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        onSelect={setSelectedTaskId}
        onNewChat={handleNewChat}
        isLoading={tasksLoading}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel
          messages={activeMessages}
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
  );
};

export default App;
