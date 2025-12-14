import {
  FormEvent,
  useMemo,
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Terminal, ChevronDown } from "lucide-react";
import MessageBubble from "../Chat/MessageBubble";
import TypingIndicator from "../Chat/TypingIndicator";
import { ChatMessage, Task } from "../../types";
import clsx from "clsx";

interface ChatPanelProps {
  messages: ChatMessage[];
  logs: string[];
  onSend: (message: string) => Promise<void> | void;
  selectedTask?: Task;
}

export const ChatPanel = ({
  messages,
  logs,
  onSend,
  selectedTask,
}: ChatPanelProps) => {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Sort messages by timestamp like Claude
  const orderedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return [...messages].sort((a, b) =>
      (a.timestamp ?? "").localeCompare(b.timestamp ?? "")
    );
  }, [messages]);

  const taskStatus = selectedTask?.status ?? "pending";

  const autoResizeTextarea = () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [draft]);

  // Scroll to bottom when messages/logs change
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = el.scrollHeight;
  }, [orderedMessages.length, logs.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      await onSend(content);
      setDraft("");
      autoResizeTextarea();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without shift) or Cmd/Ctrl+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
    // Also support Cmd+Enter / Ctrl+Enter explicitly
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  const hasActivity = orderedMessages.length > 0 || logs.length > 0;
  const taskTitle = selectedTask?.goal || "New build";

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <header className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-sky-400" />
            <span className="text-sm font-medium text-slate-100">
              Super Builder Pro
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-600">•</span>
            <span className="truncate max-w-[260px]">{taskTitle}</span>
            {selectedTask && (
              <>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 capitalize">
                  {taskStatus.replace("_", " ")}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
      >
        {!hasActivity ? (
          // Claude-style empty state with starter prompts
          <div className="max-w-3xl mx-auto space-y-8 pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/40 shadow-[0_0_40px_rgba(56,189,248,0.25)]">
                <Sparkles size={28} className="text-sky-300" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100 mb-1">
                  How can I help you build today?
                </h2>
                <p className="text-sm text-slate-400">
                  Describe what you want, and I&apos;ll plan it, call your agents, and show progress in the tools panel.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <button
                type="button"
                onClick={() =>
                  setDraft(
                    "Create a multi-agent plan where one agent audits my repo, another generates a new UI, and a third runs tests."
                  )
                }
                className="text-left rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-sky-500/60 hover:bg-slate-900 transition-colors"
              >
                <p className="font-medium text-slate-100 mb-1">
                  Design a full build plan
                </p>
                <p className="text-xs text-slate-400">
                  Ask for a complex feature or product and let Builder orchestrate the steps.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraft(
                    "Refactor this codebase for clarity and performance. Start by summarizing the current structure, then propose improvements."
                  )
                }
                className="text-left rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-sky-500/60 hover:bg-slate-900 transition-colors"
              >
                <p className="font-medium text-slate-100 mb-1">
                  Refactor an existing repo
                </p>
                <p className="text-xs text-slate-400">
                  Paste a GitHub link or describe the project and ask for a refactor plan.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraft(
                    "You are connected to multiple tools. Help me debug this failing build step and then fix the underlying issue."
                  )
                }
                className="text-left rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-sky-500/60 hover:bg-slate-900 transition-colors"
              >
                <p className="font-medium text-slate-100 mb-1">
                  Debug a failing build
                </p>
                <p className="text-xs text-slate-400">
                  Describe the error logs and let Builder trace and fix the problem.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {orderedMessages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Typing indicator while waiting for response */}
            <TypingIndicator isVisible={isSending} />

            {/* Task Activity Logs */}
            {logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  <Terminal size={12} />
                  Task Activity
                </div>
                <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 space-y-2 font-mono text-xs max-h-48 overflow-y-auto">
                  {logs.map((log, idx) => (
                    <motion.div
                      key={`${log}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="text-slate-300 leading-relaxed flex items-start gap-2"
                    >
                      <span className="text-sky-400/60 select-none">&gt;</span>
                      <span>{log}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-800 px-4 py-4 bg-slate-950/60 flex-shrink-0">
        <form className="max-w-3xl mx-auto" onSubmit={handleSubmit}>
          <div className="relative rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_0_25px_rgba(15,23,42,0.85)] focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              className="w-full resize-none bg-transparent pl-4 pr-12 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none max-h-40"
              placeholder="Type / for commands, @ for files, or ask Builder anything..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              className={clsx(
                "absolute right-2.5 bottom-2.5 p-2 rounded-lg text-white transition-all",
                isSending
                  ? "bg-sky-600/50 cursor-wait"
                  : "bg-sky-500 hover:bg-sky-400 hover:shadow-lg hover:shadow-sky-500/25",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-2 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>Press Enter to send, Shift+Enter for a new line</span>
            </div>
            {draft.length > 0 && <span>{draft.length} characters</span>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
