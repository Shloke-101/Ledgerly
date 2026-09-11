import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ServerCrash, ShieldX } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onReset?: () => void;
  retryLabel?: string;
  resetLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Audit Error',
  message,
  onRetry,
  onReset,
  retryLabel = 'Retry',
  resetLabel = 'Try another repository',
}) => {
  const isNetwork = message.toLowerCase().includes('backend') || message.toLowerCase().includes('connect') || message.toLowerCase().includes('reach');
  const isNotFound = message.toLowerCase().includes('not found') || message.toLowerCase().includes('404');

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4 text-center">
      <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-8 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto mb-4">
          {isNetwork ? (
            <ServerCrash className="w-6 h-6" />
          ) : isNotFound ? (
            <ShieldX className="w-6 h-6" />
          ) : (
            <AlertTriangle className="w-6 h-6" />
          )}
        </div>

        <h3 className="text-lg font-bold text-white tracking-tight">
          {title}
        </h3>

        <p className="mt-2 text-xs text-slate-300 leading-relaxed font-sans">
          {message}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{retryLabel}</span>
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#161c28] hover:bg-[#1f2637] border border-[#252b38] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{resetLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
