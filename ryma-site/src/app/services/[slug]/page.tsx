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
  IconChevronRight,
  IconArrowRight,
} from '@tabler/icons-react';

function getServiceHeroImage(s: { slug: string; pole: string }): string {
  if (['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'].includes(s.slug))
    return '/hero/therapy.jpg';
  if (s.slug === 'drainage-lymphatique') return '/results/before_after_drainage.png';
  if (s.slug === 'reeducation-post-partum') return '/results/before_after_postpartum.png';
  if (s.slug === 'cryolipolyse') return '/results/before_after_cryolipolyse.png';
  if (s.slug === 'radiofrequence') return '/results/before_after_radiofrequence.png';
  if (['cavitation', 'laser-lipo', 'pressotherapie'].includes(s.slug)) return '/hero/slimming.jpg';
  if (s.slug === 'massage-drainant') return '/results/before_after_cellulite.png';
  return s.pole === 'kinesitherapie' ? '/hero/therapy.jpg' : '/hero/slimming.jpg';
}

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

                {/* Related services - Interactive Luxury Selector */}
                {relatedServices.length > 0 && (
                  <div className="bg-white border border-[#E8E2D8] rounded-2xl p-4 sm:p-5 shadow-xs">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#F0EBE1]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#FAF5EA] border border-[#C49A3C]/30 flex items-center justify-center text-[#C49A3C]">
                          <IconSparkles size={13} />
                        </div>
                        <h4 className="font-mono text-xs font-bold text-[#1A1412] uppercase tracking-wider">
                          {lang === 'pt' ? 'Tratamentos Semelhantes' : lang === 'en' ? 'Similar Treatments' : 'Soins similaires'}
                        </h4>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF5EA] text-[#8A6A24] border border-[#C49A3C]/20">
                        {relatedServices.length}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8A8078] mb-3 leading-snug">
                      {lang === 'pt'
                        ? 'Toque para selecionar e consultar outro protocolo:'
                        : lang === 'en'
                        ? 'Tap to select and explore another treatment:'
                        : 'Cliquez pour sélectionner un soin complémentaire :'}
                    </p>

                    {/* Selectable Cards List */}
                    <div className="space-y-2.5">
                      {relatedServices.map((s) => {
                        const sName = s.name[lang] || s.name.pt || s.name.fr;
                        const sThumb = getServiceHeroImage(s);

                        return (
                          <Link
                            key={s.slug}
                            href={`/services/${s.slug}`}
                            className="group relative flex items-center gap-3 p-2.5 rounded-xl border border-[#E8E2D8] hover:border-[#C49A3C] bg-[#FAF8F5]/60 hover:bg-white transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-[0.98] cursor-pointer"
                            title={`${sName} (${s.price} ${t.common.currency})`}
                          >
                            {/* Service Image Thumbnail */}
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#F5EFE6] border border-[#E8E2D8] group-hover:border-[#C49A3C]/50 transition-colors">
                              <Image
                                src={sThumb}
                                alt={sName}
                                fill
                                sizes="48px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            {/* Service Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors truncate">
                                {sName}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#8A8078] mt-0.5 font-mono">
                                <span className="flex items-center gap-1">
                                  <IconClock size={11} className="text-[#C49A3C]" />
                                  <span>{s.duration}</span>
                                </span>
                                <span className="text-[#C49A3C] font-bold">
                                  {s.price} {t.common.currency}
                                </span>
                              </div>
                            </div>

                            {/* Interactive Selection Action Chip */}
                            <div className="w-7 h-7 rounded-full bg-white group-hover:bg-[#C49A3C] text-[#8A8078] group-hover:text-white border border-[#E8E2D8] group-hover:border-[#C49A3C] flex items-center justify-center transition-all shadow-2xs shrink-0">
                              <IconChevronRight size={14} strokeWidth={2.5} />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Full Showcase Section for Similar Treatments (Mobile & Desktop) ── */}
      {relatedServices.length > 0 && (
        <section className="py-16 sm:py-20 bg-[#F5EFE6] border-t border-[#E8E2D8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#C49A3C]/30 text-[10px] font-mono font-bold text-[#8A6A24] uppercase tracking-wider mb-2.5 shadow-2xs">
                  <IconSparkles size={12} className="text-[#C49A3C]" />
                  <span>
                    {service.pole === 'kinesitherapie'
                      ? lang === 'pt' ? 'Polo Fisioterapia & Reabilitação' : lang === 'en' ? 'Physiotherapy Department' : 'Pôle Kinésithérapie & Rééducation'
                      : lang === 'pt' ? 'Polo Minceur & Estética' : lang === 'en' ? 'Slimming & Body Care' : 'Pôle Minceur & Esthétique'}
                  </span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1412]">
                  {lang === 'pt'
                    ? 'Tratamentos Semelhantes & Protocolos Alternativos'
                    : lang === 'en'
                    ? 'Similar Treatments & Alternative Protocols'
                    : 'Soins similaires & protocoles alternatifs'}
                </h2>
                <p className="text-sm text-[#6B6058] mt-1.5 max-w-2xl">
                  {lang === 'pt'
                    ? 'Selecione e explore outros tratamentos especializados concebidos para complementar o seu plano clínico.'
                    : lang === 'en'
                    ? 'Select and explore other specialized treatments tailored to complement your clinical recovery plan.'
                    : 'Sélectionnez et explorez d’autres soins spécialisés conçus pour compléter votre parcours de soin.'}
                </p>
              </div>

              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9A7428] hover:text-[#C49A3C] transition-colors group shrink-0"
              >
                <span>{lang === 'pt' ? 'Ver todos os tratamentos' : lang === 'en' ? 'View all treatments' : 'Voir tous les soins'}</span>
                <IconArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Grid of Interactive Treatment Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {relatedServices.map((rel) => {
                const relName = rel.name[lang] || rel.name.pt || rel.name.fr;
                const relDesc = rel.shortDesc[lang] || rel.shortDesc.pt || rel.shortDesc.fr;
                const relThumb = getServiceHeroImage(rel);
                const relIndications = getLocalizedList(rel.indications, lang).slice(0, 2);

                return (
                  <div
                    key={rel.slug}
                    className="flex flex-col justify-between bg-white rounded-2xl border border-[#E8E2D8] hover:border-[#C49A3C] p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div>
                      {/* Photographic Preview */}
                      <Link
                        href={`/services/${rel.slug}`}
                        className="block relative h-40 w-full rounded-xl overflow-hidden mb-3.5 bg-[#F5EFE6] cursor-pointer"
                        title={relName}
                      >
                        <Image
                          src={relThumb}
                          alt={relName}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05]/80 via-transparent to-transparent" />

                        {/* Badges on Image */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
                          <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full text-[#1A1412] font-semibold border border-white/40 shadow-2xs">
                            <IconClock size={11} className="text-[#C49A3C]" />
                            <span>{rel.duration}</span>
                          </span>
                          <span className="bg-[#1A1412]/85 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[#E8C97A] font-bold border border-white/20">
                            {rel.price} {t.common.currency}
                          </span>
                        </div>
                      </Link>

                      {/* Title & Short Description */}
                      <Link href={`/services/${rel.slug}`} className="block">
                        <h3 className="font-serif text-base font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors line-clamp-1 mb-1.5">
                          {relName}
                        </h3>
                        <p className="text-xs text-[#6B6058] line-clamp-2 leading-relaxed mb-3">
                          {relDesc}
                        </p>
                      </Link>

                      {/* Clinical indications checklist */}
                      {relIndications.length > 0 && (
                        <div className="space-y-1 mb-3.5 pt-2 border-t border-[#F0EBE1]">
                          {relIndications.map((ind, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-[#554C42]">
                              <div className="w-3.5 h-3.5 rounded-full bg-[#FAF5EA] border border-[#C49A3C]/40 flex items-center justify-center shrink-0">
                                <IconCheck size={10} className="text-[#9A7428]" />
                              </div>
                              <span className="truncate">{ind}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action buttons: Primary Select + Direct Booking */}
                    <div className="pt-3 border-t border-[#F0EBE1] flex items-center gap-2">
                      <Link
                        href={`/services/${rel.slug}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-white border border-[#C49A3C]/30 text-xs font-bold transition-all shadow-2xs group/btn"
                      >
                        <span>{lang === 'pt' ? 'Selecionar' : lang === 'en' ? 'Select' : 'Sélectionner'}</span>
                        <IconChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        href={`/rendez-vous?service=${rel.slug}`}
                        className="p-2 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#1A1412] hover:text-[#9A7428] border border-[#E8E2D8] hover:border-[#C49A3C] transition-all shadow-2xs shrink-0"
                        title={t.common.bookAppointment}
                        aria-label={t.common.bookAppointment}
                      >
                        <IconCalendarEvent size={16} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
