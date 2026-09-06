'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile, Year, Semester } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { MOCK_CURRENT_USER, MOCK_PROFILES } from '@/lib/mockData';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (params: {
    email: string;
    password: string;
    fullName: string;
    year: Year;
    semester: Semester;
    department: string;
    avatarFile?: File | null;
  }) => Promise<{ error?: string }>;
  loginWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>, newAvatarFile?: File | null) => Promise<{ error?: string }>;
  switchDemoUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'campus_hub_active_user';
const SESSION_COOKIE_NAME = 'campus_auth_session';

function setSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${SESSION_COOKIE_NAME}=active; path=/; max-age=604800; SameSite=Lax`;
  }
}

function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
  }
}

function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE_NAME}=active`));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial session
  useEffect(() => {
    async function initAuth() {
      setIsLoading(true);

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setSessionCookie();
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
            } else {
              // Fallback user from session metadata
              setUser({
                id: session.user.id,
                full_name: session.user.user_metadata?.full_name || 'BTech Student',
                year: (session.user.user_metadata?.year as Year) || '3rd Year',
                semester: (session.user.user_metadata?.semester as Semester) || 'Sem 5',
                department: session.user.user_metadata?.department || 'Computer Science & Engineering',
                avatar_url: session.user.user_metadata?.avatar_url || null,
                created_at: session.user.created_at,
                updated_at: session.user.created_at,
              });
            }
          } else {
            clearSessionCookie();
            setUser(null);
          }
        } catch (err) {
          console.error('Supabase session load error:', err);
        }
      } else {
        // Local mode: check if session cookie is active
        if (hasSessionCookie()) {
          const savedUserJson = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_USER_KEY) : null;
          if (savedUserJson) {
            try {
              setUser(JSON.parse(savedUserJson));
            } catch {
              setUser(MOCK_CURRENT_USER);
            }
          } else {
            setUser(MOCK_CURRENT_USER);
          }
        } else {
          setUser(null);
        }
      }

      setIsLoading(false);
    }

    initAuth();

    // Listen to Supabase auth state change if configured
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setSessionCookie();
          const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setUser(profile as Profile);
          }
        } else if (event === 'SIGNED_OUT') {
          clearSessionCookie();
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          setSessionCookie();
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profile) setUser(profile as Profile);
        }
        setIsLoading(false);
        return {};
      } else {
        // Local demo mode - simulated check
        const matched = Object.values(MOCK_PROFILES).find(
          (p) => p.full_name.toLowerCase().includes(email.split('@')[0].toLowerCase())
        ) || MOCK_CURRENT_USER;

        setSessionCookie();
        setUser(matched);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(matched));
        }
        setIsLoading(false);
        return {};
      }
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err.message : 'Login failed' };
    }
  }, []);

  // Signup
  const signup = useCallback(async (params: {
    email: string;
    password: string;
    fullName: string;
    year: Year;
    semester: Semester;
    department: string;
    avatarFile?: File | null;
  }) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        let avatarUrl: string | null = null;

        // Step 1: Sign up in Supabase Auth with metadata
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName,
              year: params.year,
              semester: params.semester,
              department: params.department,
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }

        const userId = data.user?.id;
        if (!userId) {
          setIsLoading(false);
          return { error: 'Signup succeeded, please confirm your email address.' };
        }

        // Step 2: Upload avatar if provided
        if (params.avatarFile) {
          const fileExt = params.avatarFile.name.split('.').pop() || 'png';
          const filePath = `${userId}/avatar.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, params.avatarFile, { upsert: true });

          if (!uploadErr) {
            const { data: pubUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = pubUrl.publicUrl;
          }
        }

        // Step 3: Insert or update profiles table
        const newProfile: Profile = {
          id: userId,
          full_name: params.fullName,
          year: params.year,
          semester: params.semester,
          department: params.department,
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert(newProfile);
        setSessionCookie();
        setUser(newProfile);
        setIsLoading(false);
        return {};
      } else {
        // Local mode
        let avatarUrl: string | null = null;
        if (params.avatarFile) {
          avatarUrl = URL.createObjectURL(params.avatarFile);
        }

        const newProfile: Profile = {
          id: `usr_${Date.now()}`,
          full_name: params.fullName,
          year: params.year,
          semester: params.semester,
          department: params.department,
          avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setSessionCookie();
        setUser(newProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newProfile));
        }
        setIsLoading(false);
        return {};
      }
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err.message : 'Signup failed' };
    }
  }, []);

  // Google OAuth
  const loginWithGoogle = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/`
        : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } else {
      // In local mode, simulate Google login with Arjun Mehta
      setSessionCookie();
      setUser(MOCK_PROFILES['usr_arjun_mehta_002']);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(MOCK_PROFILES['usr_arjun_mehta_002']));
      }
      return {};
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearSessionCookie();
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, []);

  // Update Profile
  const updateProfile = useCallback(async (updates: Partial<Profile>, newAvatarFile?: File | null) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      let avatarUrl = updates.avatar_url || user.avatar_url;

      if (newAvatarFile) {
        if (isSupabaseConfigured && supabase) {
          const fileExt = newAvatarFile.name.split('.').pop() || 'png';
          const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from('avatars')
            .upload(filePath, newAvatarFile, { upsert: true });

          if (!uploadErr) {
            const { data: pubUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = pubUrl.publicUrl;
          }
        } else {
          avatarUrl = URL.createObjectURL(newAvatarFile);
        }
      }

      const updatedUser: Profile = {
        ...user,
        ...updates,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updatedUser.full_name,
            year: updatedUser.year,
            semester: updatedUser.semester,
            department: updatedUser.department,
            avatar_url: updatedUser.avatar_url,
            updated_at: updatedUser.updated_at,
          })
          .eq('id', user.id);

        if (error) return { error: error.message };
      }

      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updatedUser));
      }

      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Update failed' };
    }
  }, [user]);

  // Switch demo user helper (for testing multiple uploaders: Priya vs Arjun vs Sneha)
  const switchDemoUser = useCallback((userId: string) => {
    const target = MOCK_PROFILES[userId] || MOCK_CURRENT_USER;
    setSessionCookie();
    setUser(target);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(target));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
        switchDemoUser,
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
