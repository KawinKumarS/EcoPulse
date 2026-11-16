import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'amber' | 'blue' | 'red' | 'slate';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'sm',
  pulse = false,
}) => {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
    blue: 'bg-sky-50 text-sky-700 border-sky-200/80',
    red: 'bg-rose-50 text-rose-700 border-rose-200/80',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  const dotStyles = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-sky-500',
    red: 'bg-rose-500',
    slate: 'bg-slate-400',
  }[variant];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        styles
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotStyles)} />
          <span className={clsx('relative inline-flex rounded-full h-2 w-2', dotStyles)} />
        </span>
      )}
      {children}
    </span>
  );
};
