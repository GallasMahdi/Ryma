'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { TESTIMONIALS } from '@/data/testimonials';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconStar, IconQuote, IconArrowRight } from '@tabler/icons-react';

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
            — {lang === 'fr' ? 'Témoignages Patients' : 'شهادات المرضى'} —
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1412] mt-2 mb-4">
            {lang === 'fr' ? 'Ce que disent nos patients' : 'ما يقوله مرضانا'}
          </h2>
          <p className="text-[#6B6058] max-w-xl mx-auto text-base">
            {lang === 'fr'
              ? 'Découvrez les retours de nos patients sur leur accompagnement en kinésithérapie et soins minceur.'
              : 'اكتشفي آراء مرضانا حول تجربتهم في عيادتنا للعلاج الطبيعي والتنحيف.'}
          </p>
        </ScrollReveal>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayed.map((testimonial, i) => (
            <ScrollReveal key={testimonial.id} delay={i * 0.1}>
              <div className="bg-white border border-[#C49A3C]/20 rounded-2xl p-6 md:p-8 h-full flex flex-col justify-between shadow-[0_4px_20px_rgba(196,154,60,0.08)] hover:border-[#C49A3C]/45 hover:shadow-[0_8px_30px_rgba(196,154,60,0.15)] hover:-translate-y-1 transition-all duration-300">
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    {/* Rating stars */}
                    <div className="flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, si) => (
                        <IconStar key={si} size={17} className="text-[#C49A3C]" fill="#C49A3C" />
                      ))}
                    </div>
                    <IconQuote size={28} className="text-[#C49A3C]/25 shrink-0" />
                  </div>

                  {/* Comment */}
                  <p className="text-[#332D28] leading-relaxed text-sm md:text-base mb-6 font-normal italic">
                    &ldquo;{testimonial.comment[lang]}&rdquo;
                  </p>
                </div>

                {/* Footer / Author info */}
                <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C49A3C] via-[#E8C97A] to-[#9A7428] flex items-center justify-center text-sm font-bold text-[#1A1412] shadow-sm">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1A1412] text-sm">{testimonial.name}</div>
                      <div className="text-xs text-[#8A8078]">{testimonial.role[lang]}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-medium text-[#9A7428] bg-[#F5E9C8] px-2.5 py-1 rounded-full">
                    {testimonial.location}
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* View All Link */}
        <ScrollReveal className="text-center mt-12">
          <Link
            href="/avis"
            className="inline-flex items-center gap-2 font-medium text-sm text-[#9A7428] bg-white border border-[#C49A3C]/30 px-6 py-3 rounded-full hover:bg-[#F5E9C8] hover:text-[#1A1412] hover:border-[#C49A3C]/60 shadow-sm transition-all duration-200"
          >
            <span>{lang === 'fr' ? 'Voir tous les avis' : 'عرض جميع التقييمات'}</span>
            <IconArrowRight size={16} className="rtl-flip text-[#C49A3C]" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
