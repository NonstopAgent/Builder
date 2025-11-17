import { FormEvent, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles } from "lucide-react";
import { ChatMessage } from "../../types";
import MessageBubble from "./MessageBubble";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

const ChatPanel = ({ messages, onSend }: ChatPanelProps) => {
  const [draft, setDraft] = useState("");

  const ordered = useMemo(
    () => [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800/70 bg-slate-950/70">
      <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2 text-sm text-slate-300">
        <Bot size={16} className="text-neon" /> AI Assistant
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3 pr-4">
        <AnimatePresence>
          {ordered.map((message) => (
            <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>
        {ordered.length === 0 && (
          <div className="mt-10 text-center text-sm text-slate-500">
            Ask the assistant to create tasks or explain code.
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
          <Sparkles size={16} className="text-neon" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the AI to build, refactor or explain..."
            className="w-full bg-transparent text-sm text-slate-100 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 text-sm font-semibold text-slate-900"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
