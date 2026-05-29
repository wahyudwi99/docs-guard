"use client";

import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useI18n } from '@/hooks/useI18n';
import { Check, X, Shield, Zap, Lock, FileText, Video, EyeOff, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface PaywallProps {
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
  const { packages, subscribe, loading, restorePurchases } = useSubscription();
  const { t } = useI18n();
  const { user: session, loading: isLoadingAuth, loginWithGoogle } = useAuth();
  const router = useRouter();

  const features = [
    t('paywall_feature_unlimited_pdf') || 'Unlimited PDF Watermarking',
    t('paywall_feature_unlimited_video') || 'Unlimited Video Watermarking',
    t('paywall_feature_encryption') || 'PDF Lock & Encryption',
    t('paywall_feature_smart_blur') || 'Smart Blur (Info Masking)',
    t('paywall_feature_ad_free') || '100% Ad-Free Experience',
  ];

  const authenticated = !!session;

  const handleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google Sign-In error:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative p-8 text-center">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <div className="mt-2 mb-6 inline-flex p-4 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Star className="w-8 h-8 fill-current" />
          </div>
          
          <h2 className="text-3xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            DocsGuard Pro
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">
            {t('paywall_subtitle') || 'Unlock all premium features and protect your documents like a pro.'}
          </p>
          
          <div className="space-y-2.5 mb-10 text-left bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{feature}</span>
              </div>
            ))}
          </div>
          
          {isLoadingAuth ? (
            <div className="w-full py-12 flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : authenticated ? (
            <div className="grid grid-cols-1 gap-4 mb-8">
              {packages.map((pkg) => {
                const isYearly = pkg.identifier.toLowerCase().includes('yearly');
                const isMonthly = pkg.identifier.toLowerCase().includes('monthly');
                
                return (
                  <button
                    key={pkg.identifier}
                    disabled={loading}
                    onClick={async () => {
                      const success = await subscribe(pkg);
                      if (success) {
                        window.location.reload();
                      }
                    }}
                    className={cn(                      "relative w-full p-5 rounded-3xl text-left transition-all active:scale-[0.98] border-2",
                      isYearly 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200" 
                        : "bg-white border-slate-100 hover:border-indigo-200 text-slate-900"
                    )}
                  >
                    {isYearly && (
                      <div className="absolute -top-3 right-6 px-3 py-1 bg-amber-400 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">
                        Best Value
                      </div>
                    )}
                    {isMonthly && (
                      <div className="absolute -top-3 right-6 px-3 py-1 bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-200">
                        Most Popular
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-bold text-lg", isYearly ? "text-white" : "text-slate-900")}>
                        {pkg.product.title}
                      </span>
                      <span className={cn("font-black text-xl", isYearly ? "text-amber-300" : "text-indigo-600")}>
                        {pkg.product.priceString}
                      </span>
                    </div>
                    <p className={cn("text-xs font-medium", isYearly ? "text-indigo-100" : "text-slate-400")}>
                      {pkg.product.description || (isYearly ? "Save 60% with annual billing" : "No commitment, cancel anytime")}
                    </p>
                  </button>
                );
              })}
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
