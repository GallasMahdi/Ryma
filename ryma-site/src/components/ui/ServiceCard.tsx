'use client';

import React from 'react';
import Link from 'next/link';
import { Service, getLocalizedText, getLocalizedList } from '@/data/services';
import { useLanguage } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
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
  IconCalendarEvent,
  IconCheck,
} from '@tabler/icons-react';

interface ServiceCardProps {
  service: Service;
  featured?: boolean;
}

function getServiceIcon(iconKey: string, size = 18) {
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

export function ServiceCard({ service, featured = false }: ServiceCardProps) {
  const { lang, t } = useLanguage();

  const isKine = service.pole === 'kinesitherapie';
  const indications = getLocalizedList(service.indications, lang).slice(0, 2);

  return (
    <div className="h-full flex flex-col justify-between rounded-3xl bg-white border border-[#E8E2D8] hover:border-[#C49A3C] p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_40px_rgba(196,154,60,0.14)] hover:-translate-y-1.5 transition-all duration-300 group select-none relative overflow-hidden">
      
      {/* Subtle top right gold ambient glow on hover */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#C49A3C]/10 rounded-full blur-xl group-hover:bg-[#C49A3C]/20 transition-all pointer-events-none" />

      <div>
        {/* Top Header: Pole Badge + Duration & Price Chip */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                isKine
                  ? 'bg-[#FAF5EA] text-[#8A6A24] border border-[#C49A3C]/30 group-hover:bg-[#C49A3C] group-hover:text-white'
                  : 'bg-[#FAF6F0] text-[#9A7428] border border-[#C49A3C]/30 group-hover:bg-[#9A7428] group-hover:text-white'
              }`}
            >
              {getServiceIcon(service.icon, 18)}
            </div>

            <span className="font-mono text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E8E2D8] text-[#7A7065]">
              {isKine
                ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
                : lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#8A8078] bg-[#FAF8F5] px-2.5 py-1 rounded-full border border-[#E8E2D8]">
              <IconClock size={12} className="text-[#C49A3C]" />
              <span>{service.duration}</span>
            </div>
            <span className="font-mono text-sm font-bold text-[#C49A3C]">
              {service.price} {t.common.currency}
            </span>
          </div>
        </div>

        {/* Treatment Title */}
        <Link
          href={`/services/${service.slug}`}
          onClick={playSoftClick}
          className="block group-hover:text-[#9A7428] transition-colors"
        >
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1412] mb-2 leading-snug group-hover:text-[#9A7428] transition-colors">
            {getLocalizedText(service.name, lang)}
          </h3>
        </Link>

        {/* Short Description */}
        <p className="text-xs sm:text-sm text-[#6B6058] leading-relaxed line-clamp-2 mb-4 font-normal">
          {getLocalizedText(service.shortDesc, lang)}
        </p>

        {/* Indication Micro-Bullet Points */}
        {indications.length > 0 && (
          <ul className="space-y-1.5 mb-6 text-xs text-[#554C42]">
            {indications.map((ind, idx) => (
              <li key={idx} className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <IconCheck size={13} className="text-[#9A7428] shrink-0" />
                <span className="truncate">{ind}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8] gap-2 mt-auto">
        <Link
          href={`/services/${service.slug}`}
          onClick={playSoftClick}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#7A7065] hover:text-[#C49A3C] transition-colors py-1 group/btn"
        >
          <span>{lang === 'pt' ? 'Ver Detalhes' : lang === 'en' ? 'Learn More' : 'En savoir plus'}</span>
          <IconArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/rendez-vous"
          onClick={playSoftClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF5EA] hover:bg-[#C49A3C] text-[#8A6A24] hover:text-[#1A1412] text-xs font-bold transition-all shadow-xs border border-[#C49A3C]/30 hover:border-[#C49A3C]"
        >
          <IconCalendarEvent size={13} />
          <span>{lang === 'pt' ? 'Agendar' : lang === 'en' ? 'Book' : 'Réserver'}</span>
        </Link>
      </div>
    </div>
  );
}
