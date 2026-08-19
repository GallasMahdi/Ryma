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
      iconBg: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]',
      valColor: 'text-[#0F172A]',
    },
    {
      label: txt('Confirmés', 'Confirmed', 'Confirmados'),
      value: stats.confirmed,
      badge: stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : null,
      icon: IconCheck,
      iconBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
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
      iconBg: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
      valColor: 'text-[#1E40AF]',
    },
    {
      label: txt('Revenu Estimé', 'Est. Revenue', 'Receita Estimada'),
      value: `${stats.revenue} €`,
      badge: null,
      icon: IconCurrencyEuro,
      iconBg: 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]',
      valColor: 'text-[#0F172A]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-sans">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isRevenue = idx === 4;

        return (
          <div
            key={it.label}
            className={`p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between shadow-xs transition-colors hover:border-[#CBD5E1] ${
              isRevenue ? 'col-span-2 sm:col-span-2 lg:col-span-1 bg-[#F8FAFC]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${it.iconBg}`}
                >
                  <Icon size={15} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] truncate">
                  {it.label}
                </span>
              </div>
              {it.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534] shrink-0">
                  {it.badge}
                </span>
              )}
            </div>

            <div className={`text-2xl font-bold tracking-tight ${it.valColor}`}>
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}