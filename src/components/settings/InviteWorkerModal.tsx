import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FormField } from '../common/FormField';
import { supabase } from '../../lib/supabase';
import { UserRole } from '../../types';
import { AlertCircle, CheckCircle2, UserPlus, X } from 'lucide-react';

interface InviteWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteWorkerModal: React.FC<InviteWorkerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { canAccess, role: callerRole } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('worker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !canAccess(['admin', 'manager'])) return null;

  const assignableRoles: UserRole[] = callerRole === 'admin' ? ['worker', 'manager', 'admin'] : ['worker'];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!supabase) {
      setErrorMsg('Supabase is not configured.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('invite-worker', {
        body: {
          email: email.trim(),
          fullName: fullName.trim(),
          role: selectedRole,
          phone: phone.trim() || undefined,
        },
      });
      if (invokeError) {
        const isFetchError = invokeError.name === 'FunctionsFetchError';
        throw new Error(
          isFetchError
            ? 'Could not reach the invite-worker Edge Function. Make sure it is deployed and that "Enforce JWT Verification" is turned off for it (the browser CORS preflight is rejected while JWT verification is enabled).'
            : invokeError.message,
        );
      }
      if (data?.error) throw new Error(data.error);
      setSuccessMsg(`Invitation sent to ${email.trim()}.`);
      setEmail('');
      setFullName('');
      setPhone('');
      setSelectedRole('worker');
      onSuccess();
    } catch (error: any) {
      setErrorMsg(error.message || 'Could not send the invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        <div className="p-6 bg-stone-900 text-white border-b border-stone-800 relative">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 text-stone-400 hover:text-white" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 mx-auto flex items-center justify-center shadow-md mb-3">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-center">Invite Farm User</h2>
          <p className="text-xs text-stone-400 mt-1 text-center">They will receive an email to set their own password.</p>
        </div>

        <div className="p-6">
          {errorMsg && <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800"><AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{errorMsg}</span></div>}
          {successMsg && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /><span>{successMsg}</span></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full Name" required>
              <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. Priya Sharma" className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900" />
            </FormField>
            <FormField label="Work Email Address" required>
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@farm.com" className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900" />
            </FormField>
            <FormField label="Phone (optional)">
              <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. +91 98765 43210" className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900" />
            </FormField>
            {assignableRoles.length > 1 && (
              <FormField label="Role" required>
                <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as UserRole)} className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900">
                  {assignableRoles.map((assignableRole) => <option key={assignableRole} value={assignableRole}>{assignableRole.charAt(0).toUpperCase() + assignableRole.slice(1)}</option>)}
                </select>
              </FormField>
            )}
            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm disabled:opacity-60">
              {isSubmitting ? 'Sending invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
