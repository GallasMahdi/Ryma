'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { TESTIMONIALS } from '@/data/testimonials';
import { SERVICES } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { IconStar, IconQuote, IconCheck } from '@tabler/icons-react';

export default function AvisPage() {
  const { lang, t } = useLanguage();

  const avgRating = (TESTIMONIALS.reduce((acc, t) => acc + t.rating, 0) / TESTIMONIALS.length).toFixed(1);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-14 overflow-hidden text-center bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl px-6 md:px-12">
          <ScrollReveal>
            <Badge variant="rose" className="mb-4">
              {lang === 'pt' ? 'Avaliações & Testemunhos' : lang === 'en' ? 'Reviews & Testimonials' : 'Avis & Témoignages'}
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? 'Testemunhos dos Nossos Pacientes' : lang === 'en' ? 'What Our Patients Say' : 'Nos patients témoignent'}
            </h1>
            <p className="text-[#6B6058] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {lang === 'pt'
                ? 'Descubra a experiência autêntica dos nossos pacientes após os tratamentos de fisioterapia e estética na nossa clínica.'
                : lang === 'en'
                ? 'Discover authentic feedback from our patients following their specialized treatment programs.'
                : 'Découvrez les retours authentiques de nos patients suite à leurs séances de soins au cabinet.'}
            </p>

            {/* Average rating pill */}
            <div className="inline-flex items-center gap-3 bg-white border border-[#C49A3C]/25 px-6 py-3 rounded-full mt-6 shadow-[0_4px_16px_rgba(196,154,60,0.12)]">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <IconStar key={i} size={18} fill="#C49A3C" className="text-[#C49A3C]" />
                ))}
              </div>
              <span className="font-mono font-bold text-[#C49A3C] text-xl">{avgRating}</span>
              <span className="text-[#6B6058] text-sm font-medium">
                /5 — {TESTIMONIALS.length} {lang === 'pt' ? 'avaliações verificadas' : lang === 'en' ? 'verified reviews' : 'avis vérifiés'}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Reviews Grid ─────────────────────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((review, i) => {
              const service = SERVICES.find((s) => s.slug === review.serviceSlug);
              return (
                <ScrollReveal key={review.id} delay={i * 0.08}>
                  <GlassCard className="h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex gap-0.5">
                          {Array.from({ length: review.rating }).map((_, si) => (
                            <IconStar key={si} size={16} className="text-[#C49A3C]" fill="#C49A3C" />
                          ))}
                        </div>
                        <IconQuote size={24} className="text-[#C49A3C]/25 shrink-0" />
                      </div>

                      {service && (
                        <Badge variant="teal" className="mb-3 text-xs">
                          {service.name[lang] || service.name.pt || service.name.fr}
                        </Badge>
                      )}

                      <p className="text-[#332D28] leading-relaxed text-sm md:text-[15px] mb-6 italic">
                        &ldquo;{review.comment[lang] || review.comment.pt || review.comment.fr}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C49A3C] via-[#E8C97A] to-[#9A7428] flex items-center justify-center text-[#1A1412] font-bold text-sm shadow-sm">
                          {review.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-[#1A1412] text-sm">{review.name}</div>
                          <div className="text-xs text-[#8A8078]">{review.role[lang] || review.role.pt || review.role.fr}</div>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="font-mono text-xs font-medium text-[#9A7428] bg-[#F5E9C8] px-2.5 py-1 rounded-full block mb-1">
                          {review.location}
                        </span>
                        {review.verified && (
                          <div className="font-mono text-[11px] text-[#9A7428] font-bold flex items-center justify-end gap-1">
                            <IconCheck size={12} /> {lang === 'pt' ? 'Verificado' : lang === 'en' ? 'Verified' : 'Vérifié'}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Google Reviews placeholder */}
          <ScrollReveal className="mt-12">
            <div className="bg-white border border-dashed border-[#C49A3C]/40 rounded-2xl p-6 text-center shadow-sm">
              <p className="font-mono text-xs text-[#9A7428] tracking-widest uppercase mb-2 font-bold">
                {lang === 'pt' ? 'Widget Google Reviews' : lang === 'en' ? 'Google Reviews Widget' : 'Widget Google Reviews'}
              </p>
              <p className="text-sm text-[#6B6058]">
                {lang === 'pt'
                  ? '→ Sincronização direta com a ficha do Google Business.'
                  : lang === 'en'
                  ? '→ Direct sync with Google Business Profile.'
                  : '→ Intégrer le widget Google Business ici une fois la fiche créée.'}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-12 pb-24 text-center bg-[#FAFAF8]">
        <div className="mx-auto max-w-lg px-6 md:px-12">
          <ScrollReveal>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? 'Pronta para iniciar a sua transformação?' : lang === 'en' ? 'Ready for your transformation?' : 'Prête à vivre votre expérience ?'}
            </h2>
            <p className="text-[#6B6058] text-sm mb-6">
              {lang === 'pt'
                ? 'Agende a sua consulta de avaliação e descubra um plano de tratamento personalizado.'
                : lang === 'en'
                ? 'Book your individual assessment and discover your customized care plan.'
                : 'Réservez votre bilan individuel et découvrez un programme sur mesure.'}
            </p>
            <Button href="/rendez-vous" variant="primary" size="lg">
              {t.common.bookAppointment}
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
