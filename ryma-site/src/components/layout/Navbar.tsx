'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, getLocalizedText } from '@/data/services';
import { Button } from '@/components/ui/Button';
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
} from '@tabler/icons-react';

export function Navbar() {
  const { lang, t, toggleLang, setLang } = useLanguage();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setServicesDropdownOpen(false);
  }, [pathname]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const kineServices = SERVICES.filter((s) => s.pole === 'kinesitherapie').slice(0, 4);
  const minceurServices = SERVICES.filter((s) => s.pole === 'minceur').slice(0, 4);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

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
              <Link href="/" className="flex items-center gap-2.5 group shrink-0 whitespace-nowrap">
                <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-[#C49A3C] via-[#E8C97A] to-[#9A7428] p-[1.5px] shadow-[0_2px_10px_rgba(196,154,60,0.3)] group-hover:shadow-[0_4px_16px_rgba(196,154,60,0.45)] transition-all duration-300">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span className="font-serif text-base md:text-lg font-bold bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A] bg-clip-text text-transparent">
                      R
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center leading-none">
                  <span className="font-serif text-base md:text-lg font-bold tracking-tight text-[#1A1412] group-hover:text-[#9A7428] transition-colors whitespace-nowrap">
                    {t.common.siteName}
                  </span>
                  <span className="font-sans text-[9px] font-semibold tracking-[0.16em] text-[#C49A3C] uppercase mt-0.5 whitespace-nowrap">
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
                  onClick={toggleLang}
                  className="text-xs font-mono font-extrabold text-[#9A7428] bg-[#F5E9C8] border border-[#C49A3C]/30 px-2.5 py-1 rounded-full uppercase"
                >
                  {lang}
                </button>
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="p-1.5 rounded-xl text-[#1A1412] hover:bg-[#F5E9C8] transition-colors"
                  aria-label="Menu"
                >
                  {mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
                </button>
              </div>


            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile Drawer Menu ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 xl:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl xl:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#C49A3C]/15">
                <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C49A3C] to-[#E8C97A] flex items-center justify-center">
                    <span className="font-serif text-base font-bold text-[#1A1412]">R</span>
                  </div>
                  <span className="font-serif text-lg font-bold text-[#1A1412]">{t.common.siteName}</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-xl text-[#8A8078] hover:bg-[#F5E9C8] hover:text-[#9A7428] transition-colors"
                >
                  <IconX size={20} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-2">
                {[...navLinks, { href: '/services', label: t.nav.services }].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive(href)
                        ? 'bg-[#F5E9C8] text-[#9A7428] font-semibold'
                        : 'text-[#332D28] hover:bg-[#FAF6EE] hover:text-[#9A7428]'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="px-5 py-6 border-t border-[#C49A3C]/15 space-y-3">
                <Button href="/rendez-vous" variant="primary" className="w-full justify-center py-3.5 text-sm font-semibold">
                  <IconCalendarEvent size={18} className="me-2" />
                  {t.common.bookAppointment}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
