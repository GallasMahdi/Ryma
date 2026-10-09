'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { pt } from '@/data/translations/pt';
import { en } from '@/data/translations/en';
import { fr } from '@/data/translations/fr';
import { es } from '@/data/translations/es';
import { isLanguage, SUPPORTED_LANGUAGES, type Lang } from '@/lib/locales';

export type { Lang } from './locales';
export type Translations = typeof pt;

interface LanguageContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  dir: 'ltr';
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLang = 'pt',
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ryma_lang') as Lang;
        if (isLanguage(saved)) {
          return saved;
        }
      } catch {}
    }
    return initialLang;
  });

  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr');
    document.documentElement.setAttribute('lang', lang);
    const titles = [
      ['Digital Clínica — Fisioterapia & Estética Avançada em Lisboa', 'Digital Clínica — Fisioterapia y estética avanzada en Lisboa'],
      ['Acesso Admin — Digital Clínica', 'Acceso de administración — Digital Clínica'],
    ];
    for (const [ptTitle, esTitle] of titles) {
      if (document.title.includes(ptTitle) || document.title.includes(esTitle)) {
        document.title = document.title.replace(lang === 'es' ? ptTitle : esTitle, lang === 'es' ? esTitle : ptTitle);
      }
    }
  }, [lang]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('ryma_lang', newLang);
      document.cookie = `ryma_lang=${newLang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
  };

  const toggleLang = () => {
    const order = SUPPORTED_LANGUAGES;
    const nextIdx = (order.indexOf(lang) + 1) % order.length;
    setLang(order[nextIdx]);
  };

  const getTranslations = (currentLang: Lang): Translations => {
    switch (currentLang) {
      case 'es':
        return es;
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
