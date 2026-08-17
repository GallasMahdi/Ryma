'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { CounterAnimation } from '@/components/animation/CounterAnimation';
import { IconArrowDown, IconSparkles, IconStethoscope, IconFlame } from '@tabler/icons-react';

const HERO_IMAGES = [
  { src: '/hero_wellness_bg.png', alt: 'Cabinet Medical Kinésithérapie & Minceur' },
  { src: '/hero_kine_bg.png', alt: 'Séance Kinésithérapie & Rééducation' },
  { src: '/hero_slimming_bg.png', alt: 'Soin Minceur High-Tech' },
];

export function Hero() {
  const { lang, t } = useLanguage();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [activeMobileTab, setActiveMobileTab] = useState<'kine' | 'minceur'>('kine');

  // Auto-rotate background image every 4 seconds seamlessly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { end: 1200, suffix: '+', label: t.hero.stat1Label },
    { end: 8,    suffix: '+', label: t.hero.stat2Label },
    { end: 3,    suffix: '',  label: t.hero.stat3Label },
    { end: 99,   suffix: '%', label: t.hero.stat4Label },
  ];

  return (
    <section className="relative min-h-[85vh] md:min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-14 pb-10 md:pt-20 md:pb-16">
      {/* ── Seamless Preloaded Stacked Image Carousel ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {HERO_IMAGES.map((img, index) => {
          const isActive = currentImgIndex === index;
          return (
            <motion.div
              key={img.src}
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 0.9 : 0, scale: isActive ? 1 : 1.04 }}
              transition={{ opacity: { duration: 1.2, ease: 'easeInOut' }, scale: { duration: 4, ease: 'linear' } }}
              className="absolute inset-0"
              style={{ willChange: 'opacity, transform' }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority={index === 0}
                quality={85}
                sizes="100vw"
                className="object-cover object-center"
              />
            </motion.div>
          );
        })}

        {/* Soft vignette overlay - keeps edges soft while leaving center vivid */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF8]/40 via-transparent to-[#FAFAF8]" />

        {/* Subtle center glow overlay to protect text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 75% 55% at 50% 40%, rgba(255,255,255,0.65) 0%, rgba(250,250,248,0.1) 100%)',
          }}
        />

        <div className="absolute left-[-120px] top-[18%] h-[280px] w-[280px] rounded-full bg-[#C49A3C]/10 blur-3xl" />
        <div className="absolute right-[-80px] top-[12%] h-[220px] w-[220px] rounded-full bg-[#E8C97A]/14 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#FAFAF8] to-transparent" />
      </div>

      {/* ── Main Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-5 md:px-12 text-center w-full">

        {/* Carousel Indicators with Progress Animation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-4 md:mb-6 bg-white/90 backdrop-blur-md px-3.5 py-1.5 md:px-4 md:py-2 rounded-full border border-[#C49A3C]/35 shadow-md"
        >
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentImgIndex(i)}
              className={`relative h-2 md:h-2.5 rounded-full transition-all duration-500 overflow-hidden pointer-events-auto ${
                currentImgIndex === i
                  ? 'w-7 md:w-8 bg-[#E8E2D8]'
                  : 'w-2 md:w-2.5 bg-[#D4CEBE] hover:bg-[#9A7428]'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            >
              {currentImgIndex === i && (
                <motion.div
                  key={`progress-${i}-${currentImgIndex}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                  className="h-full bg-[#C49A3C] rounded-full"
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Badge pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="inline-flex items-center gap-2.5 md:gap-3 bg-white/95 backdrop-blur-xl border border-[#C49A3C]/30 px-4 py-2 md:px-5 md:py-2.5 rounded-full mb-6 md:mb-8 shadow-[0_6px_30px_rgba(196,154,60,0.24)]"
        >
          <span className="grid place-items-center h-7 w-7 md:h-9 md:w-9 rounded-full bg-[#C49A3C]/10 text-[#C49A3C] shadow-sm">
            <IconSparkles size={15} className="md:w-4 md:h-4" />
          </span>
          <span className="font-mono text-[10px] md:text-xs tracking-[0.22em] md:tracking-[0.28em] text-[#9A7428] uppercase font-semibold">
            {t.hero.badge}
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-3xl"
        >
          <div className="mb-4 md:mb-6 flex items-center justify-center gap-2.5 md:gap-3">
            <div className="h-px w-8 md:w-10 bg-[#D4CEBE]/80" />
            <span className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] md:tracking-[0.32em] text-[#9A7428] font-semibold">
              {lang === 'pt'
                ? 'Experiência Premium'
                : lang === 'en'
                ? 'Premium Experience'
                : 'Expérience Premium'}
            </span>
            <div className="h-px w-8 md:w-10 bg-[#D4CEBE]/80" />
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.08] md:leading-[1.02] mb-5 md:mb-6 text-[#1A1412] tracking-[-0.02em] drop-shadow-[0_24px_80px_rgba(26,20,18,0.08)]">
            {t.hero.titleLine1}
            <br />
            <span className="text-gradient-bronze">
              {t.hero.titleLine2}
            </span>
          </h1>
        </motion.div>

        {/* ── Highlight Section: Desktop Dual Grid & Mobile Segment Switcher ── */}
        
        {/* MOBILE Segment Switcher (< 768px) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="block md:hidden mb-6"
        >
          {/* Segmented Pill Selector */}
          <div className="inline-flex items-center p-1 bg-[#F4F0E8]/90 backdrop-blur-lg rounded-full border border-[#C49A3C]/30 mb-3.5 mx-auto w-full max-w-[320px] shadow-inner">
            <button
              onClick={() => setActiveMobileTab('kine')}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                activeMobileTab === 'kine'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-md'
                  : 'text-[#4A4540] hover:text-[#C49A3C]'
              }`}
            >
              <IconStethoscope size={14} />
              <span>
                {lang === 'pt'
                  ? 'Fisioterapia'
                  : lang === 'en'
                  ? 'Physiotherapy'
                  : 'Kinésithérapie'}
              </span>
            </button>
            <button
              onClick={() => setActiveMobileTab('minceur')}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-[11px] font-semibold transition-all duration-300 ${
                activeMobileTab === 'minceur'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-md'
                  : 'text-[#4A4540] hover:text-[#C49A3C]'
              }`}
            >
              <IconFlame size={14} />
              <span>
                {lang === 'pt'
                  ? 'Emagrecimento'
                  : lang === 'en'
                  ? 'Slimming Care'
                  : 'Soins Minceur'}
              </span>
            </button>
          </div>

          {/* Animated Card Content */}
          <AnimatePresence mode="wait">
            {activeMobileTab === 'kine' ? (
              <motion.div
                key="kine"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="relative overflow-hidden rounded-[24px] border border-[#C49A3C]/30 bg-white/95 p-4 text-left shadow-[0_16px_40px_rgba(196,154,60,0.12)]"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428]" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="grid place-items-center h-9 w-9 rounded-xl bg-[#C49A3C]/10 text-[#9A7428] shrink-0">
                    <IconStethoscope size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#9A7428]">
                      {lang === 'pt'
                        ? 'Fisioterapia Especializada'
                        : lang === 'en'
                        ? 'Specialized Physiotherapy'
                        : 'Kinésithérapie Sur Mesure'}
                    </div>
                    <div className="text-[10px] text-[#C49A3C] font-mono tracking-wider uppercase font-medium">
                      {lang === 'pt'
                        ? 'Postura & Alívio Duradouro'
                        : lang === 'en'
                        ? 'Posture & Lasting Relief'
                        : 'Posture & Soulagement Durable'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#4A4540] leading-5">
                  {lang === 'pt'
                    ? 'Cuidados especializados para uma postura otimizada, reabilitação ativa e bem-estar duradouro.'
                    : lang === 'en'
                    ? 'Expert care for optimized posture, targeted rehabilitation, and long-term well-being.'
                    : 'Soins experts pour une posture optimisée, une rééducation ciblée et un bien-être durable.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="minceur"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="relative overflow-hidden rounded-[24px] border border-[#C49A3C]/30 bg-white/95 p-4 text-left shadow-[0_16px_40px_rgba(196,154,60,0.12)]"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E8C97A] via-[#C49A3C] to-[#9A7428]" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="grid place-items-center h-9 w-9 rounded-xl bg-[#E8C97A]/15 text-[#C49A3C] shrink-0">
                    <IconFlame size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#C49A3C]">
                      {lang === 'pt'
                        ? 'Protocolos de Emagrecimento High-Tech'
                        : lang === 'en'
                        ? 'High-Tech Slimming Protocols'
                        : 'Protocoles Minceur High-Tech'}
                    </div>
                    <div className="text-[10px] text-[#9A7428] font-mono tracking-wider uppercase font-medium">
                      {lang === 'pt'
                        ? 'Remodelação 100% Não Invasiva'
                        : lang === 'en'
                        ? '100% Non-Invasive Sculpting'
                        : 'Remodelage 100% Non-Invasif'}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#4A4540] leading-5">
                  {lang === 'pt'
                    ? 'Firmeza localizada e remodelação natural da silhueta sem dor ou cirurgia.'
                    : lang === 'en'
                    ? 'Targeted firming and natural body contouring without pain or surgery.'
                    : 'Raffermissement ciblé et remodelage naturel de la silhouette sans douleur ni chirurgie.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* DESKTOP Side-by-Side Dual Pills (>= 768px) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="hidden md:grid md:grid-cols-2 gap-4 mb-10 text-left"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-[#C49A3C]/20 bg-white/90 p-4 shadow-[0_25px_80px_rgba(196,154,60,0.08)]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#C49A3C] via-[#E8C97A] to-[#9A7428]" />
            <div className="relative flex items-start gap-3">
              <div className="grid place-items-center h-11 w-11 rounded-2xl bg-[#C49A3C]/10 text-[#9A7428] shadow-sm shrink-0">
                <IconStethoscope size={18} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] font-semibold text-[#9A7428] mb-1">
                  {lang === 'pt'
                    ? 'Fisioterapia Terapêutica'
                    : lang === 'en'
                    ? 'Therapeutic Physiotherapy'
                    : 'Kinésithérapie Sur Mesure'}
                </div>
                <p className="text-sm text-[#4A4540] leading-6">
                  {lang === 'pt'
                    ? 'Cuidados especializados para uma postura otimizada e alívio duradouro da dor.'
                    : lang === 'en'
                    ? 'Expert clinical care for optimized posture and long-term pain relief.'
                    : 'Soins experts pour une posture optimisée et un soulagement durable.'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-[#C49A3C]/20 bg-white/90 p-4 shadow-[0_25px_80px_rgba(196,154,60,0.08)]">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#E8C97A] via-[#C49A3C] to-[#9A7428]" />
            <div className="relative flex items-start gap-3">
              <div className="grid place-items-center h-11 w-11 rounded-2xl bg-[#E8C97A]/12 text-[#C49A3C] shadow-sm shrink-0">
                <IconFlame size={18} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] font-semibold text-[#C49A3C] mb-1">
                  {lang === 'pt'
                    ? 'Protocolos Minceur Não Invasivos'
                    : lang === 'en'
                    ? 'Non-Invasive Slimming Protocols'
                    : 'Protocoles Minceur Non-Invasifs'}
                </div>
                <p className="text-sm text-[#4A4540] leading-6">
                  {lang === 'pt'
                    ? 'Firmeza localizada e remodelação natural da silhueta sem cirurgia.'
                    : lang === 'en'
                    ? 'Targeted firming and natural body contouring without surgery.'
                    : 'Raffermissement ciblé et remodelage naturel sans chirurgie.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>


        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-8 md:mb-16 w-full max-w-sm sm:max-w-none mx-auto"
        >
          <Button href="/rendez-vous" variant="primary" size="lg" className="w-full sm:w-auto shadow-[0_8px_34px_rgba(196,154,60,0.2)] tracking-[0.04em]">
            {t.common.bookAppointment}
          </Button>
          <Button href="/services" variant="outline" size="lg" className="w-full sm:w-auto bg-white/95 backdrop-blur-xl border-[#C49A3C]/20 text-[#1A1412] tracking-[0.04em]">
            {t.common.ourServices}
          </Button>
        </motion.div>

        {/* ── Stats Section: Desktop Grid & Mobile Glass Ribbon ── */}

        {/* MOBILE Stats Compact Glass Ribbon (< 768px) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="block md:hidden"
        >
          <div className="relative overflow-hidden rounded-2xl border border-[#C49A3C]/30 bg-white/90 backdrop-blur-md p-3 shadow-[0_12px_32px_rgba(196,154,60,0.12)]">
            <div className="grid grid-cols-4 divide-x divide-[#C49A3C]/20 rtl:divide-x-reverse text-center">
              {stats.map((stat, i) => (
                <div key={i} className="px-1 py-1">
                  <div className="font-serif text-lg font-bold text-[#C49A3C] leading-none mb-1">
                    <CounterAnimation end={stat.end} suffix={stat.suffix} />
                  </div>
                  <div className="font-mono text-[9px] font-semibold text-[#8A8078] tracking-wider uppercase line-clamp-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* DESKTOP Stats Grid (>= 768px) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="hidden md:grid md:grid-cols-4 gap-4 md:gap-6"
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-[28px] border border-[#C49A3C]/25 bg-white/95 p-5 text-center shadow-[0_16px_40px_rgba(196,154,60,0.1)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(196,154,60,0.18)]"
            >
              <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative font-serif text-3xl md:text-4xl font-bold text-[#C49A3C] mb-1">
                <CounterAnimation end={stat.end} suffix={stat.suffix} />
              </div>
              <div className="relative font-mono text-[11px] font-semibold text-[#8A8078] tracking-[0.21em] uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="mt-8 md:mt-12 flex flex-col items-center gap-1.5"
      >
        <span className="font-mono text-[10px] font-bold tracking-widest text-[#9A7428] uppercase">
          {lang === 'pt' ? 'Deslizar' : lang === 'en' ? 'Scroll' : 'Défiler'}
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[#C49A3C]"
        >
          <IconArrowDown size={18} />
        </motion.div>
      </motion.div>
    </section>
  );
}

