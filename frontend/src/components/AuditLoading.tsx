import React from 'react';
import { Loader2, CheckCircle2, CircleDot, Circle, AlertCircle, GitBranch } from 'lucide-react';
import { WebSocketScanEvent } from '../types/api';

interface AuditLoadingProps {
  repoName: string;
  githubUrl?: string;
  currentEvent: WebSocketScanEvent | null;
  pollingProgress?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const AuditLoading: React.FC<AuditLoadingProps> = ({
  repoName,
  githubUrl,
  currentEvent,
  pollingProgress,
  errorMessage,
  onRetry,
  onCancel,
}) => {
  // Determine real backend progress stage based on event payload
  const hasRealtimeEvents = Boolean(currentEvent);
  const status = currentEvent?.status;
  const progress = currentEvent?.progress ?? pollingProgress ?? 15;

  // Stages definition
  // 1: Fetched repository manifests
  // 2: Parsed dependencies
  // 3: Scanning OSV database
  // 4: Security evaluation & AI remediation
  // 5: Report generation

  const isStep1Done = status ? ['parsing', 'scanning', 'clean', 'vulnerable', 'completed'].includes(status) : progress >= 20;
  const isStep1Active = status === 'connecting' || (!status && progress < 20);

  const isStep2Done = status ? ['scanning', 'clean', 'vulnerable', 'completed'].includes(status) : progress >= 30;
  const isStep2Active = status === 'parsing';

  const isStep3Done = status === 'completed' || (progress >= 85);
  const isStep3Active = status === 'scanning' || status === 'clean' || status === 'vulnerable' || (progress >= 30 && progress < 85);

  const isStep4Done = status === 'completed' || (progress >= 95);
  const isStep4Active = isStep3Done && status !== 'completed';

  const isStep5Done = status === 'completed';

  return (
    <div className="w-full max-w-xl mx-auto py-8">
      <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center pb-6 border-b border-[#252b38]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Analyzing repository</h2>
          <p className="mt-1 font-mono text-sm text-indigo-300 flex items-center justify-center gap-1.5">
            <GitBranch className="w-4 h-4 text-slate-400" />
            {repoName || 'repository'}
          </p>
          {githubUrl && (
            <p className="text-xs text-slate-500 truncate mt-0.5 max-w-sm mx-auto">
              {githubUrl}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="my-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
            <span>Scan Progress</span>
            <span className="font-mono text-indigo-300">{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#080b12] border border-[#252b38] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
            />
          </div>
        </div>

        {/* Real Backend Status Stage Panel */}
        {hasRealtimeEvents ? (
          <div className="space-y-3 font-mono text-xs">
            {/* Stage 1 */}
            <div className="flex items-center gap-3">
              {isStep1Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isStep1Active ? (
                <CircleDot className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className={isStep1Done ? 'text-slate-300' : isStep1Active ? 'text-indigo-300 font-semibold' : 'text-slate-600'}>
                Repository manifests fetched
              </span>
            </div>

            {/* Stage 2 */}
            <div className="flex items-center gap-3">
              {isStep2Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isStep2Active ? (
                <CircleDot className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className={isStep2Done ? 'text-slate-300' : isStep2Active ? 'text-indigo-300 font-semibold' : 'text-slate-600'}>
                Repository structure analyzed
              </span>
            </div>

            {/* Stage 3 */}
            <div className="flex items-center gap-3">
              {isStep3Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isStep3Active ? (
                <CircleDot className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className={isStep3Done ? 'text-slate-300' : isStep3Active ? 'text-indigo-300 font-semibold' : 'text-slate-600'}>
                {isStep3Active && currentEvent?.package_name && currentEvent.package_name !== '__system__' ? (
                  <>Scanning {currentEvent.package_name} {currentEvent.version ? `(${currentEvent.version})` : ''}</>
                ) : (
                  'Scanning dependencies'
                )}
              </span>
            </div>

            {/* Stage 4 */}
            <div className="flex items-center gap-3">
              {isStep4Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : isStep4Active ? (
                <CircleDot className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className={isStep4Done ? 'text-slate-300' : isStep4Active ? 'text-indigo-300 font-semibold' : 'text-slate-600'}>
                Running security checks
              </span>
            </div>

            {/* Stage 5 */}
            <div className="flex items-center gap-3">
              {isStep5Done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              )}
              <span className={isStep5Done ? 'text-slate-300' : 'text-slate-600'}>
                Generating audit report
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Security analysis in progress...</span>
            </div>
          </div>
        )}

        {/* Live message from backend */}
        {currentEvent?.message && (
          <div className="mt-4 p-2.5 rounded-lg bg-[#080b12] border border-[#252b38] text-xs font-mono text-slate-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-status-pulse" />
            <span className="truncate">{currentEvent.message}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Analysis Encountered an Issue</p>
              <p className="mt-0.5">{errorMessage}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 px-3 py-1 rounded bg-rose-800/60 hover:bg-rose-700 text-white font-medium text-xs transition"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          </div>
        )}

        {onCancel && !errorMessage && (
          <div className="mt-6 pt-4 border-t border-[#252b38] flex justify-center">
            <button
              onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Cancel and return to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
