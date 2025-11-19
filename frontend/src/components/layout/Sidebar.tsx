import { useMemo, useState } from "react";
import { Plus, Rocket, Search, Sparkles } from "lucide-react";
import { Task, TaskStatus, TaskType } from "../../types";

interface SidebarProps {
  tasks: Task[];
  selectedTaskId?: string;
  onSelect: (taskId: string) => void;
  onCreate: (goal: string, type: TaskType) => void;
  isLoading?: boolean;
  onStartEnhancedWorkflow: (goal: string) => void;
}

const statusBadge = (status: TaskStatus) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-600/40";
    case "failed":
      return "bg-rose-500/15 text-rose-200 border-rose-600/40";
    case "in_progress":
      return "bg-amber-500/15 text-amber-200 border-amber-600/40";
    default:
      return "bg-slate-800 text-slate-300 border-slate-600";
  }
};

export const Sidebar = ({
  tasks,
  selectedTaskId,
  onSelect,
  onCreate,
  isLoading,
  onStartEnhancedWorkflow,
}: SidebarProps) => {
  const [goal, setGoal] = useState("Build a landing page for our AI product");
  const [type, setType] = useState<TaskType>("build");
  const [search, setSearch] = useState("");
  const [showPremiumMode, setShowPremiumMode] = useState(false);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.goal.toLowerCase().includes(search.toLowerCase())),
    [search, tasks]
  );

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="text-xs uppercase tracking-wide text-slate-400">Session Ready</div>
        <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
          <Rocket size={18} className="text-sky-400" />
          Super Builder Pro
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-sky-400" />
            Create a new goal
          </div>
          <button
            onClick={() => setShowPremiumMode(!showPremiumMode)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              showPremiumMode
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showPremiumMode ? "⭐ Premium" : "Standard"}
          </button>
        </div>

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          placeholder={
            showPremiumMode
              ? "Describe your vision... Council will ask clarifying questions"
              : "Describe what you want to build"
          }
          rows={4}
        />

        <div className="flex items-center justify-between text-[12px] text-slate-300">
          <div className="flex gap-2">
            {["build", "plan", "modify"].map((option) => (
              <button
                key={option}
                onClick={() => setType(option as TaskType)}
                className={`rounded-full px-3 py-1 capitalize transition-all ${
                  type === option
                    ? "bg-gradient-to-r from-cyan-500/80 to-blue-600/80 text-white"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[12px] font-semibold shadow-glow ${
              showPremiumMode
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                : "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
            }`}
            onClick={() => {
              if (!goal.trim()) return;
              if (showPremiumMode) {
                onStartEnhancedWorkflow(goal);
              } else {
                onCreate(goal, type);
              }
            }}
            disabled={isLoading}
          >
            <Plus size={14} />
            {showPremiumMode ? "Start Premium" : "Create"}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 text-[11px] uppercase tracking-wide text-slate-500">Projects</div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent text-xs focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onSelect(task.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                selectedTaskId === task.id
                  ? "border-sky-500/50 bg-slate-900"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className={`rounded-full px-2 py-0.5 border ${statusBadge(task.status)}`}>
                  {task.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-100 line-clamp-2">{task.goal}</p>
              <p className="text-[11px] text-slate-400">Type: {task.type}</p>
            </button>
          ))}

          {filteredTasks.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-center text-sm text-slate-500">
              {tasks.length === 0 ? "No tasks yet" : "No tasks match your search"}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
