import React from 'react';
import { ShieldCheck, ShieldAlert, Shield, AlertOctagon } from 'lucide-react';

interface SecurityScoreProps {
  score: number; // 0 - 100 (risk score from backend)
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({ score }) => {
  // Score interpretation (Backend calculates risk_score where 0 is lowest risk, 100 is maximum risk)
  // Let's display both the raw risk index and a clear risk classification tier.
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const getTierDetails = (val: number) => {
    if (val >= 80) {
      return {
        label: 'Critical Risk',
        color: 'text-rose-400',
        bg: 'bg-rose-950/40',
        border: 'border-rose-800/50',
        barColor: 'bg-rose-500',
        icon: AlertOctagon,
        description: 'Severe vulnerabilities detected. Immediate remediation recommended.',
      };
    } else if (val >= 50) {
      return {
        label: 'High Risk',
        color: 'text-orange-400',
        bg: 'bg-orange-950/40',
        border: 'border-orange-800/50',
        barColor: 'bg-orange-500',
        icon: ShieldAlert,
        description: 'Significant vulnerabilities present in dependency tree.',
      };
    } else if (val >= 25) {
      return {
        label: 'Moderate Risk',
        color: 'text-amber-400',
        bg: 'bg-amber-950/40',
        border: 'border-amber-800/50',
        barColor: 'bg-amber-500',
        icon: Shield,
        description: 'Moderate security advisories detected. Update packages soon.',
      };
    } else if (val > 0) {
      return {
        label: 'Low Risk',
        color: 'text-blue-400',
        bg: 'bg-blue-950/40',
        border: 'border-blue-800/50',
        barColor: 'bg-blue-500',
        icon: ShieldCheck,
        description: 'Minor non-breaking advisories found.',
      };
    } else {
      return {
        label: 'Secure / Clean',
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-800/50',
        barColor: 'bg-emerald-500',
        icon: ShieldCheck,
        description: 'No known published OSV advisories found for inspected manifests.',
      };
    }
  };

  const tier = getTierDetails(clampedScore);
  const IconComponent = tier.icon;

  return (
    <div className="rounded-xl border border-[#252b38] bg-[#11151f] p-6 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Security Risk Score
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${tier.bg} ${tier.border} ${tier.color}`}>
          <IconComponent className="w-3.5 h-3.5" />
          <span>{tier.label}</span>
        </div>
      </div>

      <div className="my-5">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight text-white font-mono">
            {clampedScore}
          </span>
          <span className="text-xl font-medium text-slate-500 font-mono">/ 100</span>
        </div>

        {/* Progress meter */}
        <div className="mt-4 w-full h-2 rounded-full bg-[#080b12] border border-[#252b38] overflow-hidden">
          <div
            className={`h-full ${tier.barColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(4, clampedScore)}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {tier.description}
      </p>
    </div>
  );
};
