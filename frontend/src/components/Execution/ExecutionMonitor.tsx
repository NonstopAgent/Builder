import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Zap } from "lucide-react";
import { getExecutionStatus } from "../../api/tasks";

interface ExecutionMonitorProps {
  taskId: string;
}

interface VerificationResult {
  step: number;
  type: string;
  passed: boolean;
  details: string;
}

export const ExecutionMonitor = ({ taskId }: ExecutionMonitorProps) => {
  const [progress, setProgress] = useState(0);
  const { data: status, isLoading } = useQuery({
    queryKey: ["execution-status", taskId],
    queryFn: async () => getExecutionStatus(taskId),
    refetchInterval: 2000,
    enabled: !!taskId,
  });

  useEffect(() => {
    if (status?.progress_percentage !== undefined) {
      setProgress(status.progress_percentage);
    }
  }, [status]);

  if (isLoading || !status) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  const verificationResults: VerificationResult[] = status.verification_results || [];

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-200">Execution Progress</span>
          <span className="text-slate-400">
            Step {status.current_step || 0} of {status.total_steps}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {verificationResults.length > 0 && (
        <div className="glass rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Zap size={16} className="text-amber-400" />
            Verification Results
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {verificationResults.map((result, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    result.passed
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-rose-500/30 bg-rose-500/10"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle2 className="mt-0.5 text-emerald-400" size={18} />
                  ) : (
                    <AlertCircle className="mt-0.5 text-rose-400" size={18} />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">
                      Step {result.step}: {result.type}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{result.details}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <div className="mb-3 text-sm font-semibold text-slate-200">Recent Activity</div>
        <div className="space-y-1">
          {status.recent_logs.map((log: string, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded bg-slate-900/50 px-3 py-2 font-mono text-xs text-slate-300"
            >
              {log}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
