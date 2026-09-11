import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, GitBranch, Calendar, ArrowRight, RotateCw, ExternalLink, Loader2 } from 'lucide-react';
import { RepoSummary } from '../types/api';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

interface HistoryPageProps {
  onAuditRepo: (url: string) => void;
  onNavigateHome: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onAuditRepo,
  onNavigateHome,
}) => {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listRecentRepos(30);
      setRepos(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve audit history.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mb-3" />
        <p className="text-xs text-slate-400">Loading audit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to Load History"
        message={error}
        onRetry={fetchHistory}
        onReset={onNavigateHome}
        retryLabel="Retry"
        resetLabel="Return to Dashboard"
      />
    );
  }

  return (
    <div className="py-8 max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#252b38]">
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-indigo-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical record of repositories audited on Ledgerly
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-[#252b38] bg-[#11151f] hover:bg-[#161c28] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* History Content */}
      {repos.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No audit history available."
          description="You haven't performed any security audits yet. Start by scanning a repository on the dashboard."
          action={{
            label: "Analyze a Repository",
            onClick: onNavigateHome,
          }}
        />
      ) : (
        <div className="rounded-xl border border-[#252b38] bg-[#11151f] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#252b38] bg-[#0c101a] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 pl-4">Repository</th>
                  <th className="py-3.5">GitHub URL</th>
                  <th className="py-3.5">Last Audited</th>
                  <th className="py-3.5 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252b38]/50">
                {repos.map((repo) => (
                  <tr key={repo.id} className="hover:bg-[#161c28]/60 transition">
                    <td className="py-3.5 pl-4 font-mono font-medium text-white">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{repo.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <a
                        href={repo.github_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-slate-400 hover:text-indigo-300 font-mono text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <span className="truncate max-w-[200px]">{repo.github_url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>

                    <td className="py-3.5 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        {repo.last_scanned_at
                          ? new Date(repo.last_scanned_at).toLocaleString()
                          : repo.created_at
                          ? new Date(repo.created_at).toLocaleString()
                          : 'Recent'}
                      </span>
                    </td>

                    <td className="py-3.5 text-right pr-4">
                      <button
                        onClick={() => onAuditRepo(repo.github_url)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-xs inline-flex items-center gap-1 transition shadow-sm"
                      >
                        <span>Audit Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
