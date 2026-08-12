'use client';

import React from 'react';

interface StatsProps {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  revenue: number;
}

interface AdminKpiCardsProps {
  stats: StatsProps;
  lang: 'fr' | 'ar';
}

export function AdminKpiCards({ stats, lang }: AdminKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#77736B]">{lang === 'fr' ? 'Total' : 'المجموع'}</div>
        <div className="text-2xl font-bold font-mono text-[#202020]">{stats.total}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#6F8F72]">{lang === 'fr' ? 'Confirmés' : 'مؤكد'}</div>
        <div className="text-2xl font-bold font-mono text-[#6F8F72]">{stats.confirmed}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#B08A45]">{lang === 'fr' ? 'En attente' : 'انتظار'}</div>
        <div className="text-2xl font-bold font-mono text-[#B08A45]">{stats.pending}</div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#5B82A6]">{lang === 'fr' ? 'Terminés' : 'منتهي'}</div>
        <div className="text-2xl font-bold font-mono text-[#5B82A6]">{stats.completed}</div>
      </div>

      <div className="p-4 rounded-2xl bg-[#FAF6EE] border border-[#C6A15B]/30 space-y-1 col-span-2 lg:col-span-1 shadow-[0_2px_8px_rgba(198,161,91,0.06)]">
        <div className="font-mono text-[10px] uppercase font-semibold text-[#9B793A]">{lang === 'fr' ? 'Revenu Estimé' : 'العائد المقدر'}</div>
        <div className="text-2xl font-bold font-mono text-[#C6A15B]">{stats.revenue} TND</div>
      </div>
    </div>
  );
}