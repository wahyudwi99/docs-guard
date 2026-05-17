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
  subscription_type?: string | null;
  subscription_end_date?: string | null;
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
      
      // 1. Try to fetch existing profile
      const { data, error } = await supabase
        .from('users')
        .select('is_pro, full_name, subscription_type, subscription_end_date')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.log(`[AUTH] Profile fetch status: ${error.code} (${error.message})`);
        
        // 2. If profile is missing (Error PGRST116), create it (Auto-Repair)
        if (error.code === 'PGRST116') {
          console.log("[AUTH] Profile MISSING in public.users. Attempting AUTO-REPAIR...");
          
          const profileData = {
            id: userId,
            email: email || '',
            full_name: metadata?.full_name || metadata?.name || 'User',
            updated_at: new Date().toISOString()
          };

          const { data: newData, error: insertError } = await supabase
            .from('users')
            .upsert(profileData)
            .select()
            .single();
            
          if (insertError) {
            console.error("[AUTH] AUTO-REPAIR FAILED:", insertError.code, insertError.message);
            throw insertError;
          }
          
          console.log("[AUTH] AUTO-REPAIR SUCCESSFUL");
          return { 
            name: newData.full_name, 
            is_pro: newData.is_pro,
            subscription_type: newData.subscription_type,
            subscription_end_date: newData.subscription_end_date
          };
        }
        throw error;
      }
      
      console.log("[AUTH] Profile found in DB.");
      return {
        name: data.full_name,
        is_pro: data.is_pro,
        subscription_type: data.subscription_type,
        subscription_end_date: data.subscription_end_date
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
          image: session.user.user_metadata.avatar_url, // Metadata only
          is_pro: profile.is_pro || false,
          subscription_type: profile.subscription_type,
          subscription_end_date: profile.subscription_end_date,
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
            console.log("Supabase Auth SUCCESS. User ID:", authData.user.id);
            // Wait longer for the DB trigger to create the profile record
            console.log("Waiting for DB trigger (2s)...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const dbProfile = await fetchUserProfile(authData.user.id, authData.user.user_metadata, authData.user.email);
            console.log("Fetched DB Profile:", dbProfile);
            
            const newUser: AuthUser = {
              id: authData.user.id,
              email: authData.user.email,
              name: dbProfile.name || authData.user.user_metadata.full_name || "User",
              image: authData.user.user_metadata.avatar_url,
              is_pro: dbProfile.is_pro || false,
              loggedIn: true,
            };
            
            await Preferences.set({
              key: AUTH_STORAGE_KEY,
              value: JSON.stringify(newUser),
            });
            
            setUser(newUser);
            console.log("[AUTH] Login sequence finished.");
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
