import { Editor } from "@monaco-editor/react";
import { useMemo } from "react";
import { useUIStore } from "../../store/useStore";

const MonacoEditor = () => {
  const { tabs, activeTabId, updateTabContent } = useUIStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId), [tabs, activeTabId]);

  return (
    <div className="h-full overflow-hidden rounded-b-lg border border-slate-800/70 bg-slate-950/70">
      {activeTab ? (
        <Editor
          height="100%"
          defaultLanguage={activeTab.language || "typescript"}
          theme="vs-dark"
          value={activeTab.content}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            roundedSelection: false,
            fontFamily: "JetBrains Mono",
          }}
          onChange={(value) => updateTabContent(activeTab.id, value ?? "")}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Open a file to start editing.
        </div>
      )}
    </div>
  );
};

export default MonacoEditor;
