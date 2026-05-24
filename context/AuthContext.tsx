"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  loggedIn: boolean;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'docs_guard_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const fetchUserProfile = async (userId: string, metadata?: any, email?: string): Promise<Partial<AuthUser>> => {
    try {
      console.log(`[AUTH] Fetching profile for: ${userId}`);
      
      // 1. Try to fetch existing profile (Simple Profile only)
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.log(`[AUTH] Profile missing or error: ${error.code}. Triggering Self-Healing Sync...`);
        
        // 2. SELF-HEALING: Call RPC to sync profile from Auth metadata
        // This ensures the public.users table is re-populated if deleted
        const { error: syncError } = await supabase.rpc('sync_user_profile', {
          user_id: userId,
          user_email: email || '',
          user_metadata: metadata || {}
        });

        if (syncError) {
          console.error("[AUTH] Self-Healing Sync FAILED:", syncError.message);
          throw syncError;
        }

        // 3. Final retry after sync
        const { data: newData, error: retryError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', userId)
          .single();
          
        if (retryError) throw retryError;
        return { name: newData.full_name };
      }
      
      console.log("[AUTH] Profile found in DB.");
      return {
        name: data.full_name
      };
    } catch (err) {
      console.error('[AUTH] fetchUserProfile exception:', err);
      return {};
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const { data: { session } } = await supabase.auth.getSession();
      const profileUpdates = await fetchUserProfile(user.id, session?.user?.user_metadata, session?.user?.email);
      const updatedUser = { ...user, ...profileUpdates };
      setUser(updatedUser);
      await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(updatedUser) });
    } else if (user) {
      const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
      if (value) {
        setUser(JSON.parse(value));
      }
    }
  };

  const restoreSession = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log("[AUTH] Session active:", session.user.email);
        const profile = await fetchUserProfile(session.user.id, session.user.user_metadata, session.user.email);
        
        const currentUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: profile.name || session.user.user_metadata.full_name,
          image: session.user.user_metadata.avatar_url, // UI only
          loggedIn: true
        };
        setUser(currentUser);
        await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(currentUser) });
      } else {
        const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
        if (value) {
          setUser(JSON.parse(value));
        }
      }
    } catch (error) {
      console.error('[AUTH] restoreSession error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      if (Capacitor.isNativePlatform()) {
        try { await SocialLogin.logout({ provider: 'google' }); } catch (e) {}
      }

      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });

      if (result.result && result.result.responseType === 'online') {
        const idToken = result.result.idToken;

        if (idToken) {
          console.log("[AUTH] Signing in with Supabase...");
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (authError) throw authError;

          if (authData.user) {
            console.log("[AUTH] Supabase Auth SUCCESS. ID:", authData.user.id);
            // Re-sync profile to ensure public table is populated
            const dbProfile = await fetchUserProfile(authData.user.id, authData.user.user_metadata, authData.user.email);
            
            const newUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email,
              name: dbProfile.name || authData.user.user_metadata.full_name || "User",
              image: authData.user.user_metadata.avatar_url,
              loggedIn: true,
            };
            
            await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(newUser) });
            setUser(newUser);
            console.log("[AUTH] Login sequence finished.");
          }
        }
      }
    } catch (error) {
      console.error('[AUTH] Google login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (Capacitor.isNativePlatform()) {
        await SocialLogin.logout({ provider: 'google' });
      }
      await supabase.auth.signOut();
      await Preferences.remove({ key: AUTH_STORAGE_KEY });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, restoreSession, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
