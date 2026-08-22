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
  IconAlertCircle,
  IconClock,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarWeek,
  IconX,
  IconCheck,
  IconFilter,
  IconCalendarEvent,
  IconReceiptTax,
} from '@tabler/icons-react';
import {
  Appointment,
  AppointmentStatus,
  STATUS_CONFIG,
  getServiceName,
  getServicePrice,
  formatLocalDate,
} from '@/types/admin';
import { Lang } from '@/lib/i18n';
import { DayAgendaView } from './DayAgendaView';
import { FilterSheet } from './FilterSheet';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { WhatsAppCommunicationModal } from './WhatsAppCommunicationModal';

// ─── Week Calendar View (Desktop / Tablet) ───────────────────────────────────

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
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay();
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface WeekCalendarViewProps {
  appointments: Appointment[];
  lang: Lang;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
  recentNewIds?: Set<string>;
  openWhatsAppModal?: (appt: Appointment) => void;
}

function WeekCalendarView({
  appointments,
  lang,
  updateStatus,
  softDeleteAppointment,
  openPatientNote,
  setConfirmDialog,
  recentNewIds,
  openWhatsAppModal,
}: WeekCalendarViewProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const todayStr = useMemo(() => toDateStr(new Date()), []);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const apptByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach(a => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [appointments]);

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
    <div className="space-y-4 font-sans">
      {/* Week Navigation Header */}
      <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 shadow-xs">
        <button
          onClick={() => setWeekStart(d => addDays(d, -7))}
          className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
        >
          <IconChevronLeft size={16} />
        </button>

        <div className="text-center">
          <div className="font-semibold text-[#0F172A] text-sm sm:text-base">{weekLabel}</div>
          <div className="text-xs text-[#64748B] font-medium mt-0.5">
            {txt('Semaine', 'Week', 'Semana')} · {appointments.filter(a => weekDays.some(d => toDateStr(d) === a.date)).length}{' '}
            {txt('rendez-vous', 'appointments', 'consultas')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] text-[#334155] text-xs font-semibold hover:bg-[#E2E8F0] transition-colors"
          >
            {txt("Auj.", 'Today', 'Hoje')}
          </button>
          <button
            onClick={() => setWeekStart(d => addDays(d, 7))}
            className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto shadow-xs no-scrollbar">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[#E2E8F0]">
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const isToday = ds === todayStr;
              const sunday = isSunday(day);
              const count = (apptByDate[ds] ?? []).length;
              const occupancy = count / WEEK_HOUR_SLOTS.length;

              return (
                <div
                  key={i}
                  className={`p-2.5 text-center border-r last:border-r-0 border-[#E2E8F0] ${
                    sunday ? 'bg-[#F8FAFC]' : isToday ? 'bg-[#F1F5F9]' : ''
                  }`}
                >
                  <div className={`text-[10px] uppercase font-semibold tracking-wider mb-1 ${
                    sunday ? 'text-[#94A3B8]' : isToday ? 'text-[#0F172A] font-bold' : 'text-[#64748B]'
                  }`}>
                    {dayShort(day)}
                  </div>
                  <div className={`text-base font-bold leading-tight ${
                    isToday
                      ? 'w-7 h-7 rounded-full bg-[#0F172A] text-white flex items-center justify-center mx-auto shadow-xs'
                      : sunday
                      ? 'text-[#CBD5E1]'
                      : 'text-[#0F172A]'
                  }`}>
                    {dayNum(day)}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-[#E2E8F0] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
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
                    <div className="text-[10px] text-[#64748B] font-medium mt-0.5">
                      {count} {count === 1 ? txt('rdv', 'appt', 'cons.') : txt('rdvs', 'appts', 'cons.')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Appointment Chips per Day */}
          <div className="grid grid-cols-7 divide-x divide-[#E2E8F0] min-h-[300px]">
            {weekDays.map((day, i) => {
              const ds = toDateStr(day);
              const dayAppts = apptByDate[ds] ?? [];
              const sunday = isSunday(day);

              return (
                <div
                  key={i}
                  className={`p-1.5 flex flex-col gap-1.5 ${
                    sunday ? 'bg-[#F8FAFC]' : ''
                  }`}
                >
                  {sunday ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[11px] text-[#CBD5E1] rotate-90 whitespace-nowrap">
                        {txt('Fermé', 'Closed', 'Fechado')}
                      </span>
                    </div>
                  ) : dayAppts.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[11px] text-[#E2E8F0]">—</span>
                    </div>
                  ) : (
                    dayAppts.map(appt => {
                      const isNew = recentNewIds?.has(appt.id);
                      return (
                        <button
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg border text-[11px] leading-tight transition-all hover:shadow-xs ${
                            STATUS_CHIP[appt.status]
                          } ${selectedAppt?.id === appt.id ? 'ring-2 ring-[#0F172A] ring-offset-1' : ''} ${
                            isNew ? 'ring-2 ring-[#C49A3C] shadow-xs animate-pulse' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`} />
                              <span className="font-bold">{appt.startTime}</span>
                            </div>
                            {isNew && (
                              <span className="bg-[#C49A3C] text-white text-[7.5px] font-bold px-1 rounded uppercase shrink-0">
                                {txt('NOUV.', 'NEW', 'NOVO')}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold truncate">
                            {appt.patientName.split(' ')[0]}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Popover */}
      <AnimatePresence>
        {selectedAppt && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            ref={popoverRef}
            className="relative bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-lg overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[#334155] flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(selectedAppt.patientName)}
                </div>
                <div>
                  <div className="font-semibold text-[#0F172A] text-base leading-tight">
                    {selectedAppt.patientName}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {selectedAppt.date} · {selectedAppt.startTime}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0"
              >
                <IconX size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-semibold mb-1">
                  {txt('Traitement', 'Treatment', 'Tratamento')}
                </div>
                <div className="font-semibold text-[#0F172A]">{getServiceName(selectedAppt.service, lang)}</div>
              </div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B] uppercase font-semibold mb-1">
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
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {openWhatsAppModal ? (
                <button
                  type="button"
                  onClick={() => { openWhatsAppModal(selectedAppt); setSelectedAppt(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs font-medium hover:bg-[#DCFCE7] transition-colors"
                >
                  <IconBrandWhatsapp size={14} />
                  WhatsApp
                </button>
              ) : (
                <a
                  href={`https://wa.me/${selectedAppt.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs font-medium hover:bg-[#DCFCE7] transition-colors"
                >
                  <IconBrandWhatsapp size={14} />
                  WhatsApp
                </a>
              )}

              <button
                onClick={() => { openPatientNote(selectedAppt); setSelectedAppt(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] text-xs font-medium hover:bg-[#F1F5F9] transition-colors"
              >
                <IconNotes size={14} />
                {txt('Dossier', 'File', 'Ficha')}
              </button>

              {selectedAppt.status !== 'CONFIRMED' && selectedAppt.status !== 'CANCELLED' && (
                <button
                  onClick={() => { updateStatus(selectedAppt.id, 'CONFIRMED'); setSelectedAppt(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-medium hover:bg-[#BBF7D0] transition-colors"
                >
                  <IconCheck size={14} />
                  {txt('Confirmer', 'Confirm', 'Confirmar')}
                </button>
              )}

              {selectedAppt.status === 'CONFIRMED' && (
                <button
                  onClick={() => { updateStatus(selectedAppt.id, 'COMPLETED'); setSelectedAppt(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] text-xs font-medium hover:bg-[#BFDBFE] transition-colors"
                >
                  <IconCheck size={14} />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs font-medium hover:bg-[#FECACA] transition-colors"
                >
                  <IconX size={14} />
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

// ─── Main AppointmentsTab Component ──────────────────────────────────────────

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
  recentNewIds?: Set<string>;
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
  recentNewIds,
}: AppointmentsTabProps) {
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const [viewMode, setViewMode] = useState<'agenda' | 'week' | 'cards' | 'table' | 'grouped'>('agenda');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedApptForInvoice, setSelectedApptForInvoice] = useState<Appointment | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedApptForWhatsApp, setSelectedApptForWhatsApp] = useState<Appointment | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const handleOpenWhatsAppHub = (appt: Appointment) => {
    setSelectedApptForWhatsApp(appt);
    setIsWhatsAppModalOpen(true);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, dateFilter, viewMode, itemsPerPage]);

  const displayedAppointments = useMemo(() => {
    return filteredAppointments.filter(item => {
      if (dateFilter === 'today') return item.date === todayStr;
      if (dateFilter === 'tomorrow') return item.date === tomorrowStr;
      if (dateFilter === 'upcoming') return item.date >= todayStr;
      return true;
    });
  }, [filteredAppointments, dateFilter, todayStr, tomorrowStr]);

  const totalItems = displayedAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedAppointments = useMemo(() => {
    return displayedAppointments.slice(startIndex, endIndex);
  }, [displayedAppointments, startIndex, endIndex]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    paginatedAppointments.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginatedAppointments]);

  const isAnyFilterActive = searchQuery || filter !== 'all' || dateFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilter('all');
    setDateFilter('all');
  };

  const renderAppointmentCard = (item: Appointment) => {
    const st = STATUS_CONFIG[item.status];
    const price = getServicePrice(item.service);
    const initials = getInitials(item.patientName);
    const isRecentNew = recentNewIds?.has(item.id);
    const noShows = noShowCounts?.[item.phone] ?? 0;

    return (
      <div
        key={item.id}
        className={`bg-white border p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 transition-colors shadow-xs ${
          isRecentNew
            ? 'border-[#C49A3C] bg-[#FAF6EE]/50 ring-1 ring-[#C49A3C]'
            : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
        }`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#334155] flex items-center justify-center font-bold text-xs shrink-0 border border-[#E2E8F0]">
            {initials}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-sm sm:text-base text-[#0F172A] truncate">
                {item.patientName}
              </span>
              {isRecentNew && (
                <span className="bg-[#C49A3C] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                  {txt('NOUV.', 'NEW', 'NOVO')}
                </span>
              )}
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                {st[lang] || st.pt || st.fr}
              </span>
              {noShows >= 2 && (
                <span className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                  <IconAlertCircle size={11} />
                  <span>{noShows} {txt('annulations', 'cancels', 'cancelamentos')}</span>
                </span>
              )}
              {price > 0 && (
                <span className="text-[11px] font-semibold text-[#0F172A] px-1.5 py-0.2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                  {price} €
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-2.5 text-xs text-[#64748B]">
              <span className="font-medium text-[#334155]">
                {getServiceName(item.service, lang)}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="font-semibold text-[#0F172A]">
                {item.date} {item.startTime}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <a
                href={`tel:${item.phone}`}
                className="flex items-center gap-1 text-[#475569] hover:text-[#0F172A] transition-colors"
              >
                <IconPhoneCall size={13} />
                <span>{item.phone}</span>
              </a>
            </div>

            {item.notes && (
              <div className="text-xs text-[#64748B] bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] mt-1 max-w-xl">
                {item.notes}
              </div>
            )}
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center pt-2.5 md:pt-0 border-t md:border-t-0 border-[#E2E8F0] w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleOpenWhatsAppHub(item)}
            className="p-2 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] transition-colors touch-target flex items-center justify-center shadow-2xs"
            title="WhatsApp Hub (Lembretes & Pós-Tratamento)"
          >
            <IconBrandWhatsapp size={15} />
          </button>

          <button
            onClick={() => openPatientNote(item)}
            className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors touch-target flex items-center justify-center"
            title={txt('Dossier patient', 'Patient file', 'Ficha do doente')}
          >
            <IconNotes size={15} />
          </button>

          <button
            onClick={() => {
              setSelectedApptForInvoice(item);
              setIsInvoiceModalOpen(true);
            }}
            className="p-2 rounded-lg border border-[#CBD5E1] bg-[#FAF8F5] text-[#9A7428] hover:bg-[#F5E9C8] transition-colors touch-target flex items-center justify-center shadow-xs"
            title={txt('Émettre Fatura-Recibo', 'Issue Tax Invoice', 'Emitir Fatura-Recibo')}
          >
            <IconReceiptTax size={15} />
          </button>

          {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
            <button
              onClick={() => updateStatus(item.id, 'CONFIRMED')}
              className="px-3 py-2 rounded-lg bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-xs font-semibold transition-colors touch-target flex items-center gap-1"
            >
              <IconCheck size={14} />
              <span>{txt('Confirmer', 'Confirm', 'Confirmar')}</span>
            </button>
          )}

          {item.status === 'CONFIRMED' && (
            <button
              onClick={() => updateStatus(item.id, 'COMPLETED')}
              className="px-3 py-2 rounded-lg bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#BFDBFE] text-xs font-semibold transition-colors touch-target flex items-center gap-1"
            >
              <IconCheck size={14} />
              <span>{txt('Terminer', 'Complete', 'Concluir')}</span>
            </button>
          )}

          {item.status !== 'CANCELLED' && (
            <button
              onClick={() =>
                setConfirmDialog({
                  title: txt(`Annuler ce rendez-vous pour ${item.patientName} ?`, `Cancel appointment for ${item.patientName}?`, `Cancelar consulta de ${item.patientName}?`),
                  onConfirm: () => softDeleteAppointment(item.id),
                })
              }
              className="p-2 rounded-lg text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-colors touch-target flex items-center justify-center"
              title={txt('Annuler', 'Cancel', 'Cancelar')}
            >
              <IconX size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Control Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
        {/* Top row: Search & View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search box on tablet/desktop */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={txt('Rechercher patient, téléphone, soin...', 'Search patient, phone, service...', 'Pesquisar utente, telefone, tratamento...')}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
            />
          </div>

          {/* Mobile Filter Sheet Trigger Button */}
          <div className="flex items-center justify-between sm:hidden w-full gap-2">
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold touch-target"
            >
              <IconFilter size={15} className="text-[#64748B]" />
              <span>{txt('Filtres & Recherche', 'Filters & Search', 'Filtros')}</span>
              {isAnyFilterActive && (
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              )}
            </button>

            {isAnyFilterActive && (
              <button
                onClick={resetFilters}
                className="px-2.5 py-2 rounded-lg text-xs font-semibold text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] touch-target"
                title={txt('Réinitialiser', 'Reset', 'Repor')}
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] overflow-x-auto no-scrollbar self-start sm:self-auto">
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap touch-target ${
                viewMode === 'agenda'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Agenda Journalier', 'Day Agenda View', 'Vista Agenda')}
            >
              <IconCalendarEvent size={15} className={viewMode === 'agenda' ? 'text-[#0F172A]' : ''} />
              <span>{txt('Agenda', 'Agenda', 'Agenda')}</span>
            </button>

            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap touch-target ${
                viewMode === 'week'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Semaine', 'Week View', 'Vista Semanal')}
            >
              <IconCalendarWeek size={15} className={viewMode === 'week' ? 'text-[#0F172A]' : ''} />
              <span className="hidden xs:inline">{txt('Semaine', 'Week', 'Semana')}</span>
            </button>

            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap touch-target ${
                viewMode === 'cards'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Cartes', 'Cards View', 'Vista Cartões')}
            >
              <IconLayoutGrid size={15} className={viewMode === 'cards' ? 'text-[#0F172A]' : ''} />
              <span className="hidden sm:inline">{txt('Cartes', 'Cards', 'Cartões')}</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap touch-target hidden sm:flex ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue Tableau', 'Table View', 'Vista Tabela')}
            >
              <IconTable size={15} className={viewMode === 'table' ? 'text-[#0F172A]' : ''} />
              <span>{txt('Tableau', 'Table', 'Tabela')}</span>
            </button>

            <button
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap touch-target hidden md:flex ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title={txt('Vue par Date', 'View by Date', 'Vista por Data')}
            >
              <IconTimeline size={15} className={viewMode === 'grouped' ? 'text-[#0F172A]' : ''} />
              <span>{txt('Par Date', 'By Date', 'Por Data')}</span>
            </button>
          </div>
        </div>

        {/* Desktop Filter Pills Row */}
        <div className="hidden sm:flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 pt-2.5 border-t border-[#E2E8F0]">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filter === p.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${filter === p.id ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'}`}>
                  {p.count}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'all', label: txt('Toutes dates', 'All dates', 'Todas as datas') },
              { id: 'today', label: txt("Aujourd'hui", 'Today', 'Hoje') },
              { id: 'tomorrow', label: txt('Demain', 'Tomorrow', 'Amanhã') },
              { id: 'upcoming', label: txt('À venir', 'Upcoming', 'Próximas') },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as typeof dateFilter)}
                className={`px-2.5 py-1 rounded-lg transition-colors text-xs font-medium whitespace-nowrap ${
                  dateFilter === d.id
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        lang={lang}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filter={filter}
        setFilter={setFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        onReset={resetFilters}
        totalResults={displayedAppointments.length}
      />

      {/* Error Alert */}
      {appointmentsError && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#991B1B] text-xs font-medium flex items-center gap-2">
          <IconAlertCircle size={16} />
          <span>{appointmentsError}</span>
        </div>
      )}

      {/* Content Rendering based on viewMode */}
      {loadingAppointments ? (
        <div className="py-20 text-center text-[#64748B] text-xs flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-[#E2E8F0]">
          <div className="w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
          <span>{txt('Chargement des rendez-vous...', 'Loading appointments...', 'A carregar consultas...')}</span>
        </div>
      ) : displayedAppointments.length === 0 ? (
        <div className="py-16 text-center text-[#64748B] bg-white rounded-xl border border-[#E2E8F0] space-y-2">
          <IconListCheck size={36} className="mx-auto text-[#94A3B8]" />
          <h4 className="text-sm font-semibold text-[#0F172A]">
            {txt('Aucun rendez-vous trouvé', 'No appointments found', 'Nenhuma consulta encontrada')}
          </h4>
          <p className="text-xs text-[#64748B]">
            {txt('Modifiez vos filtres ou effectuez une autre recherche', 'Try changing your filters or search terms', 'Tente alterar os seus filtros')}
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'agenda' ? (
            <DayAgendaView
              appointments={displayedAppointments}
              lang={lang}
              updateStatus={updateStatus}
              softDeleteAppointment={softDeleteAppointment}
              openPatientNote={openPatientNote}
              setConfirmDialog={setConfirmDialog}
              noShowCounts={noShowCounts}
              recentNewIds={recentNewIds}
              openWhatsAppModal={handleOpenWhatsAppHub}
            />
          ) : viewMode === 'week' ? (
            <WeekCalendarView
              appointments={displayedAppointments}
              lang={lang}
              updateStatus={updateStatus}
              softDeleteAppointment={softDeleteAppointment}
              openPatientNote={openPatientNote}
              setConfirmDialog={setConfirmDialog}
              recentNewIds={recentNewIds}
              openWhatsAppModal={handleOpenWhatsAppHub}
            />
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 gap-2.5">
              {paginatedAppointments.map(renderAppointmentCard)}
            </div>
          ) : viewMode === 'table' ? (
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] uppercase text-[11px] text-[#64748B] font-semibold">
                    <tr>
                      <th className="py-3 px-4">{txt('Patient', 'Patient', 'Utente')}</th>
                      <th className="py-3 px-4">{txt('Traitement', 'Treatment', 'Tratamento')}</th>
                      <th className="py-3 px-4">{txt('Date & Heure', 'Date & Time', 'Data & Hora')}</th>
                      <th className="py-3 px-4">{txt('Statut', 'Status', 'Estado')}</th>
                      <th className="py-3 px-4 text-right">{txt('Actions', 'Actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {paginatedAppointments.map(item => {
                      const st = STATUS_CONFIG[item.status];
                      const price = getServicePrice(item.service);
                      const initials = getInitials(item.patientName);
                      const isRecentNew = recentNewIds?.has(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors duration-150 ${
                            isRecentNew ? 'bg-[#FAF6EE]' : 'hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#334155] font-semibold text-xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#0F172A] text-xs flex items-center gap-1.5">
                                  <span>{item.patientName}</span>
                                  {isRecentNew && (
                                    <span className="bg-[#C49A3C] text-white text-[8px] font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                                      {txt('NOUV.', 'NEW', 'NOVO')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#64748B]">{item.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#0F172A]">{getServiceName(item.service, lang)}</div>
                            <div className="text-[11px] text-[#64748B]">{price} €</div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                            {item.date} {item.startTime}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                              {st[lang] || st.pt || st.fr}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsAppHub(item)}
                                className="p-1.5 rounded-lg text-[#166534] hover:bg-[#DCFCE7] transition-colors"
                                title="WhatsApp Hub"
                              >
                                <IconBrandWhatsapp size={16} />
                              </button>
                              <button
                                onClick={() => openPatientNote(item)}
                                className="p-1.5 rounded-lg text-[#475569] hover:bg-[#F1F5F9] transition-colors"
                                title={txt('Dossier patient', 'Patient file', 'Ficha do utente')}
                              >
                                <IconNotes size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApptForInvoice(item);
                                  setIsInvoiceModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-[#9A7428] hover:bg-[#F5E9C8] transition-colors"
                                title={txt('Émettre Fatura-Recibo', 'Issue Tax Invoice', 'Emitir Fatura-Recibo')}
                              >
                                <IconReceiptTax size={16} />
                              </button>
                              {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'CONFIRMED')}
                                  className="px-2.5 py-1 rounded bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-xs font-semibold transition-colors"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'COMPLETED')}
                                  className="px-2.5 py-1 rounded bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#BFDBFE] text-xs font-semibold transition-colors"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() =>
                                    setConfirmDialog({
                                      title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                                      onConfirm: () => softDeleteAppointment(item.id),
                                    })
                                  }
                                  className="p-1.5 rounded text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-colors"
                                  title={txt('Annuler', 'Cancel', 'Cancelar')}
                                >
                                  <IconTrash size={16} />
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
            /* Grouped Timeline View */
            <div className="space-y-6">
              {groupedByDate.map(([date, appts]) => {
                const isToday = date === todayStr;
                const isTomorrow = date === tomorrowStr;

                return (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2.5 py-1 rounded-lg font-bold ${
                          isToday
                            ? 'bg-[#0F172A] text-white shadow-xs'
                            : isTomorrow
                            ? 'bg-[#334155] text-white'
                            : 'bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]'
                        }`}>
                          {isToday ? txt("Aujourd'hui", 'Today', 'Hoje') : isTomorrow ? txt('Demain', 'Tomorrow', 'Amanhã') : date}
                        </span>
                        <span className="text-[#64748B] font-semibold">{date}</span>
                      </div>
                      <span className="text-xs text-[#64748B]">
                        {appts.length} {txt('rendez-vous', 'appointments', 'consultas')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {appts.map(renderAppointmentCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          {viewMode !== 'agenda' && viewMode !== 'week' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-[#E2E8F0] shadow-xs text-xs">
              <div className="flex items-center gap-3 text-[#64748B]">
                <span>
                  {txt(
                    `Affichage ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} sur ${totalItems}`,
                    `Showing ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} of ${totalItems}`,
                    `A mostrar ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} de ${totalItems}`
                  )}
                </span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="hidden md:inline">{txt('Par page:', 'Per page:', 'Por página:')}</span>
                  <select
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(Number(e.target.value))}
                    className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-2 py-1 rounded-md focus:outline-none focus:border-[#2563EB] font-semibold"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target flex items-center justify-center"
                    title={txt('Précédent', 'Previous', 'Anterior')}
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                      if (
                        totalPages > 5 &&
                        p !== 1 &&
                        p !== totalPages &&
                        Math.abs(p - currentPage) > 1
                      ) {
                        if (p === 2 || p === totalPages - 1) {
                          return <span key={p} className="px-1 text-[#64748B]">.</span>;
                        }
                        return null;
                      }

                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg font-semibold transition-colors text-xs ${
                            currentPage === p
                              ? 'bg-[#0F172A] text-white shadow-xs'
                              : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
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
                    className="p-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-target flex items-center justify-center"
                    title={txt('Suivant', 'Next', 'Seguinte')}
                  >
                    <IconChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Invoice Modal for Selected Appointment */}
      {selectedApptForInvoice && (
        <CreateInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedApptForInvoice(null);
          }}
          onCreated={() => {
            setIsInvoiceModalOpen(false);
            setSelectedApptForInvoice(null);
          }}
          lang={lang}
          patients={[]}
          appointments={appointments}
          prefilledData={{
            appointmentId: selectedApptForInvoice.id,
            patientName: selectedApptForInvoice.patientName,
            patientPhone: selectedApptForInvoice.phone,
            patientEmail: selectedApptForInvoice.email || undefined,
            serviceSlug: selectedApptForInvoice.service,
            amount: getServicePrice(selectedApptForInvoice.service),
            coverageType: selectedApptForInvoice.coverageType || 'PARTICULAR',
            coverageProvider: selectedApptForInvoice.coverageProvider || undefined,
            coverageNumber: selectedApptForInvoice.coverageNumber || undefined,
          }}
        />
      )}

      {/* WhatsApp Communication Hub Modal */}
      {selectedApptForWhatsApp && (
        <WhatsAppCommunicationModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setSelectedApptForWhatsApp(null);
          }}
          appointment={selectedApptForWhatsApp}
          lang={lang}
        />
      )}
    </div>
  );
}