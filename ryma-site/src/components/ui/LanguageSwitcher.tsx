'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, type Lang } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
import { IconChevronDown, IconCheck } from '@tabler/icons-react';

/* ── Crisp, Vector-Accurate Country Flags ────────────────────────────── */

export function PortugalFlag({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.18)] border border-[#C49A3C]/30 shrink-0 ${className}`}
      title="Portugal"
    >
      <svg viewBox="0 0 600 400" className="w-full h-full block" preserveAspectRatio="none">
        <rect width="240" height="400" fill="#046A38" />
        <rect x="240" width="360" height="400" fill="#DA291C" />
        <circle cx="240" cy="200" r="70" fill="#FFD100" stroke="#1A1412" strokeWidth="4" />
        <rect x="215" y="175" width="50" height="50" rx="6" fill="#FFFFFF" stroke="#DA291C" strokeWidth="6" />
        <circle cx="240" cy="200" r="11" fill="#002B7F" />
      </svg>
    </span>
  );
}

export function UKFlag({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.18)] border border-[#C49A3C]/30 shrink-0 ${className}`}
      title="United Kingdom"
    >
      <svg viewBox="0 0 60 30" className="w-full h-full block" preserveAspectRatio="none">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="3" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    </span>
  );
}

export function FranceFlag({ className = 'w-5 h-3.5' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.18)] border border-[#C49A3C]/30 shrink-0 ${className}`}
      title="France"
    >
      <svg viewBox="0 0 900 600" className="w-full h-full block" preserveAspectRatio="none">
        <rect width="300" height="600" fill="#002654" />
        <rect x="300" width="300" height="600" fill="#FFFFFF" />
        <rect x="600" width="300" height="600" fill="#CE1126" />
      </svg>
    </span>
  );
}

export interface LanguageItem {
  code: Lang;
  label: string;
  country: string;
  FlagComponent: React.ComponentType<{ className?: string }>;
}

export const LANGUAGES: LanguageItem[] = [
  { code: 'pt', label: 'Português', country: 'Portugal', FlagComponent: PortugalFlag },
  { code: 'en', label: 'English', country: 'United Kingdom', FlagComponent: UKFlag },
  { code: 'fr', label: 'Français', country: 'France', FlagComponent: FranceFlag },
];

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'drawer';
  className?: string;
}

export function LanguageSwitcher({ variant = 'dropdown', className = '' }: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const CurrentFlag = currentLang.FlagComponent;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectLanguage = (code: Lang) => {
    playSoftClick();
    setLang(code);
    setIsOpen(false);
  };

  /* ── Drawer Inline Pill Segmenter (for Mobile Navigation Drawer) ── */
  if (variant === 'drawer') {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A6A24] px-1 mb-2">
          {lang === 'pt' ? 'Idioma / Language' : lang === 'en' ? 'Language / Idioma' : 'Langue / Language'}
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4EFE6] rounded-2xl border border-[#C49A3C]/30 shadow-2xs">
          {LANGUAGES.map((l) => {
            const isSelected = lang === l.code;
            const Flag = l.FlagComponent;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => selectLanguage(l.code)}
                className={`relative flex items-center justify-center gap-2 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-[#1A1412] shadow-sm border border-[#C49A3C]/40'
                    : 'text-[#6B6058] hover:text-[#1A1412] hover:bg-white/50'
                }`}
              >
                <Flag className="w-4 h-3 shrink-0" />
                <span className="font-mono text-xs uppercase">{l.code}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Desktop & Mobile Header Dropdown ────────────────────────────── */
  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          playSoftClick();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          lang === 'pt'
            ? `Idioma selecionado: ${currentLang.label}. Clique para alterar.`
            : lang === 'en'
            ? `Selected language: ${currentLang.label}. Click to change.`
            : `Langue sélectionnée: ${currentLang.label}. Cliquez pour modifier.`
        }
        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] active:scale-95 touch-manipulation ${
          isOpen
            ? 'bg-white border-[#C49A3C] shadow-sm'
            : 'bg-white/95 hover:bg-[#FAF6EE] border-[#C49A3C]/30 hover:border-[#C49A3C]/60 shadow-2xs'
        }`}
      >
        <CurrentFlag className="w-4 h-3 sm:w-4.5 sm:h-3.2" />
        <span className="font-mono text-xs font-extrabold uppercase text-[#1A1412] tracking-wider">
          {currentLang.code}
        </span>
        <IconChevronDown
          size={13}
          className={`text-[#8A8078] group-hover:text-[#C49A3C] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#C49A3C]' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="listbox"
            aria-label="Idiomas disponíveis"
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-white/98 backdrop-blur-xl border border-[#C49A3C]/35 shadow-[0_12px_36px_rgba(26,20,18,0.12)] p-1.5 z-50 overflow-hidden"
          >
            {/* Subtle luxury gold accent top line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] rounded-full mb-1 opacity-70" />

            <div className="space-y-1">
              {LANGUAGES.map((item) => {
                const isSelected = item.code === lang;
                const Flag = item.FlagComponent;

                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectLanguage(item.code)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-[#FAF5EA] text-[#1A1412] font-bold border border-[#C49A3C]/30 shadow-2xs'
                        : 'text-[#554C42] hover:bg-[#FAF8F5] hover:text-[#1A1412]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Flag className="w-5 h-3.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold leading-snug text-[#1A1412]">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-[#8A8078] leading-tight font-medium">
                          {item.country}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#C49A3C] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <IconCheck size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] font-bold text-[#A8A098] uppercase px-1">
                        {item.code}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
