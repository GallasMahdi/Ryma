'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, getLocalizedText } from '@/data/services';
import { Button } from '@/components/ui/Button';
import { LogoIcon } from '@/components/ui/Logo';
import { playSoftClick } from '@/lib/sound';
import {
  IconMenu2,
  IconX,
  IconChevronDown,
  IconSparkles,
  IconPhoneCall,
  IconCalendarEvent,
  IconStethoscope,
  IconFlame,
  IconArrowUpRight,
  IconClock,
  IconHome,
  IconUserCheck,
  IconTag,
  IconStar,
  IconChevronRight,
} from '@tabler/icons-react';

const kineServices = SERVICES.filter((s) => s.pole === 'kinesitherapie').slice(0, 4);
const minceurServices = SERVICES.filter((s) => s.pole === 'minceur').slice(0, 4);

export function Navbar() {
  const { lang, t, toggleLang, setLang } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 20;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setServicesDropdownOpen(false);
    setOptimisticTab(null);
    setNavigatingHref(null);
  }, [pathname]);

  // Clear optimistic tab if drawer is dismissed
  useEffect(() => {
    if (!mobileOpen) {
      setOptimisticTab(null);
      setNavigatingHref(null);
    }
  }, [mobileOpen]);

  // Close drawer on Escape key & manage scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setServicesDropdownOpen(false);
      }
    };
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/') return pathname === '/';
      return pathname?.startsWith(href) ?? false;
    },
    [pathname]
  );

  const isDrawerTabActive = useCallback(
    (href: string) => {
      if (optimisticTab !== null) {
        if (href === '/') return optimisticTab === '/';
        return optimisticTab.startsWith(href);
      }
      return isActive(href);
    },
    [optimisticTab, isActive]
  );

  const handleDrawerNav = useCallback(
    (e: React.MouseEvent, href: string) => {
      const isCurrent = isActive(href);
      if (isCurrent && (!optimisticTab || optimisticTab === href)) {
        e.preventDefault();
        playSoftClick();
        setMobileOpen(false);
        return;
      }

      e.preventDefault();
      playSoftClick();

      // 1. Instantly move the active gold selection pill to the newly tapped tab
      setOptimisticTab(href);
      setNavigatingHref(href);

      // 2. Trigger Next.js router transition
      router.push(href);

      // 3. Keep drawer visible for a buttery 170ms so the spring glides seamlessly into place
      setTimeout(() => {
        setMobileOpen(false);
      }, 170);
    },
    [isActive, optimisticTab, router]
  );

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/a-propos', label: t.nav.about },
    { href: '/tarifs', label: t.nav.pricing },
    { href: '/avis', label: t.nav.reviews },
  ];

  return (
    <>
      {/* ── Top Announcement Bar ─────────────────────────── */}
      <div className="bg-[#1A1412] text-[#F5E9C8] text-[11px] py-1.5 px-6 hidden lg:block tracking-wide font-sans border-b border-[#C49A3C]/20">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C49A3C] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C49A3C]" />
              </span>
              <span className="text-[#F5E9C8] font-semibold tracking-wider uppercase text-[10px]">
                {lang === 'pt' ? 'Clínica Aberta' : lang === 'en' ? 'Clinic Open' : 'Cabinet Ouvert'}
              </span>
              <span className="text-[#B8A88A]">— {t.common.location}</span>
            </span>

            <span className="flex items-center gap-1.5 text-[#B8A88A]">
              <IconClock size={13} className="text-[#C49A3C]" />
              {t.common.hours}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href={`tel:${t.common.phone}`}
              className="flex items-center gap-1.5 text-[#B8A88A] hover:text-[#E8C97A] transition-colors"
            >
              <IconPhoneCall size={13} className="text-[#C49A3C]" />
              <span className="font-mono text-xs">{t.common.phone}</span>
            </a>
            <span className="h-3 w-px bg-[#C49A3C]/30" />
            <span className="flex items-center gap-1.5 text-[#E8C97A] font-medium tracking-wide">
              <IconSparkles size={13} className="text-[#C49A3C]" />
              {lang === 'pt' ? 'Recibos p/ Seguros de Saúde' : lang === 'en' ? 'Health Insurance Receipts' : 'Reçus pour Mutuelles / Assurances'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Floating Luxury Navbar ─────────────────────────── */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 w-full"
      >
        <div
          className={`w-full transition-all duration-300 ${
            scrolled
              ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_30px_rgba(196,154,60,0.14),_0_2px_8px_rgba(0,0,0,0.04)] border-b border-[#C49A3C]/20 py-1'
              : 'bg-white/90 backdrop-blur-md border-b border-[#C49A3C]/15 py-2'
          }`}
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 md:h-16 gap-3">

              {/* ── Brand / Logo ── */}
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 whitespace-nowrap">
                <div className="relative group-hover:scale-105 transition-transform duration-300">
                  <LogoIcon size={48} className="drop-shadow-[0_2px_12px_rgba(196,154,60,0.35)]" />
                </div>

                <div className="flex flex-col justify-center leading-none">
                  <span className="font-serif text-base md:text-lg font-bold tracking-tight text-[#1A1412] group-hover:text-[#9A7428] transition-colors whitespace-nowrap">
                    {t.common.siteName}
                  </span>
                  <span className="font-sans text-[9px] font-semibold tracking-[0.16em] text-[#8A6A24] uppercase mt-0.5 whitespace-nowrap">
                    {t.common.subtitle}
                  </span>
                </div>
              </Link>

              {/* ── Desktop Navigation Links ── */}
              <nav className="hidden xl:flex items-center gap-1 2xl:gap-2 shrink-0">
                {navLinks.map(({ href, label }) =>
                  href === '/services' ? null : (
                    <Link
                      key={href}
                      href={href}
                      className={`px-2.5 py-1.5 text-[13px] 2xl:text-[14px] font-medium tracking-wide transition-all duration-200 rounded-full whitespace-nowrap ${
                        isActive(href)
                          ? 'text-[#9A7428] font-semibold bg-[#F5E9C8]/80'
                          : 'text-[#332D28] hover:text-[#9A7428] hover:bg-[#FAF6EE]'
                      }`}
                    >
                      {label}
                    </Link>
                  )
                )}

                {/* ── Services Dropdown ── */}
                <div
                  className="relative"
                  onMouseEnter={() => setServicesDropdownOpen(true)}
                  onMouseLeave={() => setServicesDropdownOpen(false)}
                >
                  <Link
                    href="/services"
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[13px] 2xl:text-[14px] font-medium tracking-wide rounded-full transition-all duration-200 whitespace-nowrap ${
                      isActive('/services')
                        ? 'text-[#9A7428] font-semibold bg-[#F5E9C8]/80'
                        : 'text-[#332D28] hover:text-[#9A7428] hover:bg-[#FAF6EE]'
                    }`}
                  >
                    <span>{t.nav.services}</span>
                    <IconChevronDown
                      size={14}
                      className={`transition-transform duration-300 ${
                        servicesDropdownOpen ? 'rotate-180 text-[#C49A3C]' : 'text-[#8A8078]'
                      }`}
                    />
                  </Link>

                  {/* Mega Dropdown Panel */}
                  <AnimatePresence>
                    {servicesDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[660px] z-50"
                      >
                        <div className="bg-white border border-[#C49A3C]/25 rounded-2xl shadow-[0_20px_60px_rgba(196,154,60,0.15),_0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
                          <div className="px-6 py-3.5 border-b border-[#C49A3C]/15 bg-[#FDFAF4] flex items-center justify-between">
                            <span className="text-[11px] font-semibold tracking-widest text-[#9A7428] uppercase">
                              {lang === 'pt' ? 'Os Nossos Polos de Cuidados' : lang === 'en' ? 'Our Treatment Centers' : 'Nos Pôles de Soins'}
                            </span>
                            <Link
                              href="/services"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#C49A3C] hover:text-[#9A7428] transition-colors"
                            >
                              {lang === 'pt' ? 'Ver catálogo completo' : lang === 'en' ? 'View all treatments' : 'Voir tout le catalogue'}
                              <IconArrowUpRight size={14} />
                            </Link>
                          </div>

                          <div className="grid grid-cols-2 divide-x divide-[#C49A3C]/15 p-3">
                            <div className="px-4 py-2">
                              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-[#C49A3C]/10">
                                <IconStethoscope size={16} className="text-[#9A7428]" />
                                <span className="text-xs font-bold uppercase tracking-wider text-[#9A7428]">
                                  {lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {kineServices.map((s) => (
                                  <Link
                                    key={s.slug}
                                    href={`/services/${s.slug}`}
                                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF6EE] transition-colors"
                                  >
                                    <div>
                                      <div className="text-[13px] font-semibold text-[#1A1412] group-hover:text-[#9A7428] transition-colors">
                                        {getLocalizedText(s.name, lang)}
                                      </div>
                                      <div className="text-[11px] text-[#6B6058] line-clamp-1">
                                        {getLocalizedText(s.shortDesc, lang)}
                                      </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#C49A3C] ml-2 shrink-0">
                                      {s.price} {t.common.currency}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>

                            <div className="px-4 py-2">
                              <div className="flex items-center gap-2 mb-3 pb-1 border-b border-[#C49A3C]/10">
                                <IconFlame size={16} className="text-[#C49A3C]" />
                                <span className="text-xs font-bold uppercase tracking-wider text-[#C49A3C]">
                                  {lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {minceurServices.map((s) => (
                                  <Link
                                    key={s.slug}
                                    href={`/services/${s.slug}`}
                                    className="group flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF6EE] transition-colors"
                                  >
                                    <div>
                                      <div className="text-[13px] font-semibold text-[#1A1412] group-hover:text-[#9A7428] transition-colors">
                                        {getLocalizedText(s.name, lang)}
                                      </div>
                                      <div className="text-[11px] text-[#6B6058] line-clamp-1">
                                        {getLocalizedText(s.shortDesc, lang)}
                                      </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#C49A3C] ml-2 shrink-0">
                                      {s.price} {t.common.currency}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              {/* ── Right Actions ── */}
              <div className="hidden xl:flex items-center gap-2.5 shrink-0">
                {/* Multi-Language Selector */}
                <div className="inline-flex items-center gap-0.5 p-1 bg-[#F4F0E8] rounded-full border border-[#C49A3C]/25 text-xs font-mono font-bold">
                  {(['pt', 'en', 'fr'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-2.5 py-0.5 rounded-full transition-all uppercase ${
                        lang === l
                          ? 'bg-[#C49A3C] text-white shadow-sm font-extrabold'
                          : 'text-[#8A8078] hover:text-[#C49A3C]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Booking Button */}
                <Button
                  href="/rendez-vous"
                  variant="primary"
                  size="sm"
                  className="shadow-[0_4px_16px_rgba(196,154,60,0.3)] text-xs font-semibold tracking-wide py-2 px-4 whitespace-nowrap"
                >
                  <IconCalendarEvent size={15} className="me-1.5" />
                  <span>{t.common.bookAppointment}</span>
                </Button>
              </div>

              {/* ── Mobile & Tablet Menu Controls ── */}
              <div className="flex xl:hidden items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleLang}
                  aria-label={lang === 'pt' ? 'Mudar idioma' : lang === 'en' ? 'Change language' : 'Changer de langue'}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-mono font-extrabold text-[#9A7428] bg-[#F5E9C8] border border-[#C49A3C]/30 px-3 py-1.5 rounded-full uppercase transition-transform active:scale-95 touch-manipulation"
                >
                  {lang}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-xl text-[#1A1412] hover:bg-[#F5E9C8] active:scale-95 transition-all touch-manipulation"
                  aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                >
                  {mobileOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile Drawer Menu (Ultra-Optimized 60/120 FPS) ─────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* GPU-Accelerated Crisp Backdrop (Zero Frame Drops) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'linear' }}
              className="fixed inset-0 z-40 bg-black/60 xl:hidden transform-gpu will-change-[opacity]"
              onClick={() => setMobileOpen(false)}
            />

            {/* Hardware-Accelerated Slide-in Luxury Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[88vw] max-w-[380px] bg-[#FAF5EC] shadow-[-12px_0_40px_rgba(26,20,18,0.25)] xl:hidden flex flex-col border-l border-[#C49A3C]/35 overflow-hidden font-sans transform-gpu will-change-transform contain-paint"
            >
              {/* ── Drawer Header ──────────────────────── */}
              <div className="relative flex items-center justify-between px-5 py-4 border-b border-[#C49A3C]/20 bg-[#FCF9F3] shrink-0">
                <Link
                  href="/"
                  className="flex items-center gap-3 group touch-manipulation"
                  onClick={() => setMobileOpen(false)}
                >
                  <div className="relative group-hover:scale-105 transition-transform duration-200 shrink-0">
                    <LogoIcon size={40} className="drop-shadow-[0_2px_8px_rgba(196,154,60,0.3)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-base font-bold text-[#1A1412] leading-tight">
                      {t.common.siteName}
                    </span>
                    <span className="text-[9px] font-semibold tracking-wider text-[#8A6A24] uppercase">
                      {t.common.subtitle}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-xl text-[#8A6A24] active:scale-90 bg-[#F5E9C8] hover:bg-[#EEDBB2] border border-[#C49A3C]/30 transition-transform flex items-center justify-center shadow-2xs touch-manipulation"
                  aria-label="Fermer le menu"
                >
                  <IconX size={20} />
                </button>
              </div>

              {/* ── Live Status & Language Quick Bar ───── */}
              <div className="px-5 py-2.5 bg-[#FAF5EC] border-b border-[#C49A3C]/20 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A6A24] bg-[#F5E9C8] px-2.5 py-1 rounded-full border border-[#C49A3C]/30 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C49A3C] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C49A3C]" />
                  </span>
                  <span>{lang === 'pt' ? 'Clínica Aberta' : lang === 'en' ? 'Clinic Open' : 'Cabinet Ouvert'}</span>
                </div>

                <div className="relative inline-flex items-center gap-1 bg-white p-0.5 rounded-full border border-[#C49A3C]/30 shadow-2xs">
                  {(['pt', 'en', 'fr'] as const).map((l) => {
                    const isSelected = lang === l;
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => {
                          playSoftClick();
                          setLang(l);
                        }}
                        className={`relative px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase transition-colors touch-manipulation z-10 ${
                          isSelected
                            ? 'text-[#1A1412] font-black'
                            : 'text-[#8A6A24] hover:text-[#1A1412]'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="activeDrawerLangPill"
                            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#E8C97A] shadow-xs -z-10"
                            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                          />
                        )}
                        <span>{l}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Navigation Tabs (Ultra-Fluid 60/120 FPS Gliding Pill) ── */}
              <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-2.5">
                {[
                  {
                    href: '/',
                    label: t.nav.home,
                    sublabel: lang === 'pt' ? 'Início & Apresentação' : lang === 'en' ? 'Welcome & Experience' : 'Accueil & Présentation',
                    icon: IconHome,
                  },
                  {
                    href: '/services',
                    label: t.nav.services,
                    sublabel: lang === 'pt' ? 'Fisioterapia & Emagrecimento' : lang === 'en' ? 'Physio & Slimming Care' : 'Kinésithérapie & Minceur',
                    icon: IconStethoscope,
                    badge: lang === 'pt' ? '2 Polos' : lang === 'en' ? '2 Centers' : '2 Pôles',
                  },
                  {
                    href: '/tarifs',
                    label: t.nav.pricing,
                    sublabel: lang === 'pt' ? 'Preços Claros & Seguros' : lang === 'en' ? 'Rates & Insurance Coverage' : 'Tarifs & Reçus Mutuelles',
                    icon: IconTag,
                  },
                  {
                    href: '/a-propos',
                    label: t.nav.about,
                    sublabel: lang === 'pt' ? 'Ryma Ben Romdhane • D.E' : lang === 'en' ? 'Ryma Ben Romdhane • Specialist' : 'Ryma Ben Romdhane • D.E',
                    icon: IconUserCheck,
                  },
                  {
                    href: '/avis',
                    label: t.nav.reviews,
                    sublabel: lang === 'pt' ? 'Experiências Reais' : lang === 'en' ? 'Verified Patient Reviews' : 'Témoignages & Avis Vérifiés',
                    icon: IconStar,
                    badge: '5.0 ★',
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = isDrawerTabActive(tab.href);
                  const isTargetNav = navigatingHref === tab.href;

                  return (
                    <div key={tab.href} className="relative">
                      {/* Fluid Animated Gold Selection Indicator (Spring Physics) */}
                      {active && (
                        <motion.div
                          layoutId="activeDrawerNavPill"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#F5E9C8] via-[#FAF3E0] to-[#EEDBB2] border border-[#C49A3C]/70 shadow-[0_4px_16px_rgba(196,154,60,0.18)] -z-10"
                          transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.8 }}
                        />
                      )}

                      <Link
                        href={tab.href}
                        prefetch={true}
                        onClick={(e) => handleDrawerNav(e, tab.href)}
                        className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] touch-manipulation select-none ${
                          active
                            ? 'border-transparent text-[#1A1412]'
                            : 'bg-white hover:bg-[#FAF5EC] border-[#C49A3C]/20 hover:border-[#C49A3C]/45 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Luxury Gold Icon Pill */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                              active
                                ? 'bg-gradient-to-br from-[#C49A3C] via-[#D4AF37] to-[#E8C97A] text-[#1A1412] shadow-[0_2px_8px_rgba(196,154,60,0.35)] border border-[#FFF8E7] scale-105'
                                : 'bg-[#F5E9C8] text-[#8A6A24] border border-[#C49A3C]/30 scale-100'
                            }`}
                          >
                            <Icon size={20} strokeWidth={active ? 2.3 : 1.8} />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm tracking-tight truncate transition-colors duration-150 ${active ? 'font-bold text-[#1A1412]' : 'font-semibold text-[#1A1412]'}`}>
                                {tab.label}
                              </span>
                              {tab.badge && (
                                <span className="bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#E8C97A] text-[#1A1412] font-black text-[10px] px-2 py-0.5 rounded-full border border-[#FFF8E7] shadow-xs">
                                  {tab.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#7A6B5D] truncate mt-0.5">
                              {tab.sublabel}
                            </span>
                          </div>
                        </div>

                        {/* Trailing Gold Arrow / Active Spinner Indicator */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                            active
                              ? 'bg-gradient-to-br from-[#C49A3C] to-[#E8C97A] text-[#1A1412] shadow-2xs translate-x-1'
                              : 'text-[#9A7428] group-hover:text-[#1A1412] translate-x-0'
                          }`}
                        >
                          {isTargetNav ? (
                            <span className="w-3.5 h-3.5 border-2 border-[#1A1412] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <IconChevronRight size={16} strokeWidth={active ? 2.5 : 2} />
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* ── Treatment Quick Jump Cards ──────────── */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#8A6A24] px-1 mb-2">
                    {lang === 'pt' ? 'Acesso Direto aos Cuidados' : lang === 'en' ? 'Direct Care Access' : 'Accès Direct aux Soins'}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/services#kinesitherapie"
                      prefetch={true}
                      onClick={(e) => handleDrawerNav(e, '/services#kinesitherapie')}
                      className="flex flex-col p-2.5 rounded-xl bg-gradient-to-br from-[#FAF5EC] via-[#FDF9F2] to-[#F5E9C8] border border-[#C49A3C]/35 active:scale-95 transition-transform touch-manipulation shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 text-[#1A1412] font-bold text-xs">
                        <div className="w-5 h-5 rounded-md bg-[#F5E9C8] flex items-center justify-center border border-[#C49A3C]/30 text-[#8A6A24]">
                          <IconStethoscope size={13} />
                        </div>
                        <span>{lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physio' : 'Kinésithérapie'}</span>
                      </div>
                      <span className="text-[10px] text-[#8A6A24] mt-1 line-clamp-1 font-medium">
                        {lang === 'pt' ? 'Reabilitação & Postura' : lang === 'en' ? 'Rehab & Posture' : 'Rééducation & Dos'}
                      </span>
                    </Link>

                    <Link
                      href="/services#minceur"
                      prefetch={true}
                      onClick={(e) => handleDrawerNav(e, '/services#minceur')}
                      className="flex flex-col p-2.5 rounded-xl bg-gradient-to-br from-[#FAF5EC] via-[#FDF9F2] to-[#F5E9C8] border border-[#C49A3C]/35 active:scale-95 transition-transform touch-manipulation shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 text-[#1A1412] font-bold text-xs">
                        <div className="w-5 h-5 rounded-md bg-[#F5E9C8] flex items-center justify-center border border-[#C49A3C]/30 text-[#8A6A24]">
                          <IconFlame size={13} />
                        </div>
                        <span>{lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur'}</span>
                      </div>
                      <span className="text-[10px] text-[#8A6A24] mt-1 line-clamp-1 font-medium">
                        {lang === 'pt' ? 'Drenagem & Silhouette' : lang === 'en' ? 'Drainage & Body' : 'Drainage & Remodelage'}
                      </span>
                    </Link>
                  </div>
                </div>
              </nav>

              {/* ── Drawer Footer / Quick Actions ──────── */}
              <div className="p-4 bg-[#FCF9F3] border-t border-[#C49A3C]/20 space-y-2.5 shrink-0">
                {/* Primary Booking CTA */}
                <Link
                  href="/rendez-vous"
                  prefetch={true}
                  onClick={(e) => handleDrawerNav(e, '/rendez-vous')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#AA771C] text-[#1A1412] font-bold text-sm shadow-[0_4px_16px_rgba(196,154,60,0.35)] border border-[#F5E9C8] active:scale-[0.98] transition-transform touch-manipulation"
                >
                  <IconCalendarEvent size={19} className="text-[#1A1412]" />
                  <span>{t.common.bookAppointment}</span>
                </Link>

                {/* Direct Call Button */}
                <a
                  href={`tel:${t.common.phone}`}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#FAF5EC] hover:bg-[#F5E9C8] text-[#8A6A24] hover:text-[#1A1412] border border-[#C49A3C]/25 text-xs font-semibold font-mono active:scale-[0.98] transition-all touch-manipulation"
                >
                  <IconPhoneCall size={14} className="text-[#C49A3C]" />
                  <span>{t.common.phone}</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
