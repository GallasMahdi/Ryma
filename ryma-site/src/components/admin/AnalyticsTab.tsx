'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getServiceName } from '@/types/admin';
import { Lang } from '@/lib/i18n';
import {
  IconChartBar,
  IconClock,
  IconCalendarEvent,
  IconFileSpreadsheet,
  IconTrendingUp,
  IconStethoscope,
} from '@tabler/icons-react';

interface AnalyticsData {
  dowLabels: string[];
  dowCounts: number[];
  topServices: [string, number][];
  peakHours: [string, number][];
  cancelRate: number;
  completionRate: number;
}

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
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const confirmationRate = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Banner & CSV Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E9E6DF] shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1A1412]">
            {txt('Statistiques & Rapports d’Activité', 'Analytics & Activity Reports', 'Estatísticas & Relatórios')}
          </h3>
          <p className="text-xs text-[#77736B] font-mono mt-0.5">
            {txt('Performances du cabinet, fréquentation et analyses de rentabilité', 'Clinic performance, attendance and revenue trends', 'Desempenho da clínica e faturação')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/export?type=appointments"
            target="_blank"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#4A4540] hover:bg-[#FAF6EE] hover:border-[#E8D7B0] hover:text-[#9A7428] text-xs font-mono font-bold transition-all touch-target"
          >
            <IconFileSpreadsheet size={15} className="text-[#C49A3C]" />
            <span>{txt('Export RDV (CSV)', 'Export Appts (CSV)', 'Exportar Consultas')}</span>
          </a>

          <a
            href="/api/admin/export?type=patients"
            target="_blank"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#4A4540] hover:bg-[#FAF6EE] hover:border-[#E8D7B0] hover:text-[#9A7428] text-xs font-mono font-bold transition-all touch-target"
          >
            <IconFileSpreadsheet size={15} className="text-[#C49A3C]" />
            <span>{txt('Export Patients (CSV)', 'Export Patients (CSV)', 'Exportar Utentes')}</span>
          </a>
        </div>
      </div>

      {/* KPI Rate Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {[
          {
            label: txt('Taux de Confirmation', 'Confirmation Rate', 'Taxa de Confirmação'),
            value: `${confirmationRate}%`,
            color: 'text-[#166534]',
            bg: 'bg-[#F0FDF4] border-[#DCFCE7]',
          },
          {
            label: txt('Taux d’Annulation', 'Cancellation Rate', 'Taxa de Cancelamento'),
            value: `${analyticsData.cancelRate}%`,
            color: 'text-[#991B1B]',
            bg: 'bg-[#FEF2F2] border-[#FECACA]',
          },
          {
            label: txt('Taux d’Achèvement', 'Completion Rate', 'Taxa de Conclusão'),
            value: `${analyticsData.completionRate}%`,
            color: 'text-[#1E40AF]',
            bg: 'bg-[#EFF6FF] border-[#BFDBFE]',
          },
          {
            label: txt('Revenu Estimé Total', 'Total Est. Revenue', 'Receita Estimada Total'),
            value: `${stats.revenue} €`,
            color: 'text-[#C49A3C]',
            bg: 'bg-[#FAF6EE] border-[#E8D7B0]',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="p-4 rounded-2xl bg-white border border-[#E9E6DF] flex flex-col justify-between min-h-[95px] shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
          >
            <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#77736B]">
              {kpi.label}
            </div>
            <div className={`font-serif text-2xl font-bold tracking-tight ${kpi.color}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Day of Week + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of Week Distribution */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E9E6DF]">
            <IconCalendarEvent size={18} className="text-[#C49A3C]" />
            <div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-[#1A1412]">
                {txt('Répartition par Jour de Semaine', 'Day of Week Distribution', 'Distribuição por Dia da Semana')}
              </h4>
              <div className="text-[11px] font-mono text-[#77736B]">
                {txt('Jours de plus forte activité', 'Peak activity days', 'Dias mais ativos')}
              </div>
            </div>
          </div>

          {(() => {
            const max = Math.max(...analyticsData.dowCounts, 1);
            return (
              <div className="space-y-2.5 pt-1">
                {analyticsData.dowLabels.map((label, i) => {
                  const pct = Math.round((analyticsData.dowCounts[i] / max) * 100);
                  const isPeak = analyticsData.dowCounts[i] === Math.max(...analyticsData.dowCounts) && analyticsData.dowCounts[i] > 0;

                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className="text-xs font-mono font-bold text-[#77736B] w-9 shrink-0">
                        {label}
                      </div>
                      <div className="flex-1 bg-[#FAFAF8] border border-[#E9E6DF] rounded-full h-3.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isPeak
                              ? 'bg-gradient-to-r from-[#C49A3C] to-[#E8C97A]'
                              : 'bg-[#1A1412]'
                          }`}
                        />
                      </div>
                      <div
                        className={`text-xs font-mono font-bold w-6 text-right ${
                          isPeak ? 'text-[#C49A3C]' : 'text-[#1A1412]'
                        }`}
                      >
                        {analyticsData.dowCounts[i]}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Top Treatments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E9E6DF]">
            <IconStethoscope size={18} className="text-[#C49A3C]" />
            <div>
              <h4 className="font-serif font-bold text-sm sm:text-base text-[#1A1412]">
                {txt('Soins les Plus Demandés', 'Most Requested Treatments', 'Tratamentos Mais Solicitados')}
              </h4>
              <div className="text-[11px] font-mono text-[#77736B]">
                {txt('Demande par acte médical', 'Demand by clinical care', 'Procura por tratamento')}
              </div>
            </div>
          </div>

          {analyticsData.topServices.length === 0 ? (
            <div className="text-center text-[#77736B] font-mono text-xs py-8">
              {txt('Aucune donnée', 'No data', 'Sem dados')}
            </div>
          ) : (() => {
            const max = Math.max(...analyticsData.topServices.map(s => s[1]), 1);
            return (
              <div className="space-y-2.5 pt-1">
                {analyticsData.topServices.map(([slug, count], i) => {
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={slug} className="flex items-center gap-3">
                      <div className="text-xs font-medium text-[#1A1412] w-32 sm:w-36 shrink-0 truncate">
                        {getServiceName(slug, lang)}
                      </div>
                      <div className="flex-1 bg-[#FAFAF8] border border-[#E9E6DF] rounded-full h-3.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#1A1412] to-[#4A4540]"
                        />
                      </div>
                      <div className="text-xs font-mono font-bold text-[#1A1412] w-6 text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Charts Row 2: Peak Hours */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E6DF] space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E9E6DF]">
          <IconClock size={18} className="text-[#C49A3C]" />
          <div>
            <h4 className="font-serif font-bold text-sm sm:text-base text-[#1A1412]">
              {txt('Heures de Pointe', 'Peak Hours', 'Horários de Ponta')}
            </h4>
            <div className="text-[11px] font-mono text-[#77736B]">
              {txt('Fréquentation par tranche horaire', 'Attendance per time slot', 'Horários de maior afluência')}
            </div>
          </div>
        </div>

        {analyticsData.peakHours.length === 0 ? (
          <div className="text-center text-[#77736B] font-mono text-xs py-6">
            {txt('Aucune donnée', 'No data', 'Sem dados')}
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {analyticsData.peakHours.map(([hour, count], i) => {
              const max = analyticsData.peakHours[0][1];
              const pct = Math.round((count / max) * 100);
              const isPeak = i === 0;

              return (
                <div
                  key={hour}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isPeak
                      ? 'bg-[#FAF6EE] border-[#C49A3C] shadow-xs'
                      : 'bg-[#FAFAF8] border-[#E9E6DF]'
                  }`}
                >
                  <div className={`font-mono font-bold text-xs ${isPeak ? 'text-[#9A7428]' : 'text-[#1A1412]'}`}>
                    {hour}
                  </div>
                  <div className="w-full bg-white border border-[#E9E6DF] rounded-full h-1.5 my-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isPeak ? 'bg-[#C49A3C]' : 'bg-[#1A1412]'}`}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-[#77736B]">
                    {count} {txt('rdv', 'appts', 'cons.')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {[
          { key: 'PENDING', label: txt('En attente', 'Pending', 'Pendentes'), count: stats.pending, color: 'text-[#854D0E]', bg: 'bg-[#FEF9C3]', border: 'border-[#FEF08A]' },
          { key: 'CONFIRMED', label: txt('Confirmés', 'Confirmed', 'Confirmados'), count: stats.confirmed, color: 'text-[#166534]', bg: 'bg-[#DCFCE7]', border: 'border-[#BBF7D0]' },
          { key: 'COMPLETED', label: txt('Terminés', 'Completed', 'Concluídos'), count: stats.completed, color: 'text-[#1E40AF]', bg: 'bg-[#DBEAFE]', border: 'border-[#BFDBFE]' },
          { key: 'CANCELLED', label: txt('Annulés', 'Cancelled', 'Cancelados'), count: stats.cancelled, color: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]', border: 'border-[#FECACA]' },
          { key: 'NO_SHOW', label: txt('Non présentés', 'No-shows', 'Faltas'), count: stats.noShow, color: 'text-[#475569]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]' },
        ].map(s => (
          <div
            key={s.key}
            className="p-3.5 rounded-2xl bg-white border border-[#E9E6DF] space-y-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          >
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${s.color}`}>
              {s.label}
            </div>
            <div className={`font-serif text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-[10.5px] font-mono text-[#77736B]">
              {stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}% du total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}