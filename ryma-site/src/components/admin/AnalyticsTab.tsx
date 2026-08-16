'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getServiceName } from '@/types/admin';

interface AnalyticsData {
  dowLabels: string[];
  dowCounts: number[];
  topServices: [string, number][];
  peakHours: [string, number][];
  cancelRate: number;
  completionRate: number;
}

import { Lang } from '@/lib/i18n';

interface AnalyticsTabProps {
  lang: Lang;
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
  };
  analyticsData: AnalyticsData;
}

export function AnalyticsTab({ lang, stats, analyticsData }: AnalyticsTabProps) {
  return (
    <div className="space-y-6 font-sans">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: lang === 'pt' ? 'Taxa de confirmação' : lang === 'en' ? 'Confirmation rate' : 'Taux de confirmation', value: `${stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%`, color: 'text-[#6F8F72]', border: 'border-[#6F8F72]/30' },
          { label: lang === 'pt' ? 'Taxa de cancelamento' : lang === 'en' ? 'Cancellation rate' : 'Taux d\'annulation', value: `${analyticsData.cancelRate}%`, color: 'text-[#A9655F]', border: 'border-[#A9655F]/30' },
          { label: lang === 'pt' ? 'Taxa de conclusão' : lang === 'en' ? 'Completion rate' : 'Taux d\'achèvement', value: `${analyticsData.completionRate}%`, color: 'text-[#5B82A6]', border: 'border-[#5B82A6]/30' },
          { label: lang === 'pt' ? 'Receita estimada total' : lang === 'en' ? 'Total estimated revenue' : 'Revenu total estimé', value: `${stats.revenue} €`, color: 'text-[#C6A15B]', border: 'border-[#C6A15B]/30' },
        ].map(kpi => (
          <div key={kpi.label} className={`p-5 rounded-2xl bg-white border ${kpi.border} space-y-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]`}>
            <div className="text-[10px] font-mono uppercase text-[#77736B] font-semibold">{kpi.label}</div>
            <div className={`text-3xl font-bold font-mono ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Day of Week + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Day of Week Bar Chart */}
        <div className="p-6 rounded-3xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div>
            <div className="font-mono text-[10px] uppercase text-[#77736B] mb-1 font-semibold">{lang === 'pt' ? 'Dias mais ativos' : lang === 'en' ? 'Peak activity days' : 'Jours les plus actifs'}</div>
            <div className="font-serif text-lg font-bold text-[#202020]">{lang === 'pt' ? 'Distribuição por Dia da Semana' : lang === 'en' ? 'Day of Week Distribution' : 'Répartition par Jour de Semaine'}</div>
          </div>
          {(() => {
            const max = Math.max(...analyticsData.dowCounts, 1);
            return (
              <div className="space-y-2">
                {analyticsData.dowLabels.map((label, i) => {
                  const pct = Math.round((analyticsData.dowCounts[i] / max) * 100);
                  const isPeak = analyticsData.dowCounts[i] === Math.max(...analyticsData.dowCounts);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className="font-mono text-xs text-[#77736B] w-8 shrink-0 font-medium">{label}</div>
                      <div className="flex-1 bg-[#F4F2EE] rounded-full h-5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className={`h-full rounded-full ${isPeak ? 'bg-[#C6A15B]' : 'bg-[#C6A15B]/40'}`}
                        />
                      </div>
                      <div className={`font-mono text-xs font-bold w-5 text-right ${isPeak ? 'text-[#9B793A]' : 'text-[#77736B]'}`}>
                        {analyticsData.dowCounts[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Top Services Bar Chart */}
        <div className="p-6 rounded-3xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div>
            <div className="font-mono text-[10px] uppercase text-[#77736B] mb-1 font-semibold">{lang === 'pt' ? 'Procura por tratamento' : lang === 'en' ? 'Demand by treatment' : 'Demande par soin'}</div>
            <div className="font-serif text-lg font-bold text-[#202020]">{lang === 'pt' ? 'Tratamentos Mais Solicitados' : lang === 'en' ? 'Most Requested Treatments' : 'Soins les Plus Demandés'}</div>
          </div>
          {analyticsData.topServices.length === 0 ? (
            <div className="text-center text-[#77736B] text-sm py-8 font-mono">{lang === 'pt' ? 'Sem dados' : lang === 'en' ? 'No data' : 'Aucune donnée'}</div>
          ) : (() => {
            const max = Math.max(...analyticsData.topServices.map(s => s[1]), 1);
            return (
              <div className="space-y-2">
                {analyticsData.topServices.map(([slug, count], i) => {
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={slug} className="flex items-center gap-3">
                      <div className="font-mono text-[11px] text-[#77736B] w-28 shrink-0 truncate font-medium">{getServiceName(slug, lang)}</div>
                      <div className="flex-1 bg-[#F4F2EE] rounded-full h-5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#C6A15B] to-[#9B793A]"
                        />
                      </div>
                      <div className="font-mono text-xs font-bold w-5 text-right text-[#9B793A]">{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Charts Row 2: Peak Hours */}
      <div className="p-6 rounded-3xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div>
          <div className="font-mono text-[10px] uppercase text-[#77736B] mb-1 font-semibold">{lang === 'pt' ? 'Horários de maior afluência' : lang === 'en' ? 'Peak slots' : 'Créneaux les plus chargés'}</div>
          <div className="font-serif text-lg font-bold text-[#202020]">{lang === 'pt' ? 'Horários de Ponta' : lang === 'en' ? 'Peak Hours' : 'Heures de Pointe'}</div>
        </div>
        {analyticsData.peakHours.length === 0 ? (
          <div className="text-center text-[#77736B] text-sm py-4 font-mono">{lang === 'pt' ? 'Sem dados' : lang === 'en' ? 'No data' : 'Aucune donnée'}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {analyticsData.peakHours.map(([hour, count], i) => {
              const max = analyticsData.peakHours[0][1];
              const pct = Math.round((count / max) * 100);
              const isPeak = i === 0;
              return (
                <div key={hour} className={`p-3 rounded-2xl border text-center ${isPeak ? 'bg-[#FAF6EE] border-[#C6A15B]/50' : 'bg-[#FAFAF8] border-[#E9E6DF]'}`}>
                  <div className={`font-mono text-base font-bold ${isPeak ? 'text-[#9B793A]' : 'text-[#202020]'}`}>{hour}</div>
                  <div className="w-full bg-[#F4F2EE] rounded-full h-1.5 my-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isPeak ? 'bg-[#C6A15B]' : 'bg-[#C6A15B]/40'}`}
                    />
                  </div>
                  <div className="font-mono text-xs text-[#77736B]">{count} rdv</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { key: 'PENDING', label: lang === 'pt' ? 'Pendentes' : lang === 'en' ? 'Pending' : 'En attente', count: stats.pending, color: '#B08A45' },
          { key: 'CONFIRMED', label: lang === 'pt' ? 'Confirmados' : lang === 'en' ? 'Confirmed' : 'Confirmés', count: stats.confirmed, color: '#6F8F72' },
          { key: 'COMPLETED', label: lang === 'pt' ? 'Concluídos' : lang === 'en' ? 'Completed' : 'Terminés', count: stats.completed, color: '#5B82A6' },
          { key: 'CANCELLED', label: lang === 'pt' ? 'Cancelados' : lang === 'en' ? 'Cancelled' : 'Annulés', count: stats.cancelled, color: '#A9655F' },
          { key: 'NO_SHOW', label: lang === 'pt' ? 'Faltas' : lang === 'en' ? 'No-shows' : 'Non présentés', count: stats.noShow, color: '#77736B' },
        ] as const).map(s => (
          <div key={s.key} className="p-4 rounded-2xl bg-white border border-[#E9E6DF] space-y-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="font-mono text-[10px] uppercase font-semibold" style={{ color: s.color }}>{s.label}</div>
            <div className="font-mono text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="w-full bg-[#F4F2EE] rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: s.color }}
              />
            </div>
            <div className="font-mono text-[10px] text-[#77736B]">
              {stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}