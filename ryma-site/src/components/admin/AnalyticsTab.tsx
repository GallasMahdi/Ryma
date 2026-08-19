'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { getServiceName } from '@/types/admin';
import { Lang } from '@/lib/i18n';
import {
  IconCalendarEvent,
  IconClock,
  IconFileSpreadsheet,
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
    <div className="space-y-4 font-sans">
      {/* Top Banner & CSV Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base sm:text-lg text-[#0F172A]">
            {txt('Statistiques & Rapports d’Activité', 'Analytics & Activity Reports', 'Estatísticas & Relatórios')}
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt('Performances du cabinet, fréquentation et analyses de rentabilité', 'Clinic performance, attendance and revenue trends', 'Desempenho da clínica e faturação')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/admin/export?type=appointments"
            target="_blank"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] text-xs font-medium transition-colors touch-target"
          >
            <IconFileSpreadsheet size={15} className="text-[#64748B]" />
            <span>{txt('Export RDV (CSV)', 'Export Appts (CSV)', 'Exportar Consultas')}</span>
          </a>

          <a
            href="/api/admin/export?type=patients"
            target="_blank"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] text-xs font-medium transition-colors touch-target"
          >
            <IconFileSpreadsheet size={15} className="text-[#64748B]" />
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
          },
          {
            label: txt('Taux d’Annulation', 'Cancellation Rate', 'Taxa de Cancelamento'),
            value: `${analyticsData.cancelRate}%`,
            color: 'text-[#991B1B]',
          },
          {
            label: txt('Taux d’Achèvement', 'Completion Rate', 'Taxa de Conclusão'),
            value: `${analyticsData.completionRate}%`,
            color: 'text-[#1E40AF]',
          },
          {
            label: txt('Revenu Estimé Total', 'Total Est. Revenue', 'Receita Estimada Total'),
            value: `${stats.revenue} €`,
            color: 'text-[#0F172A]',
          },
        ].map(kpi => (
          <div
            key={kpi.label}
            className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between min-h-[90px] shadow-xs"
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">
              {kpi.label}
            </div>
            <div className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Day of Week + Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of Week Distribution */}
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <IconCalendarEvent size={18} className="text-[#64748B]" />
            <div>
              <h4 className="font-semibold text-sm sm:text-base text-[#0F172A]">
                {txt('Répartition par Jour de Semaine', 'Day of Week Distribution', 'Distribuição por Dia da Semana')}
              </h4>
              <div className="text-xs text-[#64748B]">
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
                      <div className="text-xs font-semibold text-[#64748B] w-9 shrink-0">
                        {label}
                      </div>
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isPeak ? 'bg-[#0F172A]' : 'bg-[#64748B]'
                          }`}
                        />
                      </div>
                      <div
                        className={`text-xs font-bold w-6 text-right ${
                          isPeak ? 'text-[#0F172A]' : 'text-[#64748B]'
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
        <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <IconStethoscope size={18} className="text-[#64748B]" />
            <div>
              <h4 className="font-semibold text-sm sm:text-base text-[#0F172A]">
                {txt('Soins les Plus Demandés', 'Most Requested Treatments', 'Tratamentos Mais Solicitados')}
              </h4>
              <div className="text-xs text-[#64748B]">
                {txt('Demande par acte médical', 'Demand by clinical care', 'Procura por tratamento')}
              </div>
            </div>
          </div>

          {analyticsData.topServices.length === 0 ? (
            <div className="text-center text-[#64748B] text-xs py-8">
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
                      <div className="text-xs font-medium text-[#0F172A] w-32 sm:w-36 shrink-0 truncate">
                        {getServiceName(slug, lang)}
                      </div>
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-3 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                          className="h-full rounded-full bg-[#0F172A]"
                        />
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] w-6 text-right">
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
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <IconClock size={18} className="text-[#64748B]" />
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-[#0F172A]">
              {txt('Heures de Pointe', 'Peak Hours', 'Horários de Ponta')}
            </h4>
            <div className="text-xs text-[#64748B]">
              {txt('Fréquentation par tranche horaire', 'Attendance per time slot', 'Horários de maior afluência')}
            </div>
          </div>
        </div>

        {analyticsData.peakHours.length === 0 ? (
          <div className="text-center text-[#64748B] text-xs py-6">
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
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isPeak
                      ? 'bg-[#F8FAFC] border-[#0F172A] shadow-xs'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div className="font-bold text-xs text-[#0F172A]">
                    {hour}
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 my-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isPeak ? 'bg-[#0F172A]' : 'bg-[#64748B]'}`}
                    />
                  </div>
                  <div className="text-[11px] text-[#64748B]">
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
          { key: 'PENDING', label: txt('En attente', 'Pending', 'Pendentes'), count: stats.pending, color: 'text-[#854D0E]' },
          { key: 'CONFIRMED', label: txt('Confirmés', 'Confirmed', 'Confirmados'), count: stats.confirmed, color: 'text-[#166534]' },
          { key: 'COMPLETED', label: txt('Terminés', 'Completed', 'Concluídos'), count: stats.completed, color: 'text-[#1E40AF]' },
          { key: 'CANCELLED', label: txt('Annulés', 'Cancelled', 'Cancelados'), count: stats.cancelled, color: 'text-[#991B1B]' },
          { key: 'NO_SHOW', label: txt('Non présentés', 'No-shows', 'Faltas'), count: stats.noShow, color: 'text-[#475569]' },
        ].map(s => (
          <div
            key={s.key}
            className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-1 shadow-xs"
          >
            <div className={`text-[11px] font-medium uppercase tracking-wider ${s.color}`}>
              {s.label}
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            <div className="text-[11px] text-[#64748B]">
              {stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0}% du total
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}