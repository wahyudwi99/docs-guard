"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, X, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export function LoginModal({ isOpen, onClose, callbackUrl = '/' }: LoginModalProps) {
  const { loginWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (error) {
      console.error("Google Sign-In error:", error);
    }
  };

  const benefits = [
    "Unlimited PDF Watermarking",
    "Unlimited Video Watermarking",
    "PDF lock & encryption",
    "Smart Blur",
    "100% Ad-Free & Faster Processing"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-10 border border-white/20"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="mb-4 inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              
              <h2 className="text-2xl font-black mb-1 text-zinc-900 dark:text-white tracking-tight uppercase">Get 3 Days Pro Free</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-xs font-medium uppercase tracking-widest">
                Login now to unlock all premium features
              </p>

              <div className="space-y-3 mb-8 bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-left">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-white border border-zinc-200 text-zinc-900 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-md hover:bg-zinc-50 mb-4"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                SIGN IN WITH GOOGLE
              </button>
              
              <p className="text-[10px] text-zinc-400 font-medium">
                By continuing, you agree to our Privacy Policy
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
