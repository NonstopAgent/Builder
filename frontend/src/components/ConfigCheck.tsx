import { API_BASE_URL } from "../api/config";
import { AlertCircle } from "lucide-react";

export const ConfigCheck = ({ children }: { children: React.ReactNode }) => {
  const isProduction = import.meta.env.MODE === 'production';

  // In production, if API_BASE_URL is missing or empty, it's a critical configuration error
  // because the frontend won't be able to reach the backend.
  if (isProduction && !API_BASE_URL) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8 max-w-2xl flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Configuration Error</h1>
          <p className="text-slate-300">
            The frontend cannot connect to the backend because the API URL is not configured.
          </p>
          <div className="bg-slate-900 rounded p-4 text-left w-full mt-4 border border-slate-800">
            <h3 className="text-slate-200 font-semibold mb-2">How to fix this:</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-2">
              <li>Go to your deployment settings (e.g., Vercel Dashboard).</li>
              <li>Add an environment variable named <code className="text-yellow-400">VITE_API_BASE_URL</code>.</li>
              <li>Set its value to your backend URL (e.g., <code className="text-blue-400">https://your-backend.railway.app</code>).</li>
              <li>Redeploy the frontend.</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
