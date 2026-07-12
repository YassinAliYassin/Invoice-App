import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'brand';
  trend?: number;
  onClick?: () => void;
}

const tones = {
  default: {
    icon: 'bg-slate-100 text-slate-600',
    value: 'text-slate-900',
  },
  success: {
    icon: 'bg-emerald-50 text-emerald-600',
    value: 'text-emerald-700',
  },
  danger: {
    icon: 'bg-red-50 text-red-600',
    value: 'text-red-600',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600',
    value: 'text-amber-700',
  },
  brand: {
    icon: 'bg-blue-50 text-blue-600',
    value: 'text-slate-900',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  trend,
  onClick,
}) => {
  const t = tones[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-modern p-5 text-left w-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className={`text-2xl font-extrabold tracking-tight mt-1.5 truncate ${t.value}`}>
            {value}
          </p>
          {(hint || trend !== undefined) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
              {trend !== undefined && (
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${
                    trend >= 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {trend >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {Math.abs(trend).toFixed(0)}%
                </span>
              )}
              {hint && <span className="truncate">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${t.icon}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </button>
  );
};
