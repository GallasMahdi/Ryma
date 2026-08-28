'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, Service, getLocalizedText, getLocalizedList } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick, playSlideChange } from '@/lib/sound';
import {
  IconSparkles,
  IconArrowRight,
  IconShieldCheck,
  IconClock,
  IconCheck,
  IconCalendarEvent,
  IconSearch,
  IconX,
  IconActivity,
  IconHeartbeat,
  IconStethoscope,
  IconDroplet,
  IconBolt,
  IconRipple,
  IconFlame,
  IconLayoutGrid,
  IconEye,
  IconChevronRight,
  IconChevronLeft,
  IconAward,
} from '@tabler/icons-react';

// ── Tag → slug mapping (static, outside component) ──────────────────────────
const TAG_SLUGS: Record<string, string[]> = {
  posture:    ['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'],
  slimming:   ['cryolipolyse', 'cavitation', 'radiofrequence', 'laser-lipo'],
  drainage:   ['drainage-lymphatique', 'pressotherapie', 'massage-drainant'],
  postpartum: ['reeducation-post-partum', 'pressotherapie', 'massage-therapeutique'],
};

// ── Filter chip definitions (multilingual labels, static) ────────────────────
const CHIPS = [
  { id: 'all',        label: { pt: 'Todos',            en: 'All',              fr: 'Tous' } },
  { id: 'posture',    label: { pt: 'Postura & Coluna',  en: 'Posture & Spine',  fr: 'Posture & Dos' } },
  { id: 'slimming',   label: { pt: 'Gordura & Firmeza', en: 'Fat & Tightening', fr: 'Graisse & Fermeté' } },
  { id: 'drainage',   label: { pt: 'Drenagem & Pernas', en: 'Drainage & Legs',  fr: 'Drainage & Jambes' } },
  { id: 'postpartum', label: { pt: 'Saúde Pós-Parto',   en: 'Postpartum Care',  fr: 'Soins Post-Partum' } },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getServiceHeroImage(service: Service): string {
  if (['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'].includes(service.slug))
    return '/hero/therapy.jpg';
  if (service.slug === 'drainage-lymphatique')    return '/results/before_after_drainage.png';
  if (service.slug === 'reeducation-post-partum') return '/results/before_after_postpartum.png';
  if (service.slug === 'cryolipolyse')            return '/results/before_after_cryolipolyse.png';
  if (service.slug === 'radiofrequence')          return '/results/before_after_radiofrequence.png';
  if (['cavitation', 'laser-lipo', 'pressotherapie'].includes(service.slug)) return '/hero/slimming.jpg';
  if (service.slug === 'massage-drainant')        return '/results/before_after_cellulite.png';
  return service.pole === 'kinesitherapie' ? '/hero/therapy.jpg' : '/hero/slimming.jpg';
}

function getServiceIcon(iconKey: string, size = 18) {
  switch (iconKey) {
    case 'spine':    return <IconActivity    size={size} />;
    case 'pelvis':   return <IconHeartbeat   size={size} />;
    case 'hands':    return <IconStethoscope size={size} />;
    case 'lymph':    return <IconDroplet     size={size} />;
    case 'electric': return <IconBolt        size={size} />;
    case 'wave':     return <IconRipple      size={size} />;
    case 'bubble':   return <IconSparkles    size={size} />;
    case 'radio':    return <IconFlame       size={size} />;
    default:         return <IconShieldCheck size={size} />;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ServicesHub() {
  const { lang, t } = useLanguage();

  const [activePole,   setActivePole]   = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const [activeTag,    setActiveTag]    = useState<string>('all');
  const [searchQuery,  setSearchQuery]  = useState<string>('');
  const [viewMode,     setViewMode]     = useState<'spotlight' | 'grid'>('spotlight');
  const [selectedSlug, setSelectedSlug] = useState<string>(SERVICES[0]?.slug ?? 'reeducation-posturale');

  // ── FIX 1: per-item refs for scroll-into-view ────────────────────────────
  // hasInteracted guard: only scroll AFTER the user has explicitly clicked
  // something — prevents the page from jumping to the services section on load
  // (which was causing the Home button to appear to redirect to services).
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!hasInteracted.current) return;
    const el = itemRefs.current[selectedSlug];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [selectedSlug]);

  // ── FIX 2: memoised search predicate (shared by filteredServices + chipCounts) ─
  const matchesSearch = useCallback(
    (service: Service): boolean => {
      if (!searchQuery.trim()) return true;
      const q    = searchQuery.toLowerCase().trim();
      const name = getLocalizedText(service.name, lang).toLowerCase();
      const desc = getLocalizedText(service.shortDesc, lang).toLowerCase();
      const tags = service.keywords?.join(' ').toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q) || tags.includes(q);
    },
    [searchQuery, lang],
  );

  // ── Filtered list ────────────────────────────────────────────────────────
  const filteredServices = useMemo(() =>
    SERVICES.filter((s) => {
      if (activePole !== 'all' && s.pole !== activePole) return false;
      if (!matchesSearch(s)) return false;
      if (activeTag === 'all') return true;
      return TAG_SLUGS[activeTag]?.includes(s.slug) ?? true;
    }),
    [activePole, activeTag, matchesSearch],
  );

  // Keep selectedSlug in sync when filter changes
  useEffect(() => {
    if (filteredServices.length > 0 && !filteredServices.some(s => s.slug === selectedSlug)) {
      setSelectedSlug(filteredServices[0].slug);
    }
  }, [filteredServices, selectedSlug]);

  // ── FIX 6: return null when empty — prevents stale spotlight card ────────
  const activeService = useMemo(() => {
    if (filteredServices.length === 0) return null;
    return filteredServices.find(s => s.slug === selectedSlug) ?? filteredServices[0];
  }, [filteredServices, selectedSlug]);

  const activeServiceIndex = useMemo(
    () => filteredServices.findIndex(s => s.slug === activeService?.slug),
    [filteredServices, activeService],
  );

  // ── FIX 2: per-chip counts for the current pole + active search ──────────
  const chipCounts = useMemo(() => {
    const base = SERVICES.filter(s => activePole === 'all' || s.pole === activePole);
    const count = (tagId: string) =>
      base.filter(s => {
        if (!matchesSearch(s)) return false;
        if (tagId === 'all') return true;
        return TAG_SLUGS[tagId]?.includes(s.slug) ?? false;
      }).length;
    return {
      all:       count('all'),
      posture:   count('posture'),
      slimming:  count('slimming'),
      drainage:  count('drainage'),
      postpartum:count('postpartum'),
    };
  }, [activePole, matchesSearch]);

  // ── FIX 2: pole change resets tag AND search ─────────────────────────────
  const handlePoleChange = useCallback((pole: 'all' | 'kinesitherapie' | 'minceur') => {
    setActivePole(pole);
    setActiveTag('all');
    setSearchQuery('');
    playSoftClick();
  }, []);

  // ── Navigation handlers ──────────────────────────────────────────────────
  const handleSelectService = (slug: string) => {
    hasInteracted.current = true;
    setSelectedSlug(slug);
    playSlideChange();
  };
  const handleNextService   = () => {
    if (!filteredServices.length) return;
    hasInteracted.current = true;
    setSelectedSlug(filteredServices[(activeServiceIndex + 1) % filteredServices.length].slug);
    playSlideChange();
  };
  const handlePrevService   = () => {
    if (!filteredServices.length) return;
    hasInteracted.current = true;
    setSelectedSlug(filteredServices[(activeServiceIndex - 1 + filteredServices.length) % filteredServices.length].slug);
    playSlideChange();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section id="services" className="relative py-16 sm:py-24 bg-[#FAFAF8] overflow-hidden select-none">

      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px]"
          style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 30%, rgba(245,233,200,0.45) 0%, transparent 70%)' }}
        />
        <div className="absolute -left-20 top-1/2 h-96 w-96 rounded-full bg-[#C49A3C]/8 blur-3xl" />
        <div className="absolute -right-20 top-2/3 h-96 w-96 rounded-full bg-[#E8C97A]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-12">

        {/* ── Section Header ───────────────────────────────────────────── */}
        <ScrollReveal className="text-center mb-8 sm:mb-12">

          <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C49A3C]/35 px-4 py-1.5 rounded-full mb-3 sm:mb-4 shadow-xs">
            <IconSparkles size={14} className="text-[#C49A3C]" />
            <span className="font-mono text-[11px] tracking-[0.24em] text-[#9A7428] uppercase font-bold">
              {lang === 'pt' ? 'Polos Clínicos de Excelência' : lang === 'en' ? 'Centers of Clinical Excellence' : "Pôles de Soins d'Excellence"}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-3 sm:mb-4 tracking-tight">
            {lang === 'pt' ? 'Os Nossos Cuidados Especializados' : lang === 'en' ? 'Specialized Medical Treatments' : 'Nos Soins & Protocoles Médicaux'}
          </h2>

          <p className="text-[#6B6058] max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed font-normal">
            {lang === 'pt'
              ? '13 tratamentos de vanguarda estruturados para a saúde postural, alívio de dor articular e remodelação corporal sem cirurgia.'
              : lang === 'en'
              ? '13 advanced protocols tailored for postural alignment, joint recovery, and non-invasive silhouette remodeling.'
              : '13 soins sur mesure alliant précision clinique et technologies de pointe pour votre posture et votre silhouette.'}
          </p>

          {/* ── Pole switcher + View toggle ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto mt-6 sm:mt-8">

            {/* FIX 2: handlePoleChange resets search + tag */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs w-full sm:w-auto overflow-x-auto no-scrollbar justify-between sm:justify-start">
              {(['all', 'kinesitherapie', 'minceur'] as const).map((pole) => (
                <button
                  key={pole}
                  onClick={() => handlePoleChange(pole)}
                  className={`flex-1 sm:flex-none py-1.5 px-3 sm:px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activePole === pole
                      ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                      : 'text-[#554C42] hover:text-[#9A7428]'
                  }`}
                >
                  {pole === 'all'
                    ? lang === 'pt' ? 'Todos (13)' : lang === 'en' ? 'All (13)' : 'Tous (13)'
                    : pole === 'kinesitherapie'
                    ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
                    : lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
                </button>
              ))}
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs shrink-0">
              <button
                onClick={() => { setViewMode('spotlight'); playSoftClick(); }}
                className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  viewMode === 'spotlight' ? 'bg-[#1A1412] text-[#E8C97A] shadow-xs' : 'text-[#8A8078] hover:text-[#1A1412]'
                }`}
              >
                <IconEye size={14} />
                <span>{lang === 'pt' ? 'Destaque' : lang === 'en' ? 'Spotlight' : 'En Vedette'}</span>
              </button>
              <button
                onClick={() => { setViewMode('grid'); playSoftClick(); }}
                className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  viewMode === 'grid' ? 'bg-[#1A1412] text-[#E8C97A] shadow-xs' : 'text-[#8A8078] hover:text-[#1A1412]'
                }`}
              >
                <IconLayoutGrid size={14} />
                <span>{lang === 'pt' ? 'Catálogo' : lang === 'en' ? 'Catalog' : 'Catalogue'}</span>
              </button>
            </div>
          </div>

          {/* ── FIX 2: Sub-filter chips with live counts + disabled state ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4 max-w-3xl mx-auto w-full">

            {/* Quick search */}
            <div className="relative flex items-center bg-white border border-[#E8E2D8] focus-within:border-[#C49A3C] rounded-full px-3 py-1 text-xs shadow-2xs transition-all w-full sm:w-56 shrink-0">
              <IconSearch size={13} className="text-[#8A8078] shrink-0 mr-1.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={lang === 'pt' ? 'Pesquisar tratamento...' : lang === 'en' ? 'Search treatment...' : 'Rechercher un soin...'}
                className="w-full bg-transparent text-[#1A1412] text-xs focus:outline-none placeholder-[#A8A098]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#8A8078] hover:text-[#1A1412] p-0.5">
                  <IconX size={12} />
                </button>
              )}
            </div>

            {/* Chips */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto justify-start sm:justify-center px-1 py-1">
              {CHIPS.map((chip) => {
                const count    = chipCounts[chip.id as keyof typeof chipCounts];
                const isActive = activeTag === chip.id;
                const isEmpty  = count === 0;

                return (
                  <button
                    key={chip.id}
                    onClick={() => { if (!isEmpty) { setActiveTag(chip.id); playSoftClick(); } }}
                    disabled={isEmpty}
                    className={`px-3 py-1 rounded-full text-[11px] font-mono whitespace-nowrap shrink-0 transition-all border ${
                      isActive
                        ? 'bg-[#FAF5EA] border-[#C49A3C] text-[#8A6A24] font-bold shadow-xs'
                        : isEmpty
                        ? 'bg-white/50 border-[#E8E2D8] text-[#C0B8B0] cursor-not-allowed opacity-50'
                        : 'bg-white/80 border-[#E8E2D8] text-[#8A8078] hover:text-[#1A1412] hover:bg-white hover:border-[#C49A3C]/40'
                    }`}
                  >
                    {chip.label[lang as keyof typeof chip.label] ?? chip.label.pt}
                    {chip.id !== 'all' && (
                      <span className={`ml-1 tabular-nums text-[10px] ${isActive ? 'text-[#C49A3C]' : 'text-[#A8A098]'}`}>
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* ── VIEW: Spotlight ──────────────────────────────────────────── */}
        {viewMode === 'spotlight' && (
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5 sm:gap-6 items-start">

            {/* Left panel: scrollable service list */}
            <div className="w-full lg:col-span-5 order-2 lg:order-1">

              <div className="hidden lg:flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8078] font-bold">
                  {lang === 'pt' ? 'Selecionar Tratamento' : lang === 'en' ? 'Select Treatment' : 'Sélectionner un soin'}
                </span>
                <span className="text-[11px] font-mono text-[#C49A3C] font-semibold">
                  {filteredServices.length} {lang === 'pt' ? 'disponíveis' : lang === 'en' ? 'available' : 'disponibles'}
                </span>
              </div>

              {/* FIX 7: fluid mobile width instead of fixed w-[260px] */}
              <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar max-h-none lg:max-h-[580px] pb-2 lg:pb-0 lg:pr-2 snap-x lg:snap-none">
                {filteredServices.length === 0 ? (
                  <div className="min-w-[220px] w-full bg-white/80 backdrop-blur-md rounded-2xl border border-[#E8E2D8] p-8 text-center text-[#8A8078] text-xs">
                    {lang === 'pt' ? 'Nenhum tratamento encontrado.' : lang === 'en' ? 'No treatments matched your criteria.' : 'Aucun soin ne correspond à votre recherche.'}
                  </div>
                ) : (
                  filteredServices.map((service) => {
                    const isSelected = service.slug === activeService?.slug;
                    const isKine     = service.pole === 'kinesitherapie';

                    return (
                      <button
                        key={service.slug}
                        // FIX 1: track per-item ref for scroll-into-view
                        ref={(el) => {
                          if (el) itemRefs.current[service.slug] = el;
                          else    delete itemRefs.current[service.slug];
                        }}
                        onClick={() => handleSelectService(service.slug)}
                        className={`text-left p-3 sm:p-4 rounded-2xl transition-all duration-200 relative flex items-center justify-between gap-2.5 sm:gap-3 border shrink-0 snap-start touch-target ${
                          isSelected
                            ? 'bg-white border-[#C49A3C] shadow-[0_8px_24px_rgba(196,154,60,0.14)] scale-[1.01] ring-1 ring-[#C49A3C]/30'
                            : 'bg-white/70 hover:bg-white border-[#E8E2D8] hover:border-[#C49A3C]/40 text-[#6B6058]'
                        } w-[72vw] max-w-[300px] lg:w-full`}
                      >
                        {/* FIX 4: AnimatePresence per-item bar — no layoutId conflicts */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              key="bar"
                              initial={{ opacity: 0, scaleY: 0.4 }}
                              animate={{ opacity: 1, scaleY: 1 }}
                              exit={{ opacity: 0, scaleY: 0.4 }}
                              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                              className="hidden lg:block absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b from-[#C49A3C] to-[#9A7428] rounded-r-full origin-center"
                            />
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#FAF5EA] text-[#8A6A24] border border-[#C49A3C]/40 shadow-xs'
                              : 'bg-[#F4EFE6] text-[#8A8078]'
                          }`}>
                            {getServiceIcon(service.icon, 18)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E8E2D8] text-[#7A7065]">
                                {isKine
                                  ? lang === 'pt' ? 'Fisio' : lang === 'en' ? 'Physio' : 'Kiné'
                                  : lang === 'pt' ? 'Minceur' : lang === 'en' ? 'Slimming' : 'Minceur'}
                              </span>
                              <span className="text-[10px] font-mono text-[#8A8078] flex items-center gap-0.5">
                                <IconClock size={11} className="text-[#C49A3C]" />
                                {service.duration}
                              </span>
                            </div>
                            <h3 className={`font-serif text-xs sm:text-sm lg:text-base font-bold truncate leading-tight transition-colors ${
                              isSelected ? 'text-[#1A1412]' : 'text-[#4A4038]'
                            }`}>
                              {getLocalizedText(service.name, lang)}
                            </h3>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end justify-center pl-1">
                          <span className="font-mono text-xs sm:text-sm font-bold text-[#C49A3C]">
                            {service.price} {t.common.currency}
                          </span>
                          <IconChevronRight
                            size={14}
                            className={`transition-transform mt-0.5 hidden sm:block ${
                              isSelected ? 'text-[#C49A3C] translate-x-0.5' : 'text-[#C8C0B8]'
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right panel: spotlight card */}
            <div className="w-full lg:col-span-7 order-1 lg:order-2">
              {/*
               * FIX 3: mode="popLayout" — the exiting card gets position:absolute
               * automatically, so the entering card renders immediately.
               * No more blank white gap between card transitions.
               */}
              <AnimatePresence mode="popLayout">
                {activeService ? (
                  <motion.div
                    key={activeService.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
                    className="relative bg-white rounded-2xl sm:rounded-3xl border border-[#E8E2D8] p-4 sm:p-7 md:p-8 shadow-[0_12px_36px_rgba(196,154,60,0.12)] overflow-hidden"
                  >
                    {/* Hero image */}
                    <div className="relative h-40 sm:h-52 md:h-56 w-full rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
                      <Image
                        src={getServiceHeroImage(activeService)}
                        alt={getLocalizedText(activeService.name, lang)}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                        className="object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1412]/85 via-[#1A1412]/35 to-transparent" />

                      {/* Badge row */}
                      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white/95 backdrop-blur-md text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-[#8A6A24] border border-[#C49A3C]/30 shadow-xs truncate">
                          {getServiceIcon(activeService.icon, 12)}
                          <span className="truncate">
                            {activeService.pole === 'kinesitherapie'
                              ? lang === 'pt' ? 'Fisioterapia & RPG' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
                              : lang === 'pt' ? 'Estética Médica' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#1A1412]/85 backdrop-blur-md text-white font-mono text-[10px] sm:text-xs font-bold border border-white/20">
                            {activeService.duration}
                          </span>
                          <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-[#C49A3C] text-[#1A1412] font-mono text-[11px] sm:text-xs font-extrabold shadow-xs">
                            {activeService.price} {t.common.currency}
                          </span>
                        </div>
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-2.5 sm:bottom-3 left-3 sm:left-4 right-3 sm:right-4">
                        <h3 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md">
                          {getLocalizedText(activeService.name, lang)}
                        </h3>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-[#554C42] leading-relaxed mb-4 sm:mb-6 font-normal">
                      {getLocalizedText(activeService.shortDesc, lang)}
                    </p>

                    {/* Clinical indications */}
                    <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl sm:rounded-2xl p-3.5 sm:p-4 mb-4 sm:mb-6 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#8A6A24]">
                        <IconAward size={13} className="text-[#C49A3C]" />
                        <span>{lang === 'pt' ? 'Indicações & Benefícios Clínicos' : lang === 'en' ? 'Clinical Indications & Benefits' : 'Indications & Bienfaits'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                        {getLocalizedList(activeService.indications, lang).slice(0, 4).map((ind, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#4A4038]">
                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#FAF5EA] border border-[#C49A3C]/40 flex items-center justify-center shrink-0">
                              <IconCheck size={10} className="text-[#9A7428]" />
                            </div>
                            <span className="truncate">{ind}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                      <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handlePrevService}
                            className="p-2 sm:p-2.5 rounded-xl border border-[#E8E2D8] hover:border-[#C49A3C] bg-white text-[#8A8078] hover:text-[#1A1412] transition-colors touch-target flex items-center justify-center"
                            aria-label="Previous treatment"
                          >
                            <IconChevronLeft size={16} />
                          </button>
                          <button
                            onClick={handleNextService}
                            className="p-2 sm:p-2.5 rounded-xl border border-[#E8E2D8] hover:border-[#C49A3C] bg-white text-[#8A8078] hover:text-[#1A1412] transition-colors touch-target flex items-center justify-center"
                            aria-label="Next treatment"
                          >
                            <IconChevronRight size={16} />
                          </button>
                        </div>
                        <span className="text-[11px] font-mono text-[#8A8078] font-semibold px-2 tabular-nums">
                          {activeServiceIndex + 1} / {filteredServices.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Link
                          href={`/services/${activeService.slug}`}
                          onClick={playSoftClick}
                          className="flex-1 sm:flex-none text-center px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#E8E2D8] hover:border-[#C49A3C] text-[#4A4038] hover:text-[#9A7428] font-bold text-xs transition-all touch-target flex items-center justify-center"
                        >
                          {lang === 'pt' ? 'Detalhes & FAQ' : lang === 'en' ? 'Details & FAQ' : 'Détails & FAQ'}
                        </Link>
                        <Link
                          href={`/rendez-vous?service=${activeService.slug}`}
                          onClick={playSoftClick}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#9A7428] hover:from-[#B88E32] hover:to-[#8A6620] text-white font-bold text-xs transition-all shadow-[0_4px_16px_rgba(196,154,60,0.25)] hover:shadow-[0_6px_20px_rgba(196,154,60,0.35)] touch-target"
                        >
                          <IconCalendarEvent size={14} />
                          <span>{lang === 'pt' ? 'Agendar' : lang === 'en' ? 'Book' : 'Réserver'}</span>
                        </Link>
                      </div>
                    </div>
                  </motion.div>

                ) : (
                  /* FIX 6: proper empty state — no stale fallback service card */
                  <motion.div
                    key="empty-spotlight"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    className="relative bg-white rounded-2xl sm:rounded-3xl border border-dashed border-[#C49A3C]/40 p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center gap-4 min-h-[300px]"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#FAF5EA] border border-[#C49A3C]/20 flex items-center justify-center text-[#C49A3C]">
                      <IconSearch size={26} />
                    </div>
                    <div>
                      <p className="font-serif text-lg font-bold text-[#1A1412] mb-1">
                        {lang === 'pt' ? 'Nenhum tratamento encontrado' : lang === 'en' ? 'No treatments found' : 'Aucun soin trouvé'}
                      </p>
                      <p className="text-xs text-[#8A8078] max-w-[260px] mx-auto leading-relaxed">
                        {lang === 'pt'
                          ? 'Tente remover alguns filtros ou pesquise por outro termo.'
                          : lang === 'en'
                          ? 'Try removing some filters or searching with a different term.'
                          : 'Essayez de supprimer des filtres ou de chercher autrement.'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setActiveTag('all'); setSearchQuery(''); playSoftClick(); }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-white text-xs font-bold transition-all border border-[#C49A3C]/30 hover:border-[#C49A3C]"
                    >
                      <IconX size={13} />
                      {lang === 'pt' ? 'Limpar Filtros' : lang === 'en' ? 'Clear Filters' : 'Effacer les filtres'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── VIEW: Grid ───────────────────────────────────────────────── */}
        {viewMode === 'grid' && (
          /*
           * FIX 5: removed `layout` from the outer wrapper div.
           * Previously, motion.div layout caused ALL cards (including those
           * staying in the filtered set) to re-animate on every filter change.
           * Now only truly added/removed cards animate via their own AnimatePresence.
           */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredServices.length === 0 ? (
                <motion.div
                  key="empty-grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-full flex flex-col items-center justify-center gap-4 py-16 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#FAF5EA] border border-[#C49A3C]/20 flex items-center justify-center text-[#C49A3C]">
                    <IconSearch size={26} />
                  </div>
                  <p className="font-serif text-lg font-bold text-[#1A1412]">
                    {lang === 'pt' ? 'Nenhum tratamento encontrado' : lang === 'en' ? 'No treatments found' : 'Aucun soin trouvé'}
                  </p>
                  <button
                    onClick={() => { setActiveTag('all'); setSearchQuery(''); playSoftClick(); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-white text-xs font-bold transition-all border border-[#C49A3C]/30"
                  >
                    <IconX size={13} />
                    {lang === 'pt' ? 'Limpar Filtros' : lang === 'en' ? 'Clear Filters' : 'Effacer les filtres'}
                  </button>
                </motion.div>
              ) : (
                filteredServices.map((service, i) => (
                  <motion.div
                    key={service.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                  >
                    <ServiceCard service={service} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Bottom care ribbon ───────────────────────────────────────── */}
        <div className="mt-12 sm:mt-16 text-center">
          <ScrollReveal>
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-2.5 sm:p-3 bg-white border border-[#C49A3C]/30 rounded-2xl sm:rounded-full shadow-xs">
              <div className="flex items-center gap-2 px-3 text-xs text-[#554C42]">
                <IconShieldCheck size={16} className="text-[#6F8F72]" />
                <span className="font-semibold">
                  {lang === 'pt'
                    ? 'Avaliação personalizada e recibos para comparticipação ADSE/Seguros de Saúde'
                    : lang === 'en'
                    ? 'Personalized clinical assessment & certified receipts for health insurance'
                    : 'Bilan personnalisé & factures conformes mutuelles et assurances'}
                </span>
              </div>
              <Link
                href="/services"
                onClick={playSoftClick}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl sm:rounded-full bg-[#1A1412] hover:bg-[#2C2420] text-[#E8C97A] text-xs font-bold transition-all shadow-xs"
              >
                <span>{lang === 'pt' ? 'Ver Todos os 13 Protocolos' : lang === 'en' ? 'Explore All 13 Protocols' : 'Explorer les 13 Soins'}</span>
                <IconArrowRight size={13} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
