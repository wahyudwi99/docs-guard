"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '@/lib/i18n/dictionaries/en.json';
import id from '@/lib/i18n/dictionaries/id.json';
import ja from '@/lib/i18n/dictionaries/ja.json';
import ko from '@/lib/i18n/dictionaries/ko.json';
import zh from '@/lib/i18n/dictionaries/zh.json';
import ru from '@/lib/i18n/dictionaries/ru.json';
import es from '@/lib/i18n/dictionaries/es.json';
import pt from '@/lib/i18n/dictionaries/pt.json';

type Language = 'en' | 'id' | 'ja' | 'ko' | 'zh' | 'ru' | 'es' | 'pt';

const dictionaries = { en, id, ja, ko, zh, ru, es, pt };

interface I18nContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (path: string, variables?: Record<string, any>) => any;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Language>('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Language;
    if (savedLocale && dictionaries[savedLocale]) {
      setLocaleState(savedLocale);
    } else {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (dictionaries[browserLang]) {
        setLocaleState(browserLang);
      }
    }
  }, []);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    localStorage.setItem('locale', lang);
  };

  const t = (path: string, variables?: Record<string, any>) => {
    const keys = path.split('.');
    let result: any = dictionaries[locale];

    for (const key of keys) {
      if (result[key] === undefined) return path;
      result = result[key];
    }

    if (typeof result === 'string' && variables) {
      Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{${key}}`, 'g'), value);
      });
    }

    return result;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
