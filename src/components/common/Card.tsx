import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  action,
  icon,
}) => {
  return (
    <div
      className={clsx(
        'bg-white border border-slate-200/90 rounded-2xl shadow-card transition-all duration-200 overflow-hidden',
        className
      )}
    >
      {(title || action || icon) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="font-semibold text-slate-900 text-sm tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
