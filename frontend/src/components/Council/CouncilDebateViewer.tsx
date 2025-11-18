import { useEffect, useState } from "react";
import { Loader2, Users, FileText, CheckCircle2, RefreshCw, X } from "lucide-react";
import { getDebateDetails, startCouncilDebate } from "../../api/tasks";

interface CouncilDebateViewerProps {
  prd: string;
  onComplete: (architectureDoc: string) => void;
  onCancel: () => void;
}

interface DebateRoundOpinion {
  agent: string;
  proposal: string;
  concerns: string[];
  recommendations: string[];
  confidence: number;
}

interface DebateRoundDetails {
  round_number: number;
  topic: string;
  opinions: DebateRoundOpinion[];
}

export const CouncilDebateViewer = ({ prd, onComplete, onCancel }: CouncilDebateViewerProps) => {
  const [debateId, setDebateId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<DebateRoundDetails[]>([]);
  const [architecture, setArchitecture] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runDebate = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await startCouncilDebate(prd);
        setDebateId(response.debate_id);
        setArchitecture(response.architecture_document || "");
        if (response.debate_id) {
          const details = await getDebateDetails(response.debate_id);
          setRounds(details.rounds);
          setArchitecture(details.final_architecture || response.architecture_document || "");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to start council debate.");
      } finally {
        setIsLoading(false);
      }
    };

    runDebate();
  }, [prd]);

  const handleRefresh = async () => {
    if (!debateId) return;
    setIsLoading(true);
    try {
      const details = await getDebateDetails(debateId);
      setRounds(details.rounds);
      setArchitecture(details.final_architecture || architecture);
    } catch (err) {
      console.error(err);
      setError("Unable to refresh debate details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-slate-800/60 bg-slate-950/80 p-6 text-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Council</p>
          <h2 className="text-xl font-bold text-slate-50">Multi-agent Debate</h2>
          <p className="text-sm text-slate-400">PRD length: {prd.length} chars</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
          >
            <RefreshCw size={14} className="mr-1 inline" /> Refresh
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
          >
            <X size={14} className="mr-1 inline" /> Close
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-md border border-rose-500/50 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

      {isLoading && (
        <div className="flex items-center justify-center p-10 text-slate-400">
          <Loader2 className="mr-2 animate-spin" /> Running council debate...
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Users size={16} className="text-cyan-400" /> Debate Rounds
            </div>
            <div className="space-y-3">
              {rounds.map((round) => (
                <div key={round.round_number} className="rounded border border-slate-800/60 bg-slate-950/60 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Round {round.round_number}</span>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{round.topic}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {round.opinions.map((opinion, idx) => (
                      <div key={`${round.round_number}-${idx}`} className="rounded border border-slate-800/50 bg-slate-900/60 p-2">
                        <p className="text-sm font-semibold text-slate-100">{opinion.agent}</p>
                        <p className="text-xs text-slate-300">{opinion.proposal}</p>
                        {opinion.concerns.length > 0 && (
                          <p className="text-[11px] text-amber-300/80">Concerns: {opinion.concerns.join(", ")}</p>
                        )}
                        {opinion.recommendations.length > 0 && (
                          <p className="text-[11px] text-emerald-300/80">Recs: {opinion.recommendations.join(", ")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800/70 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FileText size={16} className="text-emerald-400" /> Architecture Summary
            </div>
            <pre className="h-[420px] overflow-auto rounded-lg border border-slate-800/60 bg-slate-950/50 p-3 text-xs text-slate-200">
              {architecture || "Waiting for council output..."}
            </pre>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onComplete(architecture)}
                disabled={!architecture}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> Use Architecture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
