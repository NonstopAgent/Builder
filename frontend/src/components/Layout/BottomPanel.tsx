import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

interface BottomPanelProps {
  logs: string[];
}

const BottomPanel = ({ logs }: BottomPanelProps) => {
  return (
    <div className="h-full rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Terminal size={16} className="text-neon" /> Terminal
      </div>
      <div className="h-[16vh] overflow-auto rounded-lg bg-slate-900/60 p-3 font-mono text-xs text-slate-200">
        {logs.length === 0 ? (
          <p className="text-slate-500">Logs will appear here when you run a task.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, idx) => (
              <motion.pre
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="whitespace-pre-wrap rounded bg-slate-900/70 p-2"
              >
                {log}
              </motion.pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomPanel;
