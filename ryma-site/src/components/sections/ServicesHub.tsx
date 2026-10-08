'use client';
import { useServices } from '@/components/ServiceCatalogProvider';

import React, { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';
import { Service, getLocalizedText, getLocalizedList } from '@/data/services';
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

function getServiceHeroImage(service: {pole:string}): string {
  return service.pole === 'kinesitherapie' ? '/hero/therapy.jpg' : service.pole === 'bilan' ? '/hero/consultation.jpg' : '/hero/slimming.jpg';
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

// Scrolling only rerenders the previously active and newly active cards.
const ServiceCarouselCard = memo(function ServiceCarouselCard({ service, index, isCurrent, onSelect }: {
  service: Service;
  index: number;
  isCurrent: boolean;
  onSelect: (index: number) => void;
}) {
  const { lang, t } = useLanguage();
  const isKine = service.pole === 'kinesitherapie';
  const keyIndications = getLocalizedList(service.indications, lang).slice(0, 2);
  return (
    <div
      onClick={() => onSelect(index)}
      className={`service-carousel-card snap-start shrink-0 w-[84vw] sm:w-[340px] lg:w-[370px] flex flex-col justify-between bg-white rounded-3xl border p-4 sm:p-5 transition-[border-color,box-shadow] duration-200 group overflow-hidden ${
        isCurrent
          ? 'border-[#C49A3C] shadow-[0_16px_45px_rgba(196,154,60,0.18)] ring-1 ring-[#C49A3C]/30'
          : 'border-[#E8E2D8] hover:border-[#C49A3C]/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(196,154,60,0.12)]'
      }`}
    >
      {/* Top Image Preview with Gold Tag */}
      <Link
        draggable={false}
        href={`/services/${service.slug}`}
        onClick={(e) => {
          e.stopPropagation();
          playSoftClick();
        }}
        className="block relative h-40 sm:h-44 w-full rounded-2xl overflow-hidden mb-3.5 bg-[#F5EFE6] cursor-pointer"
        title={getLocalizedText(service.name, lang)}
      >
        <Image
          draggable={false}
          quality={70}
          src={getServiceHeroImage(service)}
          alt={getLocalizedText(service.name, lang)}
          fill
          sizes="(max-width: 639px) calc(84vw - 34px), (max-width: 1023px) 298px, 328px"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A05]/80 via-[#0F0A05]/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-sans font-bold uppercase tracking-wider text-[#8A6A24] border border-[#C49A3C]/30 shadow-xs">
            {getServiceIcon(service.icon, 13)}
            <span>
              {service.pole === 'bilan' ? (lang === 'pt' ? 'Avaliação' : lang === 'en' ? 'Assessment' : 'Bilan') : isKine
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
      </Link>

      {/* Content Section */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Title */}
          <Link
            draggable={false}
            href={`/services/${service.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              playSoftClick();
            }}
            className="block group-hover:text-[#9A7428] transition-colors"
          >
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412] leading-snug mb-1.5 truncate">
              {getLocalizedText(service.name, lang)}
            </h3>
          </Link>

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
            draggable={false}
            href={`/services/${service.slug}`}
            onClick={(e) => {
              e.stopPropagation();
              playSoftClick();
            }}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-[#C49A3C]/30 hover:border-[#C49A3C] bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-white font-bold text-xs transition-all shadow-2xs group/btn"
          >
            <span>{lang === 'pt' ? 'Selecionar' : lang === 'en' ? 'Select' : 'Sélectionner'}</span>
            <IconArrowRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            draggable={false}
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
});

export interface ServicesHubProps {
  embedded?: boolean;
  hideHeader?: boolean;
}

export const ServicesHub = memo(function ServicesHub({ embedded = false, hideHeader = false }: ServicesHubProps = {}) {
  const SERVICES = useServices();
  const { lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const [slideCount, setSlideCount] = useState(SERVICES.length);
  const carouselRef = useRef<HTMLDivElement>(null);
  const geometryRef = useRef({ step: 0, maxScroll: 0, lastSlide: 0 });
  const scrollFrameRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  const matchesCategory = useCallback((service: Service, cat: CategoryFilter): boolean => {
    if (cat === 'all') return true;
    if (cat === 'kine') {
      return service.pole === 'kinesitherapie';
    }
    if (cat === 'slimming') {
      return service.pole === 'minceur';
    }
    if (cat === 'postpartum_drainage') {
      return service.careGoals?.some(g=>g==='postpartum'||g==='drainage') ?? false;
    }
    return true;
  }, []);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return SERVICES.filter((service) => {
      if (!matchesCategory(service, activeCategory)) return false;
      if (!q) return true;

      const name = getLocalizedText(service.name, lang).toLowerCase();
      const desc = getLocalizedText(service.shortDesc, lang).toLowerCase();
      const tags = service.keywords?.join(' ').toLowerCase() ?? '';
      return name.includes(q) || desc.includes(q) || tags.includes(q);
    });
  }, [activeCategory, searchQuery, lang, matchesCategory, SERVICES]);

  const categoryCounts = useMemo(() => {
    return {
      all: SERVICES.length,
      kine: SERVICES.filter((s) => matchesCategory(s, 'kine')).length,
      slimming: SERVICES.filter((s) => matchesCategory(s, 'slimming')).length,
      postpartum_drainage: SERVICES.filter((s) => matchesCategory(s, 'postpartum_drainage')).length,
    };
  }, [matchesCategory, SERVICES]);

  // Measure only when the content or viewport changes, never inside a scroll frame.
  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;
    container.scrollTo({ left: 0, behavior: 'instant' });
    setCurrentSlideIndex(0);
    const measure = () => {
      // Preserve the scroll position while the other explorer tab is open.
      if (!container.clientWidth) return;
      const card = container.querySelector<HTMLElement>('.service-carousel-card');
      const step = card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(container).columnGap) : 0;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      const lastSlide = step ? Math.min(filteredServices.length - 1, Math.ceil(Math.max(0, maxScroll - 1) / step)) : 0;
      geometryRef.current = { step, maxScroll, lastSlide };
      setSlideCount(filteredServices.length ? lastSlide + 1 : 0);
      setCurrentSlideIndex(!step ? 0 : container.scrollLeft >= maxScroll - 1
        ? lastSlide
        : Math.min(lastSlide, Math.round(container.scrollLeft / step)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    const card = container.querySelector<HTMLElement>('.service-carousel-card');
    if (card) observer.observe(card);
    return () => {
      observer.disconnect();
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    };
  }, [filteredServices]);

  // Coalesce scroll events into one inexpensive update per animation frame.
  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const container = carouselRef.current;
      const { step, maxScroll, lastSlide } = geometryRef.current;
      if (!container || !step) return;
      const index = container.scrollLeft >= maxScroll - 1
        ? lastSlide
        : Math.round(container.scrollLeft / step);
      setCurrentSlideIndex(Math.max(0, Math.min(index, lastSlide)));
    });
  }, []);

  const scrollToSlide = useCallback((index: number) => {
    const container = carouselRef.current;
    const { step, maxScroll, lastSlide } = geometryRef.current;
    if (!container || !step) return;
    const target = Math.max(0, Math.min(index, lastSlide));
    container.scrollTo({
      left: Math.min(target * step, maxScroll),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    playSlideChange();
  }, []);

  const handleNext = () => {
    scrollToSlide(currentSlideIndex < slideCount - 1 ? currentSlideIndex + 1 : 0);
  };

  const handlePrev = () => {
    scrollToSlide(currentSlideIndex > 0 ? currentSlideIndex - 1 : slideCount - 1);
  };

  // Touch keeps native momentum scrolling; mouse dragging uses refs without rerenders.
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragRef.current = { active: true, moved: false, startX: event.clientX, scrollLeft: event.currentTarget.scrollLeft };
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    delete event.currentTarget.dataset.dragging;
    event.currentTarget.style.scrollSnapType = 'x mandatory';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
      event.currentTarget.style.scrollSnapType = 'none';
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - distance;
  };

  const hubContent = (
    <div className={embedded ? 'relative mx-auto max-w-7xl px-0' : 'relative mx-auto max-w-7xl px-4 sm:px-6 md:px-10'}>

        {/* ── Section Header ───────────────────────────────────────────── */}
        {!hideHeader && (
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
                ? `${SERVICES.length} protocolos clínicos estruturados para postura, alívio de dor e remodelação corporal não invasiva.`
                : lang === 'en'
                ? `${SERVICES.length} tailored clinical protocols for spinal posture, joint relief, and non-invasive body contouring.`
                : `${SERVICES.length} protocoles médicaux sur-mesure alliant précision biomécanique et technologies esthétiques de pointe.`}
            </p>
          </ScrollReveal>
        )}

        {/* ── Single-Tier Clean Category Navigation + Search ── */}
        <div className={`flex flex-col md:flex-row items-center justify-between gap-3 max-w-5xl mx-auto ${hideHeader ? 'mt-0 mb-6' : 'mt-6'}`}>
            
            {/* Category Segmenter Pills */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#C49A3C]/30 rounded-2xl sm:rounded-full shadow-xs w-full md:w-auto overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isActive}
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
                type="search"
                aria-label={lang === 'pt' ? 'Pesquisar cuidados' : lang === 'en' ? 'Search treatments' : 'Rechercher un soin'}
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

        {/* ── Carousel Header Controls ── */}
        <div className="flex items-center justify-between px-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/30 px-3 py-1 rounded-full shadow-2xs">
              {String(Math.min(currentSlideIndex + 1, slideCount)).padStart(2, '0')} <span className="text-[#A8A098] font-normal">/</span> {String(slideCount).padStart(2, '0')}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#8A8078]">
              <span>{lang === 'pt' ? 'Deslize ou arraste para navegar' : lang === 'en' ? 'Swipe or drag to browse' : 'Faites glisser pour parcourir'}</span>
            </span>
          </div>

          {/* Luxury Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={slideCount <= 1}
              className="p-2 sm:p-2.5 rounded-full bg-white hover:bg-[#FAF5EA] border border-[#C49A3C]/40 text-[#554C42] hover:text-[#9A7428] shadow-xs hover:shadow-md transition-all duration-200 touch-target flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-default"
              aria-label={lang === 'pt' ? 'Cuidado anterior' : lang === 'en' ? 'Previous treatment' : 'Soin précédent'}
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={slideCount <= 1}
              className="p-2 sm:p-2.5 rounded-full bg-white hover:bg-[#FAF5EA] border border-[#C49A3C]/40 text-[#554C42] hover:text-[#9A7428] shadow-xs hover:shadow-md transition-all duration-200 touch-target flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-default"
              aria-label={lang === 'pt' ? 'Próximo cuidado' : lang === 'en' ? 'Next treatment' : 'Soin suivant'}
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            onPointerLeave={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) handlePointerEnd(event);
            }}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => {
              if (!dragRef.current.moved) return;
              dragRef.current.moved = false;
              event.preventDefault();
              event.stopPropagation();
            }}
            tabIndex={0}
            aria-label={lang === 'pt' ? 'Carrossel de cuidados' : lang === 'en' ? 'Treatment carousel' : 'Carrousel des soins'}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === 'ArrowRight') { event.preventDefault(); handleNext(); }
              if (event.key === 'ArrowLeft') { event.preventDefault(); handlePrev(); }
              if (event.key === 'Home') { event.preventDefault(); scrollToSlide(0); }
              if (event.key === 'End') { event.preventDefault(); scrollToSlide(slideCount - 1); }
            }}
            className="flex gap-5 sm:gap-6 overflow-x-auto overscroll-x-contain no-scrollbar snap-x snap-mandatory py-3 px-1 -mx-1 cursor-grab data-[dragging=true]:cursor-grabbing"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollPaddingInline: 4,
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
              filteredServices.map((service, index) => (
                <ServiceCarouselCard
                  key={service.slug}
                  service={service}
                  index={index}
                  isCurrent={currentSlideIndex === index}
                  onSelect={scrollToSlide}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Carousel Interactive Pagination Dots / Bar ──────────────── */}
        {slideCount > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 sm:mt-6">
            {Array.from({ length: slideCount }, (_, i) => {
              const isCurrent = currentSlideIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'w-8 bg-gradient-to-r from-[#C49A3C] to-[#9A7428] shadow-xs'
                      : 'w-2 bg-[#D8D0C5] hover:bg-[#C49A3C]/60'
                  }`}
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={lang === 'pt' ? `Ir para a posição ${i + 1}` : lang === 'en' ? `Go to position ${i + 1}` : `Aller à la position ${i + 1}`}
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
  );

  if (embedded) {
    return (
      <div id="services-carousel" className="relative select-none">
        {hubContent}
      </div>
    );
  }

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

      {hubContent}
    </section>
  );
});
