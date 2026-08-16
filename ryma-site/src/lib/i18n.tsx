'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { pt } from '@/data/translations/pt';
import { en } from '@/data/translations/en';
import { fr } from '@/data/translations/fr';

export type Lang = 'pt' | 'en' | 'fr';
export type Translations = typeof pt;

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  dir: 'ltr';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt');

  useEffect(() => {
    const saved = localStorage.getItem('ryma_lang') as Lang;
    if (saved === 'pt' || saved === 'en' || saved === 'fr') {
      setLangState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('ryma_lang', newLang);
  };

  const toggleLang = () => {
    const order: Lang[] = ['pt', 'en', 'fr'];
    const nextIdx = (order.indexOf(lang) + 1) % order.length;
    setLang(order[nextIdx]);
  };

  const getTranslations = (currentLang: Lang): Translations => {
    switch (currentLang) {
      case 'en':
        return en;
      case 'fr':
        return fr;
      case 'pt':
      default:
        return pt;
    }
  };

  const t = getTranslations(lang);

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, toggleLang, dir: 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

