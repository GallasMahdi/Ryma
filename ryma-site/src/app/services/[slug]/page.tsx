'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
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
} from '@tabler/icons-react';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ServiceDetailPage({ params }: Props) {
  const { slug } = use(params);
  const { lang, t } = useLanguage();
  const service = getServiceBySlug(slug);

  if (!service) notFound();

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
      {/* ── Hero Section ────────────────────────────── */}
      <section className="relative pt-28 pb-14 overflow-hidden bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        {/* Subtle gold radial */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 md:px-12">
          <ScrollReveal>
            {/* Back link */}
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm text-[#8A8078] hover:text-[#9A7428] transition-colors mb-8 group"
            >
              <IconArrowLeft
                size={15}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              {t.servicePage.backToServices}
            </Link>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Badge variant={poleBadge.variant}>{getLocalizedText(poleBadge.label, lang)}</Badge>
              <div className="flex items-center gap-1.5 text-xs text-[#8A8078] font-mono bg-[#F4F2EE] px-2.5 py-1 rounded-full">
                <IconClock size={13} />
                {service.duration}
              </div>
              <div className="font-mono text-xl font-bold text-[#C49A3C]">
                {service.price} {t.common.currency}
              </div>
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-5 leading-tight">
              {getLocalizedText(service.name, lang)}
            </h1>

            {/* Short desc */}
            <p className="text-[#6B6058] text-lg md:text-xl max-w-2xl leading-relaxed">
              {getLocalizedText(service.shortDesc, lang)}
            </p>
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
                    <Button href="/rendez-vous" variant="primary" className="w-full justify-center">
                      <IconCalendarEvent size={15} className="me-2" />
                      {t.common.bookAppointment}
                    </Button>
                    <Button
                      href={`https://wa.me/21698123456?text=${encodeURIComponent(
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

                  {/* CNAM note */}
                  {service.pole === 'kinesitherapie' && (
                    <p className="mt-4 text-[11px] text-[#8A8078] text-center leading-relaxed bg-[#F5E9C8] rounded-xl px-3 py-2">
                      ✓ {lang === 'pt' ? 'Possibilidade de comparticipação mediante prescrição médica' : lang === 'en' ? 'Insurance coverage & receipts provided with prescription' : 'Prise en charge CNAM possible sur prescription médicale'}
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
