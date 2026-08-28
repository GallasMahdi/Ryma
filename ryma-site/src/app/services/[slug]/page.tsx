'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { getServiceBySlug, SERVICES, getLocalizedText, getLocalizedList } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { FAQAccordion } from '@/components/ui/FAQAccordion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import Link from 'next/link';
import {
  IconClock,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconSparkles,
} from '@tabler/icons-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ServiceDetailPage({ params }: Props) {
  const { slug } = use(params);
  const { lang, t } = useLanguage();
  const service = getServiceBySlug(slug);

  if (!service) notFound();

  const heroImage =
    service.pole === 'minceur'
      ? '/hero/slimming.jpg'
      : service.pole === 'kinesitherapie'
      ? '/hero/therapy.jpg'
      : '/hero/consultation.jpg';

  const poleBadge = {
    kinesitherapie: { label: { fr: 'Kinésithérapie', pt: 'Fisioterapia', en: 'Physiotherapy' }, variant: 'teal' as const },
    minceur:        { label: { fr: 'Minceur High-Tech', pt: 'Emagrecimento High-Tech', en: 'High-Tech Slimming' }, variant: 'bronze' as const },
    bilan:          { label: { fr: 'Bilan Expert', pt: 'Avaliação Especializada', en: 'Expert Assessment' }, variant: 'rose' as const },
  }[service.pole];

  const faqItems = service.faq.map((f) => ({
    q: getLocalizedText(f.q, lang),
    a: getLocalizedText(f.a, lang),
  }));
  const paragraphs = getLocalizedText(service.longDesc, lang).split('\n\n').filter(Boolean);
  const sessionFlowItems = getLocalizedList(service.sessionFlow, lang);
  const indicationItems = getLocalizedList(service.indications, lang);
  const contraindicationItems = getLocalizedList(service.contraindications, lang);

  const relatedServices = SERVICES.filter(
    (s) => s.pole === service.pole && s.slug !== service.slug
  ).slice(0, 4);

  return (
    <>
      {/* ── Cinematic Hero with Photographic Background & Gold Particles ── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-20 overflow-hidden bg-[#1A1412] text-white">
        {/* Context-Aware Photographic Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt={getLocalizedText(service.name, lang)}
            fill
            priority
            className="object-cover object-center opacity-30 scale-105 transform transition-transform duration-1000"
          />
          {/* Obsidian & Gold Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1412]/90 via-[#1A1412]/75 to-[#1A1412]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 75% 60% at 50% 20%, rgba(196,154,60,0.3) 0%, transparent 75%)',
            }}
          />
        </div>

        {/* Ambient Floating Gold Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
          {[
            { top: '22%', left: '16%', size: 4, dur: 4.2, delay: 0 },
            { top: '32%', left: '78%', size: 3.5, dur: 5.4, delay: 0.9 },
            { top: '65%', left: '12%', size: 3, dur: 4.6, delay: 0.5 },
            { top: '60%', left: '85%', size: 4, dur: 5.9, delay: 1.3 },
          ].map((p, idx) => (
            <motion.div
              key={idx}
              className="absolute rounded-full bg-[#E8C97A] opacity-60"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                boxShadow: '0 0 12px 2px rgba(232, 201, 122, 0.8)',
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.9, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-12">
          <ScrollReveal>
            {/* Back link */}
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm text-[#E8C97A] hover:text-white transition-colors mb-6 group bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C49A3C]/30 shadow-xs"
            >
              <IconArrowLeft
                size={15}
                className="group-hover:-translate-x-1 transition-transform text-[#E8C97A]"
              />
              <span>{t.servicePage.backToServices}</span>
            </Link>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Badge variant={poleBadge.variant}>{getLocalizedText(poleBadge.label, lang)}</Badge>
              <div className="flex items-center gap-1.5 text-xs text-[#F5E9C8] font-mono bg-[#2A221E]/90 border border-[#C49A3C]/40 px-3 py-1 rounded-full shadow-xs">
                <IconClock size={13} className="text-[#E8C97A]" />
                {service.duration}
              </div>
              <div className="font-mono text-2xl font-black text-[#E8C97A] drop-shadow-[0_2px_8px_rgba(196,154,60,0.5)]">
                {service.price} {t.common.currency}
              </div>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
              {getLocalizedText(service.name, lang)}
            </h1>

            {/* Short desc */}
            <p className="text-[#E8E2D8] text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed font-normal mb-8">
              {getLocalizedText(service.shortDesc, lang)}
            </p>

            {/* Direct CTAs in Hero */}
            <div className="flex flex-wrap items-center gap-3.5">
              <Button
                href={`/rendez-vous?service=${service.slug}`}
                variant="primary"
                size="md"
                className="shadow-[0_4px_20px_rgba(196,154,60,0.4)]"
              >
                <IconCalendarEvent size={18} className="me-2" />
                <span>{t.common.bookAppointment}</span>
              </Button>
              <a
                href={`https://wa.me/351912345678?text=${encodeURIComponent(
                  lang === 'pt'
                    ? `Olá! Gostaria de saber mais sobre o tratamento: ${getLocalizedText(service.name, lang)}`
                    : `Hello! I would like to know more about: ${getLocalizedText(service.name, lang)}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 px-6 py-3 text-sm tracking-wide bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <IconBrandWhatsapp size={18} className="me-2 text-[#25D366]" />
                <span>WhatsApp</span>
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Main Content + Sidebar ───────────────────── */}
      <section className="py-12 pb-28 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

            {/* ── Main Column ── */}
            <div className="lg:col-span-2 space-y-14">

              {/* About */}
              <ScrollReveal>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mb-6">
                  {lang === 'pt' ? 'Sobre Este Tratamento' : lang === 'en' ? 'About This Treatment' : 'À propos de ce soin'}
                </h2>
                <div className="space-y-4 text-[#6B6058] leading-relaxed text-[15px]">
                  {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </ScrollReveal>

              {/* Session Flow */}
              <ScrollReveal>
                <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                  {t.servicePage.sessionTitle}
                </h2>
                <div className="space-y-3">
                  {sessionFlowItems.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 bg-white border border-[#E8E2D8] rounded-xl p-4 hover:border-[#C49A3C]/30 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C49A3C] to-[#E8C97A] flex items-center justify-center shrink-0 shadow-sm">
                        <span className="font-mono text-xs font-bold text-[#1A1412]">{i + 1}</span>
                      </div>
                      <p className="text-sm text-[#4A4540] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              {/* Indications & Contraindications */}
              <ScrollReveal>
                <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                  {t.servicePage.indicationsTitle} & {t.servicePage.contraindicationsTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Indications */}
                  <div className="bg-white border border-[#C49A3C]/20 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A7428] mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#F5E9C8] flex items-center justify-center">
                        <IconCheck size={11} className="text-[#9A7428]" strokeWidth={3} />
                      </span>
                      {t.servicePage.indicationsTitle}
                    </h3>
                    <ul className="space-y-2">
                      {indicationItems.map((ind, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#6B6058]">
                          <span className="text-[#C49A3C] mt-0.5 shrink-0 font-bold">·</span>
                          {ind}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contraindications */}
                  <div className="bg-white border border-[#E8A0A0]/25 rounded-2xl p-6 shadow-sm">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#B87070] mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FDF0F0] flex items-center justify-center">
                        <IconX size={11} className="text-[#B87070]" strokeWidth={3} />
                      </span>
                      {t.servicePage.contraindicationsTitle}
                    </h3>
                    <ul className="space-y-2">
                      {contraindicationItems.map((contra, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#6B6058]">
                          <span className="text-[#B87070] mt-0.5 shrink-0 font-bold">·</span>
                          {contra}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>

              {/* FAQ */}
              {faqItems.length > 0 && (
                <ScrollReveal>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                    {t.servicePage.faqTitle}
                  </h2>
                  <FAQAccordion items={faqItems} />
                </ScrollReveal>
              )}
            </div>

            {/* ── Sticky Sidebar ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-5">

                {/* Booking card */}
                <div className="bg-white border border-[#C49A3C]/25 rounded-2xl p-6 shadow-[0_4px_24px_rgba(196,154,60,0.1)]">
                  <div className="font-mono text-[10px] text-[#8A8078] mb-2 uppercase tracking-widest">
                    {t.servicePage.priceLabel}
                  </div>
                  <div className="font-serif text-4xl font-bold text-[#C49A3C] mb-1">
                    {service.price}

                    <span className="text-xl ml-1">{t.common.currency}</span>
                  </div>
                  <div className="text-sm text-[#8A8078] mb-6 flex items-center gap-2 font-mono">
                    <IconClock size={14} className="text-[#C49A3C]" />
                    {lang === 'pt' ? 'Duração :' : lang === 'en' ? 'Duration :' : 'Durée :'} {service.duration}
                  </div>

                  <div className="space-y-3">
                    <Button href={`/rendez-vous?service=${service.slug}`} variant="primary" className="w-full justify-center">
                      <IconCalendarEvent size={15} className="me-2" />
                      {t.common.bookAppointment}
                    </Button>
                    <Button
                      href={`https://wa.me/351912345678?text=${encodeURIComponent(
                        lang === 'pt'
                          ? `Olá, gostaria de agendar uma sessão de ${service.name.pt || service.name.fr}`
                          : lang === 'en'
                          ? `Hello, I would like to book a session of ${service.name.en || service.name.fr}`
                          : `Bonjour, je souhaite réserver une séance de ${service.name.fr}`
                      )}`}
                      variant="outline"
                      className="w-full justify-center"
                    >
                      <IconBrandWhatsapp size={15} className="me-2" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Insurance note */}
                  {service.pole === 'kinesitherapie' && (
                    <p className="mt-4 text-[11px] text-[#8A8078] text-center leading-relaxed bg-[#F5E9C8] rounded-xl px-3 py-2">
                      ✓ {lang === 'pt' ? 'Possibilidade de comparticipação mediante prescrição médica' : lang === 'en' ? 'Insurance coverage & receipts provided with prescription' : 'Prise en charge mutuelle / assurance possible sur prescription médicale'}
                    </p>
                  )}
                </div>

                {/* Related services */}
                {relatedServices.length > 0 && (
                  <div className="bg-white border border-[#E8E2D8] rounded-2xl p-5">
                    <div className="font-mono text-[10px] text-[#8A8078] mb-4 uppercase tracking-widest">
                      {lang === 'pt' ? 'Tratamentos Semelhantes' : lang === 'en' ? 'Similar Treatments' : 'Soins similaires'}
                    </div>
                    <div className="space-y-1">
                      {relatedServices.map((s) => (
                        <Link
                          key={s.slug}
                          href={`/services/${s.slug}`}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#FAF6EE] transition-colors group"
                        >
                          <span className="text-sm text-[#4A4540] group-hover:text-[#9A7428] transition-colors line-clamp-1">
                            {s.name[lang] || s.name.pt || s.name.fr}
                          </span>
                          <span className="font-mono text-xs text-[#C49A3C] font-bold ml-2 shrink-0">
                            {s.price} {t.common.currency}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
