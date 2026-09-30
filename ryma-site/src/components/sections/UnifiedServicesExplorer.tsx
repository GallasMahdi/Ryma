'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
import { ServicesHub } from './ServicesHub';
import {
  IconBodyScan,
  IconSparkles,
} from '@tabler/icons-react';

export type ExplorerViewMode = 'anatomy' | 'carousel';

const BodyMap = dynamic(() => import('./BodyMap').then((module) => module.BodyMap), {
  loading: function AnatomyLoading() {
    const { lang } = useLanguage();
    return (
      <div role="status" className="min-h-96 grid place-items-center rounded-3xl bg-white/60 text-sm text-[#6B6058]">
        {lang === 'pt' ? 'A carregar o mapa…' : lang === 'en' ? 'Loading the care map…' : 'Chargement de la carte…'}
      </div>
    );
  },
});

const VIEW_MODES: ExplorerViewMode[] = ['carousel', 'anatomy'];

export function UnifiedServicesExplorer() {
  const { lang } = useLanguage();
  const [viewMode, setViewMode] = useState<ExplorerViewMode>('carousel');
  const [hasOpenedAnatomy, setHasOpenedAnatomy] = useState(false);

  const handleModeChange = (mode: ExplorerViewMode) => {
    if (mode === viewMode) return;
    playSoftClick();
    if (mode === 'anatomy') setHasOpenedAnatomy(true);
    setViewMode(mode);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, mode: ExplorerViewMode) => {
    let nextMode: ExplorerViewMode;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      nextMode = mode === 'carousel' ? 'anatomy' : 'carousel';
    } else if (event.key === 'Home') {
      nextMode = 'carousel';
    } else if (event.key === 'End') {
      nextMode = 'anatomy';
    } else {
      return;
    }
    event.preventDefault();
    handleModeChange(nextMode);
    document.getElementById(`explorer-tab-${nextMode}`)?.focus();
  };

  return (
    <section
      id="services"
      className="relative py-14 sm:py-20 md:py-24 bg-gradient-to-b from-[#FDFBF7] via-[#FAF7F0] to-[#FDFBF7] overflow-hidden select-none"
    >
      {/* Anchor for any link targeting #body-map */}
      <div id="body-map" className="absolute -top-24 pointer-events-none opacity-0" aria-hidden="true" />

      {/* Luxury ambient light glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{
            background:
              'radial-gradient(ellipse 70% 45% at 50% 30%, rgba(245,233,200,0.3) 0%, transparent 70%)',
          }}
        />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-[#C49A3C]/5 blur-3xl" />
        <div className="absolute -right-20 top-2/3 h-80 w-80 rounded-full bg-[#E8C97A]/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-10">

        {/* ── Master Section Header ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          className="text-center mb-8 sm:mb-10 max-w-3xl mx-auto"
        >
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C49A3C]/40 px-4 py-1.5 rounded-full mb-3.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C] animate-pulse" />
            <span className="font-sans text-[11px] sm:text-xs tracking-[0.2em] text-[#9A7428] uppercase font-bold">
              {lang === 'pt'
                ? 'Polos Clínicos & Diagnóstico Integrado'
                : lang === 'en'
                ? 'Clinical Care & Integrated Assessment'
                : 'Pôles Cliniques & Diagnostic Intégré'}
            </span>
          </div>

          {/* Master Title */}
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-[#1A1412] mb-3.5 tracking-tight leading-tight">
            {lang === 'pt' ? (
              <>
                Cuidados Clínicos &{' '}
                <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Protocolos Especializados
                </span>
              </>
            ) : lang === 'en' ? (
              <>
                Clinical Care &{' '}
                <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Specialized Protocols
                </span>
              </>
            ) : (
              <>
                Soins Médicaux &{' '}
                <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Protocoles Spécialisés
                </span>
              </>
            )}
          </h2>

          <p className="text-[#6B6058] text-xs sm:text-sm md:text-base leading-relaxed font-normal max-w-2xl mx-auto">
            {lang === 'pt'
              ? '13 protocolos clínicos estruturados. Navegue pelo catálogo em carrossel ou explore o mapa anatómico interativo.'
              : lang === 'en'
              ? '13 tailored clinical protocols. Browse the treatment carousel or explore the interactive anatomical map.'
              : '13 protocoles médicaux sur-mesure. Parcourez le catalogue en carrousel ou explorez la carte anatomique interactive.'}
          </p>

          {/* ── Haute-Couture View Mode Switcher ─────────────────────── */}
          <div className="mt-6 sm:mt-7 flex items-center justify-center">
            <div
              className="inline-flex max-w-full items-center p-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#C49A3C]/35 shadow-sm"
              role="tablist"
              aria-label={lang === 'pt' ? 'Modo de visualização' : lang === 'en' ? 'View mode' : "Mode d'affichage"}
            >
              {VIEW_MODES.map((mode) => {
                const isSelected = viewMode === mode;
                const isCarousel = mode === 'carousel';
                const Icon = isCarousel ? IconSparkles : IconBodyScan;
                return (
                  <button
                    key={mode}
                    id={`explorer-tab-${mode}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`explorer-panel-${mode}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleModeChange(mode)}
                    onKeyDown={(event) => handleTabKeyDown(event, mode)}
                    className={`relative min-w-0 flex-1 sm:flex-none sm:whitespace-nowrap px-3 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] ${
                      isSelected ? 'text-white' : 'text-[#6B6058] hover:text-[#1A1412]'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="servicesExplorerModePill"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-[#1A1412] to-[#2B2320] shadow-md border border-[#C49A3C]/40"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon size={16} aria-hidden="true" className={`shrink-0 ${isSelected ? 'text-[#E8C97A]' : 'text-[#C49A3C]'}`} />
                      <span>
                        {isCarousel
                          ? lang === 'pt' ? 'Catálogo em Carrossel' : lang === 'en' ? 'Treatment Carousel' : 'Catalogue en Carrousel'
                          : lang === 'pt' ? 'Mapa de Cuidados' : lang === 'en' ? '3D Anatomical Explorer' : 'Carte des soins'}
                      </span>
                      <span className={`hidden sm:inline-block whitespace-nowrap text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isSelected ? 'bg-white/20 text-[#F5E9C8]' : 'bg-[#FAF5EA] text-[#9A7428] border border-[#C49A3C]/20'
                      }`}>
                        {isCarousel
                          ? lang === 'pt' ? '13 Cuidados' : lang === 'en' ? '13 Treatments' : '13 Soins'
                          : lang === 'pt' ? 'Zonas' : 'Zones'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="relative w-full">
          <div
            role="tabpanel"
            id="explorer-panel-carousel"
            aria-labelledby="explorer-tab-carousel"
            hidden={viewMode !== 'carousel'}
            tabIndex={0}
          >
            <ServicesHub embedded hideHeader />
          </div>
          <div
            role="tabpanel"
            id="explorer-panel-anatomy"
            aria-labelledby="explorer-tab-anatomy"
            hidden={viewMode !== 'anatomy'}
            tabIndex={0}
          >
            {/* Load on first selection, then preserve the visitor's map selections. */}
            {hasOpenedAnatomy && <BodyMap embedded hideHeader />}
          </div>
        </div>

      </div>
    </section>
  );
}
