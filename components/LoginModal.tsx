"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export function LoginModal({ isOpen, onClose, callbackUrl = '/' }: LoginModalProps) {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (error) {
      console.error("Google Sign-In error:", error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
      onClose();
    } catch (error) {
      console.error("Apple Sign-In error:", error);
    }
  };

  const handlePrivacyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    router.push('/privacy');
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-10 border border-zinc-100"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-6">
              <h2 className="text-2xl font-black mb-8 text-zinc-900 tracking-tight uppercase">
                SIGN IN
              </h2>
              
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-white border border-zinc-200 text-zinc-900 font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-md hover:bg-zinc-50 mb-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                SIGN IN WITH GOOGLE
              </button>

              <button
                onClick={handleAppleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-black text-white font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-3 shadow-md hover:bg-zinc-900 mb-4"
              >
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 16 16">
                  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282"/>
                </svg>
                SIGN IN WITH APPLE
              </button>
              
              <p className="text-[10px] text-zinc-400 font-medium">
                By continuing, you agree to our <button onClick={handlePrivacyClick} className="text-indigo-600 font-bold hover:underline">Privacy Policy</button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
