import { X } from "lucide-react";
import clsx from "clsx";
import { Tab } from "../../types";

interface TabBarProps {
  tabs: Tab[];
  activeTabId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

const TabBar = ({ tabs, activeTabId, onSelect, onClose }: TabBarProps) => {
  if (tabs.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        Open a file to start editing
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-t-lg border-b border-slate-800 bg-slate-950/60 px-2 py-2 text-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={clsx(
            "group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-all",
            activeTabId === tab.id
              ? "bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-white"
              : "text-slate-300 hover:bg-slate-800/60"
          )}
        >
          <span className="font-medium">{tab.label}</span>
          {tab.isDirty && <span className="text-[10px] text-amber-300">●</span>}
          <X
            size={14}
            className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          />
        </button>
      ))}
    </div>
  );
};

export default TabBar;
