"use client";

import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useI18n } from '@/hooks/useI18n';
import { Check, X, Shield, Zap, Lock } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
  const { packages, subscribe, loading, restorePurchases } = useSubscription();
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const router = useRouter();

  const features = [
    { icon: <Zap className="w-5 h-5 text-yellow-500" />, text: t('paywall_feature_unlimited_blur') || 'Unlimited Blur & Pixelation' },
    { icon: <Lock className="w-5 h-5 text-blue-500" />, text: t('paywall_feature_password') || 'PDF Password Protection' },
    { icon: <Shield className="w-5 h-5 text-green-500" />, text: t('paywall_feature_metadata') || 'Full Metadata Stripper' },
    { icon: <Check className="w-5 h-5 text-purple-500" />, text: t('paywall_feature_high_quality') || 'High Quality Export' },
  ];

  const authenticated = status === 'authenticated';

  const handleSignIn = () => {
    // BUG-005 Fix: Use proper origin for Capacitor or web
    const origin = (typeof window !== 'undefined' && window.location.origin.includes('localhost') && Capacitor.isNativePlatform())
      ? 'https://docsguard.app' // Replace with real production domain
      : window.location.origin;

    const callbackUrl = origin;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="relative p-6 text-center">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <div className="mt-4 mb-6 inline-flex p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
            <Shield className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl font-bold mb-2">DocsGuard Pro</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            {t('paywall_subtitle') || 'Unlock all premium features and protect your documents like a pro.'}
          </p>
          
          <div className="space-y-4 mb-8 text-left">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0">{feature.icon}</div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
          
          {authenticated ? (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.identifier}
                  disabled={loading}
                  onClick={() => subscribe(pkg)}
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  <div className="flex justify-between items-center">
                    <span>{pkg.product.title}</span>
                    <span>{pkg.product.priceString}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t('subscription_section.login_required_desc') || 'Please login to subscribe and protect your documents with Pro features.'}
              </p>
              <button
                onClick={handleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {t('subscription_section.login_with_google') || 'Login with Google'}
              </button>
            </div>
          )}
          
          <button
            onClick={restorePurchases}
            disabled={loading}
            className="mt-6 text-sm text-zinc-500 underline underline-offset-4"
          >
            {t('paywall_restore') || 'Restore Purchases'}
          </button>
          
          <p className="mt-4 text-[10px] text-zinc-400 leading-tight">
            Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
          </p>
        </div>
      </div>
    </div>
  );
};
