import { ExternalLink, Globe2 } from "lucide-react";
import { motion } from "framer-motion";

interface PreviewPanelProps {
  url?: string;
  html?: string;
}

const PreviewPanel = ({ url, html }: PreviewPanelProps) => {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800/70 bg-slate-950/70">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <Globe2 size={16} className="text-neon" /> Preview
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            className="flex items-center gap-1 text-xs text-neon hover:underline"
            rel="noreferrer"
          >
            Open <ExternalLink size={14} />
          </a>
        )}
      </div>
      <div className="h-full overflow-hidden bg-slate-900/70">
        {url ? (
          <iframe src={url} className="h-full w-full border-0" title="Live preview" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400"
          >
            <p className="text-sm">No preview URL yet. Provide HTML to render inline.</p>
            {html && (
              <div className="h-[420px] w-full max-w-3xl overflow-auto rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-left">
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
