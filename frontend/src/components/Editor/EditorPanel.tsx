import { useEffect, useState } from "react";
import SplitPane from "react-split-pane";
import { listFiles, readFile } from "../../api";
import { FileEntry } from "../../types";
import { useUIStore } from "../../store/useStore";
import TabBar from "./TabBar";
import MonacoEditor from "./MonacoEditor";

const EditorPanel = () => {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab } = useUIStore();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const entries = await listFiles();
        setFiles(entries);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFiles();
  }, []);

  const handleOpenFile = async (file: FileEntry) => {
    if (file.type === "directory") return;
    try {
      const content = await readFile(file.path);
      addTab({
        id: file.path,
        path: file.path,
        label: file.name,
        language: file.path.endsWith(".tsx") ? "typescript" : "plaintext",
        content: content.content,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SplitPane split="vertical" minSize={160} defaultSize={220} className="relative">
      <div className="h-full overflow-auto border border-slate-800/70 bg-slate-950/60 p-2">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</div>
        {loading ? (
          <p className="text-xs text-slate-500">Loading files...</p>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => handleOpenFile(file)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm text-slate-200 hover:bg-slate-800/70"
              >
                <span>{file.name}</span>
                <span className="text-[10px] uppercase text-slate-400">{file.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex h-full flex-col">
        <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTab} onClose={closeTab} />
        <MonacoEditor />
      </div>
    </SplitPane>
  );
};

export default EditorPanel;
