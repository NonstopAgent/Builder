import { useEffect, useState, useCallback } from "react";
import SplitPane from "react-split-pane";
import { listFiles, readFile } from "../../api";
import { FileEntry } from "../../types";
import { useUIStore } from "../../store/useStore";
import TabBar from "./TabBar";
import MonacoEditor from "./MonacoEditor";
import FileTree from "./FileTree";
import { RefreshCw, FolderTree, Loader2 } from "lucide-react";

// Detect language from file extension
const getLanguage = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "html":
      return "html";
    case "py":
      return "python";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
};

const EditorPanel = () => {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useUIStore();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>();

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await listFiles();
      setFiles(entries);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileSelect = useCallback(async (file: FileEntry) => {
    if (file.type === "directory") return;

    setSelectedPath(file.path);

    // Check if tab already exists
    const existingTab = tabs.find((t) => t.path === file.path);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    try {
      const content = await readFile(file.path);
      addTab({
        id: file.path,
        path: file.path,
        label: file.name,
        language: getLanguage(file.path),
        content: content.content,
      });
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  }, [tabs, addTab, setActiveTab]);

  return (
    <SplitPane split="vertical" minSize={160} defaultSize={220} className="relative">
      <div className="h-full overflow-auto border-r border-slate-800/70 bg-slate-950/60">
        {/* File Explorer Header */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/50 px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <FolderTree size={12} />
              Workspace
            </div>
            <button
              onClick={loadFiles}
              disabled={loading}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Refresh files"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        </div>

        {/* File Tree */}
        <div className="p-1">
          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin mr-2" />
              Loading files...
            </div>
          ) : (
            <FileTree
              files={files}
              onFileSelect={handleFileSelect}
              selectedPath={selectedPath}
            />
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex h-full flex-col bg-slate-950">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTab}
          onClose={closeTab}
        />
        <div className="flex-1 min-h-0">
          {tabs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              <div className="text-center space-y-2">
                <FolderTree size={32} className="mx-auto text-slate-600" />
                <p>Select a file to view its contents</p>
              </div>
            </div>
          ) : (
            <MonacoEditor />
          )}
        </div>
      </div>
    </SplitPane>
  );
};

export default EditorPanel;
