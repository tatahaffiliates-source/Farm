import React from 'react';
import { PigStatus, BreedingStatus, PaymentStatus } from '../../types';

interface StatusBadgeProps {
  status: PigStatus | BreedingStatus | PaymentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  let colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';

  switch (status) {
    case 'Active':
    case 'Paid':
    case 'Delivered':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      break;
    case 'Pregnant':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200 font-medium';
      break;
    case 'Sick':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
      break;
    case 'Sold':
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200 font-medium';
      break;
    case 'Mated':
    case 'Partial':
      colorClasses = 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      break;
    case 'Pending':
    case 'Planned':
      colorClasses = 'bg-yellow-50 text-yellow-800 border-yellow-200 font-medium';
      break;
    case 'Dead':
    case 'Failed':
    case 'Removed':
      colorClasses = 'bg-stone-100 text-stone-600 border-stone-300 font-medium';
      break;
    case 'Transferred':
    case 'Cancelled':
      colorClasses = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
      break;
    default:
      colorClasses = 'bg-stone-100 text-stone-700 border-stone-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorClasses} whitespace-nowrap`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'Active' || status === 'Paid'
            ? 'bg-emerald-500'
            : status === 'Pregnant'
            ? 'bg-purple-500'
            : status === 'Sick'
            ? 'bg-rose-500'
            : status === 'Sold'
            ? 'bg-sky-500'
            : 'bg-stone-400'
        }`}
      />
      {status}
    </span>
  );
};
