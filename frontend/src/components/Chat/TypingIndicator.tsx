import { memo } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator = memo(({ isVisible }: TypingIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-violet-600">
        <Bot size={16} className="text-white" />
      </div>

      {/* Typing bubble */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-purple-400">Assistant</span>
        <div className="rounded-2xl px-4 py-3 bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
            />
            <motion.span
              className="w-2 h-2 rounded-full bg-purple-400"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
            />
            <span className="ml-2 text-sm text-slate-400">Thinking...</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

TypingIndicator.displayName = "TypingIndicator";

export default TypingIndicator;
