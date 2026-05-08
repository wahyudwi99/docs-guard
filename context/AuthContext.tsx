"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

export type AuthUser = {
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'docs_guard_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Social Login if on native platform
    if (Capacitor.isNativePlatform()) {
      SocialLogin.initialize({
        google: {
          webClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        },
      });
    }
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      setLoading(true);
      const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
      if (value) {
        setUser(JSON.parse(value));
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
        // For web development, we might want a fallback or just a mock
        // Since we are refactoring for Capacitor, we'll focus on native
        // but can add web support if needed via the same plugin
        result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
      }

      if (result.result && result.result.responseType === 'online') {
        const profile = result.result.profile;
        const newUser: AuthUser = {
          name: profile.name || undefined,
          email: profile.email || undefined,
          image: profile.imageUrl || undefined,
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
      await Preferences.remove({ key: AUTH_STORAGE_KEY });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, restoreSession }}>
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
