'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { TESTIMONIALS, Testimonial } from '@/data/testimonials';
import { getLocalizedText } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick } from '@/lib/sound';
import {
  IconStar,
  IconQuote,
  IconArrowRight,
  IconShieldCheck,
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPlay,
  IconPlayerPause,
} from '@tabler/icons-react';

/** Single Luxury Testimonial Card */
function TestimonialCard({
  testimonial,
  lang,
}: {
  testimonial: Testimonial;
  lang: string;
}) {
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-[#C49A3C]/25 rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-between shadow-[0_6px_25px_rgba(196,154,60,0.08)] hover:border-[#C49A3C]/60 hover:shadow-[0_12px_36px_rgba(196,154,60,0.18)] hover:-translate-y-1 transition-all duration-300 select-none">
      <div>
        <div className="flex items-start justify-between gap-4 mb-3 sm:mb-4">
          {/* Rating stars */}
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: testimonial.rating }).map((_, si) => (
                <IconStar
                  key={si}
                  size={14}
                  className="text-[#C49A3C]"
                  fill="#C49A3C"
                />
              ))}
            </div>
            <span className="font-mono text-[11px] font-bold text-[#9A7428] ms-1.5">
              5.0
            </span>
          </div>
          <IconQuote size={24} className="text-[#C49A3C]/25 shrink-0" />
        </div>

        {/* Comment */}
        <p className="text-[#332D28] leading-relaxed text-xs sm:text-sm mb-4 font-normal italic line-clamp-4">
          &ldquo;{getLocalizedText(testimonial.comment, lang)}&rdquo;
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3.5 border-t border-[#E8E2D8]/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#F5E9C8] via-[#FAF3E0] to-[#E8C97A] flex items-center justify-center text-xs sm:text-sm font-bold text-[#8A6A24] border border-[#C49A3C]/30 shadow-xs shrink-0">
            {testimonial.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[#1A1412] text-xs sm:text-sm leading-tight truncate">
              {testimonial.name}
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8A8078] leading-tight truncate">
              {getLocalizedText(testimonial.role, lang)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ms-2">
          {testimonial.verified && (
            <IconShieldCheck size={13} className="text-[#6F8F72]" />
          )}
          <span className="font-mono text-[9px] sm:text-[10px] font-medium text-[#9A7428] bg-[#FAF5EA] border border-[#C49A3C]/20 px-2 py-0.5 rounded-full">
            {testimonial.location}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Universal Infinite Moving Carousel Track (Supports Web/Desktop, Tablet & Mobile)
 */
function TestimonialRow({
  testimonials,
  lang,
  reverse = false,
  speedSeconds = 35,
  isPaused,
}: {
  testimonials: Testimonial[];
  lang: string;
  reverse?: boolean;
  speedSeconds?: number;
  isPaused: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const items = [...testimonials, ...testimonials, ...testimonials];

  return (
    <div
      className="relative overflow-hidden py-2"
      onMouseEnter={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = 'paused';
      }}
      onMouseLeave={() => {
        if (trackRef.current && !isPaused)
          trackRef.current.style.animationPlayState = 'running';
      }}
    >
      <div
        ref={trackRef}
        className="flex gap-4 sm:gap-6 will-change-transform"
        style={{
          animation: `${
            reverse ? 'marquee-scroll-reverse' : 'marquee-scroll'
          } ${speedSeconds}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
          width: 'max-content',
        }}
      >
        {items.map((t, i) => (
          <div
            key={`${t.id}-${i}`}
            className="w-[280px] sm:w-[350px] lg:w-[380px] shrink-0"
          >
            <TestimonialCard testimonial={t} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const { lang, t } = useLanguage();
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Divide testimonials into 2 rows for desktop dynamic flow
  const half = Math.ceil(TESTIMONIALS.length / 2);
  const row1 = TESTIMONIALS.slice(0, half);
  const row2 = TESTIMONIALS.slice(half);

  const scrollByAmount = (offset: number) => {
    playSoftClick();
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <section
      id="temoignages"
      className="relative pt-16 md:pt-24 pb-20 md:pb-28 overflow-hidden bg-gradient-to-b from-[#FAFAF8] via-[#FAF6EE] to-[#FAFAF8]"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #E8C97A 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <ScrollReveal className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-white/90 border border-[#C49A3C]/30 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.22em] text-[#9A7428] mb-3 shadow-xs">
            <IconStar size={13} className="text-[#C49A3C]" fill="#C49A3C" />
            <span>
              {lang === 'pt'
                ? 'Testemunhos & Avaliações Reais'
                : lang === 'en'
                ? 'Verified Patient Reviews'
                : 'Témoignages & Avis Vérifiés'}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1412] mt-1 mb-3">
            {lang === 'pt'
              ? 'A Confiança dos Nossos Pacientes'
              : lang === 'en'
              ? 'What Our Patients Say'
              : 'Ce que disent nos patients'}
          </h2>

          <p className="text-[#6B6058] max-w-xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed">
            {lang === 'pt'
              ? 'Mais de 1.200 pacientes acompanhados com sucesso em fisioterapia personalizada e tratamentos de alta performance.'
              : lang === 'en'
              ? 'Over 1,200 patients successfully treated with tailored physiotherapy and advanced body aesthetics.'
              : 'Plus de 1 200 patients accompagnés avec succès en kinésithérapie personnalisée et soins minceur de haute précision.'}
          </p>

          {/* Minimalist Carousel Control Bar */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                setIsPaused((p) => !p);
                playSoftClick();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold text-[#8A6A24] bg-white/90 border border-[#C49A3C]/30 hover:bg-[#FAF6EE] shadow-xs transition-colors"
            >
              {isPaused ? <IconPlayerPlay size={13} /> : <IconPlayerPause size={13} />}
              <span>{isPaused ? (lang === 'pt' ? 'Continuar' : lang === 'en' ? 'Play' : 'Reprendre') : (lang === 'pt' ? 'Pausar' : lang === 'en' ? 'Pause' : 'Pause')}</span>
            </button>
            <span className="text-[11px] text-[#8A8078] font-sans">
              {lang === 'pt' ? 'Passe o cursor para pausar' : lang === 'en' ? 'Hover to pause' : 'Survolez pour mettre en pause'}
            </span>
          </div>
        </ScrollReveal>
      </div>

      {/* ── Infinite Moving Multi-Row Carousel on ALL Devices ── */}
      <div className="relative w-full overflow-hidden space-y-4">
        {/* Left & Right Soft Fade Masks */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 sm:w-28 md:w-40 z-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #FAFAF8 0%, rgba(250,250,248,0.85) 40%, transparent 100%)',
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-12 sm:w-28 md:w-40 z-20 pointer-events-none"
          style={{
            background:
              'linear-gradient(to left, #FAFAF8 0%, rgba(250,250,248,0.85) 40%, transparent 100%)',
          }}
        />

        {/* Row 1: Leftward moving stream */}
        <TestimonialRow
          testimonials={row1}
          lang={lang}
          speedSeconds={32}
          isPaused={isPaused}
        />

        {/* Row 2: Rightward moving stream on desktop & tablet */}
        <div className="hidden sm:block">
          <TestimonialRow
            testimonials={row2}
            lang={lang}
            reverse
            speedSeconds={38}
            isPaused={isPaused}
          />
        </div>
      </div>

      {/* ── View All Reviews & Rating Bar ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12 mt-10 sm:mt-14 text-center relative z-10">
        <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-white/90 backdrop-blur-xl border border-[#C49A3C]/30 px-5 py-3 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 text-[#C49A3C]">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} size={15} fill="#C49A3C" />
              ))}
            </div>
            <span className="font-serif font-bold text-[#1A1412] text-sm">
              4.9 / 5.0
            </span>
            <span className="text-xs text-[#8A8078]">
              (1,200+ {lang === 'pt' ? 'avaliações verificadas' : lang === 'en' ? 'verified reviews' : 'avis vérifiés'})
            </span>
          </div>

          <span className="hidden sm:inline-block h-4 w-px bg-[#C49A3C]/30" />

          <Link
            href="/avis"
            onClick={playSoftClick}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#9A7428] hover:text-[#C49A3C] transition-colors"
          >
            <span>{t.common.readMore}</span>
            <IconArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Keyframe animation styles */}
      <style>{`
        @keyframes marquee-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        @keyframes marquee-scroll-reverse {
          0% {
            transform: translateX(-33.333%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
