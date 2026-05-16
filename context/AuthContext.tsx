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
      const profileUpdates = await fetchUserProfile(user.id);
      const updatedUser = { ...user, ...profileUpdates };
      setUser(updatedUser);
      await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(updatedUser) });
    }
  };

  const restoreSession = async () => {
    try {
      setLoading(true);
      
      // Check Supabase session first
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
        // Fallback to local preferences
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
        const idToken = result.result.idToken;
        console.log("Supabase URL being used:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("ID Token received:", idToken ? "YES (Length: " + idToken.length + ")" : "NO");
        
        if (idToken) {
          // Sign in to Supabase using the Google ID token
          const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (authError) throw authError;

          if (authData.user) {
            // Wait briefly for the trigger to create the public.users record
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const profile = await fetchUserProfile(authData.user.id);
            
            const newUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email,
              name: profile.name || authData.user.user_metadata.full_name,
              image: profile.image || authData.user.user_metadata.avatar_url,
              is_pro: profile.is_pro || false,
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
