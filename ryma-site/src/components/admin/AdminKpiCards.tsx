'use client';

import React from 'react';

import { Lang } from '@/lib/i18n';

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
  const items = [
    {
      label: lang === 'pt' ? 'Total Consultas' : lang === 'en' ? 'Total Appts' : 'Total Rendez-vous',
      value: stats.total,
      badge: null,
      valColor: 'text-[#1E293B]',
    },
    {
      label: lang === 'pt' ? 'Confirmados' : lang === 'en' ? 'Confirmed' : 'Confirmés',
      value: stats.confirmed,
      badge: stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : null,
      valColor: 'text-[#166534]',
    },
    {
      label: lang === 'pt' ? 'Pendentes' : lang === 'en' ? 'Pending' : 'En attente',
      value: stats.pending,
      badge: null,
      valColor: 'text-[#854D0E]',
    },
    {
      label: lang === 'pt' ? 'Concluídos' : lang === 'en' ? 'Completed' : 'Terminés',
      value: stats.completed,
      badge: null,
      valColor: 'text-[#1E40AF]',
    },
    {
      label: lang === 'pt' ? 'Receita Estimada' : lang === 'en' ? 'Est. Revenue' : 'Revenu Estimé',
      value: `${stats.revenue} €`,
      badge: null,
      valColor: 'text-[#0F172A]',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      {items.map((it, idx) => (
        <div
          key={it.label}
          className={`p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between min-h-[86px] ${
            idx === 4 ? 'col-span-2 lg:col-span-1 bg-[#F8FAFC]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
              {it.label}
            </span>
            {it.badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534]">
                {it.badge}
              </span>
            )}
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${it.valColor}`}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}