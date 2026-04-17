"use client";

import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' }
] as const;

export const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <div className="flex items-center gap-2 mr-2 text-slate-400">
        <Globe className="h-4 w-4" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-300",
              locale === lang.code 
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" 
                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-100"
            )}
            title={lang.name}
          >
            <span className="mr-1.5">{lang.flag}</span>
            {lang.code}
          </button>
        ))}
      </div>
    </div>
  );
};
