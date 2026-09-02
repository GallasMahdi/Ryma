'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, Service, getLocalizedText, getLocalizedList } from '@/data/services';
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
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';

type CategoryFilter = 'all' | 'kine' | 'slimming' | 'postpartum_drainage';

interface CategoryTab {
  id: CategoryFilter;
  label: { pt: string; en: string; fr: string };
  icon: (size?: number) => React.ReactNode;
}

const CATEGORIES: CategoryTab[] = [
  {
    id: 'all',
    label: { pt: 'Todos os Cuidados', en: 'All Treatments', fr: 'Tous les Soins' },
    icon: (s = 15) => <IconSparkles size={s} />,
  },
  {
    id: 'kine',
    label: { pt: 'Fisioterapia & Postura', en: 'Physiotherapy & Spine', fr: 'Kinésithérapie & Posture' },
    icon: (s = 15) => <IconActivity size={s} />,
  },
  {
    id: 'slimming',
    label: { pt: 'Estética Médica & Minceur', en: 'Medical Aesthetics', fr: 'Soins Minceur & Fermeté' },
    icon: (s = 15) => <IconFlame size={s} />,
  },
  {
    id: 'postpartum_drainage',
    label: { pt: 'Saúde Pós-Parto & Drenagem', en: 'Postpartum & Drainage', fr: 'Post-Partum & Drainage' },
    icon: (s = 15) => <IconHeartbeat size={s} />,
  },
];

function getServiceHeroImage(service: Service): string {
  if (['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'].includes(service.slug))
    return '/hero/therapy.jpg';
  if (service.slug === 'drainage-lymphatique') return '/results/before_after_drainage.png';
  if (service.slug === 'reeducation-post-partum') return '/results/before_after_postpartum.png';
  if (service.slug === 'cryolipolyse') return '/results/before_after_cryolipolyse.png';
  if (service.slug === 'radiofrequence') return '/results/before_after_radiofrequence.png';
  if (['cavitation', 'laser-lipo', 'pressotherapie'].includes(service.slug)) return '/hero/slimming.jpg';
  if (service.slug === 'massage-drainant') return '/results/before_after_cellulite.png';
  return service.pole === 'kinesitherapie' ? '/hero/therapy.jpg' : '/hero/slimming.jpg';
}

function getServiceIcon(iconKey: string, size = 18) {
  switch (iconKey) {
    case 'spine': return <IconActivity size={size} />;
    case 'pelvis': return <IconHeartbeat size={size} />;
    case 'hands': return <IconStethoscope size={size} />;
    case 'lymph': return <IconDroplet size={size} />;
    case 'electric': return <IconBolt size={size} />;
    case 'wave': return <IconRipple size={size} />;
    case 'bubble': return <IconSparkles size={size} />;
    case 'radio': return <IconFlame size={size} />;
    default: return <IconShieldCheck size={size} />;
  }
}

export function ServicesHub() {
  const { lang, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Mouse Drag state for desktop grab-and-swipe
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);

  const matchesCategory = useCallback((service: Service, cat: CategoryFilter): boolean => {
    if (cat === 'all') return true;
    if (cat === 'kine') {
      return service.pole === 'kinesitherapie' && service.slug !== 'reeducation-post-partum' && service.slug !== 'drainage-lymphatique';
    }
    if (cat === 'slimming') {
      return service.pole === 'minceur' && service.slug !== 'pressotherapie' && service.slug !== 'massage-drainant';
    }
    if (cat === 'postpartum_drainage') {
      return [
        'reeducation-post-partum',
        'drainage-lymphatique',
        'pressotherapie',
        'massage-drainant',
      ].includes(service.slug);
    }
    return true;
  }, []);

  const filteredServices = useMemo(() => {
    return SERVICES.filter((service) => {
      if (!matchesCategory(service, activeCategory)) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const name = getLocalizedText(service.name, lang).toLowerCase();
      const desc = getLocalizedText(service.shortDesc, lang).toLowerCase();
      const tags = service.keywords?.join(' ').toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q) || tags.includes(q);
    });
  }, [activeCategory, searchQuery, lang, matchesCategory]);

  const categoryCounts = useMemo(() => {
    return {
      all: SERVICES.length,
      kine: SERVICES.filter((s) => matchesCategory(s, 'kine')).length,
      slimming: SERVICES.filter((s) => matchesCategory(s, 'slimming')).length,
      postpartum_drainage: SERVICES.filter((s) => matchesCategory(s, 'postpartum_drainage')).length,
    };
  }, [matchesCategory]);

  // Reset scroll position on filter change
  useEffect(() => {
    setCurrentSlideIndex(0);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [activeCategory, searchQuery]);

  // Track scroll position for active indicator
  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, clientWidth } = carouselRef.current;
    if (clientWidth === 0) return;
    const card = carouselRef.current.querySelector<HTMLElement>('.service-carousel-card');
    const cardWidth = card ? card.offsetWidth + 20 : clientWidth * 0.85;
    const index = Math.round(scrollLeft / cardWidth);
    setCurrentSlideIndex(Math.min(Math.max(index, 0), filteredServices.length - 1));
  }, [filteredServices.length]);

  const scrollToSlide = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const card = container.querySelector<HTMLElement>('.service-carousel-card');
    const cardWidth = card ? card.offsetWidth + 20 : container.clientWidth * 0.85;
    container.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth',
    });
    setCurrentSlideIndex(index);
    playSlideChange();
  }, []);

  const handleNext = () => {
    if (currentSlideIndex < filteredServices.length - 1) {
      scrollToSlide(currentSlideIndex + 1);
    } else {
      scrollToSlide(0);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      scrollToSlide(currentSlideIndex - 1);
    } else {
      scrollToSlide(filteredServices.length - 1);
    }
  };

  // Mouse Drag Events for Desktop Smooth Swiping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeftState(carouselRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    carouselRef.current.scrollLeft = scrollLeftState - walk;
  };

  return (
    <section id="services" className="relative py-14 sm:py-20 bg-[#FAFAF8] overflow-hidden select-none">

      {/* Ambient background light glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 30%, rgba(245,233,200,0.35) 0%, transparent 70%)' }}
        />
        <div className="absolute -left-20 top-1/2 h-80 w-80 rounded-full bg-[#C49A3C]/6 blur-3xl" />
        <div className="absolute -right-20 top-2/3 h-80 w-80 rounded-full bg-[#E8C97A]/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-10">

        {/* ── Section Header ───────────────────────────────────────────── */}
        <ScrollReveal className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md border border-[#C49A3C]/40 px-4 py-1.5 rounded-full mb-3 sm:mb-4 shadow-xs">
            <IconSparkles size={14} className="text-[#C49A3C]" />
            <span className="font-sans text-[11px] sm:text-xs tracking-[0.22em] text-[#9A7428] uppercase font-bold">
              {lang === 'pt' ? 'Polos Clínicos de Excelência' : lang === 'en' ? 'Centers of Clinical Excellence' : "Pôles de Soins d'Excellence"}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal text-[#1A1412] mb-3 sm:mb-4 tracking-tight">
            {lang === 'pt' ? (
              <>Cuidados Clínicos & <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">Tratamentos Especializados</span></>
            ) : lang === 'en' ? (
              <>Clinical Care & <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">Specialized Treatments</span></>
            ) : (
              <>Soins Médicaux & <span className="italic font-medium bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent">Protocoles Spécialisés</span></>
            )}
          </h2>

          <p className="text-[#6B6058] max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed font-normal">
            {lang === 'pt'
              ? '13 protocolos clínicos estruturados para postura, alívio de dor e remodelação corporal não invasiva.'
              : lang === 'en'
              ? '13 tailored clinical protocols for spinal posture, joint relief, and non-invasive body contouring.'
              : '13 protocoles médicaux sur-mesure alliant précision biomécanique et technologies esthétiques de pointe.'}
          </p>

          {/* ── Single-Tier Clean Category Navigation + Search ── */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 max-w-5xl mx-auto mt-6">
            
            {/* Category Segmenter Pills */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#C49A3C]/30 rounded-2xl sm:rounded-full shadow-xs w-full md:w-auto overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      playSoftClick();
                    }}
                    className={`flex items-center gap-1.5 py-1.5 px-3 sm:px-4 rounded-xl sm:rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-sm'
                        : 'text-[#6B6058] hover:text-[#9A7428] hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-[#C49A3C]'}>{cat.icon(13)}</span>
                    <span>{cat.label[lang as keyof typeof cat.label] ?? cat.label.pt}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#FAF5EA] text-[#9A7428]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search Input */}
            <div className="relative flex items-center bg-white border border-[#E8E2D8] focus-within:border-[#C49A3C] rounded-full px-3.5 py-1.5 text-xs shadow-2xs transition-all w-full md:w-60 shrink-0">
              <IconSearch size={14} className="text-[#8A8078] shrink-0 me-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'pt' ? 'Pesquisar...' : lang === 'en' ? 'Search...' : 'Rechercher...'}
                className="w-full bg-transparent text-[#1A1412] text-xs focus:outline-none placeholder-[#A8A098]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[#8A8078] hover:text-[#1A1412] p-0.5"
                  aria-label="Clear search"
                >
                  <IconX size={13} />
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Carousel Header Controls ── */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/30 px-3 py-1 rounded-full shadow-2xs">
              0{Math.min(currentSlideIndex + 1, filteredServices.length)} <span className="text-[#A8A098] font-normal">/</span> 0{filteredServices.length}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#8A8078]">
              <span>Deslize ou arraste para navegar</span>
            </span>
          </div>

          {/* Luxury Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 sm:p-2.5 rounded-full bg-white hover:bg-[#FAF5EA] border border-[#C49A3C]/40 text-[#554C42] hover:text-[#9A7428] shadow-xs hover:shadow-md transition-all duration-200 touch-target flex items-center justify-center active:scale-95"
              aria-label="Previous treatment"
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              className="p-2 sm:p-2.5 rounded-full bg-white hover:bg-[#FAF5EA] border border-[#C49A3C]/40 text-[#554C42] hover:text-[#9A7428] shadow-xs hover:shadow-md transition-all duration-200 touch-target flex items-center justify-center active:scale-95"
              aria-label="Next treatment"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* ── Interactive Horizontal Carousel Track with Drag & Touch Support ── */}
        <div className="relative">
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeaveOrUp}
            onMouseUp={handleMouseLeaveOrUp}
            onMouseMove={handleMouseMove}
            className={`flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-3 px-1 -mx-1 ${
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: isDragging ? 'none' : 'x mandatory',
            }}
          >
            {filteredServices.length === 0 ? (
              <div className="w-full bg-white rounded-3xl border border-dashed border-[#C49A3C]/40 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF5EA] border border-[#C49A3C]/30 flex items-center justify-center text-[#C49A3C]">
                  <IconSearch size={22} />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#1A1412]">
                  {lang === 'pt' ? 'Nenhum tratamento encontrado' : lang === 'en' ? 'No treatments found' : 'Aucun soin trouvé'}
                </h3>
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                    playSoftClick();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-white text-xs font-bold transition-all border border-[#C49A3C]/30"
                >
                  <IconX size={13} />
                  <span>{lang === 'pt' ? 'Limpar Filtros' : lang === 'en' ? 'Clear Filters' : 'Réinitialiser'}</span>
                </button>
              </div>
            ) : (
              filteredServices.map((service, index) => {
                const isKine = service.pole === 'kinesitherapie';
                const isCurrent = currentSlideIndex === index;
                const keyIndications = getLocalizedList(service.indications, lang).slice(0, 2);

                return (
                  <div
                    key={service.slug}
                    onClick={() => scrollToSlide(index)}
                    className={`service-carousel-card snap-start shrink-0 w-[84vw] sm:w-[340px] lg:w-[370px] flex flex-col justify-between bg-white rounded-3xl border p-4 sm:p-5 transition-all duration-300 group overflow-hidden ${
                      isCurrent
                        ? 'border-[#C49A3C] shadow-[0_16px_45px_rgba(196,154,60,0.18)] ring-1 ring-[#C49A3C]/30'
                        : 'border-[#E8E2D8] hover:border-[#C49A3C]/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(196,154,60,0.12)]'
                    }`}
                  >
                    {/* Top Image Preview with Gold Tag */}
                    <div className="relative h-40 sm:h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-[#F5EFE6]">
                      <Image
                        src={getServiceHeroImage(service)}
                        alt={getLocalizedText(service.name, lang)}
                        fill
                        sizes="(max-width: 768px) 85vw, 380px"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05]/80 via-[#0F0A05]/20 to-transparent" />

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-sans font-bold uppercase tracking-wider text-[#8A6A24] border border-[#C49A3C]/30 shadow-xs">
                          {getServiceIcon(service.icon, 13)}
                          <span>
                            {isKine
                              ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
                              : lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming' : 'Soins Minceur'}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1A1412]/85 backdrop-blur-md text-white font-mono text-[10px] font-semibold border border-white/20">
                          <IconClock size={11} className="text-[#E8C97A]" />
                          <span>{service.duration}</span>
                        </span>
                      </div>

                      {/* Bottom Price inside Image */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                        <span className="font-mono text-xs sm:text-sm font-bold text-[#E8C97A] drop-shadow-sm">
                          {service.price} {t.common.currency} <span className="text-[10px] text-white/80 font-normal">/ sessão</span>
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title */}
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors leading-snug mb-1.5 truncate">
                          {getLocalizedText(service.name, lang)}
                        </h3>

                        {/* Short Description */}
                        <p className="text-xs sm:text-sm text-[#6B6058] leading-relaxed line-clamp-2 mb-3 font-normal">
                          {getLocalizedText(service.shortDesc, lang)}
                        </p>

                        {/* Clinical Benefits Checklist */}
                        {keyIndications.length > 0 && (
                          <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-xl p-2.5 mb-3.5 space-y-1">
                            {keyIndications.map((ind, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#554C42]">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#FAF5EA] border border-[#C49A3C]/40 flex items-center justify-center shrink-0">
                                  <IconCheck size={10} className="text-[#9A7428]" />
                                </div>
                                <span className="truncate">{ind}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F0EBE1]">
                        <Link
                          href={`/services/${service.slug}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSoftClick();
                          }}
                          className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-[#E8E2D8] hover:border-[#C49A3C] text-[#554C42] hover:text-[#9A7428] font-bold text-xs transition-all bg-white hover:bg-[#FAF8F5]"
                        >
                          <span>{lang === 'pt' ? 'Detalhes' : lang === 'en' ? 'Details' : 'Détails'}</span>
                          <IconArrowRight size={13} />
                        </Link>

                        <Link
                          href={`/rendez-vous?service=${service.slug}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            playSoftClick();
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#9A7428] hover:from-[#B88E32] hover:to-[#8A6620] text-white font-bold text-xs transition-all shadow-xs hover:shadow-md"
                        >
                          <IconCalendarEvent size={13} />
                          <span>{lang === 'pt' ? 'Agendar' : lang === 'en' ? 'Book' : 'Réserver'}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Carousel Interactive Pagination Dots / Bar ──────────────── */}
        {filteredServices.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 sm:mt-6">
            {filteredServices.map((_, i) => {
              const isCurrent = currentSlideIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => scrollToSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'w-8 bg-gradient-to-r from-[#C49A3C] to-[#9A7428] shadow-xs'
                      : 'w-2 bg-[#D8D0C5] hover:bg-[#C49A3C]/60'
                  }`}
                  aria-label={`Go to treatment ${i + 1}`}
                />
              );
            })}
          </div>
        )}

        {/* ── Bottom Care Reassurance Ribbon ─────────────────────────────── */}
        <div className="mt-8 sm:mt-12 text-center">
          <ScrollReveal>
            <div className="inline-flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white border border-[#C49A3C]/35 rounded-2xl sm:rounded-full shadow-xs">
              <div className="flex items-center gap-2 px-2.5 text-xs text-[#554C42]">
                <IconShieldCheck size={16} className="text-[#6F8F72] shrink-0" />
                <span className="font-semibold">
                  {lang === 'pt'
                    ? 'Avaliação personalizada e recibos para comparticipação ADSE / Seguros de Saúde'
                    : lang === 'en'
                    ? 'Personalized clinical assessment & certified receipts for health insurance'
                    : 'Bilan personnalisé & factures conformes mutuelles et assurances'}
                </span>
              </div>
              <Link
                href="/services"
                onClick={playSoftClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-full bg-[#1A1412] hover:bg-[#2C2420] text-[#E8C97A] text-xs font-bold transition-all shadow-xs"
              >
                <span>{lang === 'pt' ? 'Ver Catálogo Completo' : lang === 'en' ? 'View Full Catalog' : 'Voir le Catalogue'}</span>
                <IconArrowRight size={13} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
