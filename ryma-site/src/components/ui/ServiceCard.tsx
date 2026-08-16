'use client';

import React from 'react';
import Link from 'next/link';
import { Service } from '@/data/services';
import { useLanguage } from '@/lib/i18n';
import { Badge } from './Badge';
import {
  IconArrowRight,
  IconClock,
  IconStethoscope,
  IconFlame,
  IconBolt,
  IconDroplet,
  IconSparkles,
  IconActivity,
  IconRipple,
  IconShieldCheck,
  IconHeartbeat,
} from '@tabler/icons-react';

import { getLocalizedText } from '@/data/services';

interface ServiceCardProps {
  service: Service;
}

function getServiceIcon(iconKey: string, size = 20) {
  switch (iconKey) {
    case 'spine':
      return <IconActivity size={size} />;
    case 'pelvis':
      return <IconHeartbeat size={size} />;
    case 'hands':
      return <IconStethoscope size={size} />;
    case 'lymph':
      return <IconDroplet size={size} />;
    case 'electric':
      return <IconBolt size={size} />;
    case 'wave':
      return <IconRipple size={size} />;
    case 'bubble':
      return <IconSparkles size={size} />;
    case 'radio':
      return <IconFlame size={size} />;
    default:
      return <IconShieldCheck size={size} />;
  }
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { lang, t } = useLanguage();

  const poleBadges = {
    kinesitherapie: { label: { fr: 'Kinésithérapie', pt: 'Fisioterapia', en: 'Physiotherapy' }, variant: 'teal' as const },
    minceur:        { label: { fr: 'Minceur High-Tech', pt: 'Emagrecimento High-Tech', en: 'High-Tech Slimming' }, variant: 'bronze' as const },
    bilan:          { label: { fr: 'Bilan Expert', pt: 'Avaliação Especializada', en: 'Expert Assessment' }, variant: 'rose' as const },
  };

  const pole = poleBadges[service.pole];

  return (
    <Link href={`/services/${service.slug}`} className="block h-full group">
      <div className="relative h-full flex flex-col justify-between overflow-hidden rounded-[28px] border border-[#C49A3C]/25 bg-white/95 p-6 md:p-7 shadow-[0_12px_36px_rgba(196,154,60,0.07)] transition-all duration-400 ease-out hover:-translate-y-2 hover:border-[#C49A3C]/70 hover:shadow-[0_24px_55px_rgba(196,154,60,0.22)] active:scale-[0.99] cursor-pointer">
        
        {/* Top Gold Shimmer Border Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C49A3C] to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Background Subtle Gradient Glow on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FAF6EE]/50 via-transparent to-[#F8F4EA]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10">
          {/* Top Row: Icon Badge + Category Badge + Duration */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              {/* Luxury Gold Icon Aura Box */}
              <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gradient-to-br from-[#F5E9C8] via-[#FAF3E0] to-[#E8C97A]/40 text-[#9A7428] shadow-[0_4px_16px_rgba(196,154,60,0.18)] border border-[#C49A3C]/30 group-hover:scale-110 group-hover:bg-[#C49A3C] group-hover:text-white transition-all duration-300">
                {getServiceIcon(service.icon)}
              </div>
              <Badge variant={pole.variant} className="text-[11px] px-3 py-1 font-semibold">
                {getLocalizedText(pole.label, lang)}
              </Badge>
            </div>

            {/* Duration Tag */}
            <div className="flex items-center gap-1.5 text-xs text-[#8A8078] font-mono bg-[#F4F0E8]/90 px-3 py-1.5 rounded-full border border-[#C49A3C]/15 shadow-inner">
              <IconClock size={13} className="text-[#C49A3C]" />
              <span>{service.duration}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors mb-3 leading-snug">
            {getLocalizedText(service.name, lang)}
          </h3>

          {/* Description */}
          <p className="text-xs md:text-sm text-[#6B6058] leading-relaxed line-clamp-3 mb-6 font-normal">
            {getLocalizedText(service.shortDesc, lang)}
          </p>
        </div>


        {/* Footer: Price + Luxury Interactive Button Pill */}
        <div className="relative z-10 pt-4 border-t border-[#C49A3C]/15 flex items-center justify-between mt-auto">
          <div>
            <div className="text-[10px] uppercase font-mono text-[#8A8078] tracking-widest font-medium">
              {lang === 'pt' ? 'A partir de' : lang === 'en' ? 'Starting at' : 'À partir de'}
            </div>
            <div className="font-serif text-xl font-bold text-[#C49A3C]">
              {service.price} <span className="font-mono text-xs font-semibold text-[#8A8078]">{t.common.currency}</span>
            </div>
          </div>

          {/* High-End Action Pill Button */}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] px-4 py-2 rounded-full shadow-[0_4px_16px_rgba(196,154,60,0.25)] group-hover:shadow-[0_6px_22px_rgba(196,154,60,0.4)] group-hover:scale-105 transition-all duration-300">
            <span>{t.common.learnMore}</span>
            <IconArrowRight size={14} className="rtl-flip group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}

