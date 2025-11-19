import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, fetchTaskLogs, fetchTasks, runAllTasks, runTask, sendAgentMessage } from "./api";
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
  const [collaborationLog, setCollaborationLog] = useState<string>("");

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

    let targetTaskId = selectedTaskId;

    if (!targetTaskId) {
      const task = await createTaskMutation.mutateAsync({ goal: message, type: "build" });
      targetTaskId = task.id;
      setSelectedTaskId(task.id);
      setTerminalLogs([]);
    }

    const existingMessages = targetTaskId ? chatHistory[targetTaskId] ?? [] : [];
    const updatedMessages = [...existingMessages, userMessage];

    if (targetTaskId) {
      setChatHistory((prev) => ({ ...prev, [targetTaskId]: updatedMessages }));
    }

    try {
      const response = await sendAgentMessage(updatedMessages);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      if (targetTaskId) {
        setChatHistory((prev) => {
          const existing = prev[targetTaskId!] ?? updatedMessages;
          return { ...prev, [targetTaskId!]: [...existing, assistantMessage] };
        });
      }

      if (response.log) {
        setCollaborationLog(response.log);
      }
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't reach the AI orchestrator right now.",
        timestamp: new Date().toISOString(),
      };

      if (targetTaskId) {
        setChatHistory((prev) => {
          const existing = prev[targetTaskId] ?? updatedMessages;
          return { ...prev, [targetTaskId]: [...existing, assistantMessage] };
        });
      }
    }
  };

  const handleNewChat = () => {
    setSelectedTaskId(undefined);
    setTerminalLogs([]);
    setPreviewHtml("");
    setCollaborationLog("");
  };

  const activeMessages = selectedTaskId ? chatHistory[selectedTaskId] ?? [] : [];

  const shouldShowTools = Boolean(
    selectedTaskId && (terminalLogs.length > 0 || !!previewHtml || tabs.length > 0 || collaborationLog)
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
          <ToolPanel
            previewHtml={previewHtml}
            terminalLogs={terminalLogs}
            selectedTaskId={selectedTaskId}
            collaborationLog={collaborationLog}
          />
        )}
      </div>
    </>
  );
};

export default App;
