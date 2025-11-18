import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, FileCheck, ArrowLeft } from "lucide-react";
import { finalizeRequirements, startRequirements, submitAnswer } from "../../api/tasks";
import { ClarifyingQuestion } from "../../types";

interface RequirementsWizardProps {
  initialGoal: string;
  onComplete: (prd: string) => void;
  onCancel: () => void;
}

interface RequirementsProgress {
  answered: number;
  total: number;
  percentage?: number;
}

export const RequirementsWizard = ({ initialGoal, onComplete, onCancel }: RequirementsWizardProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [progress, setProgress] = useState<RequirementsProgress>({ answered: 0, total: 0 });
  const [specification, setSpecification] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = useMemo(() => questions[progress.answered], [questions, progress.answered]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await startRequirements(initialGoal);
        setSessionId(session.session_id);
        setQuestions(session.questions);
        setProgress({ answered: 0, total: session.total_questions, percentage: 0 });
      } catch (err) {
        console.error(err);
        setError("Unable to start requirements session.");
      }
    };

    bootstrap();
  }, [initialGoal]);

  const handleSubmit = async () => {
    if (!sessionId || !currentQuestion || !currentAnswer.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitAnswer(sessionId, {
        question_id: currentQuestion.id,
        answer: currentAnswer,
      });

      setSpecification(result.specification);
      setQuestions((prev) => [...prev.slice(0, progress.answered + 1), ...result.followup_questions]);
      setProgress(result.progress);
      setCurrentAnswer("");
    } catch (err) {
      console.error(err);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!sessionId) return;
    setIsFinalizing(true);
    setError(null);
    try {
      const result = await finalizeRequirements(sessionId);
      onComplete(result.prd);
    } catch (err) {
      console.error(err);
      setError("Failed to generate PRD. Try again.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-slate-800/70 bg-slate-950/80 p-6 text-slate-100 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Premium Flow</p>
          <h2 className="text-xl font-bold text-slate-50">Requirements Gathering</h2>
          <p className="text-sm text-slate-400">Goal: {initialGoal}</p>
        </div>
        <button
          className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-500"
          onClick={onCancel}
        >
          <ArrowLeft size={14} className="mr-1 inline" /> Close
        </button>
      </div>

      {error && <div className="mb-3 rounded-md border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

      {!sessionId && (
        <div className="flex items-center justify-center p-10 text-slate-400">
          <Loader2 className="mr-2 animate-spin" />
          Initializing session...
        </div>
      )}

      {sessionId && currentQuestion && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>
                Question {progress.answered + 1} of {progress.total}
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] capitalize">{currentQuestion.category}</span>
            </div>
            <p className="text-base font-semibold text-slate-50">{currentQuestion.prompt}</p>
            <textarea
              className="mt-3 h-32 w-full rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100 focus:border-cyan-500/60 focus:outline-none"
              placeholder="Type your answer here"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  style={{ width: `${progress.percentage ?? 0}%` }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !currentAnswer.trim()}
                className="ml-3 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-slate-900 shadow-glow disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Submit
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FileCheck size={16} className="text-emerald-400" />
              Specification (live)
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              {Object.keys(specification).length === 0 && <p className="text-slate-500">Answers will populate the PRD here.</p>}
              {Object.entries(specification).map(([key, value]) => (
                <div key={key} className="rounded border border-slate-800/60 bg-slate-950/40 p-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{key}</p>
                  {Array.isArray(value) ? (
                    <ul className="ml-3 list-disc text-slate-200">
                      {value.map((item, idx) => (
                        <li key={idx} className="text-xs text-slate-300">
                          {String(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-200">{String(value)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {progress.answered >= progress.total && progress.total > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleFinalize}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg"
                disabled={isFinalizing}
              >
                {isFinalizing ? <Loader2 className="animate-spin" size={16} /> : <FileCheck size={16} />} Finalize PRD
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
