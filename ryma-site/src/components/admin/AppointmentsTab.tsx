'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconListCheck,
  IconStethoscope,
  IconCalendar,
  IconPhoneCall,
  IconMail,
  IconBrandWhatsapp,
  IconNotes,
  IconTrash,
  IconLayoutGrid,
  IconTable,
  IconTimeline,
  IconCurrencyDinar,
  IconUser,
  IconAlertCircle,
  IconClock,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarWeek,
  IconX,
  IconCheck,
} from '@tabler/icons-react';
import {
  Appointment,
  AppointmentStatus,
  STATUS_CONFIG,
  getServiceName,
  getServicePrice,
} from '@/types/admin';

import { Lang } from '@/lib/i18n';

// ─── Week Calendar View ────────────────────────────────────────────────────────

const WEEK_HOUR_SLOTS = [
  '08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];

const STATUS_DOT: Record<AppointmentStatus, string> = {
  PENDING:   'bg-[#F59E0B]',
  CONFIRMED: 'bg-[#22C55E]',
  CANCELLED: 'bg-[#EF4444]',
  COMPLETED: 'bg-[#3B82F6]',
  NO_SHOW:   'bg-[#94A3B8]',
};

const STATUS_CHIP: Record<AppointmentStatus, string> = {
  PENDING:   'bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]',
  CONFIRMED: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
  CANCELLED: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] opacity-60',
  COMPLETED: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
  NO_SHOW:   'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] opacity-60',
};

function getWeekStart(date: Date): Date {
  // Use midday (12:00:00) to avoid any DST or timezone midnight shifts
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay();
  // Monday = 1 in JS (Sunday = 0) -> offset to Monday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface WeekCalendarViewProps {
  appointments: Appointment[];
  lang: Lang;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
}

function WeekCalendarView({
  appointments,
  lang,
  updateStatus,
  softDeleteAppointment,
  openPatientNote,
  setConfirmDialog,
}: WeekCalendarViewProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedAppt(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Group appointments by date string
  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    // Sort each day by startTime
    Object.values(map).forEach(arr => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [appointments]);

  const maxPerDay = useMemo(() => {
    const counts = weekDays.map(d => (apptByDate[toDateStr(d)] ?? []).length);
    return Math.max(...counts, 1);
  }, [weekDays, apptByDate]);

  const weekLabel = useMemo(() => {
    const locale = lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR';
    const s = weekDays[0].toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const e = weekDays[6].toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }, [weekDays, lang]);

  const dayShort = (d: Date) => {
    const locale = lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR';
    return d.toLocaleDateString(locale, { weekday: 'short' });
  };

  const dayNum = (d: Date) => d.getDate();
  const isSunday = (d: Date) => d.getDay() === 0;

  return (
    <div className="space-y-4">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between bg-white border border-[#E9E6DF] rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <button
          onClick={() => setWeekStart(d => addDays(d, -7))}
          className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:border-[#C6A15B] transition-all"
        >
          <IconChevronLeft size={16} />
        </button>

        <div className="text-center">
          <div className="font-serif font-bold text-[#1A1412] text-base">{weekLabel}</div>
          <div className="font-mono text-[11px] text-[#77736B] mt-0.5">
            {txt('Semaine', 'Week', 'Semana')} · {appointments.filter(a => weekDays.some(d => toDateStr(d) === a.date)).length}{' '}
            {txt('rendez-vous', 'appointments', 'consultas')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#9B793A] text-xs font-mono font-bold hover:bg-[#F5E9C8] transition-all"
          >
            {txt("Auj.", 'Today', 'Hoje')}
          </button>
          <button
            onClick={() => setWeekStart(d => addDays(d, 7))}
            className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:border-[#C6A15B] transition-all"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-[#E9E6DF] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-[#E9E6DF]">
          {weekDays.map((day, i) => {
            const ds = toDateStr(day);
            const isToday = ds === todayStr;
            const sunday = isSunday(day);
            const count = (apptByDate[ds] ?? []).length;
            const occupancy = count / WEEK_HOUR_SLOTS.length; // max = full day

            return (
              <div
                key={i}
                className={`p-2.5 text-center border-r last:border-r-0 border-[#E9E6DF] ${
                  sunday ? 'bg-[#FAFAF8]' : isToday ? 'bg-[#FAF6EE]' : ''
                }`}
              >
                <div className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${
                  sunday ? 'text-[#94A3B8]' : isToday ? 'text-[#9A7428]' : 'text-[#77736B]'
                }`}>
                  {dayShort(day)}
                </div>
                <div className={`font-serif text-lg font-bold leading-tight ${
                  isToday
                    ? 'w-8 h-8 rounded-full bg-[#C6A15B] text-white flex items-center justify-center mx-auto shadow-md'
                    : sunday
                    ? 'text-[#CBD5E1]'
                    : 'text-[#1A1412]'
                }`}>
                  {dayNum(day)}
                </div>
                {/* Occupancy heat bar */}
                <div className="mt-2 h-1 rounded-full bg-[#E9E6DF] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(occupancy * 100 * 1.5, 100)}%`,
                      background:
                        occupancy > 0.6 ? '#EF4444' :
                        occupancy > 0.3 ? '#F59E0B' :
                        occupancy > 0   ? '#22C55E' : 'transparent',
                    }}
                  />
                </div>
                {count > 0 && (
                  <div className="font-mono text-[9px] text-[#77736B] mt-0.5">
                    {count} {count === 1 ? txt('rdv', 'appt', 'cons.') : txt('rdvs', 'appts', 'cons.')}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Appointment Chips per Day */}
        <div className="grid grid-cols-7 divide-x divide-[#E9E6DF] min-h-[320px]">
          {weekDays.map((day, i) => {
            const ds = toDateStr(day);
            const dayAppts = apptByDate[ds] ?? [];
            const sunday = isSunday(day);

            return (
              <div
                key={i}
                className={`p-1.5 flex flex-col gap-1 ${
                  sunday ? 'bg-[#FAFAF8]' : ''
                }`}
              >
                {sunday ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-[#CBD5E1] font-mono rotate-90 whitespace-nowrap">
                      {txt('Fermé', 'Closed', 'Fechado')}
                    </span>
                  </div>
                ) : dayAppts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-[#E2E8F0] font-mono">—</span>
                  </div>
                ) : (
                  dayAppts.map(appt => (
                    <button
                      key={appt.id}
                      onClick={() => setSelectedAppt(appt)}
                      className={`w-full text-left px-1.5 py-1 rounded-lg border text-[10px] leading-tight transition-all hover:shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                        STATUS_CHIP[appt.status]
                      } ${selectedAppt?.id === appt.id ? 'ring-2 ring-[#C6A15B] ring-offset-1' : ''}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`} />
                        <span className="font-bold font-mono">{appt.startTime}</span>
                      </div>
                      <div className="font-semibold truncate leading-tight" style={{ fontSize: '9.5px' }}>
                        {appt.patientName.split(' ')[0]}
                      </div>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Detail Popover */}
      <AnimatePresence>
        {selectedAppt && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            ref={popoverRef}
            className="relative bg-white border border-[#E9E6DF] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden"
          >
            {/* Gold accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, #C6A15B, #E8D7B0, #C6A15B)`,
              }}
            />

            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-[#E9E6DF] flex items-center justify-center font-bold text-[#334155] text-sm shrink-0">
                  {getInitials(selectedAppt.patientName)}
                </div>
                <div>
                  <div className="font-serif font-bold text-[#1A1412] text-base leading-tight">
                    {selectedAppt.patientName}
                  </div>
                  <div className="font-mono text-xs text-[#77736B]">
                    {selectedAppt.date} · {selectedAppt.startTime}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="p-1.5 rounded-lg text-[#77736B] hover:text-[#1A1412] hover:bg-[#F4F2EE] transition-colors shrink-0"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E9E6DF]">
                <div className="font-mono text-[10px] text-[#77736B] uppercase tracking-wide mb-1">
                  {txt('Traitement', 'Treatment', 'Tratamento')}
                </div>
                <div className="font-semibold text-[#1A1412]">{getServiceName(selectedAppt.service, lang)}</div>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E9E6DF]">
                <div className="font-mono text-[10px] text-[#77736B] uppercase tracking-wide mb-1">
                  {txt('Statut', 'Status', 'Estado')}
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  STATUS_CONFIG[selectedAppt.status].bg
                } ${
                  STATUS_CONFIG[selectedAppt.status].color
                } ${
                  STATUS_CONFIG[selectedAppt.status].border
                }`}>
                  {STATUS_CONFIG[selectedAppt.status][lang] || STATUS_CONFIG[selectedAppt.status].pt}
                </span>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E9E6DF]">
                <div className="font-mono text-[10px] text-[#77736B] uppercase tracking-wide mb-1">
                  {txt('Téléphone', 'Phone', 'Telefone')}
                </div>
                <a href={`tel:${selectedAppt.phone}`} className="font-semibold text-[#1A1412] hover:text-[#9A7428]">
                  {selectedAppt.phone}
                </a>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E9E6DF]">
                <div className="font-mono text-[10px] text-[#77736B] uppercase tracking-wide mb-1">
                  {txt('Tarif', 'Fee', 'Honorário')}
                </div>
                <div className="font-bold text-[#C49A3C] font-mono">{getServicePrice(selectedAppt.service)} €</div>
              </div>
            </div>

            {selectedAppt.notes && (
              <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0] text-xs text-[#64748B] mb-4">
                {selectedAppt.notes}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${selectedAppt.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs font-medium hover:bg-[#DCFCE7] transition-colors"
              >
                <IconBrandWhatsapp size={13} />
                WhatsApp
              </a>

              <button
                onClick={() => { openPatientNote(selectedAppt); setSelectedAppt(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] text-xs font-medium hover:bg-[#E2E8F0] transition-colors"
              >
                <IconNotes size={13} />
                {txt('Dossier', 'File', 'Ficha')}
              </button>

              {selectedAppt.status !== 'CONFIRMED' && selectedAppt.status !== 'CANCELLED' && (
                <button
                  onClick={() => { updateStatus(selectedAppt.id, 'CONFIRMED'); setSelectedAppt(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-medium hover:bg-[#BBF7D0] transition-colors"
                >
                  <IconCheck size={13} />
                  {txt('Confirmer', 'Confirm', 'Confirmar')}
                </button>
              )}

              {selectedAppt.status === 'CONFIRMED' && (
                <button
                  onClick={() => { updateStatus(selectedAppt.id, 'COMPLETED'); setSelectedAppt(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] text-xs font-medium hover:bg-[#BFDBFE] transition-colors"
                >
                  <IconCheck size={13} />
                  {txt('Terminer', 'Complete', 'Concluir')}
                </button>
              )}

              {selectedAppt.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    setConfirmDialog({
                      title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                      onConfirm: () => { softDeleteAppointment(selectedAppt.id); setSelectedAppt(null); },
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs font-medium hover:bg-[#FECACA] transition-colors"
                >
                  <IconX size={13} />
                  {txt('Annuler', 'Cancel', 'Cancelar')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AppointmentsTab ───────────────────────────────────────────────────────────

interface AppointmentsTabProps {
  lang: Lang;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: AppointmentStatus | 'all';
  setFilter: (st: AppointmentStatus | 'all') => void;
  appointmentsError: string | null;
  loadingAppointments: boolean;
  appointments: Appointment[];
  filteredAppointments: Appointment[];
  updateStatus: (id: string, status: AppointmentStatus) => void;
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  noShowCounts?: Record<string, number>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppointmentsTab({
  lang,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  appointmentsError,
  loadingAppointments,
  appointments,
  filteredAppointments,
  updateStatus,
  setConfirmDialog,
  softDeleteAppointment,
  openPatientNote,
  noShowCounts,
}: AppointmentsTabProps) {
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'grouped' | 'week'>('week');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const tomorrowStr = useMemo(() => toDateStr(addDays(new Date(), 1)), []);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, dateFilter, viewMode, itemsPerPage]);

  // Filter by date on top of status and search filter
  const displayedAppointments = useMemo(() => {
    return filteredAppointments.filter(item => {
      if (dateFilter === 'today') return item.date === todayStr;
      if (dateFilter === 'tomorrow') return item.date === tomorrowStr;
      if (dateFilter === 'upcoming') return item.date >= todayStr;
      return true;
    });
  }, [filteredAppointments, dateFilter, todayStr, tomorrowStr]);

  // Pagination calculations
  const totalItems = displayedAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedAppointments = useMemo(() => {
    return displayedAppointments.slice(startIndex, endIndex);
  }, [displayedAppointments, startIndex, endIndex]);

  // Compute summary stats for all matching items before pagination
  const summaryMetrics = useMemo(() => {
    const totalCount = displayedAppointments.length;
    const pendingCount = displayedAppointments.filter(a => a.status === 'PENDING').length;
    const todayCount = displayedAppointments.filter(a => a.date === todayStr).length;
    const totalRevenue = displayedAppointments
      .filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED')
      .reduce((sum, a) => sum + getServicePrice(a.service), 0);

    return { totalCount, pendingCount, todayCount, totalRevenue };
  }, [displayedAppointments, todayStr]);

  // Grouped by date map for grouped view mode (paginated)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    paginatedAppointments.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginatedAppointments]);

  const renderAppointmentCard = (item: Appointment) => {
    const st = STATUS_CONFIG[item.status];
    const price = getServicePrice(item.service);
    const initials = getInitials(item.patientName);

    return (
      <div
        key={item.id}
        className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:border-[#CBD5E1]"
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Patient Avatar Initials */}
          <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#334155] flex items-center justify-center font-semibold text-xs shrink-0 border border-[#E2E8F0]">
            {initials}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-[#0F172A]">
                {item.patientName}
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                {st[lang] || st.pt || st.fr}
              </span>
              {(noShowCounts?.[item.phone] ?? 0) >= 2 && (
                <span className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                  <IconAlertCircle size={12} />
                  <span>{txt(`Risco (${noShowCounts![item.phone]} cancelamentos)`, `High-Risk (${noShowCounts![item.phone]} cancellations)`, `Risco (${noShowCounts![item.phone]} cancelamentos)`)}</span>
                </span>
              )}
              {price > 0 && (
                <span className="text-[11px] font-semibold text-[#0F172A] px-1.5 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  {price} €
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[#64748B]">
              <span className="flex items-center gap-1 text-[#334155] font-medium">
                <IconStethoscope size={13} className="text-[#64748B]" />
                {getServiceName(item.service, lang)}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="flex items-center gap-1 font-medium text-[#0F172A]">
                <IconCalendar size={13} className="text-[#64748B]" />
                {item.date} {item.startTime}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <a
                href={`tel:${item.phone}`}
                className="flex items-center gap-1 hover:text-[#0F172A] transition-colors"
              >
                <IconPhoneCall size={13} />
                {item.phone}
              </a>
              {item.email && (
                <>
                  <span className="text-[#CBD5E1]">•</span>
                  <span className="flex items-center gap-1">
                    <IconMail size={13} />
                    {item.email}
                  </span>
                </>
              )}
            </div>

            {item.notes && (
              <div className="text-xs text-[#64748B] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] mt-1.5 max-w-xl">
                {item.notes}
              </div>
            )}
          </div>
        </div>

        {/* Status Change & Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0] w-full md:w-auto justify-end">
          {/* WhatsApp Direct Reminder Link */}
          <a
            href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
              lang === 'fr'
                ? `Bonjour ${item.patientName}, nous vous rappelons votre rendez-vous pour ${getServiceName(item.service, 'fr')} le ${item.date} à ${item.startTime} au Cabinet Ryma Kiné. Merci de confirmer votre présence.`
                : lang === 'en'
                ? `Hello ${item.patientName}, this is a reminder for your appointment for ${getServiceName(item.service, 'en')} on ${item.date} at ${item.startTime} at Ryma Kiné Clinic. Please confirm your attendance.`
                : `Olá ${item.patientName}, lembramos a sua consulta de ${getServiceName(item.service, 'pt')} no dia ${item.date} às ${item.startTime} na Clínica Ryma Kiné. Por favor confirme a sua presença.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 px-2 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] transition-colors flex items-center gap-1 text-xs font-medium"
            title={txt('Rappel WhatsApp', 'WhatsApp Reminder', 'Lembrete WhatsApp')}
          >
            <IconBrandWhatsapp size={14} />
            <span className="hidden xl:inline">{txt('WhatsApp', 'WhatsApp', 'WhatsApp')}</span>
          </a>

          {/* Patient Dossier Trigger */}
          <button
            onClick={() => openPatientNote(item)}
            className="p-1.5 px-2.5 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors flex items-center gap-1 text-xs font-medium"
            title={txt('Dossier Patient', 'Patient File', 'Ficha do Doente')}
          >
            <IconNotes size={14} className="text-[#64748B]" />
            <span>{txt('Ficha', 'File', 'Ficha')}</span>
          </button>

          {/* Quick Status Modifiers */}
          {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
            <button
              onClick={() => updateStatus(item.id, 'CONFIRMED')}
              className="px-2.5 py-1.5 rounded-lg bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-xs font-medium transition-colors"
            >
              ✓ {txt('Confirmar', 'Confirm', 'Confirmar')}
            </button>
          )}

          {item.status === 'CONFIRMED' && (
            <button
              onClick={() => updateStatus(item.id, 'COMPLETED')}
              className="px-2.5 py-1.5 rounded-lg bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#BFDBFE] text-xs font-medium transition-colors"
            >
              ✓ {txt('Concluir', 'Complete', 'Concluir')}
            </button>
          )}

          {item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && (
            <button
              onClick={() => updateStatus(item.id, 'CANCELLED')}
              className="p-1.5 text-[#64748B] hover:text-[#991B1B] hover:bg-[#FEF2F2] rounded-lg transition-colors text-xs"
              title={txt('Annuler', 'Cancel', 'Cancelar')}
            >
              ✕
            </button>
          )}

          <button
            onClick={() =>
              setConfirmDialog({
                title: lang === 'pt' ? `Eliminar registo de ${item.patientName}?` : `Delete appointment for ${item.patientName}?`,
                onConfirm: () => softDeleteAppointment(item.id),
              })
            }
            className="p-1.5 text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEF2F2] rounded-lg transition-colors"
            title={txt('Supprimer', 'Delete', 'Eliminar')}
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Control Bar: Search, Status Filter, Date Filter & View Switcher */}
      <div className="flex flex-col space-y-3 bg-white p-3.5 rounded-xl border border-[#E2E8F0]">
        
        {/* Top Row: Search & View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={txt('Rechercher patient, téléphone, soin...', 'Search patient, phone, care...', 'Pesquisar utente, telefone, tratamento...')}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg pl-9 pr-3 py-1.5 text-xs placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg self-end sm:self-auto border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Semaine', 'Week View', 'Vista Semanal')}
            >
              <IconCalendarWeek size={14} />
              <span className="hidden md:inline">{txt('Semaine', 'Week', 'Semana')}</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Cartes', 'Card View', 'Vista Cartões')}
            >
              <IconLayoutGrid size={14} />
              <span className="hidden md:inline">{txt('Cartes', 'Cards', 'Cartões')}</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Tableau', 'Table View', 'Vista Tabela')}
            >
              <IconTable size={14} />
              <span className="hidden md:inline">{txt('Tableau', 'Table', 'Tabela')}</span>
            </button>

            <button
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#0F172A] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue par Date', 'View by Date', 'Vista por Data')}
            >
              <IconTimeline size={14} />
              <span className="hidden md:inline">{txt('Par Date', 'By Date', 'Por Data')}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Status Filter Pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2 border-t border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'all' as const, label: txt('Tous', 'All', 'Todos'), count: appointments.length },
              { id: 'CONFIRMED' as const, label: txt('Confirmés', 'Confirmed', 'Confirmados'), count: appointments.filter(a => a.status === 'CONFIRMED').length },
              { id: 'PENDING' as const, label: txt('En attente', 'Pending', 'Pendentes'), count: appointments.filter(a => a.status === 'PENDING').length },
              { id: 'COMPLETED' as const, label: txt('Terminés', 'Completed', 'Concluídos'), count: appointments.filter(a => a.status === 'COMPLETED').length },
              { id: 'CANCELLED' as const, label: txt('Annulés', 'Cancelled', 'Cancelados'), count: appointments.filter(a => a.status === 'CANCELLED').length },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setFilter(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filter === p.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${filter === p.id ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Date Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
            <span className="text-[#77736B] text-[11px] font-semibold me-1">📅 {txt('Période:', 'Period:', 'Período:')}</span>
            {[
              { id: 'all', label: txt('Toutes dates', 'All dates', 'Todas as datas') },
              { id: 'today', label: txt("Aujourd'hui", 'Today', 'Hoje') },
              { id: 'tomorrow', label: txt('Demain', 'Tomorrow', 'Amanhã') },
              { id: 'upcoming', label: txt('À venir', 'Upcoming', 'Próximas') },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as typeof dateFilter)}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                  dateFilter === d.id
                    ? 'bg-[#202020] text-white'
                    : 'bg-[#FAFAF8] text-[#77736B] hover:text-[#202020] border border-[#E9E6DF]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {appointmentsError && (
        <div className="p-4 bg-[#A9655F]/10 border border-[#A9655F]/30 rounded-2xl text-[#A9655F] text-sm font-mono font-semibold">
          ⚠️ {appointmentsError}
        </div>
      )}

      {/* Main Content Render based on viewMode */}
      {loadingAppointments ? (
        <div className="py-20 text-center text-[#77736B] font-mono text-sm flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
          <span>{txt('Chargement des rendez-vous...', 'Loading appointments...', 'A carregar consultas...')}</span>
        </div>
      ) : displayedAppointments.length === 0 ? (
        <div className="py-16 text-center text-[#64748B] bg-white rounded-xl border border-[#E2E8F0] space-y-1.5">
          <IconListCheck size={36} className="mx-auto text-[#94A3B8]" />
          <p className="text-sm font-semibold text-[#0F172A]">{txt('Nenhum resultado encontrado', 'No appointments found', 'Nenhuma consulta encontrada')}</p>
          <p className="text-xs text-[#64748B]">{txt('Tente alterar os seus filtros ou termo de pesquisa', 'Try adjusting your filters or search query', 'Tente alterar os seus filtros ou termo de pesquisa')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'week' ? (
            /* 0. WEEK CALENDAR VIEW */
            <WeekCalendarView
              appointments={displayedAppointments}
              lang={lang}
              updateStatus={updateStatus}
              softDeleteAppointment={softDeleteAppointment}
              openPatientNote={openPatientNote}
              setConfirmDialog={setConfirmDialog}
            />
          ) : viewMode === 'cards' ? (
            /* 1. CARDS VIEW */
            <div className="grid grid-cols-1 gap-2.5">
              {paginatedAppointments.map(renderAppointmentCard)}
            </div>
          ) : viewMode === 'table' ? (
            /* 2. HIGH DENSITY TABLE VIEW */
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] uppercase text-[11px] text-[#64748B] font-semibold">
                    <tr>
                      <th className="py-3 px-4">{txt('Doente', 'Patient', 'Utente')}</th>
                      <th className="py-3 px-4">{txt('Tratamento', 'Treatment', 'Tratamento')}</th>
                      <th className="py-3 px-4">{txt('Data & Hora', 'Date & Time', 'Data & Hora')}</th>
                      <th className="py-3 px-4">{txt('Estado', 'Status', 'Estado')}</th>
                      <th className="py-3 px-4 text-right">{txt('Ações', 'Actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {paginatedAppointments.map(item => {
                      const st = STATUS_CONFIG[item.status];
                      const price = getServicePrice(item.service);
                      const initials = getInitials(item.patientName);

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#334155] font-semibold text-[11px] shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-[#0F172A] text-xs">{item.patientName}</div>
                                <div className="text-[11px] text-[#64748B]">{item.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-[#0F172A]">{getServiceName(item.service, lang)}</div>
                            <div className="text-[11px] text-[#64748B]">{price} €</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F172A]">
                            {item.date} {item.startTime}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                              {st[lang] || st.pt || st.fr}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-[#166534] hover:bg-[#DCFCE7] transition-colors"
                                title="WhatsApp"
                              >
                                <IconBrandWhatsapp size={15} />
                              </a>
                              <button
                                onClick={() => openPatientNote(item)}
                                className="p-1 rounded text-[#334155] hover:bg-[#F1F5F9] transition-colors"
                                title={txt('Ficha do Doente', 'Patient File', 'Ficha do Utente')}
                              >
                                <IconNotes size={15} />
                              </button>
                              {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'CONFIRMED')}
                                  className="px-2 py-1 rounded bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-[11px] font-medium transition-colors"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'COMPLETED')}
                                  className="px-2 py-1 rounded bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#BFDBFE] text-[11px] font-medium transition-colors"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => setConfirmDialog({
                                    title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                                    onConfirm: () => softDeleteAppointment(item.id)
                                  })}
                                  className="p-1.5 rounded-lg bg-[#A9655F]/10 text-[#A9655F] hover:bg-[#A9655F]/20"
                                  title={txt('Annuler', 'Cancel', 'Cancelar')}
                                >
                                  <IconTrash size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 3. GROUPED TIMELINE VIEW */
            <div className="space-y-6">
              {groupedByDate.map(([date, appts]) => {
                const isToday = date === todayStr;
                const isTomorrow = date === tomorrowStr;

                return (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E9E6DF]">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className={`px-2.5 py-1 rounded-xl font-bold ${
                          isToday
                            ? 'bg-[#C6A15B] text-white shadow-xs'
                            : isTomorrow
                            ? 'bg-[#202020] text-white'
                            : 'bg-[#FAF6EE] text-[#9B793A] border border-[#E8D7B0]'
                        }`}>
                          {isToday ? txt("Aujourd'hui", 'Today', 'Hoje') : isTomorrow ? txt('Demain', 'Tomorrow', 'Amanhã') : date}
                        </span>
                        <span className="text-[#77736B] font-semibold">{date}</span>
                      </div>
                      <span className="font-mono text-xs text-[#77736B]">
                        {appts.length} {txt('rendez-vous', 'appointments', 'consultas')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {appts.map(renderAppointmentCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E9E6DF] shadow-[0_2px_8px_rgba(0,0,0,0.02)] font-mono text-xs">
            <div className="flex items-center gap-3 text-[#77736B]">
              <span>
                {txt(
                  `Affichage ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} sur ${totalItems} rendez-vous`,
                  `Showing ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} of ${totalItems} appointments`,
                  `A mostrar ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} de ${totalItems} consultas`
                )}
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="hidden md:inline">{txt('Par page:', 'Per page:', 'Por página:')}</span>
                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  className="bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] px-2 py-1 rounded-lg focus:outline-none focus:border-[#C6A15B] font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={txt('Page précédente', 'Previous page', 'Página anterior')}
                >
                  <IconChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    // Render page number buttons cleanly (or ellipsis if too many)
                    if (
                      totalPages > 7 &&
                      p !== 1 &&
                      p !== totalPages &&
                      Math.abs(p - currentPage) > 1
                    ) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="px-1 text-[#77736B]">.</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-xl font-bold transition-all text-xs ${
                          currentPage === p
                            ? 'bg-[#C6A15B] text-white shadow-xs'
                            : 'bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={txt('Page suivante', 'Next page', 'Página seguinte')}
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}