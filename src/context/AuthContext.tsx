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
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  switchUserRole: (role: UserRole) => void;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSupabaseActive = isSupabaseConfigured();

  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);
      try {
        if (isSupabaseActive && supabase) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            // Fetch profile from db
            const profiles = db.getProfiles();
            const matched = profiles.find((p) => p.email === data.session?.user.email);
            if (matched) {
              setUser(matched);
              db.setCurrentUser(matched);
            } else {
              // Create default profile for Supabase user
              const newProf: UserProfile = {
                id: data.session.user.id,
                farm_id: db.getFarm().id,
                full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'User',
                email: data.session.user.email || 'user@farm.local',
                role: 'admin',
                status: 'active',
                created_at: new Date().toISOString(),
              };
              setUser(newProf);
              db.setCurrentUser(newProf);
            }
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
  }, [isSupabaseActive]);

  const signIn = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseActive && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password || '',
        });
        if (error) throw new Error(error.message);

        const profiles = db.getProfiles();
        let current = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (!current) {
          current = {
            id: data.user.id,
            farm_id: db.getFarm().id,
            full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            email: data.user.email || email,
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString(),
          };
        }
        setUser(current);
        db.setCurrentUser(current);
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

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'worker') => {
    setIsLoading(true);
    try {
      if (isSupabaseActive && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName, role },
          },
        });
        if (error) throw new Error(error.message);

        const newProf = db.addProfile({
          farm_id: db.getFarm().id,
          full_name: fullName,
          email: email.trim(),
          role,
          status: 'active',
        });
        setUser(newProf);
        db.setCurrentUser(newProf);
      } else {
        const existing = db.getProfiles().find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
        if (existing) {
          throw new Error('An account with this email address already exists.');
        }
        const newProf = db.addProfile({
          farm_id: db.getFarm().id,
          full_name: fullName,
          email: email.trim(),
          role,
          status: 'active',
        });
        setUser(newProf);
        db.setCurrentUser(newProf);
      }
    } finally {
      setIsLoading(false);
    }
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

  // Allows switching active session persona for testing RBAC
  const switchUserRole = (role: UserRole) => {
    const profiles = db.getProfiles();
    let target = profiles.find((p) => p.role === role);
    if (!target) {
      target = db.addProfile({
        farm_id: db.getFarm().id,
        full_name: `${role.toUpperCase()} User`,
        email: `${role}@sunlandswine.in`,
        role,
        status: 'active',
      });
    }
    setUser(target);
    db.setCurrentUser(target);
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
        signUp,
        signOut,
        switchUserRole,
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
