import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/config";
import { AlertCircle, Loader2, ServerCrash } from "lucide-react";

export const ConfigCheck = ({ children }: { children: React.ReactNode }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>("");

  useEffect(() => {
    const validateConnection = async () => {
      // 1. Check if URL is configured at all
      if (!API_BASE_URL && import.meta.env.MODE === 'production') {
        setIsValid(false);
        setErrorDetail("MISSING_URL");
        return;
      }

      // 2. Probe the backend
      try {
        const healthUrl = `${API_BASE_URL}/health`.replace(/([^:]\/)\/+/g, "$1"); // remove double slashes
        const res = await fetch(healthUrl);

        const contentType = res.headers.get("content-type");
        const isJson = contentType && contentType.includes("application/json");

        if (!res.ok) {
           setIsValid(false);
           setErrorDetail(`HTTP_ERROR_${res.status}`);
           return;
        }

        if (!isJson) {
          // If we got 200 OK but it's HTML, we are likely hitting the frontend dev server or Vercel SPA
          setIsValid(false);
          setErrorDetail("INVALID_RESPONSE_TYPE");
          return;
        }

        setIsValid(true);
      } catch (err) {
        console.error("Backend health check failed:", err);
        setIsValid(false);
        setErrorDetail("CONNECTION_FAILED");
      }
    };

    validateConnection();
  }, []);

  if (isValid === null) {
    // Initial loading state - just show a subtle spinner or nothing
    // We choose to show a spinner to prevent "flash of content" if backend is slow
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-slate-400 text-sm">Connecting to server...</p>
         </div>
      </div>
    );
  }

  if (isValid === false) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-8 max-w-2xl flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
            <ServerCrash size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Connection Error</h1>

          <p className="text-slate-300">
            {errorDetail === "MISSING_URL" && "The frontend cannot connect to the backend because the API URL is not configured."}
            {errorDetail === "INVALID_RESPONSE_TYPE" && "The API URL appears to be pointing to this frontend instead of the backend."}
            {errorDetail === "CONNECTION_FAILED" && "Could not connect to the backend server. It may be down or the URL is incorrect."}
            {errorDetail.startsWith("HTTP_ERROR") && `The backend returned an error: ${errorDetail.split('_')[2]}`}
          </p>

          <div className="bg-slate-900 rounded p-4 text-left w-full mt-4 border border-slate-800">
            <h3 className="text-slate-200 font-semibold mb-2">Troubleshooting:</h3>
            <ul className="list-disc list-inside text-slate-400 space-y-2 text-sm">
              <li>Current Configured URL: <code className="text-yellow-400 break-all">{API_BASE_URL || "(empty)"}</code></li>

              {errorDetail === "MISSING_URL" && (
                <li>Add <code className="text-blue-400">VITE_API_BASE_URL</code> to your environment variables.</li>
              )}

              {errorDetail === "INVALID_RESPONSE_TYPE" && (
                <li>You likely set <code className="text-blue-400">VITE_API_BASE_URL</code> to the frontend URL. It must point to your Python backend (e.g. Railway/Render URL).</li>
              )}

              {(errorDetail === "CONNECTION_FAILED" || errorDetail.startsWith("HTTP_ERROR")) && (
                 <>
                    <li>Check if the backend server is running and accessible.</li>
                    <li>Verify CORS settings on the backend allow this origin.</li>
                 </>
              )}
            </ul>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
