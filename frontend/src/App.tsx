import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, fetchTaskLogs, fetchTasks, runAllTasks, runTask } from "./api";
import { ChatMessage, Task, TaskType } from "./types";
import { useUIStore } from "./store/useStore";
import { Sidebar } from "./components/layout/Sidebar";
import { ChatPanel } from "./components/layout/ChatPanel";
import { ToolPanel } from "./components/layout/ToolPanel";
import "./index.css";

const App = () => {
  const queryClient = useQueryClient();
  const { selectedTaskId, setSelectedTaskId, tabs } = useUIStore();
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);

  useEffect(() => {
    setChatHistory((prev) => {
      const updated = { ...prev };
      tasks.forEach((task) => {
        if (!updated[task.id]) {
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

    if (!selectedTaskId) {
      const task = await createTaskMutation.mutateAsync({ goal: message, type: "build" });
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Starting a new build for "${message}". I'll plan and share progress here.`,
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => ({ ...prev, [task.id]: [userMessage, assistantMessage] }));
      setTerminalLogs([]);
      return;
    }

    setChatHistory((prev) => {
      const existing = prev[selectedTaskId] ?? [];
      return { ...prev, [selectedTaskId]: [...existing, userMessage] };
    });
  };

  const handleNewChat = () => {
    setSelectedTaskId(undefined);
    setTerminalLogs([]);
    setPreviewHtml("");
  };

  const activeMessages = selectedTaskId ? chatHistory[selectedTaskId] ?? [] : [];

  const shouldShowTools = Boolean(
    selectedTaskId && (terminalLogs.length > 0 || !!previewHtml || tabs.length > 0)
  );

  const isRunning = runTaskMutation.isPending || runAllMutation.isPending;

  return (
    <>
      <div className="h-screen w-screen bg-slate-950 text-slate-100 flex">
        <Sidebar
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelect={setSelectedTaskId}
          onNewChat={handleNewChat}
          isLoading={tasksLoading}
        />

        <div className="flex-1 flex flex-col border-x border-slate-800">
          <ChatPanel
            messages={activeMessages}
            logs={terminalLogs}
            onSend={handleSendMessage}
            onRunTask={handleRunTask}
            onRunAll={handleRunAll}
            selectedTask={selectedTask}
            isRunning={isRunning}
          />
        </div>

        {shouldShowTools && (
          <ToolPanel previewHtml={previewHtml} terminalLogs={terminalLogs} selectedTaskId={selectedTaskId} />
        )}
      </div>
    </>
  );
};

export default App;
