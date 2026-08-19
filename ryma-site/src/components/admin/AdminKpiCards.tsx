'use client';

import React from 'react';
import { Lang } from '@/lib/i18n';
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconChecklist,
  IconCurrencyEuro,
} from '@tabler/icons-react';

interface StatsProps {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  revenue: number;
}

interface AdminKpiCardsProps {
  stats: StatsProps;
  lang: Lang;
}

export function AdminKpiCards({ stats, lang }: AdminKpiCardsProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const items = [
    {
      label: txt('Total Rendez-vous', 'Total Appts', 'Total Consultas'),
      value: stats.total,
      badge: null,
      icon: IconCalendarEvent,
      iconBg: 'bg-[#F4F2EE] text-[#1A1412] border-[#E9E6DF]',
      valColor: 'text-[#1A1412]',
    },
    {
      label: txt('Confirmés', 'Confirmed', 'Confirmados'),
      value: stats.confirmed,
      badge: stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : null,
      icon: IconCheck,
      iconBg: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]',
      valColor: 'text-[#166534]',
    },
    {
      label: txt('En Attente', 'Pending', 'Pendentes'),
      value: stats.pending,
      badge: stats.pending > 0 ? txt('À valider', 'Review', 'Rever') : null,
      icon: IconClock,
      iconBg: 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]',
      valColor: 'text-[#854D0E]',
    },
    {
      label: txt('Terminés', 'Completed', 'Concluídos'),
      value: stats.completed,
      badge: null,
      icon: IconChecklist,
      iconBg: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
      valColor: 'text-[#1E40AF]',
    },
    {
      label: txt('Revenu Estimé', 'Est. Revenue', 'Receita Estimada'),
      value: `${stats.revenue} €`,
      badge: null,
      icon: IconCurrencyEuro,
      iconBg: 'bg-[#FAF6EE] text-[#C49A3C] border-[#E8D7B0]',
      valColor: 'text-[#C49A3C]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isRevenue = idx === 4;

        return (
          <div
            key={it.label}
            className={`p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E9E6DF] flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)] ${
              isRevenue ? 'col-span-2 sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-white to-[#FAF6EE]/50 border-[#E8D7B0]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border shrink-0 ${it.iconBg}`}
                >
                  <Icon size={15} strokeWidth={2} />
                </div>
                <span className="text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-[#77736B] truncate font-semibold">
                  {it.label}
                </span>
              </div>
              {it.badge && (
                <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-[#FAF6EE] text-[#9A7428] border border-[#E8D7B0] shrink-0">
                  {it.badge}
                </span>
              )}
            </div>

            <div className={`font-serif text-xl sm:text-2xl font-bold tracking-tight ${it.valColor}`}>
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}