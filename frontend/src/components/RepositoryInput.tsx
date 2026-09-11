import React, { useState } from 'react';
import { Loader2, ArrowRight, AlertCircle, Sparkles, Github } from 'lucide-react';
import { DemoRepo } from '../types/api';

interface RepositoryInputProps {
  onSubmit: (url: string) => Promise<void>;
  isLoading: boolean;
  demoRepos?: DemoRepo[];
}

export const RepositoryInput: React.FC<RepositoryInputProps> = ({
  onSubmit,
  isLoading,
  demoRepos = [],
}) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Client-side quick validation format checking
  const validateUrl = (raw: string): { isValid: boolean; normalized?: string; error?: string } => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { isValid: false, error: 'Please enter a GitHub repository URL or owner/repo.' };
    }

    // Match patterns: https://github.com/owner/repo, http://github.com/owner/repo, github.com/owner/repo, owner/repo
    const githubUrlRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/;
    const shorthandRegex = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;

    const matchUrl = trimmed.match(githubUrlRegex);
    if (matchUrl) {
      const owner = matchUrl[1];
      const repo = matchUrl[2].replace(/\.git$/, '');
      return { isValid: true, normalized: `https://github.com/${owner}/${repo}` };
    }

    const matchShorthand = trimmed.match(shorthandRegex);
    if (matchShorthand) {
      const owner = matchShorthand[1];
      const repo = matchShorthand[2].replace(/\.git$/, '');
      return { isValid: true, normalized: `https://github.com/${owner}/${repo}` };
    }

    return {
      isValid: false,
      error: 'Invalid GitHub URL format. Use https://github.com/owner/repo or owner/repo.',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    const validation = validateUrl(url);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid repository URL.');
      return;
    }

    try {
      await onSubmit(validation.normalized || url.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit repository for analysis.';
      setError(message);
    }
  };

  const handleSelectExample = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Github className="w-5 h-5 text-slate-400" />
            </div>
            <input
              id="repo-url-input"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              placeholder="https://github.com/owner/repository"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#11151f] border border-[#252b38] text-white placeholder-slate-500 text-sm focus:border-indigo-500 focus:bg-[#161c28] focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-60"
              aria-label="GitHub repository URL"
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <button
            id="analyze-submit-btn"
            type="submit"
            disabled={isLoading || !url.trim()}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-[#1d2332] disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Analyze Repository</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            id="input-error-msg"
            className="mt-3 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}
      </form>

      {/* Examples section */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="text-slate-500 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Try an example:
        </span>

        <button
          type="button"
          onClick={() => handleSelectExample('https://github.com/Shloke-101/Previa')}
          disabled={isLoading}
          className="px-2.5 py-1 rounded-md bg-[#11151f] hover:bg-[#181f2f] border border-[#252b38] hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 font-mono text-[11px] transition"
        >
          Shloke-101/Previa
        </button>

        {demoRepos.slice(1, 4).map((demo) => (
          <button
            key={demo.github_url}
            type="button"
            onClick={() => handleSelectExample(demo.github_url)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-md bg-[#11151f] hover:bg-[#181f2f] border border-[#252b38] hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 font-mono text-[11px] transition hidden sm:inline-block"
          >
            {demo.owner}/{demo.name}
          </button>
        ))}
      </div>
    </div>
  );
};
