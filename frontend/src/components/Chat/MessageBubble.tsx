import clsx from "clsx";
import { User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../../types";

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className="flex-shrink-0">
        <div
          className={clsx(
            "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold",
            isUser
              ? "bg-sky-500/90 text-white shadow-sm"
              : "bg-slate-800 text-slate-100 border border-slate-700/70"
          )}
        >
          {isUser ? <User size={16} /> : <Sparkles size={16} className="text-sky-300" />}
        </div>
      </div>

      <div
        className={clsx(
          "max-w-3xl text-sm leading-relaxed rounded-2xl px-4 py-3 shadow-sm",
          "border transition-colors",
          isUser
            ? "bg-blue-600 text-white border-blue-500/70 ml-8"
            : "bg-slate-900/80 text-slate-50 border-slate-700/80 mr-8"
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }) {
                if (inline) {
                  return (
                    <code
                      className={clsx(
                        "font-mono text-[0.78rem] px-1.5 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/70",
                        className
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <pre
                    className={clsx(
                      "mt-3 mb-1 rounded-xl bg-slate-950/90 border border-slate-800/90",
                      "p-3 overflow-x-auto font-mono text-xs"
                    )}
                  >
                    <code {...props}>{children}</code>
                  </pre>
                );
              },
              a({ children, ...props }) {
                return (
                  <a
                    className="text-sky-400 hover:text-sky-300 underline decoration-sky-500/60 underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
              ul({ children, ...props }) {
                return (
                  <ul className="list-disc ml-5 space-y-1" {...props}>
                    {children}
                  </ul>
                );
              },
              ol({ children, ...props }) {
                return (
                  <ol className="list-decimal ml-5 space-y-1" {...props}>
                    {children}
                  </ol>
                );
              },
              blockquote({ children, ...props }) {
                return (
                  <blockquote
                    className="border-l-2 border-slate-600/70 pl-3 italic text-slate-300"
                    {...props}
                  >
                    {children}
                  </blockquote>
                );
              },
              h1({ children, ...props }) {
                return (
                  <h1 className="text-lg font-semibold text-slate-50 mb-2" {...props}>
                    {children}
                  </h1>
                );
              },
              h2({ children, ...props }) {
                return (
                  <h2 className="text-base font-semibold text-slate-50 mb-2" {...props}>
                    {children}
                  </h2>
                );
              },
              h3({ children, ...props }) {
                return (
                  <h3 className="text-sm font-semibold text-slate-100 mb-1.5" {...props}>
                    {children}
                  </h3>
                );
              },
              p({ children, ...props }) {
                return (
                  <p className="mb-1.5 text-[0.86rem] text-slate-100" {...props}>
                    {children}
                  </p>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
