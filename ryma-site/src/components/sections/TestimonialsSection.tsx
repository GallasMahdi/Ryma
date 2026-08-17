'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { TESTIMONIALS } from '@/data/testimonials';
import { getLocalizedText } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconStar, IconQuote, IconArrowRight, IconShieldCheck } from '@tabler/icons-react';

/** Single testimonial card â€” used both in the grid and the marquee */
function TestimonialCard({ testimonial, lang }: { testimonial: typeof TESTIMONIALS[0]; lang: string }) {
  return (
    <div className="bg-white border border-[#C49A3C]/20 rounded-2xl p-6 h-full flex flex-col justify-between shadow-[0_4px_20px_rgba(196,154,60,0.08)] hover:border-[#C49A3C]/45 hover:shadow-[0_8px_30px_rgba(196,154,60,0.15)] hover:-translate-y-1 transition-all duration-300">
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Rating stars */}
          <div className="flex gap-0.5">
            {Array.from({ length: testimonial.rating }).map((_, si) => (
              <IconStar key={si} size={15} className="text-[#C49A3C]" fill="#C49A3C" />
            ))}
          </div>
          <IconQuote size={26} className="text-[#C49A3C]/25 shrink-0" />
        </div>

        {/* Comment */}
        <p className="text-[#332D28] leading-relaxed text-sm mb-5 font-normal italic line-clamp-4">
          &ldquo;{getLocalizedText(testimonial.comment, lang)}&rdquo;
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C49A3C] via-[#E8C97A] to-[#9A7428] flex items-center justify-center text-sm font-bold text-[#1A1412] shadow-sm shrink-0">
            {testimonial.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-[#1A1412] text-sm leading-tight">{testimonial.name}</div>
            <div className="text-[11px] text-[#8A8078] leading-tight">{getLocalizedText(testimonial.role, lang)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {testimonial.verified && <IconShieldCheck size={13} className="text-[#6F8F72]" />}
          <span className="font-mono text-[10px] font-medium text-[#9A7428] bg-[#F5E9C8] px-2 py-0.5 rounded-full">
            {testimonial.location}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Infinite auto-scrolling marquee for mobile.
 * Cards are duplicated for seamless looping. Animation pauses on hover/touch.
 * Pure CSS animation â€” no JS timers, no layout thrash.
 */
function TestimonialMarquee({ testimonials, lang }: { testimonials: typeof TESTIMONIALS; lang: string }) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Duplicate for seamless loop
  const items = [...testimonials, ...testimonials];

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }}
      onMouseLeave={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }}
      onTouchStart={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'paused'; }}
      onTouchEnd={() => { if (trackRef.current) trackRef.current.style.animationPlayState = 'running'; }}
    >
      {/* Fade masks on both sides */}
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #FAFAF8, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #FAFAF8, transparent)' }} />

      <div
        ref={trackRef}
        className="flex gap-4 will-change-transform"
        style={{
          animation: 'marquee-scroll 28s linear infinite',
          width: 'max-content',
        }}
      >
        {items.map((t, i) => (
          <div key={`${t.id}-${i}`} className="w-[280px] shrink-0">
            <TestimonialCard testimonial={t} lang={lang} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export function TestimonialsSection() {
  const { lang, t } = useLanguage();
  const displayed = TESTIMONIALS.slice(0, 4);

  return (
    <section id="temoignages" className="relative pt-16 md:pt-24 pb-24 overflow-hidden bg-gradient-to-b from-[#FAFAF8] via-[#F9F4E8] to-[#FAFAF8]">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #F5E9C8 0%, transparent 70%)' }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        {/* Section Header */}
        <ScrollReveal className="text-center mb-14">
          <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-semibold block mb-2">
            â€” {lang === 'pt' ? 'Testemunhos de Pacientes' : lang === 'en' ? 'Patient Testimonials' : 'TÃ©moignages Patients'} â€”
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1412] mt-2 mb-4">
            {lang === 'pt' ? 'O que dizem os nossos pacientes' : lang === 'en' ? 'What Our Patients Say' : 'Ce que disent nos patients'}
          </h2>
          <p className="text-[#6B6058] max-w-xl mx-auto text-base">
            {lang === 'pt'
              ? 'Descubra a experiÃªncia dos nossos pacientes com os nossos tratamentos de fisioterapia e estÃ©tica corporal.'
              : lang === 'en'
              ? 'Discover feedback from our patients on their physiotherapy and body contouring journey.'
              : 'DÃ©couvrez les retours de nos patients sur leur accompagnement en kinÃ©sithÃ©rapie et soins minceur.'}
          </p>
        </ScrollReveal>

        {/* Mobile: infinite auto-scrolling marquee */}
        <div className="md:hidden mb-10">
          <TestimonialMarquee testimonials={TESTIMONIALS} lang={lang} />
        </div>

        {/* Desktop: 2-column grid (unchanged) */}
        <div className="hidden md:grid grid-cols-2 gap-6">
          {displayed.map((testimonial, i) => (
            <ScrollReveal key={testimonial.id} delay={i * 0.1}>
              <TestimonialCard testimonial={testimonial} lang={lang} />
            </ScrollReveal>
          ))}
        </div>

        {/* View All Link */}
        <ScrollReveal className="text-center mt-12">
          <Link
            href="/avis"
            className="inline-flex items-center gap-2 font-medium text-sm text-[#9A7428] bg-white border border-[#C49A3C]/30 px-6 py-3 rounded-full hover:bg-[#F5E9C8] hover:text-[#1A1412] hover:border-[#C49A3C]/60 shadow-sm transition-all duration-200"
          >
            <span>{lang === 'pt' ? 'Ver todas as avaliaÃ§Ãµes' : lang === 'en' ? 'View all reviews' : 'Voir tous les avis'}</span>
            <IconArrowRight size={16} className="text-[#C49A3C]" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
