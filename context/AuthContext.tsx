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

  const fetchUserProfile = async (userId: string, metadata?: any): Promise<Partial<AuthUser>> => {
    try {
      // 1. Try to fetch existing profile
      const { data, error } = await supabase
        .from('users')
        .select('is_pro, full_name, avatar_url')
        .eq('id', userId)
        .single();
        
      if (error) {
        // 2. If profile is missing (Error PGRST116), create it (Auto-Repair)
        if (error.code === 'PGRST116' && metadata) {
          console.log("Profile missing, auto-repairing...");
          const { data: newData, error: insertError } = await supabase
            .from('users')
            .upsert({
              id: userId,
              full_name: metadata.full_name || metadata.name || 'User',
              avatar_url: metadata.avatar_url || metadata.picture || '',
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          return { name: newData.full_name, image: newData.avatar_url, is_pro: newData.is_pro };
        }
        
        // Handle missing column error (previous fix)
        if (error.code === '42703') {
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('is_pro, full_name')
            .eq('id', userId)
            .single();
          if (retryError) throw retryError;
          return { name: retryData.full_name, is_pro: retryData.is_pro };
        }
        throw error;
      }
      
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
      const { data: { session } } = await supabase.auth.getSession();
      const profileUpdates = await fetchUserProfile(user.id, session?.user?.user_metadata);
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
        const profile = await fetchUserProfile(session.user.id, session.user.user_metadata);
        const currentUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: profile.name || session.user.user_metadata.full_name,
          image: profile.image || session.user.user_metadata.avatar_url,
          is_pro: profile.is_pro || false,
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
      console.error('Failed to restore session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      // FORCE LOGOUT FIRST for clean state (prevents nonce mismatch)
      if (Capacitor.isNativePlatform()) {
        try {
          await SocialLogin.logout({ provider: 'google' });
        } catch (e) {
          // Ignore logout errors
        }
      }

      const result = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });

      if (result.result && result.result.responseType === 'online') {
        const profile = result.result.profile;
        const idToken = result.result.idToken;

        if (idToken) {
          // RE-ENABLED SUPABASE AUTH
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (authError) throw authError;

          if (authData.user) {
            console.log("Supabase Auth SUCCESS. User ID:", authData.user.id);
            // Wait longer for the DB trigger to create the profile record
            console.log("Waiting for DB trigger (2s)...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const dbProfile = await fetchUserProfile(authData.user.id);
            console.log("Fetched DB Profile:", dbProfile);
            
            const newUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email,
              name: dbProfile.name || authData.user.user_metadata.full_name || "User",
              image: dbProfile.image || authData.user.user_metadata.avatar_url,
              is_pro: dbProfile.is_pro || false,
              loggedIn: true,
            };
            
            await Preferences.set({
              key: AUTH_STORAGE_KEY,
              value: JSON.stringify(newUser),
            });
            
            setUser(newUser);
          }
        }
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
