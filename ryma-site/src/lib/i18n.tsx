'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fr } from '@/data/translations/fr';
import { ar } from '@/data/translations/ar';

export type Lang = 'fr' | 'ar';
export type Translations = typeof fr;

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  dir: 'ltr' | 'rtl';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('ryma_lang') as Lang;
    if (saved === 'fr' || saved === 'ar') setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('ryma_lang', newLang);
  };

  const toggleLang = () => setLang(lang === 'fr' ? 'ar' : 'fr');

  const t = lang === 'ar' ? ar : fr;
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggleLang, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
