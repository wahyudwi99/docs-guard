"use client";

import { Shield, Lock, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Link from "next/link";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  const { t } = useI18n();

  const handleLogin = () => {
    signIn("google", { callbackUrl: "/" });
  };

  const handleAppleLogin = () => {
    signIn("apple", { callbackUrl: "/" });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      </div>

      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">{t('nav.title')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Hero Section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-white rounded-[24px] shadow-xl shadow-indigo-100 mb-4">
              <Lock className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#1C1C1E]">
              {t('login.title')}
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] border border-white/60 space-y-4">
            
            <button
              onClick={handleLogin}
              className="group w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27c-.03 0-.01 0-.01 0z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm font-bold text-[#1C1C1E]">
                {t('login.google_button')}
              </span>
            </button>

            <button
              onClick={handleAppleLogin}
              className="group w-full py-4 bg-black border border-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-slate-900 active:scale-95 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M17.057 14.825c.018 2.3 1.963 3.074 1.983 3.084-.017.053-.31 1.066-1.017 2.097-.61.894-1.243 1.784-2.245 1.802-.983.018-1.3-.584-2.422-.584-1.121 0-1.474.566-2.404.602-.983.036-1.713-.965-2.325-1.855-1.253-1.815-2.21-5.12-1.025-7.173.588-1.018 1.636-1.663 2.774-1.681 1.017-.018 1.974.686 2.592.686.619 0 1.791-.849 3.007-.726.51.021 1.944.205 2.864 1.55-.074.046-1.713.998-1.696 2.978l-.012.222zm-2.433-8.524c.52-.63.87-1.505.774-2.383-.755.03-1.669.505-2.21 1.144-.485.562-.909 1.455-.796 2.315.843.066 1.712-.446 2.232-1.076z" />
              </svg>
              <span className="text-sm font-bold text-white">
                {t('login.apple_button')}
              </span>
            </button>

            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">
                  {t('login.secure_badge')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  {t('login.privacy_note')}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <Link href="/privacy" className="block text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
            {t('login.footer_privacy')}
          </Link>
        </div>
      </main>

      <footer className="p-8 text-center border-t border-slate-200/60 bg-white/50">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
          {t('login.footer_version')}<br/>
          {t('login.footer_processing')}
        </p>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-in-from-bottom {
          from { transform: translateY(20px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.6s ease-out, slide-in-from-bottom 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
