import { useRef, useCallback, memo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useUIStore } from "../../store/useStore";
import { writeFile } from "../../api/files";
import { useToast } from "../Toast";

// Get Monaco language from file extension
const getMonacoLanguage = (path: string): string => {
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
    xml: "xml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    dockerfile: "dockerfile",
    graphql: "graphql",
    rust: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    rb: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    toml: "toml",
    ini: "ini",
    env: "shell",
  };
  return languageMap[ext || ""] || "plaintext";
};

const MonacoEditorComponent = memo(() => {
  const { tabs, activeTabId, updateTabContent } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const editorRef = useRef<unknown>(null);
  const toast = useToast();

  const handleSave = useCallback(async () => {
    if (!activeTab) return;

    try {
      await writeFile(activeTab.path, activeTab.content);
      toast.success("File saved", `${activeTab.label} saved successfully`);

      // Mark the tab as not dirty after successful save
      const { tabs: currentTabs } = useUIStore.getState();
      useUIStore.setState({
        tabs: currentTabs.map((t) =>
          t.id === activeTab.id ? { ...t, isDirty: false } : t
        ),
      });
    } catch (err) {
      console.error("Failed to save file:", err);
      toast.error("Save failed", "Could not save file. Check the console for details.");
    }
  }, [activeTab, toast]);

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // Add Cmd+S / Ctrl+S save shortcut
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        handleSave();
      });

      // Add format document shortcut (Shift+Alt+F / Shift+Option+F)
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          editor.getAction("editor.action.formatDocument")?.run();
        }
      );

      // Set editor focus
      editor.focus();
    },
    [handleSave]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeTab && value !== undefined) {
        updateTabContent(activeTab.id, value);
      }
    },
    [activeTab, updateTabContent]
  );

  if (!activeTab) {
    return null;
  }

  return (
    <div className="h-full w-full relative">
      <Editor
        height="100%"
        language={getMonacoLanguage(activeTab.path)}
        value={activeTab.content}
        onChange={handleEditorChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          fontLigatures: true,
          minimap: {
            enabled: true,
            scale: 1,
            showSlider: "mouseover",
          },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          renderWhitespace: "selection",
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          padding: {
            top: 16,
            bottom: 16,
          },
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          formatOnPaste: true,
          formatOnType: false,
          lineNumbers: "on",
          renderLineHighlight: "all",
          folding: true,
          foldingHighlight: true,
          showFoldingControls: "mouseover",
          matchBrackets: "always",
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoSurround: "languageDefined",
          suggest: {
            preview: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showKeywords: true,
            showSnippets: true,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading editor...</p>
            </div>
          </div>
        }
      />

      {/* Save indicator */}
      {activeTab.isDirty && (
        <div className="absolute bottom-2 right-2 text-xs text-amber-400 bg-slate-900/90 px-2 py-1 rounded flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Unsaved - Press Cmd+S to save
        </div>
      )}
    </div>
  );
});

MonacoEditorComponent.displayName = "MonacoEditor";

export default MonacoEditorComponent;
