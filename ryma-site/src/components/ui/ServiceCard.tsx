'use client';

import React from 'react';
import Link from 'next/link';
import { Service } from '@/data/services';
import { useLanguage } from '@/lib/i18n';
import { Badge } from './Badge';
import { IconArrowRight, IconClock, IconTag } from '@tabler/icons-react';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const { lang, t } = useLanguage();

  const poleBadges = {
    kinesitherapie: { label: { fr: 'Kinésithérapie', ar: 'علاج طبيعي' }, variant: 'teal' as const },
    minceur:        { label: { fr: 'Minceur',          ar: 'تنحيف'     }, variant: 'bronze' as const },
    bilan:          { label: { fr: 'Bilan',             ar: 'تقييم'    }, variant: 'rose' as const },
  };

  const pole = poleBadges[service.pole];

  return (
    <Link href={`/services/${service.slug}`} className="block h-full group">
      <div className="h-full flex flex-col justify-between bg-white/60 backdrop-blur-sm border border-transparent rounded-3xl p-6 md:p-7 transition-transform duration-500 will-change-transform hover:scale-[1.01] hover:shadow-[0_18px_44px_rgba(26,20,18,0.12)] hover:border-[#E8D9B2]">
        <div>
          {/* Top row: badge + duration */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant={pole.variant}>{pole.label[lang]}</Badge>
            <div className="flex items-center gap-1 text-xs text-[#8A8078] font-mono bg-[#F4F2EE] px-2.5 py-1 rounded-full">
              <IconClock size={12} />
              <span>{service.duration}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors mb-3 leading-snug">
            {service.name[lang]}
          </h3>

          {/* Description */}
          <p className="text-sm text-[#6B6058] leading-relaxed line-clamp-3 mb-6">
            {service.shortDesc[lang]}
          </p>
        </div>

        {/* Footer: price + CTA */}
        <div className="pt-4 border-t border-transparent flex items-center justify-between">
          <div className="font-mono text-lg font-bold text-[#C49A3C]">
            {service.price} {t.common.currency}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A7428] bg-gradient-to-r from-[#F7EBD0] to-[#F3E5BC] px-3 py-1.5 rounded-full group-hover:bg-[#C49A3C] group-hover:text-white transition-all duration-300">
            <span>{t.common.learnMore}</span>
            <IconArrowRight size={13} className="rtl-flip group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
