import { useCallback, useRef } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useUIStore } from "../../store/useStore";
import { Loader2 } from "lucide-react";

// Language detection from file extension
const getLanguage = (path?: string): string => {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    py: "python",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    sql: "sql",
    xml: "xml",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
  };
  return languageMap[ext || ""] || "plaintext";
};

export default function MonacoEditor() {
  const { tabs, activeTabId, updateTabContent } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Configure editor theme
    monaco.editor.defineTheme("super-builder-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569CD6" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#e2e8f0",
        "editor.lineHighlightBackground": "#1e293b",
        "editor.selectionBackground": "#334155",
        "editorLineNumber.foreground": "#64748b",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editorCursor.foreground": "#38bdf8",
        "editor.inactiveSelectionBackground": "#1e293b",
      },
    });
    monaco.editor.setTheme("super-builder-dark");

    // Add Cmd+S / Ctrl+S save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Future: trigger save action
      console.log("Save triggered");
    });

    // Focus the editor
    editor.focus();
  }, []);

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      if (activeTab && value !== undefined) {
        updateTabContent(activeTab.id, value);
      }
    },
    [activeTab, updateTabContent]
  );

  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950">
      <Editor
        height="100%"
        language={activeTab.language || getLanguage(activeTab.path)}
        value={activeTab.content}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        loading={
          <div className="h-full flex items-center justify-center bg-slate-950">
            <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          lineNumbers: "on",
          renderLineHighlight: "line",
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          padding: { top: 16, bottom: 16 },
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
