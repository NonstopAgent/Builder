import { Play, RefreshCw, Rocket, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";
import { useUIStore } from "../../store/useStore";
import { Task } from "../../types";

interface TopBarProps {
  selectedTask?: Task;
  onRunTask: () => void;
  onRunAll: () => void;
  onRefresh: () => void;
}

const TopBar = ({ selectedTask, onRunTask, onRunAll, onRefresh }: TopBarProps) => {
  const { panelVisibility, togglePanel } = useUIStore();

  return (
    <div className="flex items-center justify-between px-4 py-3 glass rounded-xl border border-slate-800/70 shadow-glow">
      <div className="flex items-center gap-2">
        <motion.div
          initial={{ rotate: -10, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="flex items-center gap-2"
        >
          <Rocket className="text-neon" size={22} />
          <div>
            <p className="text-xs text-slate-400">Session Ready</p>
            <p className="font-semibold text-slate-100">Super Builder Pro</p>
          </div>
        </motion.div>
        <span className="mx-3 h-6 w-[1px] bg-slate-700" />
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30"
            onClick={onRunTask}
            disabled={!selectedTask}
          >
            <Play size={16} /> Run Task
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
            onClick={onRunAll}
          >
            <Sparkles size={16} /> Run All
          </button>
          <button
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
            onClick={onRefresh}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-300">
        <button
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-500"
          onClick={() => togglePanel("showPreview")}
        >
          {panelVisibility.showPreview ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Preview
        </button>
        <button
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-500"
          onClick={() => togglePanel("showChat")}
        >
          {panelVisibility.showChat ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Chat
        </button>
        <button
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 hover:border-slate-500"
          onClick={() => togglePanel("showTerminal")}
        >
          {panelVisibility.showTerminal ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Terminal
        </button>
      </div>
    </div>
  );
};

export default TopBar;
