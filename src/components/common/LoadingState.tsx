import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading farm records...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-stone-600">{message}</p>
    </div>
  );
};
