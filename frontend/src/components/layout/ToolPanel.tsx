import { useState } from "react";
import { Sparkles } from "lucide-react";
import EditorPanel from "../Editor/EditorPanel";
import PreviewPanel from "../Preview/PreviewPanel";
import { ExecutionMonitor } from "../Execution/ExecutionMonitor";

const tabs = ["Workspace", "Preview", "Terminal", "Collab Log"] as const;
type Tab = (typeof tabs)[number];

interface ToolPanelProps {
  previewHtml?: string;
  terminalLogs: string[];
  selectedTaskId?: string;
  collaborationLog?: string;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  previewHtml,
  terminalLogs,
  selectedTaskId,
  collaborationLog,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("Workspace");

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
          <div className="h-full overflow-auto p-3 text-sm text-slate-200">
            <p className="text-slate-500 text-xs mb-2">
              Build plan &amp; collaboration
            </p>
            <div className="h-full rounded-xl border border-slate-800 bg-slate-900/60 overflow-auto p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {collaborationLog?.trim() ? (
                <>{collaborationLog}</>
              ) : (
                <span className="text-slate-500">
                  Ask for a larger build to see the ChatGPT + Claude plan and review.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ToolPanel;
