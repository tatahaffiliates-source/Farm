import React from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  id,
}) => {
  return (
    <div className="space-y-1.5" id={id}>
      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
        {label} {required && <span className="text-rose-600 font-bold">*</span>}
      </label>
      {children}
      {helperText && !error && <p className="text-xs text-stone-500">{helperText}</p>}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
};
