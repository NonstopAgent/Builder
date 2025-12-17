import { useState, useCallback, memo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { User, Bot, Copy, Check, Clock, RefreshCw } from "lucide-react";
import { ChatMessage } from "../../types";
import clsx from "clsx";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onCopyMessage?: (content: string) => void;
}

// Format timestamp to human-readable format
const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

// Copy button component for code blocks
const CopyButton = memo(({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
      title={copied ? "Copied!" : "Copy code"}
    >
      {copied ? (
        <>
          <Check size={12} className="text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
});

CopyButton.displayName = "CopyButton";

// Code block component with Prism syntax highlighting
const CodeBlock = memo(({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "plaintext";
  const code = String(children).replace(/\n$/, "");

  // Map common language aliases
  const languageMap: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
  };
  const prismLanguage = languageMap[language] || language;

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, prismLanguage]);

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-slate-800/90 px-3 py-1.5 rounded-t-lg border-b border-slate-700/50">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">
          {language}
        </span>
        <CopyButton code={code} />
      </div>
      <pre className="!mt-0 !rounded-t-none overflow-x-auto rounded-b-lg bg-slate-900 border border-t-0 border-slate-700/50 p-4 text-sm font-mono">
        <code ref={codeRef} className={`language-${prismLanguage}`}>
          {code}
        </code>
      </pre>
    </div>
  );
});

CodeBlock.displayName = "CodeBlock";

// Inline code component
const InlineCode = memo(({ children }: { children: React.ReactNode }) => (
  <code className="px-1.5 py-0.5 rounded-md bg-slate-800 text-sky-300 text-sm font-mono border border-slate-700/50">
    {children}
  </code>
));

InlineCode.displayName = "InlineCode";

// Message actions component
const MessageActions = memo(({
  content,
  isAssistant,
  onRegenerate,
}: {
  content: string;
  isAssistant: boolean;
  onRegenerate?: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [content]);

  return (
    <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
        title="Copy message"
      >
        {copied ? (
          <Check size={12} className="text-green-400" />
        ) : (
          <Copy size={12} />
        )}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>

      {isAssistant && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
          title="Regenerate response"
        >
          <RefreshCw size={12} />
          <span>Regenerate</span>
        </button>
      )}
    </div>
  );
});

MessageActions.displayName = "MessageActions";

// Main MessageBubble component
export const MessageBubble = memo(({ message, onRegenerate }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const bubbleVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      className={clsx(
        "flex gap-3 group",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-sky-500 to-blue-600"
            : "bg-gradient-to-br from-purple-500 to-violet-600"
        )}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Message content */}
      <div
        className={clsx(
          "flex-1 max-w-[85%] space-y-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Header with role and timestamp */}
        <div
          className={clsx(
            "flex items-center gap-2 text-xs",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className={clsx(
            "font-medium",
            isUser ? "text-sky-400" : "text-purple-400"
          )}>
            {isUser ? "You" : "Assistant"}
          </span>
          {message.timestamp && (
            <span className="flex items-center gap-1 text-slate-500">
              <Clock size={10} />
              {formatTimestamp(message.timestamp)}
            </span>
          )}
        </div>

        {/* Message bubble */}
        <div
          className={clsx(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 text-slate-100"
              : "bg-slate-800/60 border border-slate-700/50 text-slate-200"
          )}
        >
          {isAssistant ? (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Code blocks
                  code({ className, children, ...props }) {
                    const isInline = !className && !String(children).includes("\n");
                    if (isInline) {
                      return <InlineCode>{children}</InlineCode>;
                    }
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                  },
                  // Links
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                  // Lists
                  ul({ children }) {
                    return (
                      <ul className="list-disc list-inside space-y-1 my-2 text-slate-300">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }) {
                    return (
                      <ol className="list-decimal list-inside space-y-1 my-2 text-slate-300">
                        {children}
                      </ol>
                    );
                  },
                  // Blockquotes
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-sky-500/50 pl-4 py-1 my-2 text-slate-400 italic">
                        {children}
                      </blockquote>
                    );
                  },
                  // Headings
                  h1({ children }) {
                    return <h1 className="text-lg font-semibold text-slate-100 mt-4 mb-2">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-semibold text-slate-100 mt-3 mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>;
                  },
                  // Paragraphs
                  p({ children }) {
                    return <p className="text-slate-200 leading-relaxed my-2 first:mt-0 last:mb-0">{children}</p>;
                  },
                  // Tables
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border border-slate-700 rounded-lg overflow-hidden">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return <thead className="bg-slate-800">{children}</thead>;
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-300 border-b border-slate-700">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-2 text-sm text-slate-400 border-b border-slate-800">
                        {children}
                      </td>
                    );
                  },
                  // Horizontal rule
                  hr() {
                    return <hr className="my-4 border-slate-700" />;
                  },
                  // Strong/Bold
                  strong({ children }) {
                    return <strong className="font-semibold text-slate-100">{children}</strong>;
                  },
                  // Emphasis/Italic
                  em({ children }) {
                    return <em className="italic text-slate-300">{children}</em>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            // User messages are plain text
            <p className="text-slate-100 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          )}
        </div>

        {/* Message actions */}
        <MessageActions
          content={message.content}
          isAssistant={isAssistant}
          onRegenerate={onRegenerate}
        />
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
