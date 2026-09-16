'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconFlame,
  IconCreditCard,
  IconBuildingHospital,
  IconUserCheck,
  IconAlertCircle,
  IconCheck,
  IconCalendar,
  IconClock,
  IconInfoCircle,
} from '@tabler/icons-react';

// ─── 1. TIMELINE SPLINE AREA CHART ──────────────────────────────────────────

export interface TimelinePoint {
  key: string;
  label: string;
  revenue: number;
  appointments: number;
  completed: number;
  cancelled: number;
}

interface TimelineSplineChartProps {
  points: TimelinePoint[];
  lang: Lang;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export const TimelineSplineChart = React.memo(function TimelineSplineChart({ points, lang, granularity }: TimelineSplineChartProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const [metric, setMetric] = useState<'revenue' | 'appointments'>('revenue');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const values = useMemo(
    () => points.map(p => (metric === 'revenue' ? p.revenue : p.appointments)),
    [points, metric]
  );

  const maxVal = Math.max(...values, 1) * 1.15; // 15% headroom
  const minVal = 0;

  // Chart coordinate space: viewBox 0 0 800 240
  const width = 800;
  const height = 240;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 30;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const coords = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return [{ x: padLeft + chartW / 2, y: padTop + chartH / 2 }];
    }
    return points.map((p, i) => {
      const val = metric === 'revenue' ? p.revenue : p.appointments;
      const x = padLeft + (i / (points.length - 1)) * chartW;
      const y = padTop + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
      return { x, y };
    });
  }, [points, metric, maxVal, minVal, chartW, chartH, padLeft, padTop]);

  // Generate cubic bezier curve path string
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length === 0) return { linePath: '', areaPath: '' };
    if (coords.length === 1) {
      const { x, y } = coords[0];
      return {
        linePath: `M ${x - 20} ${y} L ${x + 20} ${y}`,
        areaPath: `M ${x - 20} ${padTop + chartH} L ${x - 20} ${y} L ${x + 20} ${y} L ${x + 20} ${padTop + chartH} Z`,
      };
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = padTop + chartH;
    const area = `${d} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    return { linePath: d, areaPath: area };
  }, [coords, padTop, chartH]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || coords.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * width;

    // Find closest coordinate point
    let closestIdx = 0;
    let minDist = Infinity;
    coords.forEach((c, idx) => {
      const dist = Math.abs(c.x - normX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });
    setHoveredIdx(closestIdx);
  };

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;
  const activeCoord = hoveredIdx !== null ? coords[hoveredIdx] : null;

  // Stats summaries
  const totalVal = values.reduce((sum, v) => sum + v, 0);
  const avgVal = points.length > 0 ? Math.round(totalVal / points.length) : 0;
  const peakVal = Math.max(...values, 0);
  const peakIdx = values.indexOf(peakVal);
  const peakLabel = peakIdx >= 0 && points[peakIdx] ? points[peakIdx].label : '';

  // Gradient colors
  const primaryColor = metric === 'revenue' ? '#C49A3C' : '#10B981';
  const gradientId = metric === 'revenue' ? 'goldAreaGradient' : 'emeraldAreaGradient';

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-4 sm:p-6 space-y-4 font-sans">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
            <span>{txt('Évolution de l’Activité & Revenus', 'Revenue & Activity Timeline', 'Evolução da Atividade & Faturação')}</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {granularity === 'hour'
                ? txt('Par heure', 'Hourly', 'Por hora')
                : granularity === 'day'
                ? txt('Quotidien', 'Daily', 'Diário')
                : granularity === 'week'
                ? txt('Hebdomadaire', 'Weekly', 'Semanal')
                : txt('Mensuel', 'Monthly', 'Mensal')}
            </span>
          </h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt(
              'Survolez la courbe pour inspecter chaque période en détail',
              'Hover over the curve to inspect each period in detail',
              'Passe o cursor sobre a curva para inspecionar cada período'
            )}
          </p>
        </div>

        {/* Metric Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] self-start sm:self-center">
          <button
            type="button"
            onClick={() => { setMetric('revenue'); setHoveredIdx(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {txt('Chiffre d’Affaires (€)', 'Revenue (€)', 'Faturação (€)')}
          </button>
          <button
            type="button"
            onClick={() => { setMetric('appointments'); setHoveredIdx(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              metric === 'appointments'
                ? 'bg-white text-[#0F172A] shadow-xs border border-[#E2E8F0]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {txt('Consultations (Nbr)', 'Appointments (Qty)', 'Consultas (Qtd)')}
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div ref={containerRef} className="relative w-full select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="goldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C49A3C" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#C49A3C" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#C49A3C" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="emeraldAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.32" />
              <stop offset="65%" stopColor="#10B981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Grid Lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = padTop + chartH * (1 - ratio);
            const gridVal = Math.round(minVal + ratio * (maxVal - minVal));
            const formatted =
              metric === 'revenue'
                ? `${gridVal.toLocaleString('pt-PT')} €`
                : `${gridVal}`;

            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1.5"
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-[#94A3B8] font-mono select-none"
                >
                  {formatted}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && (
            <motion.path
              d={areaPath}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
          )}

          {/* Line Stroke */}
          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
            />
          )}

          {/* X Axis Labels */}
          {coords.map((c, i) => {
            const step = Math.max(1, Math.ceil(coords.length / 8));
            if (i % step !== 0 && i !== coords.length - 1) return null;

            return (
              <text
                key={i}
                x={c.x}
                y={padTop + chartH + 20}
                textAnchor="middle"
                className="text-[10px] fill-[#64748B] font-medium select-none"
              >
                {points[i].label}
              </text>
            );
          })}

          {/* Interactive Crosshair Tracking */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                y1={padTop}
                x2={activeCoord.x}
                y2={padTop + chartH}
                stroke={primaryColor}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="opacity-75"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="6"
                fill="#FFFFFF"
                stroke={primaryColor}
                strokeWidth="3"
                className="shadow-md filter drop-shadow"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="10"
                fill={primaryColor}
                opacity="0.25"
                className="animate-ping"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip Window */}
        <AnimatePresence>
          {activePoint && activeCoord && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 2, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                left: `${(activeCoord.x / width) * 100}%`,
                top: `${(activeCoord.y / height) * 100}%`,
                transform: `translate(${activeCoord.x > width * 0.7 ? '-100%' : activeCoord.x < width * 0.3 ? '0%' : '-50%'}, -115%)`,
                pointerEvents: 'none',
              }}
              className="z-30 bg-[#0F172A]/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/15 shadow-xl text-xs space-y-1 min-w-[140px]"
            >
              <div className="text-[11px] text-[#94A3B8] font-medium border-b border-white/10 pb-1 flex items-center justify-between gap-2">
                <span>{activePoint.label}</span>
                <span className="text-[10px] font-mono text-emerald-400">● {activePoint.key}</span>
              </div>
              <div className="text-base font-bold text-white tracking-tight pt-0.5">
                {metric === 'revenue'
                  ? `${activePoint.revenue.toLocaleString('pt-PT')} €`
                  : `${activePoint.appointments} ${txt('rendez-vous', 'appts', 'consultas')}`}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#CBD5E1] pt-0.5 gap-3">
                <span>{txt('Honorés', 'Completed', 'Concluídos')}: <strong className="text-emerald-300">{activePoint.completed}</strong></span>
                <span>{txt('Annulés', 'Cancelled', 'Cancelados')}: <strong className="text-rose-300">{activePoint.cancelled}</strong></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#F1F5F9] text-xs">
        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60">
          <div className="text-[#64748B] text-[11px] font-medium">{txt('Moyenne par tranche', 'Period Average', 'Média do Período')}</div>
          <div className="font-bold text-[#0F172A] text-sm mt-0.5">
            {metric === 'revenue' ? `${avgVal.toLocaleString('pt-PT')} €` : `${avgVal} rdv`}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60">
          <div className="text-[#64748B] text-[11px] font-medium flex items-center gap-1">
            <IconFlame size={13} className="text-[#C49A3C]" />
            <span>{txt('Pic d’activité', 'Peak Activity', 'Pico de Atividade')}</span>
          </div>
          <div className="font-bold text-[#0F172A] text-sm mt-0.5">
            {metric === 'revenue' ? `${peakVal.toLocaleString('pt-PT')} €` : `${peakVal} rdv`}
            <span className="text-[11px] font-normal text-[#64748B] ml-1.5">({peakLabel})</span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/60">
          <div className="text-[#64748B] text-[11px] font-medium">{txt('Total Cumulé', 'Cumulative Total', 'Total Acumulado')}</div>
          <div className="font-bold text-[#0F172A] text-sm mt-0.5">
            {metric === 'revenue' ? `${totalVal.toLocaleString('pt-PT')} €` : `${totalVal} rdv`}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── 2. DEPARTMENT DONUT CHART ──────────────────────────────────────────────

export interface DepartmentPole {
  pole: 'kinesitherapie' | 'minceur' | 'bilan';
  name: string;
  color: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface TopServiceItem {
  slug: string;
  name: string;
  pole: string;
  count: number;
  revenue: number;
  share: number;
}

interface DepartmentDonutChartProps {
  poles: DepartmentPole[];
  topServices: TopServiceItem[];
  lang: Lang;
  totalRevenue: number;
}

export const DepartmentDonutChart = React.memo(function DepartmentDonutChart({ poles, topServices, lang, totalRevenue }: DepartmentDonutChartProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const [activePole, setActivePole] = useState<DepartmentPole | null>(null);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const totalCount = poles.reduce((acc, p) => acc + p.count, 0);

  // Calculate stroke dash arrays and offsets
  let accumulatedPercent = 0;
  const slices = poles.map(p => {
    const pct = totalCount > 0 ? p.count / totalCount : 0;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += pct;
    return { ...p, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
      {/* Donut Visualizer Card */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between space-y-4">
        <div className="pb-2 border-b border-[#F1F5F9]">
          <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
            <IconBuildingHospital size={18} className="text-[#C49A3C]" />
            <span>{txt('Répartition par Pôle Médical', 'Department Distribution', 'Distribuição por Polo')}</span>
          </h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt('Chiffre d’affaires et volume d’actes par spécialité', 'Revenue and care volume by specialty', 'Receita e atos por especialidade')}
          </p>
        </div>

        {/* SVG Donut Center */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
          <div className="relative w-48 h-48 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90 overflow-visible">
              {/* Background Ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth="24"
              />

              {/* Slices */}
              {slices.map(slice => {
                const isHovered = activePole?.pole === slice.pole;
                return (
                  <motion.circle
                    key={slice.pole}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? 28 : 24}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    strokeLinecap="butt"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setActivePole(slice)}
                    onMouseLeave={() => setActivePole(null)}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: slice.strokeDashoffset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                );
              })}
            </svg>

            {/* Donut Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[11px] font-medium text-[#64748B] truncate max-w-[130px]">
                {activePole ? activePole.name : txt('Total Recettes', 'Total Revenue', 'Total Receita')}
              </span>
              <span className="text-lg font-extrabold text-[#0F172A] tracking-tight mt-0.5">
                {activePole
                  ? `${activePole.revenue.toLocaleString('pt-PT')} €`
                  : `${totalRevenue.toLocaleString('pt-PT')} €`}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] mt-1">
                {activePole ? `${activePole.percentage}% du CA` : `${totalCount} séances`}
              </span>
            </div>
          </div>

          {/* Slices Legend */}
          <div className="space-y-2.5 w-full sm:w-auto">
            {poles.map(p => {
              const isHovered = activePole?.pole === p.pole;
              return (
                <div
                  key={p.pole}
                  onMouseEnter={() => setActivePole(p)}
                  onMouseLeave={() => setActivePole(null)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-[#F8FAFC] border-[#0F172A] shadow-xs'
                      : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-bold text-[#0F172A] truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1 pl-5 gap-3">
                    <span>{p.revenue.toLocaleString('pt-PT')} €</span>
                    <span className="font-semibold text-[#0F172A]">{p.count} rdv ({p.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 6 Services Ranking Table */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between space-y-4">
        <div className="pb-2 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
              <IconFlame size={18} className="text-amber-500" />
              <span>{txt('Top Soins & Prestations Phares', 'Top Performing Treatments', 'Tratamentos de Maior Sucesso')}</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              {txt('Classement par volume de consultations', 'Ranked by consultation volume', 'Ordenados por volume')}
            </p>
          </div>
        </div>

        {topServices.length === 0 ? (
          <div className="text-center text-[#64748B] text-xs py-8">
            {txt('Aucune prestation sur cette période', 'No treatments recorded in this period', 'Sem registos neste período')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {topServices.map((svc, i) => {
              const maxServiceCount = topServices[0]?.count || 1;
              const barWidth = Math.round((svc.count / maxServiceCount) * 100);
              const poleColor =
                svc.pole === 'minceur'
                  ? 'bg-[#C49A3C]'
                  : svc.pole === 'bilan'
                  ? 'bg-[#10B981]'
                  : 'bg-[#3B82F6]';

              return (
                <div key={svc.slug} className="p-2 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-[#E2E8F0] text-[#0F172A] font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{i + 1}
                      </span>
                      <span className="font-semibold text-[#0F172A] truncate">{svc.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#0F172A]">{svc.count} {txt('rdv', 'appts', 'cons.')}</span>
                      <span className="text-[11px] text-[#64748B] ml-1.5">({svc.revenue.toLocaleString('pt-PT')} €)</span>
                    </div>
                  </div>

                  {/* Relative Volume Progress Bar */}
                  <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                      className={`h-full rounded-full ${poleColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── 3. CLINIC OCCUPANCY HEATMAP ────────────────────────────────────────────

interface OccupancyHeatmapProps {
  dowLabels: string[];
  hours: string[];
  matrix: number[][];
  maxCount: number;
  peakSlot: { dow: string; hour: string; count: number };
  lang: Lang;
}

export const OccupancyHeatmap = React.memo(function OccupancyHeatmap({
  dowLabels,
  hours,
  matrix,
  maxCount,
  peakSlot,
  lang,
}: OccupancyHeatmapProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const [hoveredCell, setHoveredCell] = useState<{ dow: string; hour: string; count: number } | null>(null);

  // Color intensity calculator
  const getCellBg = (count: number) => {
    if (count === 0) return 'bg-[#F8FAFC] text-[#94A3B8]';
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio < 0.25) return 'bg-amber-100 text-amber-800 font-semibold';
    if (ratio < 0.55) return 'bg-amber-300 text-amber-950 font-bold';
    if (ratio < 0.85) return 'bg-[#C49A3C] text-white font-extrabold';
    return 'bg-[#0F172A] text-amber-300 font-extrabold ring-1 ring-amber-400';
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
            <IconClock size={18} className="text-[#C49A3C]" />
            <span>{txt('Matrice d’Occupation & Heures d’Affluence', 'Clinic Occupancy & Peak Hours Heatmap', 'Matriz de Ocupação & Horários de Ponta')}</span>
          </h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt(
              'Densité de fréquentation par tranche horaire pour optimiser les plannings praticiens',
              'Attendance density per slot to optimize room and staffing allocation',
              'Densidade por horário para otimizar marcações e salas'
            )}
          </p>
        </div>

        {/* Peak Slot Indicator Badge */}
        {peakSlot.count > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold">
            <IconFlame size={15} className="text-amber-600" />
            <span>{txt('Créneau d’Or', 'Golden Slot', 'Horário de Ouro')}: {peakSlot.dow} {peakSlot.hour} ({peakSlot.count} rdv)</span>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[560px]">
          {/* Header Row: Hours */}
          <div className="grid grid-cols-13 gap-1 mb-1.5 text-center text-[10px] font-mono text-[#64748B]">
            <div className="text-left pl-2 font-sans font-bold">{txt('Jour', 'Day', 'Dia')}</div>
            {hours.map(h => (
              <div key={h}>{h.slice(0, 2)}h</div>
            ))}
          </div>

          {/* Matrix Rows: DOW */}
          <div className="space-y-1.5">
            {dowLabels.map((dow, dowIdx) => (
              <div key={dow} className="grid grid-cols-13 gap-1 items-center">
                <div className="text-xs font-bold text-[#0F172A] pl-2">{dow}</div>
                {hours.map((hour, hourIdx) => {
                  const count = matrix[dowIdx]?.[hourIdx] || 0;
                  const cellColor = getCellBg(count);

                  return (
                    <div
                      key={hour}
                      onMouseEnter={() => setHoveredCell({ dow, hour, count })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-9 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer select-none hover:scale-105 ${cellColor}`}
                    >
                      {count > 0 ? count : '-'}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Active Cell Inspector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#64748B] font-medium">{txt('Intensité', 'Intensity', 'Intensidade')}:</span>
          <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[10px] text-[#64748B]">0</span>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Faible</span>
          <span className="px-2 py-0.5 rounded bg-amber-300 text-amber-950 text-[10px] font-bold">Moyen</span>
          <span className="px-2 py-0.5 rounded bg-[#C49A3C] text-white text-[10px] font-bold">Élevé</span>
          <span className="px-2 py-0.5 rounded bg-[#0F172A] text-amber-300 text-[10px] font-extrabold">Pic</span>
        </div>

        {hoveredCell && (
          <div className="text-xs font-bold text-[#0F172A] bg-[#F1F5F9] px-3 py-1 rounded-lg">
            {hoveredCell.dow} {hoveredCell.hour} — <span className="text-[#C49A3C]">{hoveredCell.count} {txt('rendez-vous', 'appointments', 'consultas')}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── 4. PATIENT ATTENDANCE & CONVERSION FUNNEL ──────────────────────────────

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

interface AttendanceFunnelProps {
  stages: FunnelStage[];
  cancellationsCount: number;
  noShowsCount: number;
  lostRevenue: number;
  retentionRate: number;
  lang: Lang;
}

export const AttendanceFunnel = React.memo(function AttendanceFunnel({
  stages,
  cancellationsCount,
  noShowsCount,
  lostRevenue,
  retentionRate,
  lang,
}: AttendanceFunnelProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
      {/* Funnel Pipeline */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="pb-2 border-b border-[#F1F5F9]">
          <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
            <IconUserCheck size={18} className="text-[#10B981]" />
            <span>{txt('Entonnoir de Présence & Fidélisation', 'Attendance & Retention Funnel', 'Funil de Presença & Retenção')}</span>
          </h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt('Parcours de concrétisation du rendez-vous à la fidélisation multi-séances', 'Conversion from appointment booked to completed treatment plans', 'Conversão de consultas agendadas em planos concluídos')}
          </p>
        </div>

        {/* Steps Pipeline */}
        <div className="space-y-3 pt-1">
          {stages.map((stage, idx) => {
            const stepColors = [
              'bg-[#0F172A]',
              'bg-[#2563EB]',
              'bg-[#10B981]',
              'bg-[#C49A3C]',
            ];
            const color = stepColors[idx % stepColors.length];

            return (
              <div key={stage.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#0F172A]">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#0F172A]">{stage.count}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B]">
                      {stage.percentage}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#F1F5F9] rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.percentage}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                    className={`h-full rounded-full ${color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leakage & Lost Revenue Impact Card */}
      <div className="lg:col-span-5 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-2xl border border-[#FDE68A] p-5 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <IconAlertCircle size={18} className="text-amber-700" />
            <span>{txt('Manque à Gagner & Défections', 'Missed Revenue & Leakage', 'Perdas por Faltas & Desmarcações')}</span>
          </div>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            {txt(
              'Impact financier des annulations et absences non prévenues sur cette période.',
              'Financial impact of late cancellations and no-shows during this period.',
              'Impacto financeiro de cancelamentos tardios e faltas nesta seleção.'
            )}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/80 backdrop-blur-xs border border-amber-300/50 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-amber-900">{txt('Total Opportunités Perdues', 'Total Lost Opportunities', 'Total Oportunidades Perdidas')}:</span>
            <span className="text-xl font-extrabold text-rose-700">
              - {lostRevenue.toLocaleString('pt-PT')} €
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-amber-200">
            <div>
              <span className="text-[11px] text-amber-800">{txt('Annulations', 'Cancellations', 'Cancelamentos')}</span>
              <div className="font-bold text-[#0F172A] mt-0.5">{cancellationsCount} {txt('rdv', 'appts', 'cons.')}</div>
            </div>
            <div>
              <span className="text-[11px] text-amber-800">{txt('Absences (No-Show)', 'No-Shows', 'Faltas')}</span>
              <div className="font-bold text-[#0F172A] mt-0.5">{noShowsCount} {txt('rdv', 'appts', 'cons.')}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-amber-900 font-medium px-1">
          <span>{txt('Taux de fidélisation multi-séances', 'Multi-session retention rate', 'Taxa de retenção multi-sessões')}:</span>
          <span className="font-extrabold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-amber-300">
            {retentionRate}%
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── 5. PAYMENT & INSURANCE DISTRIBUTION BAR ────────────────────────────────

interface PaymentMethodItem {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface CoverageItem {
  coverage: string;
  count: number;
  percentage: number;
}

interface PaymentDistributionProps {
  byMethod: PaymentMethodItem[];
  byCoverage: CoverageItem[];
  unpaidCount: number;
  unpaidAmount: number;
  lang: Lang;
}

export const PaymentDistributionVisualizer = React.memo(function PaymentDistributionVisualizer({
  byMethod,
  byCoverage,
  unpaidCount,
  unpaidAmount,
  lang,
}: PaymentDistributionProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 font-sans">
      {/* Payment Methods Breakdown */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="pb-2 border-b border-[#F1F5F9] flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-[#0F172A] flex items-center gap-2">
              <IconCreditCard size={18} className="text-[#C49A3C]" />
              <span>{txt('Canaux d’Encaissement & Moyens de Paiement', 'Payment Methods Breakdown', 'Métodos de Pagamento')}</span>
            </h4>
            <p className="text-xs text-[#64748B] mt-0.5">
              {txt('Répartition des factures réglées par modalité', 'Paid invoices breakdown by payment channel', 'Faturação por forma de pagamento')}
            </p>
          </div>

          {unpaidCount > 0 && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {unpaidCount} {txt('en attente', 'pending', 'pendentes')} ({unpaidAmount.toLocaleString('pt-PT')} €)
              </span>
            </div>
          )}
        </div>

        {byMethod.length === 0 ? (
          <div className="text-center text-[#64748B] text-xs py-6">
            {txt('Aucun encaissement sur cette période', 'No payments recorded in this period', 'Sem pagamentos neste período')}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Segmented color bar */}
            <div className="flex h-3 rounded-full overflow-hidden w-full bg-[#F1F5F9]">
              {byMethod.map((item, idx) => {
                const colors = ['bg-[#0284C7]', 'bg-[#E11D48]', 'bg-[#8B5CF6]', 'bg-[#10B981]', 'bg-[#64748B]'];
                const c = colors[idx % colors.length];
                return (
                  <div
                    key={item.method}
                    style={{ width: `${item.percentage}%` }}
                    title={`${item.method}: ${item.percentage}%`}
                    className={`${c} h-full transition-all`}
                  />
                );
              })}
            </div>

            {/* Matrix details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {byMethod.map((item, idx) => {
                const dotColors = ['bg-[#0284C7]', 'bg-[#E11D48]', 'bg-[#8B5CF6]', 'bg-[#10B981]', 'bg-[#64748B]'];
                const dot = dotColors[idx % dotColors.length];
                return (
                  <div key={item.method} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                      <span className="text-xs font-bold text-[#0F172A] truncate">{item.method}</span>
                    </div>
                    <div className="font-extrabold text-[#0F172A] text-sm mt-1">
                      {item.amount.toLocaleString('pt-PT')} €
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {item.count} factures ({item.percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Insurance Coverage Breakdown */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="pb-2 border-b border-[#F1F5F9]">
          <h4 className="font-bold text-sm sm:text-base text-[#0F172A]">
            {txt('Régimes de Couverture Santé', 'Insurance & Health Coverage', 'Regimes de Cobertura')}
          </h4>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt('Assurances privées vs Régime général', 'Private insurance vs Private out-of-pocket', 'Seguradoras vs Particular')}
          </p>
        </div>

        {byCoverage.length === 0 ? (
          <div className="text-center text-[#64748B] text-xs py-6">
            {txt('Aucune donnée', 'No data', 'Sem dados')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {byCoverage.map(item => (
              <div key={item.coverage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0F172A]">{item.coverage}</span>
                  <span className="font-mono text-[#64748B]">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className="h-full rounded-full bg-[#0F172A]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
