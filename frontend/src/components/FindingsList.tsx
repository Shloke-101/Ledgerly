import React, { useState } from 'react';
import { ShieldAlert, Package, Search, ChevronRight } from 'lucide-react';
import { DependencyReport } from '../types/api';
import { FindingItemWithPackage } from './FindingDetails';

interface FindingsListProps {
  dependencies: DependencyReport[];
  filterSeverity?: string | null;
  onSelectFinding: (finding: FindingItemWithPackage) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  dependencies,
  filterSeverity,
  onSelectFinding,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten all vulnerabilities with parent package metadata
  const allFindings: FindingItemWithPackage[] = dependencies.flatMap((dep) =>
    (dep.vulnerabilities || []).map((vuln) => ({
      ...vuln,
      packageName: dep.package_name,
      packageVersion: dep.version,
      ecosystem: dep.ecosystem,
    }))
  );

  const filteredFindings = allFindings.filter((item) => {
    // Severity filter
    if (filterSeverity && item.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
      return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPkg = item.packageName.toLowerCase().includes(q);
      const matchOsv = item.osv_id.toLowerCase().includes(q);
      const matchDesc = item.raw_description.toLowerCase().includes(q);
      const matchLlm = item.llm_explanation?.toLowerCase().includes(q);
      return matchPkg || matchOsv || matchDesc || Boolean(matchLlm);
    }

    return true;
  });

  const getSeverityBadgeStyle = (sev: string) => {
    const s = sev.toLowerCase();
    if (s === 'critical') return 'bg-rose-950/40 text-rose-400 border-rose-800/50';
    if (s === 'high') return 'bg-orange-950/40 text-orange-400 border-orange-800/50';
    if (s === 'medium') return 'bg-amber-950/40 text-amber-400 border-amber-800/50';
    if (s === 'low') return 'bg-blue-950/40 text-blue-400 border-blue-800/50';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const getSummaryTitle = (item: FindingItemWithPackage) => {
    // Look for brief title line from raw_description or AI explanation
    if (item.raw_description) {
      const firstLine = item.raw_description.split('\n')[0].replace(/^#+\s*/, '').trim();
      if (firstLine && firstLine.length < 100) return firstLine;
    }
    return `Security advisory in ${item.packageName}`;
  };

  if (allFindings.length === 0) {
    return (
      <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-white">No Vulnerabilities Detected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          All scanned manifests are clean. No matching security advisories found in the OSV database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search findings by package, CVE, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#11151f] border border-[#252b38] text-white placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-white">{filteredFindings.length}</span> of {allFindings.length} findings
          {filterSeverity && (
            <span className="ml-1 text-indigo-400">
              (Filtered by {filterSeverity})
            </span>
          )}
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            className="rounded-xl border border-[#252b38] bg-[#11151f] hover:border-[#3b4356] transition-all p-4 sm:p-5 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left Details */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadgeStyle(
                      finding.severity
                    )}`}
                  >
                    {finding.severity}
                  </span>

                  <span className="font-mono text-xs font-semibold text-slate-300">
                    {finding.osv_id}
                  </span>

                  <span className="text-slate-600 text-xs">•</span>

                  <span className="text-[11px] text-slate-400">
                    Dependency Vulnerability
                  </span>

                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#161c28] border border-[#252b38] text-slate-400">
                    {finding.ecosystem}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-white tracking-tight line-clamp-1">
                    {getSummaryTitle(finding)}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {finding.llm_explanation || finding.raw_description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-slate-400">
                  <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-slate-200">{finding.packageName}</span>
                  <span className="text-slate-500">v{finding.packageVersion}</span>
                  {finding.suggested_fix_version && (
                    <span className="ml-2 text-[11px] text-emerald-400 font-sans">
                      Fix available: <span className="font-mono font-medium">{finding.suggested_fix_version}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#252b38]/50 flex sm:block justify-end">
                <button
                  type="button"
                  onClick={() => onSelectFinding(finding)}
                  className="px-3.5 py-2 rounded-lg bg-[#161c28] hover:bg-[#1f2637] border border-[#252b38] text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <span>View Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
