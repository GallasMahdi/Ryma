'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, getLocalizedText } from '@/data/services';
import { playSoftClick } from '@/lib/sound';
import {
  IconPhone,
  IconMail,
  IconMapPin,
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconArrowUpRight,
  IconNavigation,
  IconTrain,
  IconCar,
  IconDisabled,
  IconExternalLink,
  IconSparkles,
} from '@tabler/icons-react';

const ADDRESS_QUERY = encodeURIComponent('Avenida da Liberdade 120, 1250-146 Lisboa, Portugal');
const GOOGLE_MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${ADDRESS_QUERY}`;
const APPLE_MAPS_URL = `https://maps.apple.com/?daddr=${ADDRESS_QUERY}`;
const MAP_EMBED_URL = `https://maps.google.com/maps?q=${ADDRESS_QUERY}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

export function Footer() {
  const pathname = usePathname();
  const { lang, t } = useLanguage();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const services = SERVICES.slice(0, 6);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative bg-[#140F0D] text-[#D4C8B4] overflow-hidden select-none">
      {/* Top Gold Shimmer Border Accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C49A3C]/70 to-transparent" />

      {/* Ambient Subtle Luxury Aura */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-10"
          style={{
            background: 'radial-gradient(ellipse at center, #C49A3C 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12 pt-14 sm:pt-16 pb-12 relative z-10">
        
        {/* ── Main 4-Column Navigation Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12 sm:mb-16">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" onClick={playSoftClick} className="group inline-block mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5E9C8] via-[#FAF3E0] to-[#E8C97A] flex items-center justify-center shadow-[0_2px_16px_rgba(196,154,60,0.35)] border border-[#C49A3C]/40">
                  <span className="font-bold text-lg text-[#8A6A24]">D</span>
                </div>
                <div>
                  <div className="font-serif text-lg sm:text-xl font-bold text-white group-hover:text-[#E8C97A] transition-colors">
                    {t.common.siteName}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-[#C49A3C] uppercase">
                    {t.common.subtitle}
                  </div>
                </div>
              </div>
            </Link>
            
            <p className="text-xs sm:text-sm text-[#9A9080] leading-relaxed mb-5 font-normal">
              {lang === 'pt'
                ? 'Clínica de excelência em fisioterapia, reeducação postural e tratamentos corporais avançados no centro nobre de Lisboa.'
                : lang === 'en'
                ? 'Premier clinic for physiotherapy, postural reeducation, and advanced body sculpting in the heart of Lisbon.'
                : 'Clinique de référence en kinésithérapie, rééducation posturale et soins minceur de pointe au cœur de Lisbonne.'}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {[
                { Icon: IconBrandInstagram, href: 'https://instagram.com/digitalclinica', label: 'Instagram' },
                { Icon: IconBrandFacebook,  href: 'https://facebook.com/digitalclinica', label: 'Facebook' },
                { Icon: IconBrandWhatsapp,  href: `https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playSoftClick}
                  aria-label={label}
                  className="p-2 sm:p-2.5 rounded-full border border-white/10 text-[#9A9080] hover:text-[#E8C97A] hover:border-[#C49A3C]/60 hover:bg-[#C49A3C]/10 transition-all duration-200"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'pt' ? 'Navegação' : lang === 'en' ? 'Navigation' : 'Navigation'}</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {[
                { href: '/',         label: t.nav.home },
                { href: '/a-propos', label: t.nav.about },
                { href: '/services', label: t.nav.services },
                { href: '/tarifs',   label: t.nav.pricing },
                { href: '/avis',     label: t.nav.reviews },
                { href: '/blog',     label: t.nav.blog },
                { href: '/contact',  label: t.nav.contact },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={playSoftClick}
                    className="text-[#9A9080] hover:text-white transition-colors inline-flex items-center gap-1.5 group py-0.5"
                  >
                    <span className="text-[#C49A3C]/40 group-hover:text-[#C49A3C] transition-colors">›</span>
                    <span className="group-hover:translate-x-1 transition-transform">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Treatments List */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'pt' ? 'Tratamentos' : lang === 'en' ? 'Treatments' : 'Nos Soins'}</span>
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    onClick={playSoftClick}
                    className="text-[#9A9080] hover:text-white transition-colors line-clamp-1 group inline-flex items-center gap-1.5 py-0.5"
                  >
                    <span className="text-[#C49A3C]/40 group-hover:text-[#C49A3C] transition-colors">›</span>
                    <span className="group-hover:translate-x-1 transition-transform truncate">
                      {getLocalizedText(service.name, lang)}
                    </span>
                  </Link>
                </li>
              ))}
              <li className="pt-1">
                <Link
                  href="/services"
                  onClick={playSoftClick}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#C49A3C] hover:text-[#E8C97A] transition-colors"
                >
                  <span>{lang === 'pt' ? 'Ver todos os 13 tratamentos' : lang === 'en' ? 'View all 13 treatments' : 'Voir les 13 soins'}</span>
                  <IconArrowUpRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'pt' ? 'Contacto & Horário' : lang === 'en' ? 'Contact & Hours' : 'Contact & Horaires'}</span>
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5 text-[#9A9080]">
                <IconMapPin size={16} className="text-[#C49A3C] mt-0.5 shrink-0" />
                <span className="leading-relaxed">Avenida da Liberdade 120, 1250-146 Lisboa</span>
              </li>
              <li>
                <a
                  href={`tel:${t.common.phone.replace(/[^0-9+]/g, '')}`}
                  onClick={playSoftClick}
                  className="flex items-center gap-2.5 text-[#9A9080] hover:text-white transition-colors py-0.5"
                >
                  <IconPhone size={16} className="text-[#C49A3C] shrink-0" />
                  <span>{t.common.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${t.common.email}`}
                  onClick={playSoftClick}
                  className="flex items-center gap-2.5 text-[#9A9080] hover:text-white transition-colors py-0.5 truncate"
                >
                  <IconMail size={16} className="text-[#C49A3C] shrink-0" />
                  <span className="truncate">{t.common.email}</span>
                </a>
              </li>
              <li className="pt-1 text-[#C49A3C] text-[11px] font-mono leading-relaxed bg-white/5 border border-[#C49A3C]/20 rounded-xl p-2.5">
                <span className="font-bold block text-white mb-0.5">{lang === 'pt' ? 'Horário Clínico:' : lang === 'en' ? 'Clinical Hours:' : 'Horaires :'}</span>
                <span>{t.common.hours}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Ultra-Luxury Integrated Location & Map Showcase ── */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#C49A3C]/30 bg-[#1A1412]/90 backdrop-blur-xl p-4 sm:p-6 lg:p-8 shadow-2xl mb-12 sm:mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            
            {/* Left Column: Prestigious Address & Access Guidance */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-5">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#C49A3C]/15 border border-[#C49A3C]/40 px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#E8C97A] mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
                  <span>{lang === 'pt' ? 'Localização & Acessos' : lang === 'en' ? 'Location & Access' : 'Accès & Localisation'}</span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1.5">
                  Avenida da Liberdade 120
                </h3>
                
                <p className="text-xs sm:text-sm text-[#A49C90] font-normal">
                  1250-146 Lisboa, Portugal • {lang === 'pt' ? 'Centro Histórico & Financeiro' : lang === 'en' ? 'Prime Boulevard Area' : 'Avenue de Prestige'}
                </p>
              </div>

              {/* Transit and Access Badges */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-[#D4C8B4] bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <div className="p-1 rounded-lg bg-[#C49A3C]/20 text-[#E8C97A] shrink-0">
                    <IconTrain size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-white">{lang === 'pt' ? 'Metro:' : lang === 'en' ? 'Metro:' : 'Métro :'}</span>{' '}
                    <span className="text-[#A49C90]">{lang === 'pt' ? 'Avenida (Linha Azul) — 2 min a pé' : lang === 'en' ? 'Avenida Station (Blue Line) — 2 min walk' : 'Avenida (Ligne Bleue) — 2 min'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#D4C8B4] bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <div className="p-1 rounded-lg bg-[#C49A3C]/20 text-[#E8C97A] shrink-0">
                    <IconCar size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-white">{lang === 'pt' ? 'Estacionamento:' : lang === 'en' ? 'Parking:' : 'Parking :'}</span>{' '}
                    <span className="text-[#A49C90]">{lang === 'pt' ? 'Parque Av. Liberdade c/ Valet disponível' : lang === 'en' ? 'Av. Liberdade Underground Parking' : 'Parc Av. da Liberdade'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#D4C8B4] bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <div className="p-1 rounded-lg bg-[#6F8F72]/20 text-[#A7E8BD] shrink-0">
                    <IconDisabled size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-white">{lang === 'pt' ? 'Acessibilidade:' : lang === 'en' ? 'Accessibility:' : 'Accessibilité :'}</span>{' '}
                    <span className="text-[#A49C90]">{lang === 'pt' ? 'Acesso total para mobilidade reduzida & elevador' : lang === 'en' ? 'Elevator & full mobility accessibility' : 'Ascenseur & accès mobilité réduite'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Google Maps / Apple Maps */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playSoftClick}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#140F0D] bg-[#C49A3C] hover:bg-[#E8C97A] shadow-[0_4px_16px_rgba(196,154,60,0.3)] transition-all duration-200 flex-1 sm:flex-initial"
                >
                  <IconNavigation size={14} />
                  <span>{lang === 'pt' ? 'Abrir no Google Maps' : lang === 'en' ? 'Directions in Google Maps' : 'Google Maps'}</span>
                </a>

                <a
                  href={APPLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playSoftClick}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all duration-200"
                >
                  <IconExternalLink size={13} />
                  <span>Apple Maps</span>
                </a>
              </div>
            </div>

            {/* Right Column: Custom Stylized Map Frame */}
            <div className="lg:col-span-7 relative h-56 sm:h-72 lg:h-80 w-full rounded-2xl overflow-hidden border border-[#C49A3C]/30 shadow-inner bg-[#1A1412]">
              
              {/* Skeleton loading overlay */}
              {!mapLoaded && !mapError && (
                <div className="absolute inset-0 bg-[#1A1412] flex flex-col items-center justify-center gap-2 text-xs text-[#8A8078] z-0">
                  <div className="w-8 h-8 rounded-full border-2 border-[#C49A3C]/30 border-t-[#C49A3C] animate-spin" />
                  <span className="font-mono text-[11px] text-[#A49C90]">{lang === 'pt' ? 'A carregar mapa interativo...' : lang === 'en' ? 'Loading interactive map...' : 'Chargement de la carte...'}</span>
                </div>
              )}

              {!mapError ? (
                <iframe
                  title="Digital Clínica - Avenida da Liberdade 120, Lisboa"
                  src={MAP_EMBED_URL}
                  width="100%"
                  height="100%"
                  loading="lazy"
                  onLoad={() => setMapLoaded(true)}
                  onError={() => setMapError(true)}
                  style={{
                    border: 0,
                    filter: 'grayscale(35%) contrast(1.15) invert(90%) hue-rotate(180deg)',
                  }}
                  className={`w-full h-full relative z-10 transition-opacity duration-500 ${mapLoaded ? 'opacity-100' : 'opacity-0'}`}
                  allowFullScreen={false}
                  referrerPolicy="no-referrer-when-downgrade"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              ) : (
                /* Fallback Graphic Card if iframe blocked */
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#1F1916] to-[#140F0D] hover:from-[#261F1B] transition-colors group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#C49A3C]/20 border border-[#C49A3C]/50 flex items-center justify-center text-[#E8C97A] mb-3 group-hover:scale-110 transition-transform">
                    <IconMapPin size={24} />
                  </div>
                  <div className="font-serif text-lg font-bold text-white mb-1">
                    Avenida da Liberdade 120
                  </div>
                  <div className="text-xs text-[#A49C90] mb-3">
                    1250-146 Lisboa, Portugal
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E8C97A] bg-[#C49A3C]/15 border border-[#C49A3C]/30 px-3.5 py-1.5 rounded-full">
                    <span>{lang === 'pt' ? 'Ver no Google Maps' : lang === 'en' ? 'View in Google Maps' : 'Voir sur Google Maps'}</span>
                    <IconExternalLink size={13} />
                  </span>
                </a>
              )}

              {/* Floating Pin Card Over Map */}
              {mapLoaded && !mapError && (
                <div className="absolute top-3 left-3 z-20 bg-[#140F0D]/90 backdrop-blur-md border border-[#C49A3C]/40 rounded-xl px-3 py-2 shadow-lg pointer-events-none hidden sm:flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#C49A3C] text-[#140F0D] flex items-center justify-center font-bold text-xs shadow-xs">
                    D
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white leading-none">Digital Clínica</div>
                    <div className="text-[10px] text-[#E8C97A] font-mono mt-0.5">Av. da Liberdade 120</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Legal Bar ── */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A7065]">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span>
              © {new Date().getFullYear()} {t.common.siteName}. {t.common.allRightsReserved}
            </span>
            {process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE && (
              <span className="text-[#9A9080] font-mono text-[11px] sm:before:content-['•'] sm:before:mx-2">
                {lang === 'pt' ? 'Cédula Profissional' : lang === 'en' ? 'License' : 'N° d\'Ordre'} : {process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs">
            <Link href="/mentions-legales" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Aviso Legal' : lang === 'en' ? 'Legal Notice' : 'Mentions légales'}
            </Link>
            <Link href="/confidentialite" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Privacidade' : lang === 'en' ? 'Privacy Policy' : 'Confidentialité'}
            </Link>
            <Link href="/conditions-utilisation" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Termos de Uso' : lang === 'en' ? 'Terms of Use' : 'Conditions d\'utilisation'}
            </Link>
            <a
              href="https://www.livroreclamacoes.pt/inicio/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={playSoftClick}
              className="hover:text-[#C49A3C] transition-colors flex items-center gap-1"
            >
              <span>{lang === 'pt' ? 'Livro de Reclamações' : lang === 'en' ? 'Complaints Book' : 'Livre de Réclamations'}</span>
              <IconArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
