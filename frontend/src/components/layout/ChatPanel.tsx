import { FormEvent, useMemo, useState } from "react";
import { Play, Rocket, Sparkles } from "lucide-react";
import MessageBubble from "../Chat/MessageBubble";
import { ChatMessage, Task } from "../../types";

interface ChatPanelProps {
  messages: ChatMessage[];
  logs: string[];
  onSend: (message: string) => Promise<void> | void;
  onRunTask: () => void;
  onRunAll: () => void;
  selectedTask?: Task;
  isRunning?: boolean;
}

export const ChatPanel = ({ messages, logs, onSend, onRunTask, onRunAll, selectedTask, isRunning }: ChatPanelProps) => {
  const [draft, setDraft] = useState("");

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await onSend(draft.trim());
    setDraft("");
  };

  const taskStatus = selectedTask?.status ?? "pending";

  return (
    <div className="h-full flex flex-col">
      <header className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-sky-400" />
          <span className="text-sm font-medium text-slate-100">Super Builder Pro</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
            Session Ready
          </span>
          {selectedTask && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              Active: {taskStatus.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60"
            onClick={onRunTask}
            disabled={!selectedTask}
          >
            <Play size={14} /> Run Task
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-lg bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-60"
            onClick={onRunAll}
            disabled={isRunning}
          >
            <Sparkles size={14} /> Run All
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {orderedMessages.length === 0 && logs.length === 0 ? (
          <div className="max-w-2xl text-sm text-slate-200">
            <p className="text-slate-400 text-xs mb-2">Assistant</p>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3">
              Tell me what you want to build and I&apos;ll create a plan.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orderedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {logs.length > 0 && (
              <div className="max-w-2xl text-sm text-slate-200">
                <p className="text-slate-400 text-xs mb-2">Task activity</p>
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-2 font-mono text-xs text-slate-100">
                  {logs.map((log, idx) => (
                    <div key={`${log}-${idx}`} className="rounded-lg bg-slate-900/50 px-3 py-2 text-slate-200">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-3 bg-slate-950/60">
        <form className="max-w-3xl mx-auto space-y-2" onSubmit={handleSubmit}>
          <textarea
            rows={2}
            className="w-full resize-none rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Describe what you want to build..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-sky-500 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-60"
              disabled={!draft.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
