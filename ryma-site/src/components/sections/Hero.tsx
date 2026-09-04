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
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconPlayerPause,
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconShieldCheck,
  IconAward,
  IconCheck,
  IconSparkles,
  IconArrowRight,
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
      pt: 'Fisioterapia & Biomecânica Clínica',
      en: 'Physiotherapy & Clinical Biomechanics',
      fr: 'Kinésithérapie & Biomécanique Clinique',
    },
    title: {
      pt: 'Reeducação Postural & Alívio Clínico',
      en: 'Postural Reeducation & Clinical Relief',
      fr: 'Rééducation Posturale & Soulagement',
    },
    subtitle: {
      pt: 'Recupere o bem-estar e a liberdade de movimento através do método RPG e reabilitação especializada.',
      en: 'Restore natural pain-free movement through specialized GPR protocols and personalized therapy.',
      fr: 'Retrouvez votre liberté de mouvement et votre sérénité grâce à la méthode RPG et aux soins ciblés.',
    },
  },
  {
    src: '/hero/slimming.jpg',
    tag: {
      pt: 'Alta Tecnologia Não Invasiva',
      en: 'High-End Non-Invasive Technology',
      fr: 'Haute Technologie Non-Invasive',
    },
    title: {
      pt: 'Remodelação Corporal & Firmeza',
      en: 'Body Contouring & Skin Tightening',
      fr: 'Remodelage Corporel & Fermeté',
    },
    subtitle: {
      pt: 'Criolipólise, cavitação e radiofrequência médica para definição corporal e textura de excelência.',
      en: 'Cryolipolysis, cavitation, and medical radiofrequency for lasting body contouring and radiant skin.',
      fr: 'Cryolipolyse, cavitation et radiofréquence médicale pour un raffermissement naturel et durable.',
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
      pt: 'Análise clínica detalhada para desenhar um protocolo seguro, adaptado e focado nos seus objetivos.',
      en: 'In-depth diagnostic evaluation to curate a bespoke, outcome-driven therapeutic roadmap.',
      fr: 'Analyse clinique approfondie pour concevoir un programme sur-mesure, sécurisé et performant.',
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
      pt: 'Instalações modernas em Lisboa concebidas para proporcionar uma experiência clínica exclusiva.',
      en: 'State-of-the-art practice environment in Lisbon curated for your supreme comfort and well-being.',
      fr: 'Un sanctuaire apaisant et moderne à Lisbonne, pensé pour votre bien-être et votre santé.',
    },
  },
];

const SLIDE_DURATION_MS = 6500;

export function Hero() {
  const { lang, t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
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
    { end: 13, suffix: '', label: lang === 'pt' ? 'Protocolos Clínicos' : lang === 'en' ? 'Clinical Protocols' : 'Protocoles Dédiés' },
    { end: 99, suffix: '%', label: t.hero.stat4Label },
  ];

  return (
    <section className="relative min-h-[88vh] md:min-h-[92vh] lg:min-h-[96vh] flex flex-col justify-between overflow-hidden pt-6 pb-6 sm:pt-10 sm:pb-8 select-none">

      {/* ── Background Slides with Cinematic Crossfade ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = currentIndex === index;
          return (
            <motion.div
              key={slide.src}
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1.02 : 1,
              }}
              transition={{
                opacity: { duration: 1.4, ease: [0.25, 1, 0.5, 1] },
                scale: { duration: SLIDE_DURATION_MS / 1000, ease: 'linear' },
              }}
              className="absolute inset-0"
              style={isActive ? { willChange: 'opacity, transform' } : undefined}
            >
              <Image
                src={slide.src}
                alt={slide.title[lang] || slide.title.pt}
                fill
                priority={index === 0}
                loading={index === 0 ? 'eager' : 'lazy'}
                quality={85}
                sizes="100vw"
                className="object-cover object-center"
              />
            </motion.div>
          );
        })}

        {/* ── Haute Luxe Multilayer Lighting & Overlay ── */}
        {/* Layer 1: Cinematic Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 110% 110% at 50% 45%, transparent 20%, rgba(15, 10, 5, 0.65) 95%)',
          }}
        />

        {/* Layer 2: Top Ambient Dark Drop */}
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-[#0F0A05]/70 via-[#0F0A05]/30 to-transparent" />

        {/* Layer 3: Warm Champagne Gold Glow Center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 38%, rgba(196, 154, 60, 0.18) 0%, transparent 70%)',
          }}
        />

        {/* Layer 4: Text Contrast Veil */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(15, 10, 5, 0.40) 0%, transparent 80%)',
          }}
        />

        {/* Layer 5: Seamless Page Bleed Gradient to Next Section */}
        <div className="absolute inset-x-0 bottom-0 h-44 sm:h-56 bg-gradient-to-t from-[#FAFAF8] via-[#FAFAF8]/80 to-transparent" />
      </div>

      {/* ── Top Header Micro Badge ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 w-full text-center mt-2 sm:mt-4 mb-3 sm:mb-6">
        <motion.div
          key="hero-prestige-badge"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-xl border border-[#C49A3C]/40 px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-[0_8px_30px_rgba(196,154,60,0.14)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C49A3C] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C49A3C]" />
          </span>

          <span className="font-sans text-[11px] sm:text-xs tracking-[0.22em] text-[#8A6A24] uppercase font-bold">
            {lang === 'pt'
              ? 'Digital Clínica • Lisboa'
              : lang === 'en'
                ? 'Digital Clinic • Lisbon'
                : 'Digital Clínica • Lisbonne'}
          </span>

          <span className="hidden sm:inline-block h-3.5 w-px bg-[#C49A3C]/35" />

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#554C42] font-medium">
            <IconAward size={14} className="text-[#C49A3C]" />
            {lang === 'pt'
              ? 'Excelência em Fisioterapia & Estética Médica'
              : lang === 'en'
                ? 'Excellence in Physiotherapy & Medical Aesthetics'
                : 'Excellence en Kinésithérapie & Soins Minceur'}
          </span>
        </motion.div>
      </div>

      {/* ── Main Centerpiece Narrative ── */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center w-full my-auto">

        {/* Dynamic Category Pill */}
        <div className="h-6 sm:h-7 mb-2 sm:mb-3 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`tag-${currentIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-[#E8C97A] drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]"
            >
              <span className="w-5 sm:w-8 h-px bg-gradient-to-r from-transparent to-[#E8C97A]/80" />
              <span>{currentSlide.tag[lang] || currentSlide.tag.pt}</span>
              <span className="w-5 sm:w-8 h-px bg-gradient-to-l from-transparent to-[#E8C97A]/80" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Master Heading with Editorial Cormorant Serif */}
        <motion.div
          key="hero-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl mb-4 sm:mb-6"
        >
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal leading-[1.08] text-white tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            {lang === 'pt' ? (
              <>
                A Arte da Fisioterapia & <br />
                <span className="italic font-medium bg-gradient-to-r from-[#F5E9C8] via-[#E8C97A] to-[#C49A3C] bg-clip-text text-transparent">
                  Estética Médica Avançada
                </span>
              </>
            ) : lang === 'en' ? (
              <>
                The Art of Physiotherapy & <br />
                <span className="italic font-medium bg-gradient-to-r from-[#F5E9C8] via-[#E8C97A] to-[#C49A3C] bg-clip-text text-transparent">
                  Advanced Aesthetics
                </span>
              </>
            ) : (
              <>
                L&apos;Art de la Kinésithérapie & <br />
                <span className="italic font-medium bg-gradient-to-r from-[#F5E9C8] via-[#E8C97A] to-[#C49A3C] bg-clip-text text-transparent">
                  Soins Minceur de Pointe
                </span>
              </>
            )}
          </h1>
        </motion.div>

        {/* Dynamic Sub-Headline Description */}
        <div className="min-h-[48px] sm:min-h-[56px] mb-6 sm:mb-8 flex items-center justify-center max-w-2xl mx-auto px-3">
          <AnimatePresence mode="wait">
            <motion.p
              key={`sub-${currentIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="text-sm sm:text-base md:text-lg text-white/90 font-normal leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
            >
              {currentSlide.subtitle[lang] || currentSlide.subtitle.pt}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* ── Luxury Conversion CTAs ── */}
        <motion.div
          key="hero-ctas"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-md sm:max-w-none mx-auto"
        >
          {/* Primary Action: Book Online */}
          <Button
            href="/rendez-vous"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto text-sm sm:text-base px-6 py-3.5 sm:px-9 sm:py-4 shadow-[0_10px_35px_rgba(196,154,60,0.35)] hover:shadow-[0_14px_45px_rgba(196,154,60,0.5)] tracking-wide font-semibold justify-center rounded-xl sm:rounded-2xl"
          >
            <IconCalendarEvent size={18} className="me-2 shrink-0" />
            <span>{t.common.bookAppointment}</span>
          </Button>

          {/* Secondary Action: Explore Treatments */}
          <Button
            href="/services"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-sm sm:text-base px-6 py-3.5 sm:px-8 sm:py-4 bg-white/90 backdrop-blur-xl border-[#C49A3C]/40 text-[#1A1412] hover:bg-white hover:border-[#C49A3C] tracking-wide font-medium shadow-md justify-center rounded-xl sm:rounded-2xl"
          >
            <span>{t.common.ourServices}</span>
            <IconArrowRight size={16} className="ms-2 text-[#C49A3C]" />
          </Button>

          {/* WhatsApp Direct Concierge */}
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-[#1F8A4C] bg-white/95 hover:bg-white border border-[#25D366]/40 shadow-sm transition-all duration-200"
          >
            <span className="h-2 w-2 rounded-full bg-[#25D366] animate-pulse" />
            <IconBrandWhatsapp size={16} className="text-[#25D366]" />
            <span>WhatsApp Concierge</span>
          </a>
        </motion.div>

        {/* ── Key Trust Pillars ── */}
        <motion.div
          key="hero-trust"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-8 gap-y-2 text-xs sm:text-sm text-white/85 font-medium"
        >
          <span className="flex items-center gap-1.5 drop-shadow-sm">
            <IconCheck size={15} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Atendimento Personalizado 1-a-1' : lang === 'en' ? 'Tailored 1-on-1 Care' : 'Soins Personnalisés 1-à-1'}
          </span>
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 drop-shadow-sm">
            <IconShieldCheck size={15} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Equipamentos Médicos Certificados' : lang === 'en' ? 'Certified Medical Grade' : 'Équipements Médicaux Certifiés'}
          </span>
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5 drop-shadow-sm">
            <IconAward size={15} className="text-[#E8C97A]" />
            {lang === 'pt' ? 'Comparticipação p/ Seguros' : lang === 'en' ? 'Insurance Approved' : 'Reçus Mutuelle & Assurances'}
          </span>
        </motion.div>
      </div>

      {/* ── Bottom Section: Floating Slide Navigator & Metric Ribbon ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-3 sm:px-6 w-full mt-auto pt-4">

        {/* Floating Slide Control Dock */}
        <div className="flex items-center justify-between bg-white/95 backdrop-blur-xl border border-[#C49A3C]/35 px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-[0_6px_25px_rgba(196,154,60,0.12)] mb-3 sm:mb-4">

          {/* Slide Numbers with Progress */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {HERO_SLIDES.map((slide, i) => {
              const isCurrent = currentIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${isCurrent
                    ? 'bg-[#F5E9C8] text-[#8A6A24] ring-1 ring-[#C49A3C]/60 shadow-xs'
                    : 'text-[#8A8078] hover:text-[#1A1412] hover:bg-[#FAF6EE]'
                    }`}
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <span className="font-mono text-[11px] sm:text-xs">0{i + 1}</span>
                  <span className="hidden md:inline-block font-sans text-xs font-medium text-[#554C42]">
                    {slide.tag[lang] || slide.tag.pt}
                  </span>
                  {isCurrent && isPlaying && (
                    <motion.div
                      key={`dock-progress-${i}-${currentIndex}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: SLIDE_DURATION_MS / 1000, ease: 'linear' }}
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#C49A3C] rounded-full origin-left"
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
              className="p-1.5 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? <IconPlayerPause size={15} /> : <IconPlayerPlay size={15} />}
            </button>
            <span className="h-3 w-px bg-[#C49A3C]/25" />
            <button
              onClick={prevSlide}
              className="p-1.5 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label="Previous slide"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              onClick={nextSlide}
              className="p-1.5 rounded-full text-[#8A8078] hover:text-[#9A7428] hover:bg-[#FAF6EE] transition-colors"
              aria-label="Next slide"
            >
              <IconChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Luxury Stats Ribbon ── */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#C49A3C]/25 bg-white/95 backdrop-blur-xl p-3 sm:p-5 shadow-[0_10px_35px_rgba(196,154,60,0.08)]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 sm:gap-y-0 sm:divide-x sm:divide-[#C49A3C]/20 text-center">
            {stats.map((stat, i) => (
              <div key={i} className="px-2 py-0.5">
                <div className="font-serif text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent leading-none mb-1">
                  <CounterAnimation end={stat.end} suffix={stat.suffix} />
                </div>
                <div className="font-sans text-[10px] sm:text-xs font-semibold text-[#8A8078] tracking-wider uppercase truncate">
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
