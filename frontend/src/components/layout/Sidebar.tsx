import { useState } from "react";
import { 
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Folder,
  Sparkles
} from "lucide-react";
import { Task } from "../../types";

interface SidebarProps {
  tasks: Task[];
  selectedTaskId?: string | null;
  onSelect: (taskId: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
}

export const Sidebar = ({ tasks, selectedTaskId, onSelect, onNewChat, isLoading }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const projects = tasks.filter((task) => task.type === "build").slice(0, 8);

  const getTaskDate = (task: Task) => new Date(task.updatedAt ?? task.createdAt ?? Date.now());

  const filteredTasks = tasks.filter(task =>
    task.goal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tasks by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedTasks = {
    today: filteredTasks.filter(t => getTaskDate(t).toDateString() === today.toDateString()),
    yesterday: filteredTasks.filter(t => getTaskDate(t).toDateString() === yesterday.toDateString()),
    lastWeek: filteredTasks.filter(t => {
      const date = getTaskDate(t);
      return date > lastWeek && date < yesterday;
    }),
    older: filteredTasks.filter(t => getTaskDate(t) <= lastWeek)
  };

  if (collapsed) {
    return (
      <aside className="w-12 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
          title="Expand sidebar"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={onNewChat}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
          title="New chat"
        >
          <MessageSquarePlus size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* Header with collapse button */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-sky-400" />
          <span className="text-sm font-semibold text-slate-100">Super Builder</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* New Chat and Project buttons */}
      <div className="px-3 py-3 space-y-2 border-b border-slate-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors"
        >
          <MessageSquarePlus size={16} />
          New chat
        </button>
      </div>

      {/* Projects section */}
      <div className="px-3 pt-3 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Folder size={14} className="text-slate-400" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Projects
            </span>
          </div>
          {projects.length > 0 && (
            <span className="text-[10px] text-slate-500">
              {projects.length}
            </span>
          )}
        </div>

        {projects.length === 0 ? (
          <p className="text-[11px] text-slate-600">
            No projects yet. Describe a build in the chat to create one.
          </p>
        ) : (
          <div className="space-y-1">
            {projects.map((task) => (
              <button
                key={task.id}
                onClick={() => onSelect(task.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  selectedTaskId === task.id
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-300 hover:bg-slate-900"
                }`}
              >
                <div className="truncate">
                  {task.goal || task.title || "Untitled project"}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {getTaskDate(task).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-slate-800">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-3 py-4 text-xs text-slate-500">Loading chats...</div>
        )}

        {!isLoading && filteredTasks.length === 0 && (
          <div className="px-3 py-4 text-xs text-slate-500">
            {searchQuery ? "No matching chats" : "No chats yet. Start a new chat above."}
          </div>
        )}

        {!isLoading && (
          <>
            {/* Today */}
            {groupedTasks.today.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Today
                </div>
                <div className="px-2 space-y-0.5">
                  {groupedTasks.today.map((task) => (
                    <ChatItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => onSelect(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {groupedTasks.yesterday.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Yesterday
                </div>
                <div className="px-2 space-y-0.5">
                  {groupedTasks.yesterday.map((task) => (
                    <ChatItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => onSelect(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Last 7 days */}
            {groupedTasks.lastWeek.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Previous 7 days
                </div>
                <div className="px-2 space-y-0.5">
                  {groupedTasks.lastWeek.map((task) => (
                    <ChatItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => onSelect(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older */}
            {groupedTasks.older.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                  Older
                </div>
                <div className="px-2 space-y-0.5">
                  {groupedTasks.older.map((task) => (
                    <ChatItem
                      key={task.id}
                      task={task}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => onSelect(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock size={14} />
          <span>Session active</span>
        </div>
      </div>
    </aside>
  );
};

// Separate component for chat items
const ChatItem = ({ task, isSelected, onSelect }: { 
  task: Task; 
  isSelected: boolean; 
  onSelect: () => void 
}) => {
  const statusColor = {
    completed: "text-emerald-400",
    in_progress: "text-amber-400",
    failed: "text-rose-400",
    pending: "text-slate-400"
  }[task.status] || "text-slate-400";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-2 py-2 rounded-lg text-sm transition-colors group relative ${
        isSelected 
          ? "bg-slate-800 text-slate-50" 
          : "text-slate-300 hover:bg-slate-900"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {task.type === "build" ? (
            <Folder size={14} className={statusColor} />
          ) : (
            <MessageSquarePlus size={14} className={statusColor} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="line-clamp-2 text-sm">{task.goal || "Untitled"}</div>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
            <span className="capitalize">{task.type}</span>
            <span>•</span>
            <span>{getTaskDate(task).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default Sidebar;
