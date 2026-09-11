import React, { useState } from 'react';
import { Shield, History, LayoutDashboard, Settings, X, Terminal } from 'lucide-react';
import { BackendStatusBadge } from './BackendStatusBadge';
import { api } from '../services/api';

interface NavbarProps {
  currentPage: 'home' | 'history' | 'results';
  onNavigate: (page: 'home' | 'history') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#252b38] bg-[#080b12]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="Ledgerly Home"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 fill-white/20" />
            </div>
            <div className="text-left">
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Ledgerly
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                  SecOps
                </span>
              </span>
            </div>
          </button>

          {/* Nav items */}
          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'home' || currentPage === 'results'
                  ? 'bg-[#11151f] text-indigo-400 border border-[#252b38]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#11151f]/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('history')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'history'
                  ? 'bg-[#11151f] text-indigo-400 border border-[#252b38]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#11151f]/50'
              }`}
            >
              <History className="w-4 h-4" />
              Audit History
            </button>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <BackendStatusBadge />
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg border border-[#252b38] bg-[#11151f] text-slate-400 hover:text-white hover:bg-[#161c28] transition"
            title="System Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="sm:hidden flex items-center justify-around border-t border-[#252b38] bg-[#0c101a] px-4 py-2">
        <button
          onClick={() => onNavigate('home')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            currentPage === 'home' || currentPage === 'results'
              ? 'text-indigo-400 bg-[#11151f]'
              : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            currentPage === 'history'
              ? 'text-indigo-400 bg-[#11151f]'
              : 'text-slate-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Audit History
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#252b38] bg-[#11151f] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#252b38]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">System Configuration</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Configured API Endpoint
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#080b12] border border-[#252b38] font-mono text-xs text-slate-300">
                  <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{api.getApiBaseUrl() || 'Relative Proxy (http://localhost:8001)'}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Set via <code className="text-slate-400">VITE_API_URL</code> environment variable.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/30 text-xs text-indigo-200 space-y-1">
                <p className="font-medium text-indigo-300">Scanner Specifications</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-200/80">
                  <li>OSV.dev real-time vulnerability feed</li>
                  <li>Multi-ecosystem manifests (npm, PyPI, Cargo, Go)</li>
                  <li>In-process event streaming & background pipelines</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
