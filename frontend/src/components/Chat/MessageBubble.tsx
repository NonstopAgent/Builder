import clsx from "clsx";
import { User, Sparkles } from "lucide-react";
import { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  
  return (
    <div className={clsx("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-blue-600" 
            : "bg-gradient-to-br from-amber-500 to-orange-600"
        )}>
          {isUser ? (
            <User size={16} className="text-white" />
          ) : (
            <Sparkles size={16} className="text-white" />
          )}
        </div>
      </div>

      {/* Message content */}
      <div className={clsx("flex-1 space-y-1", isUser ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            {isUser ? "You" : "Super Builder"}
          </span>
          <span className="text-[10px] text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        
        <div className={clsx(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser 
            ? "bg-blue-600 text-white ml-8" 
            : "bg-slate-800 text-slate-100 mr-8"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
