'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, getLocalizedText } from '@/data/services';
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
  const pathname = usePathname();
  const { lang, t } = useLanguage();
  const services = SERVICES.slice(0, 6);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="relative bg-[#1A1412] text-[#D4C8B4]">
      {/* Gold top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#C49A3C]/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="group inline-block mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C49A3C] to-[#E8C97A] flex items-center justify-center shadow-[0_2px_12px_rgba(196,154,60,0.4)]">
                  <span className="font-serif text-base font-bold text-[#1A1412]">R</span>
                </div>
                <div>
                  <div className="font-serif text-lg font-bold text-white group-hover:text-[#E8C97A] transition-colors">
                    {t.common.siteName}
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.18em] text-[#C49A3C] uppercase">
                    {t.common.subtitle}
                  </div>
                </div>
              </div>
            </Link>
            <p className="text-sm text-[#8A8070] leading-relaxed mb-6">
              {lang === 'pt'
                ? 'Clínica de fisioterapia e tratamentos corporais estéticos avançados. Uma abordagem médica global para a sua saúde e bem-estar.'
                : lang === 'en'
                ? 'Physiotherapy and slimming care practice. A comprehensive medical approach for your health and well-being.'
                : 'Cabinet de kinésithérapie et de soins minceur. Une approche globale pour votre santé et votre bien-être.'}
            </p>

            {/* Social */}
            <div className="flex items-center gap-2.5">
              {[
                { Icon: IconBrandInstagram, href: '#', label: 'Instagram' },
                { Icon: IconBrandFacebook,  href: '#', label: 'Facebook' },
                { Icon: IconBrandWhatsapp,  href: `https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2 rounded-full border border-white/10 text-[#8A8070] hover:text-[#E8C97A] hover:border-[#C49A3C]/50 hover:bg-[#C49A3C]/10 transition-all duration-200"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-5 font-semibold">
              {lang === 'pt' ? 'Navegação' : lang === 'en' ? 'Navigation' : 'Navigation'}
            </h4>
            <ul className="space-y-2.5">
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
                    className="text-sm text-[#8A8070] hover:text-white transition-colors inline-flex items-center gap-1 group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-5 font-semibold">
              {lang === 'pt' ? 'Tratamentos' : lang === 'en' ? 'Treatments' : 'Nos Soins'}
            </h4>
            <ul className="space-y-2.5">
              {services.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-sm text-[#8A8078] hover:text-white transition-colors line-clamp-1 group inline-flex items-center gap-1"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">{getLocalizedText(service.name, lang)}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C49A3C] hover:text-[#E8C97A] transition-colors mt-1"
                >
                  {lang === 'pt' ? 'Ver todos' : lang === 'en' ? 'View all' : 'Voir tout'}
                  <IconArrowUpRight size={12} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-mono text-[10px] tracking-widest text-[#C49A3C] uppercase mb-5 font-semibold">
              {lang === 'pt' ? 'Contacto e Horário' : lang === 'en' ? 'Contact & Hours' : 'Contact & Horaires'}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-[#8A8070]">
                <IconMapPin size={15} className="text-[#C49A3C] mt-0.5 shrink-0" />
                <span className="leading-relaxed">{t.common.address}</span>
              </li>
              <li>
                <a
                  href={`tel:${t.common.phone}`}
                  className="flex items-center gap-3 text-sm text-[#8A8070] hover:text-white transition-colors"
                >
                  <IconPhone size={15} className="text-[#C49A3C] shrink-0" />
                  {t.common.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${t.common.email}`}
                  className="flex items-center gap-3 text-sm text-[#8A8070] hover:text-white transition-colors"
                >
                  <IconMail size={15} className="text-[#C49A3C] shrink-0" />
                  {t.common.email}
                </a>
              </li>
              <li className="text-sm text-[#8A8070] ps-7 leading-relaxed">
                {t.common.hours}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6A6055]">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span>
              © {new Date().getFullYear()} {t.common.siteName}. {t.common.allRightsReserved}
            </span>
            {process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE && (
              <span className="text-[#8A8070] font-mono text-[11px] sm:before:content-['•'] sm:before:mx-2">
                {lang === 'pt' ? 'Cédula Profissional' : lang === 'en' ? 'License' : 'N° d\'Ordre'} : {process.env.NEXT_PUBLIC_PROFESSIONAL_LICENSE}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/mentions-legales" className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Aviso Legal' : lang === 'en' ? 'Legal Notice' : 'Mentions légales'}
            </Link>
            <Link href="/confidentialite" className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Privacidade' : lang === 'en' ? 'Privacy Policy' : 'Confidentialité'}
            </Link>
            <Link href="/conditions-utilisation" className="hover:text-[#C49A3C] transition-colors">
              {lang === 'pt' ? 'Termos de Uso' : lang === 'en' ? 'Terms of Use' : 'Conditions d\'utilisation'}
            </Link>
            <a
              href="https://www.livroreclamacoes.pt/inicio/"
              target="_blank"
              rel="noopener noreferrer"
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
