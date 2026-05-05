"use client";

import React from 'react';
import { signIn } from 'next-auth/react';
import { Shield, Lock, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export function LoginModal({ isOpen, onClose, callbackUrl = '/' }: LoginModalProps) {
  const handleGoogleSignIn = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { SocialLogin } = await import('@capgo/capacitor-social-login');
        const result = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
        
        if (result.result.responseType === 'online' && result.result.idToken) {
          console.log("Native login successful, signing into NextAuth...");
          const res = await signIn('google-native', {
            idToken: result.result.idToken,
            callbackUrl,
            redirect: false,
          });
          
          console.log("NextAuth signIn response:", res);
          
          if (res?.ok) {
            onClose();
            // Force a slight delay then reload to ensure session is picked up on native
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      } catch (error) {
        console.error("Native Google Sign-In error:", error);
        alert("Login Error: " + JSON.stringify(error));
      }
    } else {
      await signIn('google', { callbackUrl });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="mb-6 inline-flex p-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                <Shield className="w-10 h-10" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Welcome to DocsGuard</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
                Sign in to protect your documents and manage your Pro subscription across devices.
              </p>
              
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm mb-6"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Continue with Google
              </button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                <Lock className="w-3 h-3" />
                <span>Secure AES-256 Authentication</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
