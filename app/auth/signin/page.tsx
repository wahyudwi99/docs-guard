"use client";

import React, { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Lock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function SignIn() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const handleGoogleSignIn = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        const user = await GoogleAuth.signIn();
        
        if (user.authentication.idToken) {
          // Sign in to NextAuth using the native ID token
          await signIn('google-native', {
            idToken: user.authentication.idToken,
            callbackUrl,
            redirect: true,
          });
        }
      } catch (error) {
        console.error("Native Google Sign-In error:", error);
      }
    } else {
      // Standard web-based sign-in
      await signIn('google', { callbackUrl });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl text-center">
        <div className="mb-6 inline-flex p-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
          <Shield className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">DocsGuard</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          Sign in to protect your documents and manage your Pro subscription.
        </p>
        
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Continue with Google
        </button>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Lock className="w-3 h-3" />
          <span>Secure AES-256 Authentication</span>
        </div>
      </div>
    </div>
  );
}
