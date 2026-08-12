'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, ServicePole, Service } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconStethoscope, IconFlame } from '@tabler/icons-react';

const POLES: {
  id: ServicePole;
  icon: React.ReactNode;
  label: { fr: string; ar: string };
  desc: { fr: string; ar: string };
  badge: 'teal' | 'bronze' | 'rose';
  accentColor: string;
}[] = [
  {
    id: 'kinesitherapie',
    icon: <IconStethoscope size={18} />,
    label: { fr: 'Kinésithérapie', ar: 'العلاج الطبيعي' },
    desc: {
      fr: 'Soins thérapeutiques pour les douleurs, la posture et la rééducation',
      ar: 'علاجات لآلام والوضعية وإعادة التأهيل',
    },
    badge: 'teal',
    accentColor: '#C49A3C',
  },
  {
    id: 'minceur',
    icon: <IconFlame size={18} />,
    label: { fr: 'Soins Minceur', ar: 'علاجات التنحيف' },
    desc: {
      fr: 'Technologies non-invasives pour sculpter, raffermir et éliminer',
      ar: 'تقنيات غير جراحية للنحت والشد والتخلص من الدهون',
    },
    badge: 'bronze',
    accentColor: '#9A7428',
  },
];

function Carousel({ services }: { services: Service[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      const width = el.clientWidth;
      const newIndex = Math.round(scrollLeft / (width * 0.8));
      setIndex(Math.max(0, Math.min(services.length - 1, newIndex)));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [services.length]);

  const scrollByPage = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.8) * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-5 overflow-x-auto px-2 pb-4 scroll-smooth touch-pan-x snap-x snap-mandatory -mx-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {services.map((service, i) => (
          <div key={service.slug} className="snap-start shrink-0 w-[85%] sm:w-[60%] md:w-[48%] px-2">
            <ScrollReveal delay={i * 0.06}>
              <ServiceCard service={service} />
            </ScrollReveal>
          </div>
        ))}
      </div>

      <button
        aria-label="Précédent"
        onClick={() => scrollByPage(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md"
      >
        ‹
      </button>
      <button
        aria-label="Suivant"
        onClick={() => scrollByPage(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md"
      >
        ›
      </button>

      <div className="flex items-center justify-center gap-2 mt-3">
        {services.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = ref.current;
              if (!el) return;
              const amount = Math.round(el.clientWidth * 0.8) * i;
              el.scrollTo({ left: amount, behavior: 'smooth' });
            }}
            className={`w-2 h-2 rounded-full ${i === index ? 'bg-[#C49A3C]' : 'bg-[#E6E0D6]'}`}
            aria-label={`Aller à ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ServicesHub() {
  const { lang, t } = useLanguage();

  return (
    <section id="services" className="relative pt-16 md:pt-24 pb-20 bg-[#FAFAF8]">
      {/* Subtle warm background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,233,200,0.35) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        {/* Header */}
        <ScrollReveal className="text-center mb-16">
          <span className="font-mono text-xs tracking-widest text-[#C49A3C] uppercase font-semibold">
            — {lang === 'fr' ? 'Nos Pôles de Soins' : 'أقطاب العلاجات'} —
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mt-4 mb-4">
            {lang === 'fr' ? 'Soins & Traitements' : 'العلاجات والخدمات'}
          </h2>
          <p className="text-[#6B6058] max-w-2xl mx-auto text-lg leading-relaxed">
            {lang === 'fr'
              ? '13 soins spécialisés répartis en 2 pôles complémentaires pour répondre à tous vos besoins de santé et de bien-être.'
              : '13 علاجاً متخصصاً موزعة على قطبَين متكاملَين لتلبية جميع احتياجاتك الصحية والجمالية.'}
          </p>
        </ScrollReveal>

        {/* Poles */}
        {POLES.map((pole) => {
          const poleServices = SERVICES.filter((s) => s.pole === pole.id);
          const visibleServices = poleServices.slice(0, 3);
          return (
            <div key={pole.id} className="mb-20">
              <ScrollReveal delay={0.1}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${pole.accentColor}, #E8C97A)` }}
                    >
                      {pole.icon}
                    </div>
                    <Badge variant={pole.badge} className="text-sm px-4 py-1.5">
                      {pole.label[lang]}
                    </Badge>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/25 to-transparent" />
                </div>
                <p className="text-[#8A8078] mb-8 text-sm leading-relaxed max-w-2xl">
                  {pole.desc[lang]}
                </p>
              </ScrollReveal>

              {/* Desktop grid (limited to featured few) */}
              <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-5">
                {visibleServices.map((service, i) => (
                  <ScrollReveal key={service.slug} delay={i * 0.07}>
                    <ServiceCard service={service} />
                  </ScrollReveal>
                ))}
              </div>

              {/* Mobile / tablet carousel (limited) */}
              <div className="lg:hidden">
                <Carousel services={visibleServices} />
              </div>

              <div className="mt-6 text-center">
                <Button href="/services" variant="ghost" size="sm">
                  {lang === 'fr' ? 'Voir tous les soins' : 'عرض جميع العلاجات'}
                </Button>
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <ScrollReveal className="text-center mt-4">
          <Button href="/tarifs" variant="outline" size="lg">
            {t.common.seeRates}
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
