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

  const fetchUserProfile = async (userId: string): Promise<Partial<AuthUser>> => {
    try {
      console.log(`[AUTH] Fetching profile from database: ${userId}`);
      const { data, error } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.warn(`[AUTH] Profile record missing in DB. Relying on Auth metadata.`);
        return {};
      }
      
      return { name: data.full_name };
    } catch (err) {
      console.error('[AUTH] Profile fetch exception:', err);
      return {};
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const profileUpdates = await fetchUserProfile(user.id);
      const updatedUser = { ...user, ...profileUpdates };
      setUser(updatedUser);
      await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(updatedUser) });
    }
  };

  const restoreSession = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const currentUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: profile.name || session.user.user_metadata.full_name,
          image: session.user.user_metadata.avatar_url,
          loggedIn: true
        };
        setUser(currentUser);
        await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(currentUser) });
      } else {
        const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
        if (value) setUser(JSON.parse(value));
      }
    } catch (error) {
      console.error('[AUTH] Session restoration failed:', error);
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
        options: { scopes: ['email', 'profile'] },
      });

      if (result.result && result.result.responseType === 'online') {
        const idToken = result.result.idToken;
        if (idToken) {
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (authError) throw authError;

          if (authData.user) {
            // Give DB triggers a tiny moment to finish (optional but recommended)
            await new Promise(resolve => setTimeout(resolve, 800));
            const profile = await fetchUserProfile(authData.user.id);
            
            const newUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email,
              name: profile.name || authData.user.user_metadata.full_name || "User",
              image: authData.user.user_metadata.avatar_url,
              loggedIn: true,
            };
            
            await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(newUser) });
            setUser(newUser);
          }
        }
      }
    } catch (error) {
      console.error('[AUTH] Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (Capacitor.isNativePlatform()) await SocialLogin.logout({ provider: 'google' });
      await supabase.auth.signOut();
      await Preferences.remove({ key: AUTH_STORAGE_KEY });
      setUser(null);
    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
