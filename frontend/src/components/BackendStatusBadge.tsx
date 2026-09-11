import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { HealthResponse } from '../types/api';

export const BackendStatusBadge: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const data = await api.checkHealth();
      setHealth(data);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
      setHealth(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#252b38] bg-[#11151f] hover:bg-[#161c28] text-xs text-slate-300 font-medium transition-all"
        title="Click to view backend health details"
        aria-label="Backend status"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline === true
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : isOnline === false
              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              : 'bg-amber-400 animate-pulse'
          }`}
        />
        <span>
          {isOnline === true ? 'Backend Online' : isOnline === false ? 'Backend Offline' : 'Connecting...'}
        </span>
        <Activity className={`w-3.5 h-3.5 text-slate-400 ${isChecking ? 'animate-spin' : ''}`} />
      </button>

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#252b38] bg-[#11151f] p-4 shadow-xl z-50 text-xs">
            <div className="flex items-center justify-between border-b border-[#252b38] pb-2 mb-3">
              <span className="font-semibold text-slate-200">Backend Diagnostics</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  checkStatus();
                }}
                className="text-slate-400 hover:text-white transition"
                title="Refresh status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Endpoint:</span>
                <span className="font-mono text-slate-200 truncate max-w-[140px]" title={api.getApiBaseUrl() || window.location.origin}>
                  {api.getApiBaseUrl() || window.location.origin}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Status:</span>
                <span className={isOnline ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                  {isOnline ? 'Active' : 'Unreachable'}
                </span>
              </div>

              {health && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Database:</span>
                    <span className="text-slate-200 capitalize">{health.database}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Redis:</span>
                    <span className="text-slate-200 capitalize">{health.redis}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Version:</span>
                    <span className="font-mono text-slate-300">{health.version}</span>
                  </div>
                </>
              )}
            </div>

            {!isOnline && (
              <div className="mt-3 p-2 bg-rose-950/40 border border-rose-800/40 rounded text-rose-300 text-[11px] leading-tight flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Verify that the FastAPI backend server is running on port 8001.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
