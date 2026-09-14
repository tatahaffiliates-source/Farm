import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { db } from '../services/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseActive: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getAuthErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  if (error.code === 'email_not_confirmed' || error.message?.toLowerCase().includes('email not confirmed')) {
    return 'Please confirm your email address using the Supabase verification email before signing in.';
  }
  if (error.code === 'invalid_credentials' || error.message?.toLowerCase().includes('invalid login credentials')) {
    return 'The email or password is incorrect. Check both fields and try again.';
  }
  if (error.code === 'user_already_exists' || error.message?.toLowerCase().includes('already registered')) {
    return 'An account with this email already exists. Sign in or use password reset.';
  }
  if (error.status === 422 && error.message) return error.message;
  return error.message || 'Authentication failed. Please try again.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSupabaseActive = isSupabaseConfigured();

  const loadProfile = async (userId: string): Promise<UserProfile> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, farm_id, full_name, email, role, status, phone, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error(`Unable to load your farm profile: ${error.message}`);
    if (!data || !data.farm_id) throw new Error('Your account is not assigned to a farm. Contact the farm administrator.');
    if (data.status !== 'active') throw new Error('This account has been disabled by the farm administrator.');
    if (!['admin', 'manager', 'worker'].includes(data.role)) throw new Error('Your account has an invalid role.');
    return data as UserProfile;
  };

  const setAuthenticatedProfile = async (userId: string) => {
    const profile = await loadProfile(userId);
    setUser(profile);
    db.setCurrentUser(profile);
  };

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      try {
        if (isSupabaseActive && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            await setAuthenticatedProfile(data.session.user.id);
          }
        } else {
          // Restore local authenticated user
          const savedUser = db.getCurrentUser();
          if (savedUser && savedUser.status === 'active') {
            setUser(savedUser);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    if (isSupabaseActive && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          return;
        }
        try {
          await setAuthenticatedProfile(session.user.id);
        } catch (err) {
          console.error('Unable to load authenticated profile:', err);
          setUser(null);
          await supabase?.auth.signOut();
        }
      });
      return () => listener.subscription.unsubscribe();
    }
  }, [isSupabaseActive]);

  const signIn = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseActive && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password || '',
        });
        if (error) {
          throw new Error(getAuthErrorMessage(error));
        }

        if (!data.user) throw new Error('Authentication succeeded but no user was returned.');
        await setAuthenticatedProfile(data.user.id);
      } else {
        // Local auth verification
        const profiles = db.getProfiles();
        const found = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (!found) {
          throw new Error('No user account found with this email address.');
        }
        if (found.status === 'disabled') {
          throw new Error('This account has been disabled by the farm administrator.');
        }
        setUser(found);
        db.setCurrentUser(found);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseActive || !supabase) throw new Error('Password reset requires Supabase Authentication.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}`,
    });
    if (error) throw new Error(error.message);
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseActive || !supabase) {
      throw new Error('Google sign-in requires Supabase Authentication.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseActive && supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const canAccess = (requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'worker',
        isAuthenticated: !!user,
        isLoading,
        isSupabaseActive,
        signIn,
        signInWithGoogle,
        resetPassword,
        signOut,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
