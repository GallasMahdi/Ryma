'use client';
import { useServices } from '@/components/ServiceCatalogProvider';

import React from 'react';
import { SITE } from '@/lib/site';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { getLocalizedText } from '@/data/services';
import { LogoIcon } from '@/components/ui/Logo';
import { playSoftClick } from '@/lib/sound';
import {
  IconPhone,
  IconMail,
  IconMapPin,
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandFacebook,
  IconArrowUpRight,
} from '@tabler/icons-react';

export function Footer() {
  const SERVICES = useServices();
  const pathname = usePathname();
  const { lang, t } = useLanguage();
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
                <div className="relative group-hover:scale-105 transition-transform duration-300 shrink-0">
                  <LogoIcon size={48} variant="light" className="drop-shadow-[0_4px_16px_rgba(196,154,60,0.45)]" />
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
              {lang === 'es' ? "Clínica especializada en fisioterapia, reeducación postural y remodelado corporal avanzado en el corazón de Lisboa." : lang === 'pt'
                ? 'Clínica de excelência em fisioterapia, reeducação postural e tratamentos corporais avançados no centro nobre de Lisboa.'
                : lang === 'en'
                  ? 'Premier clinic for physiotherapy, postural reeducation, and advanced body sculpting in the heart of Lisbon.'
                  : 'Clinique de référence en kinésithérapie, rééducation posturale et soins minceur de pointe au cœur de Lisbonne.'}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {[
                { Icon: IconBrandInstagram, href: SITE.instagram, label: 'Instagram' },
                { Icon: IconBrandFacebook, href: SITE.facebook, label: 'Facebook' },
                { Icon: IconBrandWhatsapp, href: `https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
              ].filter(item => item.href).map(({ Icon, href, label }) => (
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
            <h3 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'es' ? "Navegación" : lang === 'pt' ? 'Navegação' : lang === 'en' ? 'Navigation' : 'Navigation'}</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              {[
                { href: '/', label: t.nav.home },
                { href: '/a-propos', label: t.nav.about },
                { href: '/services', label: t.nav.services },
                { href: '/tarifs', label: t.nav.pricing },
                { href: '/avis', label: t.nav.reviews },
                { href: '/blog', label: t.nav.blog },
                { href: '/contact', label: t.nav.contact },
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
            <h3 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'es' ? "Tratamientos" : lang === 'pt' ? 'Tratamentos' : lang === 'en' ? 'Treatments' : 'Nos Soins'}</span>
            </h3>
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
                  <span>{lang === 'es' ? `Ver catálogo completo (${SERVICES.length})` : lang === 'pt' ? `Ver catálogo completo (${SERVICES.length})` : lang === 'en' ? `View full catalogue (${SERVICES.length})` : `Voir le catalogue complet (${SERVICES.length})`}</span>
                  <IconArrowUpRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-4 sm:mb-5 font-bold flex items-center gap-1.5">
              <span className="w-2 h-px bg-[#C49A3C]" />
              <span>{lang === 'es' ? "Contacto y horarios" : lang === 'pt' ? 'Contacto & Horário' : lang === 'en' ? 'Contact & Hours' : 'Contact & Horaires'}</span>
            </h3>
            <ul className="space-y-3 text-xs sm:text-sm">
              {t.common.address && <li className="flex items-start gap-2.5 text-[#9A9080]">
                <IconMapPin size={16} className="text-[#C49A3C] mt-0.5 shrink-0" />
                <span className="leading-relaxed">{t.common.address}</span>
              </li>}
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
              {t.common.email && <li>
                <a
                  href={`mailto:${t.common.email}`}
                  onClick={playSoftClick}
                  className="flex items-center gap-2.5 text-[#9A9080] hover:text-white transition-colors py-0.5 truncate"
                >
                  <IconMail size={16} className="text-[#C49A3C] shrink-0" />
                  <span className="truncate">{t.common.email}</span>
                </a>
              </li>}
              <li className="pt-1 text-[#C49A3C] text-[11px] font-mono leading-relaxed bg-white/5 border border-[#C49A3C]/20 rounded-xl p-2.5">
                <span className="font-bold block text-white mb-0.5">{lang === 'es' ? "Horario de la clínica:" : lang === 'pt' ? 'Horário Clínico:' : lang === 'en' ? 'Clinical Hours:' : 'Horaires :'}</span>
                <span>{t.common.hours}</span>
              </li>
            </ul>
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
                {lang === 'es' ? "Colegiación" : lang === 'pt' ? 'Cédula Profissional' : lang === 'en' ? 'License' : 'N° d\'Ordre'} : {process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs">
            <Link href="/mentions-legales" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'es' ? "Aviso legal" : lang === 'pt' ? 'Aviso Legal' : lang === 'en' ? 'Legal Notice' : 'Mentions légales'}
            </Link>
            <Link href="/confidentialite" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'es' ? "Política de privacidad" : lang === 'pt' ? 'Privacidade' : lang === 'en' ? 'Privacy Policy' : 'Confidentialité'}
            </Link>
            <Link href="/conditions-utilisation" onClick={playSoftClick} className="hover:text-[#C49A3C] transition-colors">
              {lang === 'es' ? "Condiciones de uso" : lang === 'pt' ? 'Termos de Uso' : lang === 'en' ? 'Terms of Use' : 'Conditions d\'utilisation'}
            </Link>
            <a
              href="https://www.livroreclamacoes.pt/inicio/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={playSoftClick}
              className="hover:text-[#C49A3C] transition-colors flex items-center gap-1"
            >
              <span>{lang === 'es' ? "Libro de reclamaciones" : lang === 'pt' ? 'Livro de Reclamações' : lang === 'en' ? 'Complaints Book' : 'Livre de Réclamations'}</span>
              <IconArrowUpRight size={11} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
