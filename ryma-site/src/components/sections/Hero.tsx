'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { CounterAnimation } from '@/components/animation/CounterAnimation';
import { playSoftClick, playSlideChange } from '@/lib/sound';
import {
  IconStethoscope,
  IconFlame,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconPlayerPause,
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconShieldCheck,
  IconAward,
  IconArrowUpRight,
  IconCheck,
} from '@tabler/icons-react';

interface Slide {
  src: string;
  tag: { pt: string; en: string; fr: string };
  title: { pt: string; en: string; fr: string };
  subtitle: { pt: string; en: string; fr: string };
}

const HERO_SLIDES: Slide[] = [
  {
    src: '/hero/therapy.jpg',
    tag: {
      pt: 'Fisioterapia & Biomecânica',
      en: 'Physiotherapy & Biomechanics',
      fr: 'Kinésithérapie & Biomécanique',
    },
    title: {
      pt: 'Reeducação Postural & Alívio Clínico',
      en: 'Postural Reeducation & Clinical Relief',
      fr: 'Rééducation Posturale & Soulagement',
    },
    subtitle: {
      pt: 'Recupere a liberdade de movimento através do método RPG e reabilitação especializada.',
      en: 'Restore pain-free movement through specialized GPR method and targeted therapy.',
      fr: 'Retrouvez votre liberté de mouvement grâce à la méthode RPG et aux soins ciblés.',
    },
  },
  {
    src: '/hero/slimming.jpg',
    tag: {
      pt: 'Alta Tecnologia Não Invasiva',
      en: 'High-Tech Non-Invasive',
      fr: 'Haute Technologie Non-Invasive',
    },
    title: {
      pt: 'Remodelação & Estética Médica',
      en: 'Body Contouring & Medical Aesthetics',
      fr: 'Remodelage & Esthétique Médicale',
    },
    subtitle: {
      pt: 'Criolipólise, cavitação e radiofrequência para definição corporal e firmeza da pele.',
      en: 'Cryolipolysis, cavitation, and radiofrequency for lasting body sculpting and firming.',
      fr: 'Cryolipolyse, cavitation et radiofréquence pour un raffermissement naturel et durable.',
    },
  },
  {
    src: '/hero/consultation.jpg',
    tag: {
      pt: 'Diagnóstico Sob Medida',
      en: 'Tailored Clinical Assessment',
      fr: 'Bilan Sur-Mesure',
    },
    title: {
      pt: 'Avaliação & Plano Individualizado',
      en: 'Comprehensive Personal Consultation',
      fr: 'Consultation & Protocole Personnalisé',
    },
    subtitle: {
      pt: 'Análise minuciosa de cada caso para desenhar um protocolo seguro com metas claras.',
      en: 'In-depth clinical diagnostic evaluation to design a safe, outcome-driven protocol.',
      fr: 'Analyse clinique approfondie pour concevoir un programme personnalisé et sécurisé.',
    },
  },
  {
    src: '/hero/clinic.jpg',
    tag: {
      pt: 'Ambiente de Excelência',
      en: 'Sanctuary of Excellence',
      fr: 'Espace d\'Exception',
    },
    title: {
      pt: 'Privacidade, Conforto & Serenidade',
      en: 'Privacy, Comfort & Peace of Mind',
      fr: 'Confidentialité & Sérénité',
    },
    subtitle: {
      pt: 'Instalações modernas concebidas para proporcionar uma experiência clínica sem igual.',
      en: 'State-of-the-art practice environment curated for your supreme comfort and care.',
      fr: 'Un cadre moderne et apaisant pensé pour votre bien-être et votre santé.',
    },
  },
];

const SLIDE_DURATION_MS = 6000;

export function Hero() {
  const { lang, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeSegment, setActiveSegment] = useState<'kine' | 'minceur'>('kine');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = useCallback((index: number) => {
    playSlideChange();
    setCurrentIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    playSlideChange();
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    playSlideChange();
  }, []);

  // Bug 1 fix: only depend on `isPlaying`. Adding `currentIndex` caused the
  // 6-second timer to reset from 0 on every auto-advance, making the slideshow
  // stutter and double-fire the slide-change sound.
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const currentSlide = HERO_SLIDES[currentIndex];

  const stats = [
    { end: 420, suffix: '+', label: t.hero.stat1Label },
    { end: 8, suffix: '+', label: t.hero.stat2Label },
    { end: 13, suffix: '', label: lang === 'pt' ? 'Tratamentos' : lang === 'en' ? 'Treatments' : 'Soins' },
    { end: 99, suffix: '%', label: t.hero.stat4Label },
  ];

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] lg:min-h-[94vh] flex flex-col justify-between overflow-hidden pt-4 pb-6 sm:pt-10 sm:pb-10 select-none">

      {/* ── Background Slides with Cinematic Crossfade & Gentle Zoom ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = currentIndex === index;
          return (
            <motion.div
              key={slide.src}
              // Bug 3 + Perf fix:
              // - Inactive slides get opacity:0 but scale stays at 1 (not 1.04).
              //   Previously they animated back to 1.04 during crossfade = jank.
              // - willChange only on the active slide to avoid 4× GPU compositor layers.
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1 : 1,
              }}
              transition={{
                opacity: { duration: 1.2, ease: [0.25, 1, 0.5, 1] },
              }}
              className="absolute inset-0"
              style={isActive ? { willChange: 'opacity' } : undefined}
            >
              <Image
                src={slide.src}
                alt={slide.title[lang] || slide.title.pt}
                fill
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
                quality={isActive ? 90 : 60}
                sizes="100vw"
                className="object-cover object-center scale-[1.02]"
              />
            </motion.div>
          );
        })}

        {/* ── Enterprise-grade 5-layer overlay system ──
             The image remains prominently visible (~75%).
             Each layer has a single responsibility.
        */}

        {/* Layer 1: Edge vignette — depth & cinematic framing */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(15,10,5,0.60) 100%)',
          }}
        />

        {/* Layer 2: Top dark gradient — anchors the badge + tag text */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0F0A05]/55 via-[#0F0A05]/20 to-transparent" />

        {/* Layer 3: Warm gold atmosphere — luxury clinic signature */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 50% 42%, rgba(196,154,60,0.14) 0%, transparent 65%)',
          }}
        />

        {/* Layer 4: Subtle center tint for heading readability without washing out the image */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 65% 48% at 50% 38%, rgba(15,10,5,0.30) 0%, transparent 70%)',
          }}
        />

        {/* Layer 5: Bottom cinematic page-blend — smooth transition to next section */}
        <div className="absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8]/75 to-transparent" />
      </div>

      {/* ── Top Header Micro Badge ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-3 sm:px-6 w-full text-center mb-2 sm:mb-4">
        <motion.div
          key="hero-badge"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-xl border border-[#C49A3C]/35 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-[0_4px_20px_rgba(196,154,60,0.12)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C49A3C] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C49A3C]" />
          </span>

          <span className="font-sans text-[10px] sm:text-xs tracking-[0.2em] text-[#8A6A24] uppercase font-bold">
            {lang === 'pt'
              ? 'Digital Clínica • Lisboa'
              : lang === 'en'
                ? 'Digital Clinic • Lisbon'
                : 'Digital Clínica • Lisbonne'}
          </span>

          <span className="hidden sm:inline-block h-3 w-px bg-[#C49A3C]/30" />

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#554C42] font-medium">
            <IconAward size={13} className="text-[#C49A3C]" />
            {lang === 'pt' ? 'Excelência Clínica & Estética' : lang === 'en' ? 'Clinical & Aesthetic Mastery' : 'Excellence Médicale & Esthétique'}
          </span>
        </motion.div>
      </div>

      {/* ── Main Center Narrative ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center w-full my-auto">

        {/* Dynamic Slide Tag Pill */}
        <div className="h-5 sm:h-6 mb-1 sm:mb-2 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`tag-${currentIndex}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.24em] text-[#E8C97A] drop-shadow-sm"
            >
              <span className="w-4 sm:w-5 h-px bg-[#E8C97A]/70" />
              <span>{currentSlide.tag[lang] || currentSlide.tag.pt}</span>
              <span className="w-4 sm:w-5 h-px bg-[#E8C97A]/70" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Master Heading with Animated Typography */}
        <motion.div
          key="hero-heading"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-4xl mb-2 sm:mb-4"
        >
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] sm:leading-[1.1] text-white tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
            {lang === 'pt' ? (
              <>
                A Arte da Fisioterapia & <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Estética Médica Avançada
                </span>
              </>
            ) : lang === 'en' ? (
              <>
                The Art of Physiotherapy & <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Advanced Aesthetics
                </span>
              </>
            ) : (
              <>
                L&apos;Art de la Kinésithérapie & <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">
                  Soins Minceur de Pointe
                </span>
              </>
            )}
          </h1>
        </motion.div>

        {/* Dynamic Sub-Headline Description */}
        <div className="min-h-[32px] sm:h-10 mb-4 sm:mb-6 flex items-center justify-center max-w-xl mx-auto px-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={`sub-${currentIndex}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28 }}
              className="text-xs sm:text-sm md:text-base text-white/85 font-normal leading-relaxed drop-shadow-sm"
            >
              {currentSlide.subtitle[lang] || currentSlide.subtitle.pt}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Dual Core Expertise Cards ── */}

        {/* MOBILE: Segment switcher + solid white card */}
        <div className="block md:hidden mb-4 max-w-sm mx-auto">
          <div className="p-1 bg-white rounded-full border border-white/20 flex items-center mb-3 shadow-lg">
            <button
              onClick={() => { setActiveSegment('kine'); playSoftClick(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-bold transition-all duration-300 ${
                activeSegment === 'kine'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-sm'
                  : 'text-[#554C42]'
              }`}
            >
              <IconStethoscope size={13} />
              <span>{lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}</span>
            </button>
            <button
              onClick={() => { setActiveSegment('minceur'); playSoftClick(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-bold transition-all duration-300 ${
                activeSegment === 'minceur'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-sm'
                  : 'text-[#554C42]'
              }`}
            >
              <IconFlame size={13} />
              <span>{lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeSegment === 'kine' ? (
              <motion.div
                key="mob-kine"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-2xl p-4 text-left shadow-[0_8px_40px_rgba(0,0,0,0.18)] border-l-4 border-[#C49A3C]"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#FAF5EA] to-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30 shrink-0">
                    <IconStethoscope size={17} />
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[#C49A3C] font-bold mb-0.5">Polo 01</div>
                    <span className="text-xs font-bold text-[#1A1412] leading-tight">
                      {lang === 'pt' ? 'Fisioterapia & Reeducação' : lang === 'en' ? 'Physiotherapy & Rehab' : 'Kinésithérapie & Rééducation'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#6B6058] mb-2.5 leading-relaxed">
                  {lang === 'pt'
                    ? 'Protocolos clínicos especializados para postura, hérnias e recuperação articular.'
                    : lang === 'en'
                    ? 'Specialized clinical protocols for posture, spinal discs, and joint rehab.'
                    : 'Protocoles cliniques pour la posture, le dos et la rééducation.'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {['RPG', 'TENS', 'Vodder'].map(tag => (
                      <span key={tag} className="text-[9px] font-mono font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-1.5 py-0.5 rounded-md">{tag}</span>
                    ))}
                  </div>
                  <Link href="/services?pole=kinesitherapie" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#9A7428]">
                    {lang === 'pt' ? 'Ver' : lang === 'en' ? 'See' : 'Voir'} <IconArrowUpRight size={12} />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mob-minceur"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="bg-white rounded-2xl p-4 text-left shadow-[0_8px_40px_rgba(0,0,0,0.18)] border-l-4 border-[#E8C97A]"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#FAF3E0] to-[#FAF5EA] text-[#C49A3C] border border-[#C49A3C]/30 shrink-0">
                    <IconFlame size={17} />
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase tracking-widest text-[#C49A3C] font-bold mb-0.5">Polo 02</div>
                    <span className="text-xs font-bold text-[#1A1412] leading-tight">
                      {lang === 'pt' ? 'Estética Médica & Minceur' : lang === 'en' ? 'Body Sculpting & Slimming' : 'Soins Minceur High-Tech'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#6B6058] mb-2.5 leading-relaxed">
                  {lang === 'pt'
                    ? 'Redução de gordura localizada, firmeza da pele e drenagem sem cirurgia.'
                    : lang === 'en'
                    ? 'Targeted fat reduction, skin firming, and drainage with zero downtime.'
                    : 'Élimination des graisses localisées et raffermissement sans chirurgie.'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-wrap">
                    {['Criolipólise', 'Cavitação', 'RF'].map(tag => (
                      <span key={tag} className="text-[9px] font-mono font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-1.5 py-0.5 rounded-md">{tag}</span>
                    ))}
                  </div>
                  <Link href="/services?pole=minceur" className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#9A7428]">
                    {lang === 'pt' ? 'Ver' : lang === 'en' ? 'See' : 'Voir'} <IconArrowUpRight size={12} />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DESKTOP: Premium solid-white dual expertise cards */}
        <motion.div
          key="hero-cards"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="hidden md:grid md:grid-cols-2 gap-4 lg:gap-5 max-w-3xl mx-auto mb-6 lg:mb-8 text-left"
        >
          {/* Card 1 — Fisioterapia */}
          <Link
            href="/services?pole=kinesitherapie"
            onClick={playSoftClick}
            className="group relative overflow-hidden rounded-2xl bg-white border-l-4 border-[#C49A3C] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.30)] hover:-translate-y-1.5 transition-all duration-300"
          >
            {/* Subtle hover sheen */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FAF5EA]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-start gap-3 mb-3">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-[#FAF5EA] to-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                <IconStethoscope size={21} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C49A3C] font-bold mb-0.5">Polo 01</div>
                <span className="font-serif text-sm lg:text-base font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors leading-tight block">
                  {lang === 'pt' ? 'Fisioterapia & Reeducação' : lang === 'en' ? 'Physiotherapy & Rehab' : 'Kinésithérapie & Rééducation'}
                </span>
              </div>
              <IconArrowUpRight size={16} className="text-[#C49A3C] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
            </div>

            <p className="text-xs text-[#554C42] leading-relaxed mb-3 line-clamp-2">
              {lang === 'pt'
                ? 'RPG, alívio de hérnias discais, recuperação articular e reabilitação pós-parto com acompanhamento contínuo.'
                : lang === 'en'
                ? 'GPR therapy, spinal disc relief, joint restoration, and dedicated postpartum pelvic health.'
                : 'RPG, soulagement du dos, rééducation articulaire et soins périnéaux post-partum.'}
            </p>

            <div className="flex flex-wrap gap-1">
              {['RPG', 'TENS', 'Vodder', lang === 'pt' ? 'Seguros' : lang === 'en' ? 'Insurance' : 'Mutuelle'].map(tag => (
                <span key={tag} className="text-[10px] font-mono font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-2 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          </Link>

          {/* Card 2 — Estética Minceur */}
          <Link
            href="/services?pole=minceur"
            onClick={playSoftClick}
            className="group relative overflow-hidden rounded-2xl bg-white border-l-4 border-[#E8C97A] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.30)] hover:-translate-y-1.5 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FAF3E0]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex items-start gap-3 mb-3">
              <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-to-br from-[#FAF3E0] to-[#F5E9C8] text-[#C49A3C] border border-[#C49A3C]/30 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                <IconFlame size={21} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#C49A3C] font-bold mb-0.5">Polo 02</div>
                <span className="font-serif text-sm lg:text-base font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors leading-tight block">
                  {lang === 'pt' ? 'Estética Médica & Minceur' : lang === 'en' ? 'Slimming & Body Sculpting' : 'Soins Minceur High-Tech'}
                </span>
              </div>
              <IconArrowUpRight size={16} className="text-[#C49A3C] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1" />
            </div>

            <p className="text-xs text-[#554C42] leading-relaxed mb-3 line-clamp-2">
              {lang === 'pt'
                ? 'Tecnologias avançadas não invasivas para destruição de gordura, refirmação cutânea e drenagem sequencial.'
                : lang === 'en'
                ? 'Cutting-edge non-invasive modalities for targeted fat apoptosis, collagen tightening, and drainage.'
                : 'Technologies médicales pour la réduction graisseuse ciblée et le raffermissement cutané.'}
            </p>

            <div className="flex flex-wrap gap-1">
              {['Criolipólise', 'Cavitação', 'Radiofrequência', 'Pressoterapia'].map(tag => (
                <span key={tag} className="text-[10px] font-mono font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-2 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          </Link>
        </motion.div>

        {/* ── Luxury CTAs ── */}
        <motion.div
          key="hero-ctas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3.5 mb-4 sm:mb-6 w-full max-w-sm sm:max-w-none mx-auto"
        >
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3.5 w-full sm:w-auto">
            {/* Primary Button */}
            <Button
              href="/rendez-vous"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto text-xs sm:text-base px-4 py-2.5 sm:px-8 sm:py-3.5 shadow-[0_8px_30px_rgba(196,154,60,0.28)] hover:shadow-[0_12px_40px_rgba(196,154,60,0.4)] tracking-wide font-semibold justify-center"
            >
              <IconCalendarEvent size={16} className="me-1.5 shrink-0" />
              <span className="truncate">{t.common.bookAppointment}</span>
            </Button>

            {/* Secondary Button */}
            <Button
              href="/services"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-xs sm:text-base px-4 py-2.5 sm:px-8 sm:py-3.5 bg-white/90 backdrop-blur-xl border-[#C49A3C]/35 text-[#1A1412] hover:bg-white hover:border-[#C49A3C] tracking-wide font-medium shadow-xs justify-center"
            >
              <span className="truncate">{t.common.ourServices}</span>
            </Button>
          </div>

          {/* WhatsApp Compact Fast-Track Link */}
          <a
            href={`https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
              lang === 'pt'
                ? 'Olá Digital Clínica! Gostaria de informações sobre marcação de consulta.'
                : lang === 'en'
                  ? 'Hello Digital Clinic! I would like to inquire about booking an appointment.'
                  : 'Bonjour Digital Clínica ! Je souhaite réserver une consultation.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playSoftClick}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-[#1F8A4C] bg-white/90 hover:bg-white border border-[#25D366]/40 shadow-xs transition-all duration-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
            <IconBrandWhatsapp size={14} className="text-[#25D366]" />
            <span>WhatsApp Fast-Track</span>
          </a>
        </motion.div>

        {/* ── Key Trust Pillars ── */}
        <motion.div
          key="hero-trust"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-[10px] sm:text-xs text-white/75 font-medium mb-3 sm:mb-5"
        >
          <span className="flex items-center gap-1">
            <IconCheck size={13} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Atendimento 1-a-1' : lang === 'en' ? '1-on-1 Care' : 'Soins 1-à-1'}
          </span>
          <span className="text-white/25">•</span>
          <span className="flex items-center gap-1">
            <IconShieldCheck size={13} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Equipamentos Médicos' : lang === 'en' ? 'Medical Grade' : 'Équipements Médicaux'}
          </span>
          <span className="text-white/25">•</span>
          <span className="flex items-center gap-1">
            <IconAward size={13} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Recibos p/ Seguros' : lang === 'en' ? 'Insurance Receipts' : 'Reçus Assurances'}
          </span>
        </motion.div>
      </div>

      {/* ── Bottom Section: Floating Slide Navigator & Metric Ribbon ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-3 sm:px-6 w-full mt-auto">

        {/* Floating Slide Control Dock */}
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-xl border border-[#C49A3C]/30 px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-[0_6px_24px_rgba(196,154,60,0.1)] mb-2.5 sm:mb-4">

          {/* Slide Numbers with Progress */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {HERO_SLIDES.map((slide, i) => {
              const isCurrent = currentIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`relative flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold transition-all duration-300 ${isCurrent
                    ? 'bg-[#F5E9C8] text-[#8A6A24] ring-1 ring-[#C49A3C]/60 shadow-xs'
                    : 'text-[#8A8078] hover:text-[#1A1412] hover:bg-[#FAF6EE]'
                    }`}
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <span>0{i + 1}</span>
                  <span className="hidden md:inline-block font-sans text-[11px] font-medium text-[#554C42]">
                    {slide.tag[lang] || slide.tag.pt}
                  </span>
                  {isCurrent && isPlaying && (
                    <motion.div
                      key={`dock-progress-${i}-${currentIndex}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: SLIDE_DURATION_MS / 1000, ease: 'linear' }}
                      className="absolute bottom-0 left-1.5 right-1.5 h-0.5 bg-[#C49A3C] rounded-full origin-left"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Controls: Play/Pause + Prev/Next */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => { setIsPlaying((p) => !p); playSoftClick(); }}
              className="p-1 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
            </button>
            <span className="h-3 w-px bg-[#C49A3C]/20" />
            <button
              onClick={prevSlide}
              className="p-1 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label="Previous slide"
            >
              <IconChevronLeft size={15} />
            </button>
            <button
              onClick={nextSlide}
              className="p-1 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label="Next slide"
            >
              <IconChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* ── Luxury Stats Ribbon ── */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#C49A3C]/25 bg-white/90 backdrop-blur-xl p-2 sm:p-4 shadow-[0_8px_28px_rgba(196,154,60,0.06)]">
          <div className="grid grid-cols-4 divide-x divide-[#C49A3C]/20 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="px-1 py-0.5">
                <div className="font-serif text-base sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent leading-none mb-0.5 sm:mb-1">
                  <CounterAnimation end={stat.end} suffix={stat.suffix} />
                </div>
                <div className="font-mono text-[8px] sm:text-[10px] md:text-[11px] font-semibold text-[#8A8078] tracking-wider uppercase truncate">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
