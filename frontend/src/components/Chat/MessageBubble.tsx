import clsx from "clsx";
import { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[78%] rounded-2xl px-4 py-2 text-sm shadow-glow",
          isUser
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-900"
            : "glass border border-slate-800 text-slate-100"
        )}
      >
        <p className="text-[11px] uppercase tracking-wide text-slate-300/80">
          {isUser ? "You" : "Assistant"}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed text-slate-100">{message.content}</p>
        <p className="mt-1 text-[10px] text-slate-400">{new Date(message.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
