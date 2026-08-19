'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { getLocalizedText } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick } from '@/lib/sound';
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
  IconCalendarEvent,
  IconClock,
} from '@tabler/icons-react';

interface ResultCase {
  id: string;
  category: { fr: string; pt: string; en: string };
  label: { fr: string; pt: string; en: string };
  sessions: { fr: string; pt: string; en: string };
  duration: { fr: string; pt: string; en: string };
  image: string;
  tag: { fr: string; pt: string; en: string };
  color: string;
}

const CASES: ResultCase[] = [
  {
    id: 'cellulite',
    category: { fr: 'Cellulite', pt: 'Celulite & Firmeza', en: 'Cellulite & Firming' },
    label: { fr: 'Traitement cellulite', pt: 'Tratamento de Celulite e Remodelação', en: 'Cellulite & Silhouette Remodeling' },
    sessions: { fr: '8 séances', pt: '8 sessões', en: '8 sessions' },
    duration: { fr: '4 semaines', pt: '4 semanas', en: '4 weeks' },
    image: '/results/before_after_cellulite.png',
    tag: { fr: 'Minceur', pt: 'Emagrecimento', en: 'Slimming' },
    color: '#C49A3C',
  },
  {
    id: 'cryolipolyse',
    category: { fr: 'Cryolipolyse', pt: 'Criolipólise Avançada', en: 'Advanced Cryolipolysis' },
    label: { fr: 'Élimination des graisses', pt: 'Redução de Gordura Localizada', en: 'Targeted Fat Reduction' },
    sessions: { fr: '3 séances', pt: '3 sessões', en: '3 sessions' },
    duration: { fr: '6 semaines', pt: '6 semanas', en: '6 weeks' },
    image: '/results/before_after_cryolipolyse.png',
    tag: { fr: 'Corps', pt: 'Corpo & Contorno', en: 'Body Contouring' },
    color: '#4A90B8',
  },
  {
    id: 'postpartum',
    category: { fr: 'Rééducation post-partum', pt: 'Reabilitação Pós-Parto', en: 'Postpartum Rehab' },
    label: { fr: 'Reconstruction abdominale', pt: 'Recuperação Abdominal e Pélvica', en: 'Abdominal & Pelvic Recovery' },
    sessions: { fr: '12 séances', pt: '12 sessões', en: '12 sessions' },
    duration: { fr: '6 semaines', pt: '6 semanas', en: '6 weeks' },
    image: '/results/before_after_postpartum.png',
    tag: { fr: 'Post-partum', pt: 'Pós-Parto & Mulher', en: 'Postpartum Care' },
    color: '#A67C98',
  },
  {
    id: 'radiofrequence',
    category: { fr: 'Radiofréquence', pt: 'Radiofrequência Médica', en: 'Medical Radiofrequency' },
    label: { fr: 'Raffermissement cutané', pt: 'Firmeza Cutânea e Colagénio', en: 'Skin Tightening & Collagen' },
    sessions: { fr: '6 séances', pt: '6 sessões', en: '6 sessions' },
    duration: { fr: '3 semaines', pt: '3 semanas', en: '3 weeks' },
    image: '/results/before_after_radiofrequence.png',
    tag: { fr: 'Visage & Corps', pt: 'Rosto e Corpo', en: 'Face & Body' },
    color: '#7B9E87',
  },
  {
    id: 'drainage',
    category: { fr: 'Drainage lymphatique', pt: 'Drenagem Linfática (Vodder)', en: 'Lymphatic Drainage (Vodder)' },
    label: { fr: 'Jambes légères & désenflées', pt: 'Pernas Leves e Descongestionadas', en: 'Heavy Legs & Edema Relief' },
    sessions: { fr: '5 séances', pt: '5 sessões', en: '5 sessions' },
    duration: { fr: '2 semaines', pt: '2 semanas', en: '2 weeks' },
    image: '/results/before_after_drainage.png',
    tag: { fr: 'Rééducation', pt: 'Reabilitação Ativa', en: 'Active Rehab' },
    color: '#8B7355',
  },
];

/**
 * High-performance, GPU-accelerated Before/After slider with zero layout thrash.
 */
const BeforeAfterSlider = memo(function BeforeAfterSlider({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none bg-[#1A1412] touch-none shadow-2xl border border-white/10"
      onPointerDown={(e) => {
        isDragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updatePosition(e.clientX);
      }}
      onPointerMove={(e) => {
        if (isDragging.current) updatePosition(e.clientX);
      }}
      onPointerUp={() => {
        isDragging.current = false;
      }}
      onPointerCancel={() => {
        isDragging.current = false;
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
        if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
      }}
      role="slider"
      aria-valuenow={Math.round(pos)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={alt}
    >
      {/* Base Layer: AFTER Image */}
      <Image
        src={src}
        alt={`After — ${alt}`}
        fill
        priority={priority}
        quality={85}
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-center pointer-events-none"
      />

      {/* Top Layer: BEFORE Image (Hardware-accelerated GPU Clip-Path) */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - pos}% 0 0)`,
          willChange: 'clip-path',
        }}
      >
        <Image
          src={src}
          alt={`Before — ${alt}`}
          fill
          priority={priority}
          quality={85}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center filter grayscale-[65%] brightness-[0.88] contrast-[1.08] pointer-events-none"
        />
        <div className="absolute inset-0 bg-[#8B6914]/10 mix-blend-multiply" />
      </div>

      {/* Smooth Divider Bar & Knob */}
      <div
        className="absolute inset-y-0 z-20 pointer-events-none"
        style={{
          left: `${pos}%`,
          transform: 'translateX(-50%)',
          willChange: 'left',
        }}
      >
        <div className="h-full w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)]" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.45)] border border-white/80 flex items-center justify-center gap-0.5 text-[#1A1412]">
          <IconChevronLeft size={13} />
          <IconChevronRight size={13} />
        </div>
      </div>

      {/* Minimalist Floating Badges */}
      <div className="absolute bottom-3 left-3 z-10 bg-black/65 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg pointer-events-none border border-white/10 shadow-sm">
        ANTES
      </div>
      <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur-md text-[#1A1412] text-[10px] sm:text-[11px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-lg pointer-events-none border border-black/10 shadow-sm">
        DEPOIS
      </div>
    </div>
  );
});

export function BeforeAfterGallery() {
  const { lang, t } = useLanguage();
  const [active, setActive] = useState(0);
  const current = CASES[active];

  const handleTabChange = (index: number) => {
    playSoftClick();
    setActive(index);
  };

  return (
    <section id="resultats" className="relative py-16 sm:py-20 md:py-28 overflow-hidden bg-[#0F0D0B] text-white select-none">
      
      {/* Background Architectural Grid Accent */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(196,154,60,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      
      {/* Dynamic Ambient Color Halo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[500px] sm:h-[600px] rounded-full pointer-events-none opacity-15 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(ellipse, ${current.color} 0%, transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <ScrollReveal className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-[#C49A3C]/35 px-4 py-1.5 rounded-full mb-3 shadow-xs">
            <IconSparkles size={14} className="text-[#C49A3C]" />
            <span className="font-mono text-xs tracking-[0.22em] text-[#C49A3C] uppercase font-semibold">
              {lang === 'pt' ? 'Resultados Clínicos Reais' : lang === 'en' ? 'Real Clinical Results' : 'Résultats Réels'}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            {lang === 'pt' ? 'Antes e Depois' : lang === 'en' ? 'Before & After' : 'Avant & Après'}
          </h2>

          <p className="text-[#A8A49C] max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed font-normal">
            {lang === 'pt'
              ? 'Transformações autênticas obtidas através dos nossos protocolos personalizados e tecnologia de ponta.'
              : lang === 'en'
              ? 'Authentic transformations achieved through customized clinical care and cutting-edge technology.'
              : 'Des transformations authentiques obtenues grâce à nos protocoles de soins personnalisés.'}
          </p>
        </ScrollReveal>

        {/* Category Navigation Pills */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-8 sm:mb-12 max-w-3xl mx-auto">
          {CASES.map((c, i) => {
            const isSelected = active === i;
            return (
              <button
                key={c.id}
                onClick={() => handleTabChange(i)}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  isSelected
                    ? 'bg-[#C49A3C] border-[#C49A3C] text-[#0F0D0B] shadow-[0_0_18px_rgba(196,154,60,0.35)] scale-[1.02]'
                    : 'bg-white/5 border-white/10 text-[#9A9A8A] hover:border-[#C49A3C]/40 hover:text-white'
                }`}
              >
                {getLocalizedText(c.category, lang)}
              </button>
            );
          })}
        </div>

        {/* ── Active Case Showcase ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center max-w-6xl mx-auto">
          
          {/* Left: GPU-Accelerated Slider */}
          <div className="rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl">
            <BeforeAfterSlider
              key={current.id}
              src={current.image}
              alt={getLocalizedText(current.label, lang)}
              priority={active === 0}
            />
          </div>

          {/* Right: Clinical Case Details */}
          <div className="flex flex-col justify-center gap-4 sm:gap-5">
            <div>
              <span
                className="inline-block font-mono text-[10px] sm:text-[11px] uppercase tracking-wider px-3 py-1 rounded-full font-bold"
                style={{
                  background: `${current.color}22`,
                  color: current.color,
                  border: `1px solid ${current.color}50`,
                }}
              >
                {getLocalizedText(current.tag, lang)}
              </span>
            </div>

            <div>
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
                {getLocalizedText(current.category, lang)}
              </h3>
              <p className="text-[#A8A49C] text-sm sm:text-base leading-relaxed">
                {getLocalizedText(current.label, lang)}
              </p>
            </div>

            {/* Protocol Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border backdrop-blur-md"
                style={{
                  background: `${current.color}10`,
                  borderColor: `${current.color}35`,
                }}
              >
                <div className="flex items-center gap-1 text-[#8A8078] text-[10px] sm:text-xs font-mono uppercase tracking-wider mb-1">
                  <IconCalendarEvent size={13} className="text-[#C49A3C]" />
                  <span>{lang === 'pt' ? 'Sessões' : lang === 'en' ? 'Sessions' : 'Séances'}</span>
                </div>
                <p className="text-white text-lg sm:text-2xl font-bold font-serif">
                  {getLocalizedText(current.sessions, lang)}
                </p>
              </div>

              <div
                className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border backdrop-blur-md"
                style={{
                  background: `${current.color}10`,
                  borderColor: `${current.color}35`,
                }}
              >
                <div className="flex items-center gap-1 text-[#8A8078] text-[10px] sm:text-xs font-mono uppercase tracking-wider mb-1">
                  <IconClock size={13} className="text-[#C49A3C]" />
                  <span>{lang === 'pt' ? 'Duração' : lang === 'en' ? 'Duration' : 'Durée'}</span>
                </div>
                <p className="text-white text-lg sm:text-2xl font-bold font-serif">
                  {getLocalizedText(current.duration, lang)}
                </p>
              </div>
            </div>

            <p className="text-[#6E6B65] text-xs leading-relaxed border-l-2 border-[#C49A3C]/40 pl-3">
              {lang === 'pt'
                ? 'Os resultados clínicos dependem da fisiologia de cada paciente. O protocolo definitivo é delineado durante a avaliação inicial.'
                : lang === 'en'
                ? 'Individual results vary based on physiological profile. The tailored protocol is outlined during the initial assessment.'
                : 'Les résultats peuvent varier selon les individus. Chaque protocole est adapté lors de la consultation initiale.'}
            </p>

            <div className="pt-2">
              <Link
                href="/rendez-vous"
                onClick={playSoftClick}
                className="inline-flex items-center justify-center gap-2 bg-[#C49A3C] hover:bg-[#E8C97A] text-[#0F0D0B] font-bold px-6 py-3 sm:px-8 sm:py-3.5 rounded-full transition-all duration-200 text-xs sm:text-sm shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.55)] hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <span>{t.common.bookAppointment}</span>
                <IconArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex justify-center gap-2 mt-8 sm:mt-12">
          {CASES.map((_, i) => (
            <button
              key={i}
              onClick={() => handleTabChange(i)}
              aria-label={`Resultado ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                active === i ? 'w-6 h-2 bg-[#C49A3C]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
