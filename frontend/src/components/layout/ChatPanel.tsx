import { FormEvent, useMemo, useState, useRef, useEffect } from "react";
import { Play, Sparkles, Send } from "lucide-react";
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
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [draft]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onSend(draft.trim());
      setDraft("");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const taskStatus = selectedTask?.status ?? "pending";

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <header className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-sky-400" />
            <span className="text-sm font-medium text-slate-100">Super Builder Pro</span>
          </div>
          {selectedTask && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600">•</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 capitalize">
                {taskStatus.replace("_", " ")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            onClick={onRunTask}
            disabled={!selectedTask || isRunning}
          >
            <Play size={14} />
            Run Task
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded-lg bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            onClick={onRunAll}
            disabled={isRunning}
          >
            <Sparkles size={14} />
            Run All
          </button>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {orderedMessages.length === 0 && logs.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center space-y-4 pt-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30">
                <Sparkles size={32} className="text-sky-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                  How can I help you build today?
                </h2>
                <p className="text-sm text-slate-400">
                  Tell me what you want to create and I'll generate a plan and execute it.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {orderedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {logs.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Task Activity
                </div>
                <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 space-y-2 font-mono text-xs">
                  {logs.map((log, idx) => (
                    <div key={`${log}-${idx}`} className="text-slate-300 leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 px-4 py-4 bg-slate-950/60 flex-shrink-0">
        <form className="max-w-3xl mx-auto" onSubmit={handleSubmit}>
          <div className="relative rounded-2xl border border-slate-700 bg-slate-900 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none max-h-32"
              placeholder="Message Super Builder..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-2 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
            {draft.length > 0 && (
              <span>{draft.length} characters</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
