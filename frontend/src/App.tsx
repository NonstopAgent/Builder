import { useEffect, useMemo, useState } from "react";
import SplitPane from "react-split-pane";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, createTaskWithCouncil, fetchTaskLogs, fetchTasks, runAllTasks, runTask } from "./api";
import { ChatMessage, Task, TaskType } from "./types";
import { useUIStore } from "./store/useStore";
import TopBar from "./components/Layout/TopBar";
import SideBar from "./components/Layout/SideBar";
import BottomPanel from "./components/Layout/BottomPanel";
import EditorPanel from "./components/Editor/EditorPanel";
import PreviewPanel from "./components/Preview/PreviewPanel";
import ChatPanel from "./components/Chat/ChatPanel";
import { RequirementsWizard } from "./components/Requirements/RequirementsWizard";
import { CouncilDebateViewer } from "./components/Council/CouncilDebateViewer";
import { ExecutionMonitor } from "./components/Execution/ExecutionMonitor";
import "./index.css";

const App = () => {
  const queryClient = useQueryClient();
  const { selectedTaskId, setSelectedTaskId, panelVisibility } = useUIStore();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showCouncil, setShowCouncil] = useState(false);
  const [currentPRD, setCurrentPRD] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState("");

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [tasks, selectedTaskId]);

  const createTaskMutation = useMutation({
    mutationFn: ({ goal, type }: { goal: string; type: TaskType }) => createTask({ goal, type }),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) => [task, ...old]);
      setSelectedTaskId(task.id);
    },
  });

  const createEnhancedTaskMutation = useMutation({
    mutationFn: ({ goal, type, prd, architecture }: { goal: string; type: TaskType; prd: string; architecture?: string }) =>
      createTaskWithCouncil({ goal, type, prd, architecture }),
    onSuccess: (task) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) => [task, ...old]);
      setSelectedTaskId(task.id);
      setShowCouncil(false);
      setShowRequirements(false);
      setCurrentPRD(null);
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

  const handleCreate = (goal: string, type: TaskType) => {
    createTaskMutation.mutate({ goal, type });
  };

  const handleStartEnhancedWorkflow = (goal: string) => {
    setCurrentGoal(goal);
    setShowRequirements(true);
  };

  const handleRequirementsComplete = (prd: string) => {
    setCurrentPRD(prd);
    setShowRequirements(false);
    setShowCouncil(true);
  };

  const handleCouncilComplete = (architectureDoc: string) => {
    setShowCouncil(false);
    if (!currentPRD) return;
    createEnhancedTaskMutation.mutate({
      goal: currentGoal,
      type: "build",
      prd: currentPRD,
      architecture: architectureDoc,
    });
  };

  const handleRunTask = () => {
    if (!selectedTaskId) return;
    runTaskMutation.mutate(selectedTaskId);
  };

  const handleRunAll = () => {
    runAllMutation.mutate();
  };

  const handleSendMessage = (message: string) => {
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: now,
    };
    setChatMessages((prev) => [...prev, userMessage]);

    const assistant: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `I can help with that! I'll queue a task to "${message}".`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, assistant]);

    if (message.length > 6) {
      createTaskMutation.mutate({ goal: message, type: "build" });
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#060b16] p-4">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <TopBar
            selectedTask={selectedTask}
            onRunTask={handleRunTask}
            onRunAll={handleRunAll}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
          />

          <SplitPane split="vertical" minSize={320} defaultSize={360} className="rounded-xl">
            <SideBar
              tasks={tasks}
              onCreate={handleCreate}
              onSelect={setSelectedTaskId}
              isLoading={tasksLoading}
              onStartEnhancedWorkflow={handleStartEnhancedWorkflow}
            />
            <SplitPane split="horizontal" defaultSize="68%" minSize={380} className="rounded-xl">
              <SplitPane split="vertical" defaultSize="58%" minSize={420}>
                <EditorPanel />
                <SplitPane split="horizontal" defaultSize="55%" minSize={280}>
                  {panelVisibility.showPreview ? (
                    <PreviewPanel html={previewHtml} />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500">
                      Preview hidden
                    </div>
                  )}
                  {panelVisibility.showChat ? (
                    <ChatPanel messages={chatMessages} onSend={handleSendMessage} />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500">
                      Chat hidden
                    </div>
                  )}
                </SplitPane>
              </SplitPane>
              {panelVisibility.showTerminal ? (
                <div className="grid h-full gap-3 md:grid-cols-2">
                  {selectedTaskId ? (
                    <ExecutionMonitor taskId={selectedTaskId} />
                  ) : (
                    <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500">
                      Select a task to view execution
                    </div>
                  )}
                  <BottomPanel logs={terminalLogs} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-800 text-slate-500">
                  Terminal hidden
                </div>
              )}
            </SplitPane>
          </SplitPane>
        </div>
      </div>

      {showRequirements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto">
            <RequirementsWizard
              initialGoal={currentGoal}
              onComplete={handleRequirementsComplete}
              onCancel={() => setShowRequirements(false)}
            />
          </div>
        </div>
      )}

      {showCouncil && currentPRD && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto">
            <CouncilDebateViewer
              prd={currentPRD}
              onComplete={handleCouncilComplete}
              onCancel={() => setShowCouncil(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
