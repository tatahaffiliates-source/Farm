import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  action,
  secondaryAction,
  children,
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">{title}</h1>
          {badge && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-sm text-stone-500 mt-1 max-w-2xl">{description}</p>}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors cursor-pointer"
          >
            {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4" />}
            {secondaryAction.label}
          </button>
        )}

        {action && (
          <button
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer ${
              action.disabled
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/10'
            }`}
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </button>
        )}

        {children}
      </div>
    </div>
  );
};
