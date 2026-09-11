import React, { useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  ShieldAlert,
  Calendar,
  Layers,
  Download,
  RotateCw,
} from 'lucide-react';
import { ScanReport } from '../types/api';
import { SecurityScore } from '../components/SecurityScore';
import { SeveritySummary } from '../components/SeveritySummary';
import { FindingsList } from '../components/FindingsList';
import { FindingDetails, FindingItemWithPackage } from '../components/FindingDetails';
import { DependencyList } from '../components/DependencyList';

interface AuditResultsProps {
  report: ScanReport;
  onBack: () => void;
  onReAudit: (githubUrl: string) => void;
}

export const AuditResults: React.FC<AuditResultsProps> = ({
  report,
  onBack,
  onReAudit,
}) => {
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<FindingItemWithPackage | null>(null);
  const [activeTab, setActiveTab] = useState<'findings' | 'dependencies'>('findings');

  const repoName = report.repo?.name || 'Repository';
  const githubUrl = report.repo?.github_url || `https://github.com/${repoName}`;
  const totalVulns = report.vulnerabilities_count || 0;
  const totalDeps = report.total_dependencies || 0;
  const vulnerableDeps = report.vulnerable_dependencies_count || 0;

  const downloadJsonReport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ledgerly-audit-${repoName.replace('/', '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252b38]">
        <div className="space-y-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-medium mb-1 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <GitBranch className="w-6 h-6 text-indigo-400 shrink-0" />
              {repoName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
              Security Audit
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-indigo-300 inline-flex items-center gap-1 transition"
            >
              <span>{githubUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {report.completed_at && (
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3" />
                Audited {new Date(report.completed_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={downloadJsonReport}
            className="px-3.5 py-2 rounded-lg border border-[#252b38] bg-[#11151f] hover:bg-[#161c28] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
            title="Download JSON Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => onReAudit(githubUrl)}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md shadow-indigo-600/20"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-scan</span>
          </button>
        </div>
      </div>

      {/* Overview Grid: Security Score + Severity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Security Score Gauge */}
        <div className="lg:col-span-1">
          <SecurityScore score={report.risk_score} />
        </div>

        {/* Right: Summary Metrics & Severity Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-4">
              <span className="text-xs text-slate-400">Total Dependencies</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">
                {totalDeps}
              </p>
            </div>
            <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-4">
              <span className="text-xs text-slate-400">Vulnerable Packages</span>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {vulnerableDeps}
              </p>
            </div>
            <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-4">
              <span className="text-xs text-slate-400">Total Advisories</span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {totalVulns}
              </p>
            </div>
          </div>

          <SeveritySummary
            criticalCount={report.critical_count}
            highCount={report.high_count}
            mediumCount={report.medium_count}
            lowCount={report.low_count}
            activeFilter={activeSeverityFilter}
            onFilterChange={setActiveSeverityFilter}
          />
        </div>
      </div>

      {/* Main Tabbed Area: Findings vs Dependencies */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#252b38] pb-1">
          <button
            onClick={() => setActiveTab('findings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'findings'
                ? 'bg-[#11151f] text-indigo-400 border border-[#252b38]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#11151f]/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security Findings ({totalVulns})</span>
          </button>

          <button
            onClick={() => setActiveTab('dependencies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'dependencies'
                ? 'bg-[#11151f] text-indigo-400 border border-[#252b38]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#11151f]/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Dependencies ({totalDeps})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'findings' ? (
          <FindingsList
            dependencies={report.dependencies}
            filterSeverity={activeSeverityFilter}
            onSelectFinding={setSelectedFinding}
          />
        ) : (
          <DependencyList dependencies={report.dependencies} />
        )}
      </div>

      {/* Finding Details Modal */}
      {selectedFinding && (
        <FindingDetails
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
};
