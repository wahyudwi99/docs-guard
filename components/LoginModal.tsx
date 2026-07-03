"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, X, CheckCircle2, Zap } from 'lucide-react';
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

  const benefits = [
    t('subscription_section.paywall_feature_unlimited_pdf') || 'Unlimited PDF Watermarking',
    t('subscription_section.paywall_feature_unlimited_video') || 'Unlimited Video Watermarking',
    t('subscription_section.paywall_feature_encryption') || 'PDF Lock & Encryption',
    t('subscription_section.paywall_feature_smart_blur') || 'Smart Blur',
    t('subscription_section.paywall_feature_ad_free') || '100% Ad-Free Experience',
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
            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-10 border border-zinc-100"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="mb-4 inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Zap className="w-6 h-6 fill-current" />
              </div>
              
              <h2 className="text-2xl font-black mb-1 text-zinc-900 tracking-tight uppercase">
                {t('subscription_section.login_modal_title') || 'Unlock DocsGuard Pro'}
              </h2>
              <p className="text-zinc-500 mb-6 text-xs font-medium uppercase tracking-widest">
                {t('subscription_section.login_modal_subtitle') || 'Log in to continue and unlock your 3-day free trial'}
              </p>

              <div className="space-y-3 mb-8 bg-zinc-50 p-6 rounded-3xl border border-zinc-100 text-left">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-zinc-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
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
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05 1.88-3.08 1.88-1.06 0-1.4-.65-2.61-.65-1.22 0-1.6.63-2.61.65-1.03.02-2.23-1-3.22-1.95C3.51 18.23 2 13.92 2 10.3c0-3.56 2.32-5.46 4.59-5.5 1.72-.03 3.34 1.16 4.4 1.16 1.06 0 3-.14 4.74 1.63a5.55 5.55 0 0 1 2.24 4.31c-.03 2.63 2.14 3.89 2.18 3.93a10.87 10.87 0 0 1-1.56 3.44c-.75 1.08-1.52 2.15-2.54 2.01M15.22 3.12a4.42 4.42 0 0 0 1.05-3.12c-1 .04-2 .66-2.73 1.5a4.46 4.46 0 0 0-1.06 3.06c1.12.08 2.1-.56 2.74-1.44z" />
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
