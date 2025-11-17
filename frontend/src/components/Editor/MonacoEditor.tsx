import React from "react";
import Editor from "react-simple-code-editor";
import { highlight, languages } from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css";
import { useUIStore } from "../../store/useStore";

export default function MonacoEditor() {
  const { tabs, activeTabId, updateTabContent } = useUIStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  const getLanguage = (lang?: string) => {
    const langMap: Record<string, any> = {
      javascript: languages.javascript,
      typescript: languages.typescript,
      python: languages.python,
      jsx: languages.jsx,
      tsx: languages.tsx,
      css: languages.css,
      json: languages.json,
      html: languages.html,
    };
    return (lang ? langMap[lang] : undefined) || languages.javascript;
  };

  return (
    <div className="h-full overflow-auto bg-editor-bg">
      <Editor
        value={activeTab.content}
        onValueChange={(code) => updateTabContent(activeTab.id, code)}
        highlight={(code) => highlight(code, getLanguage(activeTab.language), activeTab.language)}
        padding={20}
        textareaId="code-editor"
        className="min-h-full"
        style={{
          fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
          fontSize: 14,
          minHeight: "100%",
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          outline: "none",
        }}
        textareaClassName="focus:outline-none"
      />
    </div>
  );
}
