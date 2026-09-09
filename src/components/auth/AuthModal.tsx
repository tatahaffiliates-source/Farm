import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { FormField } from '../common/FormField';
import { ShieldCheck, UserCheck, HardHat, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { signIn, signUp, isLoading, isSupabaseActive } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (isRegistering) {
        if (!fullName.trim()) throw new Error('Please enter your full name.');
        if (!email.trim()) throw new Error('Please enter a valid email address.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters long.');
        await signUp(email, password, fullName, role);
      } else {
        if (!email.trim()) throw new Error('Please enter your email address.');
        await signIn(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setErrorMsg(null);
    try {
      await signIn(demoEmail, 'farmPass123!');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Top Header */}
        <div className="p-6 bg-stone-900 text-white text-center border-b border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 mx-auto flex items-center justify-center text-2xl shadow-md mb-3">
            🐖
          </div>
          <h2 className="text-xl font-bold tracking-tight">Sunland Swine & Livestock</h2>
          <p className="text-xs text-stone-400 mt-1">Farm Operations & Management Portal</p>

          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-stone-800 border border-stone-700 text-[11px] text-stone-300">
            <span
              className={`w-2 h-2 rounded-full ${isSupabaseActive ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span>{isSupabaseActive ? 'Supabase Auth & RLS Connected' : 'Persistent Storage Engine Ready'}</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <FormField label="Full Name" required>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </FormField>

                <FormField label="Assign Role" required>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  >
                    <option value="admin">Administrator (Owner - Full Access)</option>
                    <option value="manager">Farm Manager (Operations & Reports)</option>
                    <option value="worker">Field Worker (Operational Tasks Only)</option>
                  </select>
                </FormField>
              </>
            )}

            <FormField label="Work Email Address" required>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@farm.com"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </FormField>

            <FormField label="Password" required>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer mt-2 disabled:opacity-60"
            >
              {isLoading ? 'Authenticating...' : isRegistering ? 'Create Farm Account' : 'Sign In to Farm System'}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg(null);
              }}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              {isRegistering
                ? 'Already have an account? Sign in here'
                : 'Need to register a new staff account? Click here'}
            </button>
          </div>

          {/* Fast One-Click Demo Access for Instant Role Inspection */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider text-center mb-3">
              Fast Demo Sign-In (Verified Roles)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@sunlandswine.in')}
                className="p-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Admin</span>
                </div>
                <p className="text-[10px] text-stone-500 truncate mt-0.5">Owner Access</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@sunlandswine.in')}
                className="p-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Manager</span>
                </div>
                <p className="text-[10px] text-stone-500 truncate mt-0.5">Operations</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('worker@sunlandswine.in')}
                className="p-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <HardHat className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Worker</span>
                </div>
                <p className="text-[10px] text-stone-500 truncate mt-0.5">Field Staff</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
