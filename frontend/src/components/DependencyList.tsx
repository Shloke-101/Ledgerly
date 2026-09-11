import React, { useState } from 'react';
import { Package, Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { DependencyReport } from '../types/api';

interface DependencyListProps {
  dependencies: DependencyReport[];
}

export const DependencyList: React.FC<DependencyListProps> = ({ dependencies }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!dependencies || dependencies.length === 0) {
    return (
      <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-8 text-center text-xs text-slate-400">
        No dependency information available.
      </div>
    );
  }

  const filtered = dependencies.filter((dep) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      dep.package_name.toLowerCase().includes(q) ||
      dep.version.toLowerCase().includes(q) ||
      dep.ecosystem.toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Inspected Dependencies</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {dependencies.length} packages scanned across project manifests
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Filter dependencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#080b12] border border-[#252b38] text-white placeholder-slate-500 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#252b38] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="pb-3 pl-2">Package</th>
              <th className="pb-3">Version</th>
              <th className="pb-3">Ecosystem</th>
              <th className="pb-3">Vulnerabilities</th>
              <th className="pb-3 text-right pr-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252b38]/50">
            {filtered.map((dep) => {
              const vulnCount = dep.vulnerabilities?.length || 0;
              const isVulnerable = vulnCount > 0;

              return (
                <tr key={dep.id} className="hover:bg-[#161c28]/60 transition">
                  <td className="py-3 pl-2 font-mono font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{dep.package_name}</span>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-slate-300">
                    {dep.version || 'latest'}
                  </td>
                  <td className="py-3">
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-[#161c28] border border-[#252b38] text-slate-400">
                      {dep.ecosystem}
                    </span>
                  </td>
                  <td className="py-3 font-mono">
                    {isVulnerable ? (
                      <span className="text-rose-400 font-semibold">
                        {vulnCount} advisory{vulnCount > 1 ? 'ies' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 text-right pr-2">
                    {isVulnerable ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/40 border border-rose-800/40 text-rose-400">
                        <ShieldAlert className="w-3 h-3" />
                        Vulnerable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        Clean
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
