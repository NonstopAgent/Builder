import { Rocket } from "lucide-react";
import { Task } from "../../types";

interface SidebarProps {
  tasks: Task[];
  selectedTaskId?: string;
  onSelect: (taskId: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
}

export const Sidebar = ({ tasks, selectedTaskId, onSelect, onNewChat, isLoading }: SidebarProps) => {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Session Ready</div>
          <div className="text-lg font-semibold text-slate-50">Super Builder Pro</div>
        </div>
        <button
          onClick={onNewChat}
          className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700"
        >
          New chat
        </button>
      </div>

      <div className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-slate-500">Recents</div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {isLoading && (
          <div className="px-3 py-2 text-xs text-slate-500">Loading chats...</div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="px-3 py-2 text-xs text-slate-500">No chats yet. Start one in the middle panel.</div>
        )}

        {!isLoading &&
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelect(task.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                task.id === selectedTaskId ? "bg-slate-800 text-slate-50" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Rocket size={14} className="text-sky-400" />
                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="line-clamp-2">{task.goal || "Untitled"}</div>
            </button>
          ))}
      </div>
    </aside>
  );
};

export default Sidebar;
