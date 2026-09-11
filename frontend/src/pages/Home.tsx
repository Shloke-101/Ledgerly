import React, { useEffect, useState } from 'react';
import { Shield, History, ArrowRight, GitBranch, Calendar } from 'lucide-react';
import { RepositoryInput } from '../components/RepositoryInput';
import { DemoRepo, RepoSummary } from '../types/api';
import { api } from '../services/api';

interface HomeProps {
  onStartAudit: (url: string) => Promise<void>;
  isLoading: boolean;
  onNavigateHistory: () => void;
}

export const Home: React.FC<HomeProps> = ({
  onStartAudit,
  isLoading,
  onNavigateHistory,
}) => {
  const [demoRepos, setDemoRepos] = useState<DemoRepo[]>([]);
  const [recentRepos, setRecentRepos] = useState<RepoSummary[]>([]);

  useEffect(() => {
    // Load curated demo repos from backend
    api.getDemoRepos()
      .then((demos) => setDemoRepos(demos || []))
      .catch((err) => console.warn('Could not load demo repos', err));

    // Load recent repos
    api.listRecentRepos(5)
      .then((repos) => setRecentRepos(repos || []))
      .catch((err) => console.warn('Could not load recent repos', err));
  }, []);

  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center">
      {/* Centered Hero Section */}
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Small badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold tracking-wider uppercase">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Repository Security</span>
        </div>

        {/* Large heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Secure your repository.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Run a security audit on any public GitHub repository.
        </p>

        {/* Repository Input Form */}
        <div className="pt-4 pb-2">
          <RepositoryInput
            onSubmit={onStartAudit}
            isLoading={isLoading}
            demoRepos={demoRepos}
          />
        </div>
      </div>

      {/* Curated Demo Grid & Recent Repos (Simple & Professional) */}
      {recentRepos.length > 0 && (
        <div className="mt-16 w-full max-w-4xl mx-auto px-4 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-[#252b38] mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recently Audited Repositories</span>
            </div>
            <button
              onClick={onNavigateHistory}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recentRepos.slice(0, 3).map((r) => (
              <div
                key={r.id}
                onClick={() => onStartAudit(r.github_url)}
                className="cursor-pointer rounded-xl border border-[#252b38] bg-[#11151f] hover:border-indigo-500/50 hover:bg-[#161c28] p-4 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranch className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-mono text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {r.name}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-600" />
                    {r.last_scanned_at
                      ? new Date(r.last_scanned_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recently'}
                  </span>
                  <span className="text-indigo-400/80 font-medium">Re-audit</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
