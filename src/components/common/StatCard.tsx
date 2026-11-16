import React from 'react';
import clsx from 'clsx';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'eco' | 'solar' | 'electric' | 'slate';
  badge?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  trend,
  accentColor = 'eco',
  badge,
}) => {
  const accentClasses = {
    eco: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
    solar: 'text-amber-700 bg-amber-50 border-amber-200/80',
    electric: 'text-sky-700 bg-sky-50 border-sky-200/80',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
  }[accentColor];

  return (
    <Card className="hover:border-slate-300 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">
              {title}
            </span>
            {badge}
          </div>
          <div className="flex items-baseline gap-1.5 pt-1.5">
            <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {value}
            </span>
            {unit && <span className="text-sm font-semibold text-slate-500 font-sans">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 pt-0.5">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl border shadow-[0_1px_2px_rgba(0,0,0,0.02)]', accentClasses)}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className={clsx(
            'font-semibold inline-flex items-center gap-1',
            trend.isPositive ? 'text-emerald-600' : 'text-slate-600'
          )}>
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400 font-medium">{trend.label}</span>}
        </div>
      )}
    </Card>
  );
};
