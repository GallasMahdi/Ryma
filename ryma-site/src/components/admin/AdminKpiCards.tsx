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
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#77736B]">{lang === 'pt' ? 'Total' : lang === 'en' ? 'Total' : 'Total'}</div>
        <div className="text-2xl font-bold font-mono text-[#202020]">{stats.total}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#6F8F72]">{lang === 'pt' ? 'Confirmados' : lang === 'en' ? 'Confirmed' : 'Confirmés'}</div>
        <div className="text-2xl font-bold font-mono text-[#6F8F72]">{stats.confirmed}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#B08A45]">{lang === 'pt' ? 'Pendentes' : lang === 'en' ? 'Pending' : 'En attente'}</div>
        <div className="text-2xl font-bold font-mono text-[#B08A45]">{stats.pending}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#5B82A6]">{lang === 'pt' ? 'Concluídos' : lang === 'en' ? 'Completed' : 'Terminés'}</div>
        <div className="text-2xl font-bold font-mono text-[#5B82A6]">{stats.completed}</div>
      </div>

      <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C6A15B]/30 space-y-1 col-span-2 lg:col-span-1 shadow-[0_2px_8px_rgba(198,161,91,0.06)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#9B793A]">{lang === 'pt' ? 'Receita Estimada' : lang === 'en' ? 'Est. Revenue' : 'Revenu Estimé'}</div>
        <div className="text-2xl font-bold font-mono text-[#C6A15B]">{stats.revenue} TND</div>
      </div>
    </div>
  );
}