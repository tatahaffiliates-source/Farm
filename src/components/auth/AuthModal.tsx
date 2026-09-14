import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FormField } from '../common/FormField';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { signIn, signInWithGoogle, resetPassword, isLoading, isSupabaseActive } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (!email.trim()) throw new Error('Please enter your email address.');
      await signIn(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
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
            <span>{isSupabaseActive ? 'Supabase Authentication' : 'Local demo mode'}</span>
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
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 pr-10 text-sm rounded-lg border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-2.5 text-stone-500" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </FormField>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer mt-2 disabled:opacity-60"
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Farm System'}
            </button>
          </form>

          <button
              type="button"
              onClick={async () => {
                if (!email.trim()) {
                  setErrorMsg('Enter your email address first.');
                  return;
                }
                try {
                  await resetPassword(email);
                  setErrorMsg('Password reset instructions sent if the account exists.');
                } catch (err: any) {
                  setErrorMsg(err.message);
                }
              }}
              className="w-full mt-3 text-xs font-semibold text-stone-600 hover:text-emerald-700"
            >
              Forgot your password?
          </button>

          {isSupabaseActive && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-[11px] text-stone-400 uppercase tracking-wide">or</span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  setErrorMsg(null);
                  try {
                    await signInWithGoogle();
                  } catch (err: any) {
                    setErrorMsg(err.message || 'Could not start Google sign-in.');
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-800 font-medium text-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                <span className="text-base font-bold" aria-hidden="true">G</span>
                Continue with Google
              </button>
            </>
          )}

          <p className="mt-4 text-center text-xs text-stone-500">
            Don&apos;t have an account? Ask your farm administrator to send you an invitation.
          </p>
        </div>
      </div>
    </div>
  );
};
