import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badge?: string;
  onClick?: () => void;
  id?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  badge,
  onClick,
  id,
}) => {
  const variantStyles = {
    default: 'bg-stone-50 text-stone-700 border-stone-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue: 'bg-sky-50 text-sky-800 border-sky-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const iconBgStyles = {
    default: 'bg-stone-100 text-stone-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    rose: 'bg-rose-100 text-rose-700',
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative p-5 rounded-xl border bg-white shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-emerald-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-stone-900 mt-1 font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-stone-500 mt-1.5">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  trend.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {trend.value}
              </span>
              <span className="text-[11px] text-stone-400">vs last month</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className={`p-2.5 rounded-lg ${iconBgStyles[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm border ${variantStyles[variant]}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
