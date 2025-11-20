import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import EditorPanel from "../Editor/EditorPanel";
import PreviewPanel from "../Preview/PreviewPanel";
import { ExecutionMonitor } from "../Execution/ExecutionMonitor";
import { MemoryItem, Task } from "../../types";
import { createMemory, fetchMemory } from "../../api/memory";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const tabs = ["Workspace", "Preview", "Terminal", "Collab Log"] as const;
type Tab = (typeof tabs)[number];

interface ToolPanelProps {
  previewHtml?: string;
  terminalLogs: string[];
  selectedTaskId?: string | null;
  selectedTask?: Task;
  collaborationLog?: string;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  previewHtml,
  terminalLogs,
  selectedTaskId,
  selectedTask,
  collaborationLog,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("Workspace");
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    if (!selectedTaskId) {
      setMemoryItems([]);
      return;
    }

    setIsLoadingMemory(true);
    fetchMemory(selectedTaskId)
      .then(setMemoryItems)
      .catch((err) => console.error("Failed to load memory", err))
      .finally(() => setIsLoadingMemory(false));
  }, [selectedTaskId]);

  return (
    <aside className="w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col">
      {/* Claude-style header */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sky-400" />
            <span className="text-xs font-medium text-slate-100">Tools</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            {activeTab}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Auto-updating as the build runs</span>
        </div>
      </div>

      {/* Tabs row */}
      <div className="h-10 px-3 flex items-center gap-1 border-b border-slate-800/80 bg-slate-950/80">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-3 py-1 text-xs rounded-full transition-colors",
              activeTab === tab
                ? "bg-slate-800 text-slate-100 shadow-sm"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {activeTab === "Workspace" && (
            <div className="h-full overflow-hidden p-3">
              <div className="h-full rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <EditorPanel />
              </div>
            </div>
          )}

          {activeTab === "Preview" && (
            <div className="h-full overflow-auto p-3 text-sm text-slate-200">
              <p className="text-slate-500 text-xs mb-2">Preview</p>
              <div className="h-full rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <PreviewPanel html={previewHtml} />
              </div>
            </div>
          )}

          {activeTab === "Terminal" && (
            <div className="h-full overflow-auto p-3 space-y-3 text-sm text-slate-200">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-slate-500 text-xs mb-3">Execution</p>
                {selectedTaskId ? (
                  <ExecutionMonitor taskId={selectedTaskId} />
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-slate-500">
                    Select a task to view execution
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                <p className="text-slate-500 text-xs">Terminal</p>
                <div className="h-64 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 font-mono text-xs text-slate-200">
                  {terminalLogs.length === 0 ? (
                    <p className="text-slate-500">
                      Logs will appear here when you run a task.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {terminalLogs.map((log, idx) => (
                        <div
                          key={`${log}-${idx}`}
                          className="rounded bg-slate-900/70 px-3 py-2"
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Collab Log" && (
            <div className="h-full overflow-auto p-3 text-sm text-slate-200 space-y-3">
              {/* Build activity timeline */}
              <div>
                <p className="text-slate-500 text-xs mb-1">Build activity</p>
                {selectedTask?.logs && selectedTask.logs.length > 0 ? (
                  <div className="max-h-32 overflow-auto rounded-lg border border-slate-800/80 bg-slate-950/70 p-2 space-y-1">
                    {selectedTask.logs.slice(-10).map((log, idx) => (
                      <div key={idx} className="text-[11px] text-slate-300 flex gap-2">
                        <span className="mt-1 h-1 w-1 rounded-full bg-sky-400" />
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No high-level logs yet. Run a build or ask for a larger plan.
                  </p>
                )}
              </div>

              {/* Rich collab plan */}
              <div className="flex-1 min-h-0">
                <p className="text-slate-500 text-xs mb-2">
                  Build plan &amp; collaboration
                </p>
                <div className="h-full max-h-[420px] rounded-xl border border-slate-800/80 bg-slate-950/80 overflow-auto p-3 text-xs leading-relaxed">
                  {collaborationLog?.trim() ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children, ...props }) {
                          if (inline) {
                            return (
                              <code
                                className={
                                  "font-mono text-[0.78rem] px-1 py-0.5 rounded bg-slate-900/80 border border-slate-700/70 " +
                                  (className ?? "")
                                }
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }

                          return (
                            <pre className="mt-2 mb-2 rounded-lg bg-slate-950/90 border border-slate-800/80 p-3 overflow-x-auto">
                              <code className="font-mono text-[0.78rem]" {...props}>
                                {children}
                              </code>
                            </pre>
                          );
                        },
                      }}
                    >
                      {collaborationLog}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-slate-500">
                      Ask for a larger build to see the ChatGPT + Claude plan and review.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <section className="border-t border-neutral-800 p-3">
          <h3 className="text-xs font-semibold text-neutral-300 mb-2">Memory</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
            {isLoadingMemory && (
              <div className="text-[11px] text-neutral-500">Loading memory…</div>
            )}
            {!isLoadingMemory && memoryItems.length === 0 && (
              <div className="text-[11px] text-neutral-500">
                No saved memory yet. Add important notes here.
              </div>
            )}
            {memoryItems.map((item) => (
              <div
                key={item.id}
                className="text-[11px] text-neutral-200 border border-neutral-800 rounded px-2 py-1"
              >
                {item.content}
              </div>
            ))}
          </div>
          <textarea
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Save a key decision or fact…"
            className="w-full text-[11px] bg-neutral-950 border border-neutral-800 rounded p-1 mb-2 resize-none"
            rows={2}
          />
          <button
            disabled={!newMemory.trim() || !selectedTaskId}
            onClick={async () => {
              if (!newMemory.trim() || !selectedTaskId) return;
              try {
                const created = await createMemory({
                  task_id: selectedTaskId,
                  content: newMemory.trim(),
                });
                setMemoryItems((prev) => [created, ...prev]);
                setNewMemory("");
              } catch (err) {
                console.error("Failed to save memory", err);
              }
            }}
            className="w-full text-[11px] border border-neutral-700 rounded py-1 hover:bg-neutral-900 disabled:opacity-40"
          >
            Save to memory
          </button>
        </section>
      </div>
    </aside>
  );
};

export default ToolPanel;
