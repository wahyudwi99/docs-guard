"use client";

import { Shield, Lock, EyeOff, ServerOff, Database, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";

export default function PrivacyPolicy() {
  const { t, locale } = useI18n();

  const features = t('privacy.features') as string[];
  const lastUpdated = t('privacy.last_updated', { 
    date: new Date().toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', { 
      month: 'long', 
      year: 'numeric' 
    }) 
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* iOS Style Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-[0_1px_2px_rgba(0,0,0,0.05)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-3xl mx-auto flex h-16 items-center px-6">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-widest">{t('privacy.back_button')}</span>
          </Link>
          <div className="flex-1 text-center">
            <span className="text-lg font-bold tracking-tight text-[#1C1C1E]">{t('privacy.title')}</span>
          </div>
          <div className="w-16"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-[#1C1C1E]">
              "{t('privacy.hero_title')}" <br /> {t('privacy.title')}
            </h1>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              {t('privacy.hero_subtitle')}
            </p>
          </div>

          {/* Key Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-sm border border-white/60 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                <EyeOff className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{t('privacy.amnesia.title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('privacy.amnesia.description')}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-sm border border-white/60 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{t('privacy.on_device.title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('privacy.on_device.description')}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-sm border border-white/60 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <ServerOff className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{t('privacy.zero_cloud.title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('privacy.zero_cloud.description')}
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-sm border border-white/60 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{t('privacy.zero_selling.title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('privacy.zero_selling.description')}
              </p>
            </div>
          </div>

          {/* Detailed Section */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 md:p-12 shadow-sm border border-white/60 space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight">{t('privacy.commitment_title')}</h2>
              <p className="text-slate-600 leading-relaxed">
                {t('privacy.commitment_description')}
              </p>
              <div className="space-y-3">
                {features.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-slate-100">
              <h2 className="text-2xl font-black tracking-tight">{t('privacy.technical_title')}</h2>
              <p className="text-slate-600 leading-relaxed">
                {t('privacy.technical_description')}
              </p>
            </section>

            <section className="space-y-4 pt-8 border-t border-slate-100">
              <h2 className="text-2xl font-black tracking-tight">{t('privacy.contact_title')}</h2>
              <p className="text-slate-600 leading-relaxed">
                {t('privacy.contact_description')}
              </p>
              <p className="text-sm font-bold text-indigo-600">security@docsguard.app</p>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-3xl mx-auto w-full px-6 py-12 flex justify-center border-t border-slate-200/60 mt-12">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {lastUpdated}
        </p>
      </footer>
    </div>
  );
}
