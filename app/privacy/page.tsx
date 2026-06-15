"use client";

import { ChevronLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/hooks/useI18n";

export default function PrivacyPolicy() {
  const { t } = useI18n();

  const sections = (t('privacy.sections') as any[]) || [];

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
          <div className="w-16"></div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 md:p-12 shadow-sm border border-white/60 space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex h-24 w-24 items-center justify-center mb-4">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1C1C1E]">
              {t('privacy.hero_title')}
            </h1>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
              {t('privacy.effective_date')}
            </p>
          </div>

          <div className="space-y-10">
            {sections.map((section, idx) => (
              <section key={idx} className="space-y-4">
                <h2 className="text-xl font-black tracking-tight text-slate-900">{section.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {section.content}
                </p>
                {section.list && (
                  <div className="space-y-3 pt-2">
                    {section.list.map((item: string, i: number) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1 flex-shrink-0">
                           <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <footer className="max-w-3xl mx-auto w-full px-6 py-12 flex justify-center border-t border-slate-200/60 mt-12">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t('privacy.last_updated')}
        </p>
      </footer>
    </div>
  );
}
