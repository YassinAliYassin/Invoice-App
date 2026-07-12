import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  badge,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-1 animate-fade-in">
    <div className="min-w-0">
      {badge && (
        <span className="badge bg-blue-50 text-blue-700 border border-blue-100 mb-2">
          {badge}
        </span>
      )}
      <h1 className="text-2xl sm:text-[1.65rem] font-extrabold tracking-tight text-slate-900">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
    )}
  </div>
);
