'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Profile, Year, Semester } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  needsAcademicDetails: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'campus_hub_active_user';
const SESSION_COOKIE_NAME = 'campus_auth_session';

function setSessionCookie() {
  // Legacy cookie setting deprecated - Supabase Auth manages secure SSR cookies directly
}

function clearSessionCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
  }
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
              // Ensure profile exists for Google OAuth or metadata user
              const fallbackName =
                session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] ||
                'Student User';
              const fallbackAvatar =
                session.user.user_metadata?.avatar_url ||
                session.user.user_metadata?.picture ||
                null;

              const newProfile: Profile = {
                id: session.user.id,
                full_name: fallbackName,
                year: (session.user.user_metadata?.year as Year) || null,
                semester: (session.user.user_metadata?.semester as Semester) || null,
                department: session.user.user_metadata?.department || null,
                avatar_url: fallbackAvatar,
                created_at: session.user.created_at,
                updated_at: session.user.created_at,
              };

              await supabase.from('profiles').upsert(newProfile);
              setUser(newProfile);
            }
          } else {
            clearSessionCookie();
            setUser(null);
          }
        } catch (err) {
          console.error('Supabase session load error:', err);
          clearSessionCookie();
          setUser(null);
        }
      } else {
        // Supabase not configured: no mock user fallback
        clearSessionCookie();
        setUser(null);
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
          } else {
            const fallbackName =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0] ||
              'Student User';
            const fallbackAvatar =
              session.user.user_metadata?.avatar_url ||
              session.user.user_metadata?.picture ||
              null;

            const newProfile: Profile = {
              id: session.user.id,
              full_name: fallbackName,
              year: (session.user.user_metadata?.year as Year) || null,
              semester: (session.user.user_metadata?.semester as Semester) || null,
              department: session.user.user_metadata?.department || null,
              avatar_url: fallbackAvatar,
              created_at: session.user.created_at,
              updated_at: session.user.created_at,
            };

            await client.from('profiles').upsert(newProfile);
            setUser(newProfile);
          }
        } else if (event === 'SIGNED_OUT') {
          clearSessionCookie();
          setUser(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
            window.location.href = '/auth';
          }
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

      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return {
          error: 'Supabase database is not configured. Please add your NEXT_PUBLIC_SUPABASE_URL and key to .env.local.',
        };
      }

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
      if (!isSupabaseConfigured || !supabase) {
        setIsLoading(false);
        return {
          error: 'Supabase database is not configured. Please add your NEXT_PUBLIC_SUPABASE_URL and key to .env.local.',
        };
      }

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
        return { error: 'Signup succeeded, please confirm your email address if required.' };
      }

      // Step 2: Upload avatar if provided
      if (params.avatarFile) {
        const fileExt = params.avatarFile.name.split('.').pop() || 'png';
        const filePath = `${userId}/avatar.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, params.avatarFile, { upsert: true });

        if (!uploadErr) {
          const { data: signedData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(filePath, 315360000); // 10 years signed access
          avatarUrl = signedData?.signedUrl || null;
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
    } catch (err: unknown) {
      setIsLoading(false);
      return { error: err instanceof Error ? err.message : 'Signup failed' };
    }
  }, []);

  // Google OAuth
  const loginWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      return {
        error: 'Supabase database is not configured. Please add your credentials to .env.local.',
      };
    }

    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Supabase signOut error:', err);
    } finally {
      clearSessionCookie();
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        window.location.href = '/auth';
      }
    }
  }, []);

  // Update Profile
  const updateProfile = useCallback(async (
    updates: Partial<Profile>,
    newAvatarFile?: File | null
  ) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      let avatarUrl = updates.avatar_url ?? user.avatar_url;

      if (newAvatarFile && isSupabaseConfigured && supabase) {
        const fileExt = newAvatarFile.name.split('.').pop() || 'png';
        const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, newAvatarFile, { upsert: true });

        if (!uploadErr) {
          const { data: signedData } = await supabase.storage
            .from('avatars')
            .createSignedUrl(filePath, 315360000); // 10 years signed access
          avatarUrl = signedData?.signedUrl || null;
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
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Update failed' };
    }
  }, [user]);

  const needsAcademicDetails = Boolean(
    user && (!user.year || !user.semester || !user.department)
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSupabaseConnected: isSupabaseConfigured,
        needsAcademicDetails,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
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
