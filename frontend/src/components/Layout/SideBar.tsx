import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Plus, Search, Sparkles } from "lucide-react";
import { Task, TaskStatus, TaskType } from "../../types";
import { useUIStore } from "../../store/useStore";

interface SideBarProps {
  tasks: Task[];
  onCreate: (goal: string, type: TaskType) => void;
  onSelect: (taskId: string) => void;
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

const SideBar = ({ tasks, onCreate, onSelect, isLoading, onStartEnhancedWorkflow }: SideBarProps) => {
  const { selectedTaskId } = useUIStore();
  const [goal, setGoal] = useState("Build a landing page for our AI product");
  const [type, setType] = useState<TaskType>("build");
  const [search, setSearch] = useState("");
  const [showPremiumMode, setShowPremiumMode] = useState(false);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.goal.toLowerCase().includes(search.toLowerCase())),
    [search, tasks]
  );

  return (
    <div className="h-full space-y-4 rounded-xl glass p-3">
      <div className="rounded-lg border border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-3">
        <div className="flex items-center justify-between text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-neon" />
            <div>
              <p className="text-xs text-slate-400">Task Builder</p>
              <p className="text-sm font-semibold">Create a new goal</p>
            </div>
          </div>
          <button
            onClick={() => setShowPremiumMode(!showPremiumMode)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              showPremiumMode
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {showPremiumMode ? "⭐ Premium" : "Standard"}
          </button>
        </div>

        {showPremiumMode && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <Sparkles size={16} className="mt-0.5 text-amber-400" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-200">Premium Mode Active</p>
                <p className="mt-1 text-xs text-amber-300/80">
                  Multi-agent council will debate your requirements and create a detailed architecture plan
                </p>
              </div>
            </div>
          </div>
        )}

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="mt-3 h-24 w-full rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 text-sm text-slate-100 focus:border-neon/60 focus:outline-none"
          placeholder={
            showPremiumMode
              ? "Describe your vision... Council will ask clarifying questions"
              : "Describe what you want to build"
          }
        />
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex gap-2">
            {["build", "plan", "modify"].map((option) => (
              <button
                key={option}
                onClick={() => setType(option as TaskType)}
                className={`rounded-full px-3 py-1 capitalize transition-all ${
                  type === option
                    ? "bg-gradient-to-r from-cyan-500/80 to-blue-600/80 text-white"
                    : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-semibold shadow-glow ${
              showPremiumMode
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                : "bg-gradient-to-r from-neon to-blue-500 text-slate-900"
            }`}
            onClick={() => {
              if (showPremiumMode) {
                onStartEnhancedWorkflow(goal);
              } else {
                onCreate(goal, type);
              }
            }}
            disabled={isLoading || !goal.trim()}
          >
            <Plus size={14} />
            {showPremiumMode ? "Start Premium Flow" : "Create"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <ClipboardList size={16} /> Tasks
        </div>
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-slate-300">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent text-xs focus:outline-none"
          />
        </div>
        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "52vh" }}>
          <AnimatePresence>
            {filteredTasks.map((task) => (
              <motion.button
                key={task.id}
                layout
                onClick={() => onSelect(task.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                  selectedTaskId === task.id
                    ? "border-neon/40 bg-slate-800/60"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className={`rounded-full px-2 py-0.5 border ${statusBadge(task.status)}`}>
                    {task.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(task.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-100 line-clamp-2">{task.goal}</p>
                <p className="text-[11px] text-slate-400">Type: {task.type}</p>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
