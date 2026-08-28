'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, ServicePole } from '@/data/services';
import { PRICING_PACKAGES } from '@/data/pricing';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick } from '@/lib/sound';
import {
  IconCheck,
  IconStar,
  IconClock,
  IconShieldCheck,
  IconSparkles,
  IconStethoscope,
  IconFlame,
  IconArrowRight,
  IconReceipt2,
  IconSearch,
  IconCalendarEvent,
} from '@tabler/icons-react';

export default function TarifsPage() {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'all' | 'packages' | 'single'>('all');
  const [activePole, setActivePole] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter individual services
  const filteredServices = SERVICES.filter((s) => {
    const matchesPole = activePole === 'all' || s.pole === activePole;
    const name = (s.name[lang] || s.name.pt || s.name.en || s.name.fr || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || name.includes(query);
    return matchesPole && matchesSearch;
  });

  const kineServices = filteredServices.filter((s) => s.pole === 'kinesitherapie');
  const minceurServices = filteredServices.filter((s) => s.pole === 'minceur');

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] select-none">
      
      {/* ── Cinematic Luxury Hero with Background Image & Ambient Animation ── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-20 overflow-hidden text-center bg-[#1A1412] text-white">
        {/* Photographic Background Layer with Smooth Zoom */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero/clinic.jpg"
            alt="Digital Clínica Lisboa"
            fill
            priority
            className="object-cover object-center opacity-30 scale-105 transform transition-transform duration-1000"
          />
          {/* Opulent Obsidian & Champagne Gold Gradient Overlay */}
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
            { top: '15%', left: '12%', size: 4, dur: 4, delay: 0 },
            { top: '25%', left: '85%', size: 3, dur: 5, delay: 1 },
            { top: '65%', left: '8%', size: 3.5, dur: 4.5, delay: 0.5 },
            { top: '55%', left: '90%', size: 4.5, dur: 6, delay: 1.5 },
            { top: '80%', left: '50%', size: 3, dur: 5.2, delay: 2 },
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

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-[#C49A3C]/40 px-4 py-1.5 rounded-full mb-4 sm:mb-5 shadow-[0_2px_12px_rgba(196,154,60,0.25)]">
              <IconSparkles size={14} className="text-[#E8C97A]" />
              <span className="font-mono text-[11px] tracking-[0.24em] text-[#F5E9C8] uppercase font-bold">
                {lang === 'pt'
                  ? 'Transparência & Excelência Clínica'
                  : lang === 'en'
                  ? 'Transparent & Certified Pricing'
                  : 'Tarifs & Protocoles Certifiés'}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-3 sm:mb-4 tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
              {lang === 'pt'
                ? 'Tabela de Valores & Protocolos'
                : lang === 'en'
                ? 'Rates & Clinical Programs'
                : 'Nos Tarifs & Forfaits'}
            </h1>

            <p className="text-[#E8E2D8] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
              {lang === 'pt'
                ? 'Valores claros por sessão individual ou programas estruturados com descontos exclusivos. Emitimos recibos com cédula profissional para comparticipação pelo seu seguro de saúde.'
                : lang === 'en'
                ? 'Transparent pricing per individual session or complete clinical packages. Certified medical receipts provided for insurance reimbursements.'
                : 'Tarifs à la séance ou forfaits avantageux avec suivi personnalisé. Factures certifiées délivrées pour vos remboursements mutuelle et assurance santé.'}
            </p>

            {/* Trust Badges Ribbon */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-6 text-xs text-[#F5E9C8] font-medium">
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3 py-1 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconShieldCheck size={14} className="text-[#E8C97A]" />
                {lang === 'pt' ? 'Recibos p/ Seguros' : lang === 'en' ? 'Insurance Receipts' : 'Reçus Mutuelles'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3 py-1 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconSparkles size={14} className="text-[#E8C97A]" />
                {lang === 'pt' ? 'Equipamentos Médicos Certificados' : lang === 'en' ? 'Certified Equipment' : 'Matériel Certifié'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3 py-1 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconStar size={14} className="text-[#E8C97A]" fill="#E8C97A" />
                5.0 ★ (500+ Pacientes)
              </span>
            </div>

            {/* Quick Filter View Switcher */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-1.5 bg-[#241C19]/90 backdrop-blur-xl rounded-full border border-[#C49A3C]/40 max-w-sm sm:max-w-md mx-auto mt-8 sm:mt-10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              <button
                onClick={() => { setActiveCategory('all'); playSoftClick(); }}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeCategory === 'all'
                    ? 'bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#9A7428] text-[#1A1412] font-bold shadow-[0_2px_8px_rgba(196,154,60,0.4)]'
                    : 'text-[#F5E9C8] hover:text-[#E8C97A]'
                }`}
              >
                {lang === 'pt' ? 'Tudo' : lang === 'en' ? 'All' : 'Tout'}
              </button>
              <button
                onClick={() => { setActiveCategory('packages'); playSoftClick(); }}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeCategory === 'packages'
                    ? 'bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#9A7428] text-[#1A1412] font-bold shadow-[0_2px_8px_rgba(196,154,60,0.4)]'
                    : 'text-[#F5E9C8] hover:text-[#E8C97A]'
                }`}
              >
                {lang === 'pt' ? 'Pacotes' : lang === 'en' ? 'Packages' : 'Forfaits'}
              </button>
              <button
                onClick={() => { setActiveCategory('single'); playSoftClick(); }}
                className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all duration-200 ${
                  activeCategory === 'single'
                    ? 'bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#9A7428] text-[#1A1412] font-bold shadow-[0_2px_8px_rgba(196,154,60,0.4)]'
                    : 'text-[#F5E9C8] hover:text-[#E8C97A]'
                }`}
              >
                {lang === 'pt' ? 'Sessões' : lang === 'en' ? 'Single' : 'Séances'}
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Featured Packages Section ─────────────────────────────────── */}
      {(activeCategory === 'all' || activeCategory === 'packages') && (
        <section className="py-12 sm:py-16 bg-[#FAFAF8]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12">
            
            <ScrollReveal className="text-center md:text-left mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
                  — {lang === 'pt' ? 'Programas Estruturados' : lang === 'en' ? 'Clinical Packages' : 'Programmes Complets'} —
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412]">
                  {lang === 'pt' ? 'Pacotes de Tratamento Recomendados' : lang === 'en' ? 'Recommended Treatment Packages' : 'Forfaits Recommandés'}
                </h2>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6F8F72] bg-[#EBF5EE] border border-[#6F8F72]/30 px-3.5 py-1.5 rounded-full self-center md:self-auto">
                <IconShieldCheck size={15} />
                <span>{lang === 'pt' ? 'Economize até 30% em protocolos' : lang === 'en' ? 'Save up to 30% on full programs' : 'Économisez jusqu\'à 30%'}</span>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6">
              {PRICING_PACKAGES.map((pkg, i) => (
                <ScrollReveal key={pkg.id} delay={i * 0.06}>
                  <div
                    className={`relative h-full flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1.5 ${
                      pkg.popular
                        ? 'bg-white border-2 border-[#C49A3C] shadow-[0_12px_40px_rgba(196,154,60,0.18)]'
                        : 'bg-white/90 border border-[#E8E2D8] hover:border-[#C49A3C]/50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Popular Pill */}
                    {pkg.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] text-[#1A1412] text-[10px] sm:text-[11px] font-bold font-mono px-4 py-1 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
                        <IconStar size={12} fill="currentColor" className="text-[#1A1412]" />
                        <span>{pkg.badge?.[lang] || pkg.badge?.pt || pkg.badge?.fr}</span>
                      </div>
                    )}

                    <div>
                      {!pkg.popular && pkg.badge && (
                        <span className="inline-block font-mono text-[10px] font-bold tracking-wider uppercase text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-2.5 py-0.5 rounded-full mb-3">
                          {pkg.badge[lang] || pkg.badge?.pt || pkg.badge?.fr}
                        </span>
                      )}

                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412] mb-2 leading-snug">
                        {pkg.name[lang] || pkg.name?.pt || pkg.name?.fr}
                      </h3>

                      <p className="text-xs sm:text-sm text-[#6B6058] mb-5 leading-relaxed font-normal">
                        {pkg.description[lang] || pkg.description?.pt || pkg.description?.fr}
                      </p>

                      {/* Price Block */}
                      <div className="mb-5 pb-5 border-b border-[#E8E2D8]">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-3xl sm:text-4xl font-bold text-[#C49A3C]">
                            {pkg.price}
                          </span>
                          <span className="font-mono text-sm font-bold text-[#8A8078]">
                            {t.common.currency}
                          </span>
                          {pkg.originalPrice && (
                            <span className="font-mono text-xs text-[#A49C90] line-through ms-2">
                              {pkg.originalPrice} {t.common.currency}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] font-mono font-bold text-[#9A7428] bg-[#F5E9C8] px-2 py-0.5 rounded-md">
                            {pkg.sessions} {lang === 'pt' ? 'sessões incluídas' : lang === 'en' ? 'sessions included' : 'séances incluses'}
                          </span>
                          <span className="text-[10px] text-[#8A8078] font-mono">
                            ≈ {Math.round(pkg.price / pkg.sessions)} {t.common.currency} / {lang === 'pt' ? 'sessão' : lang === 'en' ? 'session' : 'séance'}
                          </span>
                        </div>
                      </div>

                      {/* Included Treatments Checklist */}
                      <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-[#4A4540]">
                        {(pkg.features[lang] || pkg.features.pt || pkg.features.fr).map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2">
                            <IconCheck size={15} className="text-[#9A7428] mt-0.5 shrink-0" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href="/rendez-vous"
                      onClick={playSoftClick}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                        pkg.popular
                          ? 'bg-[#C49A3C] hover:bg-[#E8C97A] text-[#1A1412] shadow-[0_4px_16px_rgba(196,154,60,0.3)]'
                          : 'bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1412] border border-[#E8E2D8]'
                      }`}
                    >
                      <IconCalendarEvent size={16} />
                      <span>{t.common.bookAppointment}</span>
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Single Treatment Session Rates ─────────────────────────── */}
      {(activeCategory === 'all' || activeCategory === 'single') && (
        <section className="py-12 sm:py-16 bg-[#FDFBF7] border-t border-[#E8E2D8]/80">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-12">
            
            <ScrollReveal className="text-center mb-8 sm:mb-12">
              <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
                — {lang === 'pt' ? 'Valores por Sessão Avulsa' : lang === 'en' ? 'Single Session Pricing' : 'Tarifs à la séance'} —
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-3">
                {lang === 'pt' ? 'Catálogo Individual de Tratamentos' : lang === 'en' ? 'Individual Treatment Catalog' : 'Catalogue des Soins Individuels'}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6058] max-w-xl mx-auto">
                {lang === 'pt'
                  ? 'Consulte os valores individuais para cada cuidado clínico ou estético com duração standard.'
                  : lang === 'en'
                  ? 'Explore standard session duration and prices across each specialized clinical therapy.'
                  : 'Consultez les tarifs par séance pour chacun de nos soins spécialisés.'}
              </p>

              {/* Pole Switcher & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 max-w-lg mx-auto">
                <div className="inline-flex p-1 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs w-full sm:w-auto">
                  <button
                    onClick={() => { setActivePole('all'); playSoftClick(); }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activePole === 'all' ? 'bg-[#C49A3C] text-white shadow-xs' : 'text-[#6B6058] hover:text-[#1A1412]'
                    }`}
                  >
                    {lang === 'pt' ? 'Todos (13)' : lang === 'en' ? 'All (13)' : 'Tous (13)'}
                  </button>
                  <button
                    onClick={() => { setActivePole('kinesitherapie'); playSoftClick(); }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activePole === 'kinesitherapie' ? 'bg-[#C49A3C] text-white shadow-xs' : 'text-[#6B6058] hover:text-[#1A1412]'
                    }`}
                  >
                    {lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
                  </button>
                  <button
                    onClick={() => { setActivePole('minceur'); playSoftClick(); }}
                    className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activePole === 'minceur' ? 'bg-[#C49A3C] text-white shadow-xs' : 'text-[#6B6058] hover:text-[#1A1412]'
                    }`}
                  >
                    {lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming' : 'Minceur'}
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8078]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={lang === 'pt' ? 'Procurar...' : lang === 'en' ? 'Search...' : 'Recherche...'}
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E8E2D8] rounded-full text-xs text-[#1A1412] focus:outline-none focus:border-[#C49A3C] transition-colors"
                  />
                </div>
              </div>
            </ScrollReveal>

            {/* ── Fisioterapia Category Table ── */}
            {(activePole === 'all' || activePole === 'kinesitherapie') && kineServices.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#C49A3C]/15 text-[#9A7428] flex items-center justify-center">
                    <IconStethoscope size={16} />
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412]">
                    {lang === 'pt' ? 'Polo de Fisioterapia & Reeducação' : lang === 'en' ? 'Physiotherapy & Rehabilitation' : 'Pôle Kinésithérapie'}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {kineServices.map((service, i) => (
                    <ScrollReveal key={service.slug} delay={i * 0.03}>
                      <div className="group flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#E8E2D8] hover:border-[#C49A3C]/60 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl transition-all duration-200 gap-3 shadow-xs hover:shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1A1412] text-sm sm:text-base group-hover:text-[#9A7428] transition-colors block truncate">
                              {service.name[lang] || service.name.pt || service.name.en || service.name.fr}
                            </span>
                            <span className="text-[11px] text-[#8A8078] line-clamp-1">
                              {service.shortDesc[lang] || service.shortDesc.pt || service.shortDesc.en || service.shortDesc.fr}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E2D8]/60">
                          <div className="flex items-center gap-1 text-xs font-mono text-[#8A8078] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E8E2D8]/60">
                            <IconClock size={13} className="text-[#C49A3C]" />
                            <span>{service.duration}</span>
                          </div>

                          <div className="font-mono text-lg font-bold text-[#C49A3C]">
                            {service.price} {t.common.currency}
                          </div>

                          <Link
                            href={`/rendez-vous?service=${service.slug}`}
                            onClick={playSoftClick}
                            className="hidden sm:inline-flex items-center justify-center p-2 rounded-xl text-[#9A7428] bg-[#FAF5EA] hover:bg-[#C49A3C] hover:text-white transition-all shadow-xs"
                            aria-label={`Agendar ${service.name.pt}`}
                          >
                            <IconArrowRight size={15} />
                          </Link>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

            {/* ── Minceur Category Table ── */}
            {(activePole === 'all' || activePole === 'minceur') && minceurServices.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#E8C97A]/20 text-[#C49A3C] flex items-center justify-center">
                    <IconFlame size={16} />
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412]">
                    {lang === 'pt' ? 'Polo de Estética Corporal & Emagrecimento' : lang === 'en' ? 'Body Contouring & Slimming Care' : 'Pôle Soins Minceur High-Tech'}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {minceurServices.map((service, i) => (
                    <ScrollReveal key={service.slug} delay={i * 0.03}>
                      <div className="group flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#E8E2D8] hover:border-[#C49A3C]/60 px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl transition-all duration-200 gap-3 shadow-xs hover:shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9A7428] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1A1412] text-sm sm:text-base group-hover:text-[#9A7428] transition-colors block truncate">
                              {service.name[lang] || service.name.pt || service.name.en || service.name.fr}
                            </span>
                            <span className="text-[11px] text-[#8A8078] line-clamp-1">
                              {service.shortDesc[lang] || service.shortDesc.pt || service.shortDesc.en || service.shortDesc.fr}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E2D8]/60">
                          <div className="flex items-center gap-1 text-xs font-mono text-[#8A8078] bg-[#FAF8F5] px-2.5 py-1 rounded-lg border border-[#E8E2D8]/60">
                            <IconClock size={13} className="text-[#C49A3C]" />
                            <span>{service.duration}</span>
                          </div>

                          <div className="font-mono text-lg font-bold text-[#C49A3C]">
                            {service.price} {t.common.currency}
                          </div>

                          <Link
                            href={`/rendez-vous?service=${service.slug}`}
                            onClick={playSoftClick}
                            className="hidden sm:inline-flex items-center justify-center p-2 rounded-xl text-[#9A7428] bg-[#FAF5EA] hover:bg-[#C49A3C] hover:text-white transition-all shadow-xs"
                            aria-label={`Agendar ${service.name.pt}`}
                          >
                            <IconArrowRight size={15} />
                          </Link>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Insurance & Reimbursement Card ────────────────────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#C49A3C]/35 bg-white/95 backdrop-blur-xl p-6 sm:p-8 text-center shadow-[0_8px_32px_rgba(196,154,60,0.08)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A]" />
              
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5EA] border border-[#C49A3C]/30 text-[#8A6A24] flex items-center justify-center mx-auto mb-4 shadow-xs">
                <IconReceipt2 size={24} />
              </div>

              <span className="font-mono text-xs font-bold tracking-widest text-[#9A7428] uppercase block mb-2">
                {lang === 'pt' ? 'Seguros de Saúde & Comparticipações' : lang === 'en' ? 'Health Insurance & Coverage' : 'Mutuelles & Assurances Santé'}
              </span>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1412] mb-3">
                {lang === 'pt'
                  ? 'Faturas Certificadas para Efeitos de Reembolso'
                  : lang === 'en'
                  ? 'Certified Invoices for Complete Reimbursement'
                  : 'Factures Conformes pour vos Remboursements'}
              </h3>

              <p className="text-xs sm:text-sm text-[#554C42] leading-relaxed max-w-2xl mx-auto mb-6">
                {lang === 'pt'
                  ? 'Emitimos faturas-recibo com número de cédula profissional da Ordem dos Fisioterapeutas para que possa solicitar o reembolso junto do seu seguro de saúde ou subsistema (ADSE, Médis, Multicare, AdvanceCare, SAMS, etc.).'
                  : lang === 'en'
                  ? 'We provide certified medical invoices with registered professional license number, enabling fast reimbursement with all major health insurance providers (ADSE, Médis, Multicare, AdvanceCare, etc.).'
                  : 'Nous délivrons des factures conformes avec numéro d\'ordre pour permettre un remboursement rapide auprès de vos assurances santé et mutuelles.'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono font-semibold text-[#8A6A24]">
                <span className="bg-[#FAF8F5] border border-[#C49A3C]/20 px-3 py-1 rounded-full">ADSE</span>
                <span className="bg-[#FAF8F5] border border-[#C49A3C]/20 px-3 py-1 rounded-full">Médis</span>
                <span className="bg-[#FAF8F5] border border-[#C49A3C]/20 px-3 py-1 rounded-full">Multicare</span>
                <span className="bg-[#FAF8F5] border border-[#C49A3C]/20 px-3 py-1 rounded-full">AdvanceCare</span>
                <span className="bg-[#FAF8F5] border border-[#C49A3C]/20 px-3 py-1 rounded-full">SAMS</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
