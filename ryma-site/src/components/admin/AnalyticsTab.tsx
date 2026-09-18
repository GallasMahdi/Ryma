'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import {
  IconCalendarEvent,
  IconClock,
  IconFileSpreadsheet,
  IconShieldCheck,
  IconLock,
  IconKey,
  IconLoader2,
  IconRefresh,
  IconPrinter,
  IconFilter,
  IconTrendingUp,
  IconTrendingDown,
  IconCurrencyEuro,
  IconBuildingHospital,
  IconUsers,
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import {
  TimelineSplineChart,
  DepartmentDonutChart,
  OccupancyHeatmap,
  AttendanceFunnel,
  PaymentDistributionVisualizer,
} from './AnalyticsInteractiveCharts';

interface AnalyticsTabProps {
  lang: Lang;
  stats?: {
    total: number;
    confirmed: number;
    pending: number;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
    invoicesCount?: number;
    paidInvoicesRevenue?: number;
    avgTicket?: number;
    occupancyRate?: number;
    lostRevenue?: number;
    uniquePatients?: number;
  };
  analyticsData?: {
    dowLabels: string[];
    dowCounts: number[];
    topServices: [string, number][];
    peakHours: [string, number][];
    cancelRate: number;
    completionRate: number;
  };
  initialData?: any;
  expiresAt?: number | null;
  refreshTrigger?: number;
  onLock?: () => void;
  onOpenChangePassword?: () => void;
}

export const AnalyticsTab = React.memo(function AnalyticsTab({
  lang,
  stats: initialStats,
  analyticsData: initialAnalyticsData,
  initialData,
  expiresAt,
  refreshTrigger = 0,
  onLock,
  onOpenChangePassword,
}: AnalyticsTabProps) {
  const txt = useCallback(
    (fr: string, en: string, pt: string) =>
      lang === 'fr' ? fr : lang === 'en' ? en : pt,
    [lang]
  );

  // Countdown timer for 15-minute step-up expiration
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setTimeLeft(`${mins}:${String(secs).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Filter States
  const [selectedRange, setSelectedRange] = useState<string>('30d');
  const [selectedPole, setSelectedPole] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Live Data & Loading State
  const [analyticsPayload, setAnalyticsPayload] = useState<any>(initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [isPendingTransition, startTransition] = useTransition();

  // Fast In-Memory Client Cache to ensure 0ms instantaneous navigation between filters
  const cacheRef = React.useRef<Record<string, any>>({});

  // Seed cache with initialData on mount
  useEffect(() => {
    if (initialData && !cacheRef.current['30d_all__']) {
      cacheRef.current['30d_all__'] = initialData;
    }
  }, [initialData]);

  // Fetch Filtered Analytics from API
  const requestVersion = React.useRef(0);
  const fetchFilteredData = useCallback(
    async (
      rangeParam = selectedRange,
      poleParam = selectedPole,
      startParam = customStart,
      endParam = customEnd,
      isSilent = false
    ) => {
      const requestId = ++requestVersion.current;
      const cacheKey = `${lang}_${rangeParam}_${poleParam}_${startParam}_${endParam}`;

      // ⚡ INSTANT CACHE HIT: 0ms UI switch
      if (cacheRef.current[cacheKey] && !isSilent) {
        startTransition(() => {
          setAnalyticsPayload(cacheRef.current[cacheKey]);
          setIsLoading(false);
        });
        isSilent = true; // non-blocking background revalidation
      }

      if (!isSilent) setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          lang,
          range: rangeParam,
          pole: poleParam,
        });
        if (rangeParam === 'custom' && startParam && endParam) {
          queryParams.set('startDate', startParam);
          queryParams.set('endDate', endParam);
        }

        const res = await fetch(`/api/admin/analytics?${queryParams.toString()}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (requestId !== requestVersion.current) return;
        if (res.status === 401 || res.status === 403) {
          cacheRef.current = {};
          setAnalyticsPayload(null);
          onLock?.();
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (requestId !== requestVersion.current) return;
          cacheRef.current[cacheKey] = json;
          startTransition(() => {
            setAnalyticsPayload(json);
            setLastSyncedAt(new Date());
          });
        }
      } catch (err) {
        console.error('[AnalyticsTab Fetch Error]:', err);
      } finally {
        if (requestId === requestVersion.current) setIsLoading(false);
      }
    },
    [lang, selectedRange, selectedPole, customStart, customEnd]
  );

  // Trigger fetch whenever filters change
  const handleRangeChange = (newRange: string) => {
    setSelectedRange(newRange);
    if (newRange === 'custom') {
      setIsCustomModalOpen(true);
    } else {
      fetchFilteredData(newRange, selectedPole);
    }
  };

  const handlePoleChange = (newPole: string) => {
    setSelectedPole(newPole);
    fetchFilteredData(selectedRange, newPole);
  };

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      setIsCustomModalOpen(false);
      fetchFilteredData('custom', selectedPole, customStart, customEnd);
    }
  };

  const handleManualRefresh = () => {
    cacheRef.current = {}; // bust client cache for guaranteed live accuracy
    fetchFilteredData(selectedRange, selectedPole, customStart, customEnd, false);
  };

  // Real-Time auto-refresh when SSE trigger increments or periodic 60s pulse
  useEffect(() => {
    if (refreshTrigger > 0) {
      cacheRef.current = {}; // bust client cache on real-time event arrival
      fetchFilteredData(selectedRange, selectedPole, customStart, customEnd, true);
    }
  }, [refreshTrigger, fetchFilteredData, selectedRange, selectedPole, customStart, customEnd]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchFilteredData(selectedRange, selectedPole, customStart, customEnd, true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchFilteredData, selectedRange, selectedPole, customStart, customEnd]);

  // Merge payload with initial fallback
  const currentStats = analyticsPayload?.stats || initialStats || {
    total: 0,
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    revenue: 0,
    invoicesCount: 0,
    paidInvoicesRevenue: 0,
    avgTicket: 0,
    occupancyRate: 0,
    lostRevenue: 0,
    uniquePatients: 0,
  };

  const comparison = analyticsPayload?.comparison || {
    revenueGrowthPct: 0,
    appointmentsGrowthPct: 0,
    priorRevenue: 0,
    priorAppointments: 0,
  };

  const timeline = analyticsPayload?.timeline || {
    granularity: 'day',
    points: [],
  };

  const departmentData = analyticsPayload?.departmentData || {
    poles: [],
    topServices: [],
  };

  const heatmap = analyticsPayload?.heatmap || {
    dowLabels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    hours: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
    matrix: [],
    maxCount: 0,
    peakSlot: { dow: 'Lun', hour: '10:00', count: 0 },
  };

  const funnel = analyticsPayload?.funnel || {
    stages: [],
    cancellationsCount: currentStats.cancelled || 0,
    noShowsCount: currentStats.noShow || 0,
    lostRevenue: currentStats.lostRevenue || 0,
    retentionRate: 0,
  };

  const payments = analyticsPayload?.payments || {
    byMethod: [],
    byCoverage: [],
    unpaidCount: 0,
    unpaidAmount: 0,
  };

  const activeRange = analyticsPayload?.range || {
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  };

  const attendanceRate =
    currentStats.total > 0
      ? Math.round((currentStats.completed / currentStats.total) * 100)
      : 0;

  return (
    <div className="space-y-4 font-sans print:space-y-6">
      {/* ── 1. OWNER SECURITY STATUS & REAL-TIME BAR ────────────────────── */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white p-3.5 sm:p-4 rounded-2xl border border-[#334155] shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/30 border border-[#A78BFA]/40 text-[#C4B5FD] flex items-center justify-center shrink-0 shadow-inner">
            <IconShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold tracking-tight text-white">
                {txt('Session Propriétaire Active', 'Owner Session Active', 'Sessão do Proprietário Ativa')}
              </span>
              {timeLeft && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ⏱ {timeLeft}
                </span>
              )}
              {/* Live Real-Time Pulse Indicator */}
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{txt('En Direct', 'Live Stream', 'Em Direto')}</span>
              </div>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              {txt(
                'Données consolidées en temps réel · Synchronisation automatique des encaissements et réservations.',
                'Real-time consolidated intelligence · Automatic synchronization of appointments and cashflow.',
                'Inteligência consolidada em tempo real · Sincronização de pagamentos e consultas.'
              )}
            </p>
          </div>
        </div>

        {/* Top Actions: Change Password + Lock */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <IconKey size={14} className="text-[#C4B5FD]" />
              <span>{txt('Mot de passe', 'Password', 'Palavra-passe')}</span>
            </button>
          )}

          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <IconLock size={14} />
              <span>{txt('Verrouiller', 'Lock Analytics', 'Bloquear')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. EXECUTIVE FILTER & COMMAND BAR ───────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        {/* Title, Sync Timestamp & Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-[#0F172A] flex items-center gap-2">
              <IconBuildingHospital size={20} className="text-[#C49A3C]" />
              <span>{txt('Tableau de Bord Exécutif & Analyses d’Activité', 'Executive Analytics & Clinic Intelligence', 'Painel Executivo & Relatórios')}</span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
              <span>{txt('Dernière synchronisation :', 'Last synchronized:', 'Última sincronização:')} {lastSyncedAt.toLocaleTimeString('pt-PT')}</span>
              {isLoading && (
                <span className="flex items-center gap-1 text-[#C49A3C] font-semibold animate-pulse">
                  <IconLoader2 size={13} className="animate-spin" />
                  <span>{txt('Mise à jour en direct...', 'Updating live...', 'A atualizar...')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Refresh, CSV Exports & Print */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isLoading}
              title={txt('Rafraîchir les données', 'Refresh metrics', 'Atualizar dados')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] text-xs font-semibold transition-colors cursor-pointer"
            >
              <IconRefresh size={14} className={isLoading ? 'animate-spin text-[#C49A3C]' : 'text-[#64748B]'} />
              <span>{txt('Rafraîchir', 'Refresh', 'Atualizar')}</span>
            </button>

            {/* Filtered Appointments Export */}
            <a
              href={`/api/admin/export?type=appointments&startDate=${activeRange.startDate}&endDate=${activeRange.endDate}`}
              target="_blank"
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] text-xs font-semibold transition-colors"
            >
              <IconFileSpreadsheet size={14} className="text-[#10B981]" />
              <span>{txt('Export RDV (CSV)', 'Export Appts', 'Exportar Consultas')}</span>
            </a>

            {/* Filtered Invoices Export */}
            <a
              href={`/api/admin/export?type=invoices&startDate=${activeRange.startDate}&endDate=${activeRange.endDate}`}
              target="_blank"
              download
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A] text-xs font-semibold transition-colors"
            >
              <IconFileSpreadsheet size={14} className="text-[#0284C7]" />
              <span>{txt('Export Factures', 'Export Invoices', 'Exportar Faturas')}</span>
            </a>

            {/* Print Summary */}
            <button
              type="button"
              onClick={() => window.print()}
              title={txt('Imprimer / Sauvegarder PDF', 'Print / Save PDF', 'Imprimir / Guardar PDF')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xs font-semibold transition-colors cursor-pointer"
            >
              <IconPrinter size={14} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Date Range Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-[#64748B] mr-1 flex items-center gap-1">
              <IconCalendar size={14} className="text-[#C49A3C]" />
              <span>{txt('Période :', 'Period:', 'Período:')}</span>
            </span>

            {[
              { id: 'today', label: txt('Aujourd’hui', 'Today', 'Hoje') },
              { id: '7d', label: txt('7 Jours', '7 Days', '7 Dias') },
              { id: 'month', label: txt('Ce Mois', 'This Month', 'Este Mês') },
              { id: '30d', label: txt('30 Jours', '30 Days', '30 Dias') },
              { id: '90d', label: txt('90 Jours', '90 Days', '90 Dias') },
              { id: 'year', label: txt('Cette Année', 'This Year', 'Este Ano') },
              { id: 'all', label: txt('Tout', 'All Time', 'Tudo') },
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRangeChange(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRange === r.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {r.label}
              </button>
            ))}

            {/* Custom Range Button */}
            <button
              type="button"
              onClick={() => setIsCustomModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectedRange === 'custom'
                  ? 'bg-[#C49A3C] text-white shadow-xs'
                  : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              <span>{txt('Personnalisé', 'Custom', 'Personalizado')}</span>
              {selectedRange === 'custom' && customStart && customEnd && (
                <span className="text-[10px] opacity-90 font-mono">({customStart.slice(5)} → {customEnd.slice(5)})</span>
              )}
            </button>
          </div>

          {/* Specialty / Department Selector Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] self-start md:self-center">
            {[
              { id: 'all', label: txt('Tous les Pôles', 'All Sectors', 'Todos os Polos') },
              { id: 'kinesitherapie', label: txt('Kinésithérapie', 'Physiotherapy', 'Fisioterapia') },
              { id: 'minceur', label: txt('Soins Minceur', 'Slimming Care', 'Emagrecimento') },
              { id: 'bilan', label: txt('Bilans', 'Assessments', 'Avaliações') },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePoleChange(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedPole === p.id
                    ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. EXECUTIVE KPI CARDS ROW ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Chiffre d'Affaires Encaissé */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {txt('Chiffre d’Affaires Encaissé', 'Paid Revenue', 'Faturação Liquidada')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <IconCurrencyEuro size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {currentStats.revenue.toLocaleString('pt-PT')} €
            </div>
            {/* Period-over-Period Delta & Billed Total */}
            <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
              {comparison.revenueGrowthPct >= 0 ? (
                <span className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  <IconTrendingUp size={13} className="mr-0.5" />
                  +{comparison.revenueGrowthPct}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md">
                  <IconTrendingDown size={13} className="mr-0.5" />
                  {comparison.revenueGrowthPct}%
                </span>
              )}
              <span className="text-[#64748B]">
                {currentStats.totalBilled && currentStats.totalBilled > currentStats.revenue
                  ? `· ${currentStats.totalBilled.toLocaleString('pt-PT')} € ${txt('émis', 'billed', 'faturado')}`
                  : txt('vs période préc.', 'vs prior period', 'vs período ant.')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Panier Moyen */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {txt('Panier Moyen / Acte', 'Avg Ticket Value', 'Ticket Médio')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <IconCurrencyEuro size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {currentStats.avgTicket} €
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 truncate">
              {currentStats.completed} {txt('séances honorées', 'sessions completed', 'sessões concluídas')}
            </div>
          </div>
        </div>

        {/* Card 3: Consultations & Présence */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {txt('Consultations & Présence', 'Attendance Rate', 'Taxa de Presença')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#166534] tracking-tight">
              {attendanceRate}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#64748B]">
              <span className="font-bold text-[#0F172A]">{currentStats.total}</span>
              <span>{txt('rdv planifiés au total', 'total appts scheduled', 'consultas no total')}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Taux d'Occupation Cabinet */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              {txt('Occupation Cabinet', 'Clinic Occupancy', 'Ocupação da Clínica')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <IconClock size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {currentStats.occupancyRate}%
            </div>
            <div className="text-[11px] text-[#64748B] mt-1 truncate">
              {txt('Capacité fauteuils mobilisée', 'Chair capacity utilized', 'Capacidade utilizada')}
            </div>
          </div>
        </div>

        {/* Card 5: Manque à Gagner Annulations */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              {txt('Manque à Gagner', 'Lost Revenue', 'Perda Faltas/Canc.')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <IconAlertCircle size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-rose-700 tracking-tight">
              - {currentStats.lostRevenue.toLocaleString('pt-PT')} €
            </div>
            <div className="text-[11px] text-rose-600/80 mt-1 truncate">
              {currentStats.cancelled} {txt('annulés', 'cancelled', 'desmarc.')} · {currentStats.noShow} {txt('absences', 'no-shows', 'faltas')}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DYNAMIC SPLINE TIMELINE CHART ───────────────────────────── */}
      <TimelineSplineChart
        points={timeline.points}
        lang={lang}
        granularity={timeline.granularity}
      />

      {/* ── 5. DEPARTMENT MATRIX & TOP SERVICES ────────────────────────── */}
      <DepartmentDonutChart
        poles={departmentData.poles}
        topServices={departmentData.topServices}
        lang={lang}
        totalRevenue={currentStats.revenue}
      />

      {/* ── 6. CLINIC OCCUPANCY HEATMAP ─────────────────────────────────── */}
      <OccupancyHeatmap
        dowLabels={heatmap.dowLabels}
        hours={heatmap.hours}
        matrix={heatmap.matrix}
        maxCount={heatmap.maxCount}
        peakSlot={heatmap.peakSlot}
        lang={lang}
      />

      {/* ── 7. ATTENDANCE & CONVERSION FUNNEL ───────────────────────────── */}
      <AttendanceFunnel
        stages={funnel.stages}
        cancellationsCount={funnel.cancellationsCount}
        noShowsCount={funnel.noShowsCount}
        lostRevenue={funnel.lostRevenue}
        retentionRate={funnel.retentionRate}
        lang={lang}
      />

      {/* ── 8. PAYMENT CHANNELS & INSURANCE COVERAGE ────────────────────── */}
      <PaymentDistributionVisualizer
        byMethod={payments.byMethod}
        byCoverage={payments.byCoverage}
        unpaidCount={payments.unpaidCount}
        unpaidAmount={payments.unpaidAmount}
        lang={lang}
      />

      {/* ── 9. CUSTOM DATE RANGE PICKER MODAL ──────────────────────────── */}
      <AnimatePresence>
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
                <h4 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <IconCalendar size={18} className="text-[#C49A3C]" />
                  <span>{txt('Sélectionner une Période Personnalisée', 'Custom Date Range', 'Intervalo Personalizado')}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <IconX size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    {txt('Date de Début', 'Start Date', 'Data Inicial')}
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-hidden focus:ring-2 focus:ring-[#C49A3C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    {txt('Date de Fin', 'End Date', 'Data Final')}
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-hidden focus:ring-2 focus:ring-[#C49A3C]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  {txt('Annuler', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomDate}
                  disabled={!customStart || !customEnd}
                  className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {txt('Appliquer le Filtre', 'Apply Filter', 'Aplicar Filtro')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});