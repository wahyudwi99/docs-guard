"use client";

import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useI18n } from '@/hooks/useI18n';
import { Check, X, Shield, Zap, Lock, FileText, EyeOff, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface PaywallProps {
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onClose }) => {
  const { packages, subscribe, loading, restorePurchases } = useSubscription();
  const { t } = useI18n();
  const { user: session, loading: isLoadingAuth, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();

  const features = [
    t('subscription_section.paywall_feature_unlimited_pdf') || 'Unlimited PDF Watermarking',
    t('subscription_section.paywall_feature_unlimited_video') || 'Unlimited Video Watermarking',
    t('subscription_section.paywall_feature_encryption') || 'PDF Lock & Encryption',
    t('subscription_section.paywall_feature_smart_blur') || 'Smart Blur',
    t('subscription_section.paywall_feature_ad_free') || '100% Ad-Free Experience',
  ];

  const authenticated = !!session;

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google Sign-In error:", error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await loginWithApple();
    } catch (error) {
      console.error("Apple Sign-In error:", error);
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
            {t('subscription_section.pro_title') || 'DocsGuard Pro'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">
            {t('subscription_section.paywall_subtitle') || 'Unlock all premium features and protect your documents like a pro.'}
          </p>
          
          <div className="space-y-2.5 mb-10 text-left bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-base font-medium text-zinc-700 dark:text-zinc-200">{feature}</span>
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
                const isYearly = pkg.identifier.toLowerCase().includes('yearly') || pkg.packageType === 'ANNUAL' || pkg.packageType === 'YEARLY';
                const isMonthly = pkg.identifier.toLowerCase().includes('monthly') || pkg.packageType === 'MONTHLY';
                const isWeekly = pkg.identifier.toLowerCase().includes('weekly') || pkg.packageType === 'WEEKLY';
                const pkgType = isWeekly ? 'weekly' : isMonthly ? 'monthly' : 'yearly';
                
                let displayName = t(`subscription_section.plans.${pkgType}.title`);
                if (!displayName || displayName === `subscription_section.plans.${pkgType}.title`) {
                  displayName = pkg.product.title;
                }

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
                    className={cn(
                      "relative w-full p-5 rounded-3xl text-left transition-all active:scale-[0.98] border-2",
                      isYearly 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200" 
                        : "bg-white border-slate-100 hover:border-indigo-200 text-slate-900"
                    )}
                  >
                    {isYearly && (
                      <div className="absolute -top-3 right-6 px-3 py-1 bg-amber-400 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">
                        {t('subscription_section.best_value') || 'Best Value'}
                      </div>
                    )}
                    {isMonthly && (
                      <div className="absolute -top-3 right-6 px-3 py-1 bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-200">
                        {t('subscription_section.most_popular') || 'Most Popular'}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("font-bold text-lg", isYearly ? "text-white" : "text-slate-900")}>
                        {displayName}
                      </span>
                      <span className={cn("font-black text-xl", isYearly ? "text-amber-300" : "text-indigo-600")}>
                        {pkg.product.priceString}
                      </span>
                    </div>
                    <p className={cn("text-xs font-medium", isYearly ? "text-indigo-100" : "text-slate-400")}>
                      {pkg.product.description || (
                        isYearly ? t('subscription_section.yearly_description') : 
                        isMonthly ? t('subscription_section.monthly_description') : 
                        t('subscription_section.weekly_description')
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {t('subscription_section.login_required_desc') || 'Please login to subscribe and protect your documents with Pro features.'}
              </p>
              <button
                onClick={handleGoogleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                {t('subscription_section.login_with_google') || 'Login with Google'}
              </button>
              <button
                onClick={handleAppleSignIn}
                className="w-full py-4 px-6 rounded-2xl bg-black dark:bg-zinc-950 border border-zinc-800 dark:border-zinc-800 hover:bg-zinc-900 dark:hover:bg-black text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 16 16">
                  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282"/>
                </svg>
                {t('subscription_section.login_with_apple') || 'Login with Apple'}
              </button>
            </div>
          )}
          
          <button
            onClick={restorePurchases}
            disabled={loading}
            className="mt-6 text-sm text-zinc-500 underline underline-offset-4"
          >
            {t('subscription_section.paywall_restore') || 'Restore Purchases'}
          </button>
          
          <p className="mt-4 text-[10px] text-zinc-400 leading-tight">
            {t('subscription_section.auto_renew_notice')}
          </p>
        </div>
      </div>
    </div>
  );
};
