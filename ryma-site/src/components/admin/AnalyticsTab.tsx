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
    <div className="space-y-5 font-sans">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { label: lang === 'pt' ? 'Taxa de Confirmação' : lang === 'en' ? 'Confirmation Rate' : 'Taux de Confirmation', value: `${stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%`, color: 'text-[#166534]' },
          { label: lang === 'pt' ? 'Taxa de Cancelamento' : lang === 'en' ? 'Cancellation Rate' : 'Taux d\'Annulation', value: `${analyticsData.cancelRate}%`, color: 'text-[#991B1B]' },
          { label: lang === 'pt' ? 'Taxa de Conclusão' : lang === 'en' ? 'Completion Rate' : 'Taux d\'Achèvement', value: `${analyticsData.completionRate}%`, color: 'text-[#1E40AF]' },
          { label: lang === 'pt' ? 'Receita Estimada Total' : lang === 'en' ? 'Total Est. Revenue' : 'Revenu Total Estimé', value: `${stats.revenue} €`, color: 'text-[#0F172A]' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between min-h-[86px]">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">{kpi.label}</div>
            <div className={`text-2xl font-semibold tracking-tight ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Day of Week + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Day of Week Bar Chart */}
        <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-0.5 font-medium">{lang === 'pt' ? 'Dias mais ativos' : lang === 'en' ? 'Peak activity days' : 'Jours les plus actifs'}</div>
            <div className="text-base font-semibold text-[#0F172A]">{lang === 'pt' ? 'Distribuição por Dia da Semana' : lang === 'en' ? 'Day of Week Distribution' : 'Répartition par Jour de Semaine'}</div>
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
                      <div className="text-xs text-[#64748B] w-8 shrink-0 font-medium">{label}</div>
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className={`h-full rounded-full ${isPeak ? 'bg-[#0F172A]' : 'bg-[#94A3B8]'}`}
                        />
                      </div>
                      <div className={`text-xs font-semibold w-5 text-right ${isPeak ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
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
        <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-0.5 font-medium">{lang === 'pt' ? 'Procura por tratamento' : lang === 'en' ? 'Demand by treatment' : 'Demande par soin'}</div>
            <div className="text-base font-semibold text-[#0F172A]">{lang === 'pt' ? 'Tratamentos Mais Solicitados' : lang === 'en' ? 'Most Requested Treatments' : 'Soins les Plus Demandés'}</div>
          </div>
          {analyticsData.topServices.length === 0 ? (
            <div className="text-center text-[#94A3B8] text-xs py-8">{lang === 'pt' ? 'Sem dados' : lang === 'en' ? 'No data' : 'Aucune donnée'}</div>
          ) : (() => {
            const max = Math.max(...analyticsData.topServices.map(s => s[1]), 1);
            return (
              <div className="space-y-2">
                {analyticsData.topServices.map(([slug, count], i) => {
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={slug} className="flex items-center gap-3">
                      <div className="text-xs text-[#334155] w-28 shrink-0 truncate font-medium">{getServiceName(slug, lang)}</div>
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className="h-full rounded-full bg-[#0F172A]"
                        />
                      </div>
                      <div className="text-xs font-semibold w-5 text-right text-[#0F172A]">{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Charts Row 2: Peak Hours */}
      <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-3.5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] mb-0.5 font-medium">{lang === 'pt' ? 'Horários de maior afluência' : lang === 'en' ? 'Peak slots' : 'Créneaux les plus chargés'}</div>
          <div className="text-base font-semibold text-[#0F172A]">{lang === 'pt' ? 'Horários de Ponta' : lang === 'en' ? 'Peak Hours' : 'Heures de Pointe'}</div>
        </div>
        {analyticsData.peakHours.length === 0 ? (
          <div className="text-center text-[#94A3B8] text-xs py-4">{lang === 'pt' ? 'Sem dados' : lang === 'en' ? 'No data' : 'Aucune donnée'}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {analyticsData.peakHours.map(([hour, count], i) => {
              const max = analyticsData.peakHours[0][1];
              const pct = Math.round((count / max) * 100);
              const isPeak = i === 0;
              return (
                <div key={hour} className={`p-2.5 rounded-lg border text-center ${isPeak ? 'bg-[#F8FAFC] border-[#0F172A]' : 'bg-white border-[#E2E8F0]'}`}>
                  <div className={`text-sm font-semibold ${isPeak ? 'text-[#0F172A]' : 'text-[#334155]'}`}>{hour}</div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 my-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isPeak ? 'bg-[#0F172A]' : 'bg-[#94A3B8]'}`}
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">{count} cons.</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status distribution */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { key: 'PENDING', label: lang === 'pt' ? 'Pendentes' : lang === 'en' ? 'Pending' : 'En attente', count: stats.pending, color: 'text-[#854D0E]', bg: 'bg-[#FEF9C3]', border: 'border-[#FEF08A]' },
          { key: 'CONFIRMED', label: lang === 'pt' ? 'Confirmados' : lang === 'en' ? 'Confirmed' : 'Confirmés', count: stats.confirmed, color: 'text-[#166534]', bg: 'bg-[#DCFCE7]', border: 'border-[#BBF7D0]' },
          { key: 'COMPLETED', label: lang === 'pt' ? 'Concluídos' : lang === 'en' ? 'Completed' : 'Terminés', count: stats.completed, color: 'text-[#1E40AF]', bg: 'bg-[#DBEAFE]', border: 'border-[#BFDBFE]' },
          { key: 'CANCELLED', label: lang === 'pt' ? 'Cancelados' : lang === 'en' ? 'Cancelled' : 'Annulés', count: stats.cancelled, color: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]', border: 'border-[#FECACA]' },
          { key: 'NO_SHOW', label: lang === 'pt' ? 'Faltas' : lang === 'en' ? 'No-shows' : 'Não comparências', count: stats.noShow, color: 'text-[#475569]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]' },
        ] as const).map(s => (
          <div key={s.key} className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1.5">
            <div className={`text-[10px] font-medium uppercase tracking-wider ${s.color}`}>{s.label}</div>
            <div className={`text-xl font-semibold ${s.color}`}>{s.count}</div>
            <div className="text-[11px] text-[#64748B]">
              {stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}