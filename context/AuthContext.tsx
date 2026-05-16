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
  is_pro?: boolean;
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
      const { data, error } = await supabase
        .from('users')
        .select('is_pro, full_name, avatar_url')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      
      return {
        name: data.full_name,
        image: data.avatar_url,
        is_pro: data.is_pro
      };
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return {};
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      // If supabase is enabled, fetch from server
      const profileUpdates = await fetchUserProfile(user.id);
      const updatedUser = { ...user, ...profileUpdates };
      setUser(updatedUser);
      await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(updatedUser) });
    } else if (user) {
      // In standalone test mode, we refresh from local storage or just keep current
      const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
      if (value) {
        setUser(JSON.parse(value));
      }
    }
  };

  const restoreSession = async () => {
    try {
      setLoading(true);
      
      // DISABLED SUPABASE FOR TESTING
      /*
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        const currentUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: profile.name,
          image: profile.image,
          is_pro: profile.is_pro,
          loggedIn: true
        };
        setUser(currentUser);
        await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(currentUser) });
      } else {
      */
        // Fallback to local preferences
        const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
        if (value) {
          setUser(JSON.parse(value));
        }
      // }
    } catch (error) {
      console.error('Failed to restore session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      let result;
      if (Capacitor.isNativePlatform()) {
        result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
      } else {
        result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
      }

      if (result.result && result.result.responseType === 'online') {
        const profile = result.result.profile;
        
        // DISABLED SUPABASE FOR TESTING
        /*
        const idToken = result.result.idToken;
        if (idToken) {
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          // ... rest of supabase logic
        }
        */

        const newUser: AuthUser = {
          name: profile.name || undefined,
          email: profile.email || undefined,
          image: profile.imageUrl || undefined,
          is_pro: false, // Default for testing
          loggedIn: true,
        };
        
        await Preferences.set({
          key: AUTH_STORAGE_KEY,
          value: JSON.stringify(newUser),
        });
        
        setUser(newUser);
      }
    } catch (error) {
      console.error('Google login failed:', error);
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
      // await supabase.auth.signOut(); // DISABLED SUPABASE
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
