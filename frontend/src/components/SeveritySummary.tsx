import React from 'react';
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface SeveritySummaryProps {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  activeFilter?: string | null;
  onFilterChange?: (severity: string | null) => void;
}

export const SeveritySummary: React.FC<SeveritySummaryProps> = ({
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  activeFilter,
  onFilterChange,
}) => {
  const cards = [
    {
      id: 'critical',
      label: 'Critical',
      count: criticalCount,
      color: 'text-rose-400',
      border: 'border-rose-800/40',
      bg: 'bg-rose-950/20',
      hoverBorder: 'hover:border-rose-500/60',
      activeRing: 'ring-1 ring-rose-500 bg-rose-950/40',
      icon: ShieldAlert,
    },
    {
      id: 'high',
      label: 'High',
      count: highCount,
      color: 'text-orange-400',
      border: 'border-orange-800/40',
      bg: 'bg-orange-950/20',
      hoverBorder: 'hover:border-orange-500/60',
      activeRing: 'ring-1 ring-orange-500 bg-orange-950/40',
      icon: AlertTriangle,
    },
    {
      id: 'medium',
      label: 'Medium',
      count: mediumCount,
      color: 'text-amber-400',
      border: 'border-amber-800/40',
      bg: 'bg-amber-950/20',
      hoverBorder: 'hover:border-amber-500/60',
      activeRing: 'ring-1 ring-amber-500 bg-amber-950/40',
      icon: AlertCircle,
    },
    {
      id: 'low',
      label: 'Low',
      count: lowCount,
      color: 'text-blue-400',
      border: 'border-blue-800/40',
      bg: 'bg-blue-950/20',
      hoverBorder: 'hover:border-blue-500/60',
      activeRing: 'ring-1 ring-blue-500 bg-blue-950/40',
      icon: Info,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((item) => {
        const IconComponent = item.icon;
        const isSelected = activeFilter === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange?.(isSelected ? null : item.id)}
            className={`rounded-xl border p-4 text-left transition-all ${item.border} ${item.bg} ${item.hoverBorder} ${
              isSelected ? item.activeRing : ''
            } focus:outline-none`}
            aria-label={`Filter by ${item.label} severity`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">{item.label}</span>
              <IconComponent className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-bold font-mono ${item.color}`}>
                {item.count}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
