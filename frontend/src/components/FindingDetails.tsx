import React from 'react';
import { X, Package, ExternalLink, Sparkles, Wrench, FileText } from 'lucide-react';
import { VulnerabilitySummary } from '../types/api';

export interface FindingItemWithPackage extends VulnerabilitySummary {
  packageName: string;
  packageVersion: string;
  ecosystem: string;
}

interface FindingDetailsProps {
  finding: FindingItemWithPackage | null;
  onClose: () => void;
}

export const FindingDetails: React.FC<FindingDetailsProps> = ({ finding, onClose }) => {
  if (!finding) return null;

  const getSeverityBadge = (sev: string) => {
    const s = sev.toLowerCase();
    if (s === 'critical') return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
    if (s === 'high') return 'bg-orange-950/60 text-orange-400 border-orange-800/60';
    if (s === 'medium') return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
    if (s === 'low') return 'bg-blue-950/60 text-blue-400 border-blue-800/60';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const isOsvOrGhsa = finding.osv_id?.startsWith('GHSA-') || finding.osv_id?.startsWith('CVE-') || finding.osv_id?.startsWith('PYSEC-') || finding.osv_id?.startsWith('RUSTSEC-') || finding.osv_id?.startsWith('GO-');
  const osvUrl = isOsvOrGhsa ? `https://osv.dev/vulnerability/${finding.osv_id}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-xl border border-[#252b38] bg-[#11151f] shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#252b38] bg-[#0d111a]">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                  finding.severity
                )}`}
              >
                {finding.severity}
              </span>
              <span className="font-mono text-sm font-semibold text-white">
                {finding.osv_id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Package className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-mono text-slate-200">
                {finding.packageName}@{finding.packageVersion}
              </span>
              <span className="text-slate-600">•</span>
              <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#161c28] border border-[#252b38] text-slate-400">
                {finding.ecosystem}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2637] transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
          {/* Remediation / Fix Recommendation (if exists) */}
          {finding.suggested_fix_version && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-300">
                <Wrench className="w-4 h-4" />
                <span>Recommended Upgrade</span>
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Upgrade <code className="px-1.5 py-0.5 rounded bg-emerald-900/40 font-mono text-white">{finding.packageName}</code> to version{' '}
                <code className="px-1.5 py-0.5 rounded bg-emerald-900/60 font-mono text-emerald-200 font-bold">{finding.suggested_fix_version}</code> or higher.
              </p>
            </div>
          )}

          {/* AI Security Explanation (if exists) */}
          {finding.llm_explanation && (
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-indigo-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-indigo-300 text-xs">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Impact Assessment & Remediation Guidance</span>
              </div>
              <p className="text-xs text-indigo-100/90 leading-relaxed whitespace-pre-line font-sans">
                {finding.llm_explanation}
              </p>
            </div>
          )}

          {/* Raw Advisory Description */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Advisory Description</span>
            </div>
            <div className="p-4 rounded-xl bg-[#080b12] border border-[#252b38] text-slate-300 text-xs leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
              {finding.raw_description || 'No raw advisory description provided by the registry.'}
            </div>
          </div>

          {/* References & Links */}
          {osvUrl && (
            <div className="pt-2 border-t border-[#252b38] flex items-center justify-between">
              <span className="text-xs text-slate-500">Official Database Advisory</span>
              <a
                href={osvUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
              >
                <span>View on OSV.dev</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#252b38] bg-[#0d111a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1f2637] hover:bg-[#283248] text-slate-200 font-medium text-xs transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
