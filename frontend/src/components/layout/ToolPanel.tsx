import { useState } from "react";
import EditorPanel from "../Editor/EditorPanel";
import PreviewPanel from "../Preview/PreviewPanel";
import { ExecutionMonitor } from "../Execution/ExecutionMonitor";

const tabs = ["Workspace", "Preview", "Terminal"] as const;
type Tab = (typeof tabs)[number];

interface ToolPanelProps {
  previewHtml?: string;
  terminalLogs: string[];
  selectedTaskId?: string;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ previewHtml, terminalLogs, selectedTaskId }) => {
  const [activeTab, setActiveTab] = useState<Tab>("Workspace");

  return (
    <aside className="w-[420px] bg-slate-950 border-l border-slate-800 flex flex-col">
      <div className="h-10 px-3 border-b border-slate-800 flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "px-3 py-1 text-xs rounded-full",
              activeTab === tab
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:bg-slate-900",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

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
                  <p className="text-slate-500">Logs will appear here when you run a task.</p>
                ) : (
                  <div className="space-y-2">
                    {terminalLogs.map((log, idx) => (
                      <div key={`${log}-${idx}`} className="rounded bg-slate-900/70 px-3 py-2">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ToolPanel;
