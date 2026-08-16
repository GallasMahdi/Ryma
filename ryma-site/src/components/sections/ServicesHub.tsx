'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, ServicePole, Service } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconStethoscope, IconFlame, IconChevronLeft, IconChevronRight, IconSparkles } from '@tabler/icons-react';

const POLES: {
  id: ServicePole;
  icon: React.ReactNode;
  label: { fr: string; pt: string; en: string };
  desc: { fr: string; pt: string; en: string };
  badge: 'teal' | 'bronze' | 'rose';
  accentColor: string;
}[] = [
  {
    id: 'kinesitherapie',
    icon: <IconStethoscope size={18} />,
    label: {
      fr: 'Kinésithérapie Sur Mesure',
      pt: 'Fisioterapia Especializada',
      en: 'Specialized Physiotherapy',
    },
    desc: {
      fr: 'Soins thérapeutiques avancés pour la posture, la rééducation active et le soulagement durable.',
      pt: 'Cuidados terapêuticos avançados para a postura, reabilitação ativa e alívio duradouro.',
      en: 'Advanced therapeutic care for posture, active rehabilitation, and long-term relief.',
    },
    badge: 'teal',
    accentColor: '#C49A3C',
  },
  {
    id: 'minceur',
    icon: <IconFlame size={18} />,
    label: {
      fr: 'Protocoles Minceur High-Tech',
      pt: 'Protocolos de Emagrecimento High-Tech',
      en: 'High-Tech Slimming Protocols',
    },
    desc: {
      fr: 'Technologies 100% non-invasives pour sculpter la silhouette, raffermir les tissus et déstocker.',
      pt: 'Tecnologias 100% não invasivas para esculpir a silhueta, firmar tecidos e eliminar gordura.',
      en: '100% non-invasive technologies to sculpt the body, firm tissues, and target fat.',
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
    const amount = Math.round(el.clientWidth * 0.85) * dir;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      <div
        ref={ref}
        className="flex gap-4 sm:gap-6 overflow-x-auto px-1 py-3 scroll-smooth touch-pan-x snap-x snap-mandatory -mx-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {services.map((service, i) => (
          <div key={service.slug} className="snap-start shrink-0 w-[88%] sm:w-[62%] md:w-[48%] px-1">
            <ScrollReveal delay={i * 0.05}>
              <ServiceCard service={service} />
            </ScrollReveal>
          </div>
        ))}
      </div>

      <button
        aria-label="Précédent"
        onClick={() => scrollByPage(-1)}
        className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-[#C49A3C]/30 text-[#9A7428] rounded-full p-2.5 shadow-[0_4px_20px_rgba(196,154,60,0.2)] hover:bg-[#C49A3C] hover:text-white transition-all duration-300"
      >
        <IconChevronLeft size={18} className="rtl-flip" />
      </button>
      <button
        aria-label="Suivant"
        onClick={() => scrollByPage(1)}
        className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md border border-[#C49A3C]/30 text-[#9A7428] rounded-full p-2.5 shadow-[0_4px_20px_rgba(196,154,60,0.2)] hover:bg-[#C49A3C] hover:text-white transition-all duration-300"
      >
        <IconChevronRight size={18} className="rtl-flip" />
      </button>

      <div className="flex items-center justify-center gap-2 mt-4">
        {services.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = ref.current;
              if (!el) return;
              const amount = Math.round(el.clientWidth * 0.85) * i;
              el.scrollTo({ left: amount, behavior: 'smooth' });
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-[#C49A3C]' : 'w-2 bg-[#D4CEBE] hover:bg-[#9A7428]'
            }`}
            aria-label={`Aller à ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ServicesHub() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');

  const filteredPoles = POLES.filter((p) => activeTab === 'all' || p.id === activeTab);

  return (
    <section id="services" className="relative pt-16 md:pt-24 pb-20 bg-[#FAFAF8] overflow-hidden">
      {/* Ambient Radial Luxury Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(245,233,200,0.4) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 md:px-12">
        {/* Header */}
        <ScrollReveal className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md border border-[#C49A3C]/30 px-4 py-1.5 rounded-full mb-4 shadow-sm">
            <IconSparkles size={14} className="text-[#C49A3C]" />
            <span className="font-mono text-[11px] tracking-[0.24em] text-[#9A7428] uppercase font-semibold">
              {lang === 'pt' ? 'Os Nossos Polos de Excelência' : lang === 'en' ? 'Our Centers of Excellence' : 'Nos Pôles d\'Excellence'}
            </span>
          </div>

          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-4 tracking-[-0.02em]">
            {lang === 'pt' ? 'Cuidados e Tratamentos Clinicos' : lang === 'en' ? 'Clinical Care & Treatments' : 'Soins & Traitements'}
          </h2>
          <p className="text-[#6B6058] max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-normal">
            {lang === 'pt'
              ? '13 tratamentos especializados desenhados à medida para responder a todos os seus objetivos de saúde, reabilitação e remodelação corporal.'
              : lang === 'en'
              ? '13 specialized treatments tailored to achieve all your goals in health, rehabilitation, and body contouring.'
              : '13 soins spécialisés conçus sur mesure pour répondre à tous vos objectifs de santé, rééducation et remodelage.'}
          </p>
        </ScrollReveal>

        {/* Pole Filter Selector */}
        <div className="flex items-center justify-center gap-1.5 p-1.5 bg-[#F4F0E8]/90 backdrop-blur-xl rounded-full border border-[#C49A3C]/30 max-w-md mx-auto mb-14 shadow-inner">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs font-semibold transition-all duration-300 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-md'
                : 'text-[#4A4540] hover:text-[#C49A3C]'
            }`}
          >
            {lang === 'pt' ? 'Todos os Polos' : lang === 'en' ? 'All Centers' : 'Tous les Pôles'}
          </button>
          <button
            onClick={() => setActiveTab('kinesitherapie')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-semibold transition-all duration-300 ${
              activeTab === 'kinesitherapie'
                ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-md'
                : 'text-[#4A4540] hover:text-[#C49A3C]'
            }`}
          >
            <IconStethoscope size={15} />
            <span>{lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}</span>
          </button>
          <button
            onClick={() => setActiveTab('minceur')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-semibold transition-all duration-300 ${
              activeTab === 'minceur'
                ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-md'
                : 'text-[#4A4540] hover:text-[#C49A3C]'
            }`}
          >
            <IconFlame size={15} />
            <span>{lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}</span>
          </button>
        </div>

        {/* Poles Render */}
        {filteredPoles.map((pole) => {
          const poleServices = SERVICES.filter((s) => s.pole === pole.id);
          const visibleServices = poleServices.slice(0, 3);
          return (
            <div key={pole.id} className="mb-16 md:mb-20">
              <ScrollReveal delay={0.1}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md"
                      style={{ background: `linear-gradient(135deg, ${pole.accentColor}, #E8C97A)` }}
                    >
                      {pole.icon}
                    </div>
                    <Badge variant={pole.badge} className="text-xs md:text-sm px-4 py-1.5 font-semibold">
                      {pole.label[lang] || pole.label.pt || pole.label.fr}
                    </Badge>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/30 via-[#C49A3C]/10 to-transparent" />
                </div>
                <p className="text-[#8A8078] mb-8 text-xs md:text-sm leading-relaxed max-w-2xl font-normal">
                  {pole.desc[lang] || pole.desc.pt || pole.desc.fr}
                </p>
              </ScrollReveal>

              {/* Desktop Grid */}
              <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6">
                {visibleServices.map((service, i) => (
                  <ScrollReveal key={service.slug} delay={i * 0.07}>
                    <ServiceCard service={service} />
                  </ScrollReveal>
                ))}
              </div>

              {/* Mobile / Tablet Touch Carousel */}
              <div className="lg:hidden">
                <Carousel services={visibleServices} />
              </div>

              <div className="mt-8 text-center">
                <Button href="/services" variant="ghost" size="sm" className="hover:text-[#9A7428]">
                  {lang === 'pt' ? 'Ver todos os tratamentos deste polo →' : lang === 'en' ? 'View all treatments in this area →' : 'Voir tous les soins de ce pôle →'}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Bottom CTA */}
        <ScrollReveal className="text-center mt-6">
          <Button href="/tarifs" variant="outline" size="lg" className="bg-white/95 backdrop-blur-xl border-[#C49A3C]/30 text-[#1A1412] shadow-sm hover:border-[#C49A3C]">
            {t.common.seeRates}
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}

