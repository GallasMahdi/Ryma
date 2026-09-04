'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCheck,
  IconLock,
  IconBan,
  IconSun,
  IconSunset,
  IconRefresh,
  IconCalendarOff,
  IconX,
  IconSparkles,
  IconAlertCircle,
} from '@tabler/icons-react';
import {
  SlotInfo,
  Appointment,
  formatSlotDateLabel,
  shiftDateString,
  getServiceName,
} from '@/types/admin';
import { Lang } from '@/lib/i18n';
import { ResponsiveModal } from './ResponsiveModal';

interface SlotsTabProps {
  lang: Lang;
  selectedDateForSlots: string;
  setSelectedDateForSlots: React.Dispatch<React.SetStateAction<string>>;
  todayStr: string;
  next7Days: string[];
  slotList: SlotInfo[];
  loadingSlots: boolean;
  appointments: Appointment[];
  toggleSlot: (time: string) => Promise<boolean | undefined> | void;
  refreshSlots?: (date: string) => void;
  onActionToast?: (toast: { type: 'success' | 'error' | 'info' | 'loading'; title: string; message?: string }) => void;
}

const MORNING_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const AFTERNOON_TIMES = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

type BatchActionType = 'block_morning' | 'block_afternoon' | 'block_all' | 'unblock_all' | 'range' | null;

export const SlotsTab = React.memo(function SlotsTab({
  lang,
  selectedDateForSlots,
  setSelectedDateForSlots,
  todayStr,
  next7Days,
  slotList,
  loadingSlots,
  appointments,
  toggleSlot,
  refreshSlots,
  onActionToast,
}: SlotsTabProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const [slotFilter, setSlotFilter] = useState<'all' | 'available' | 'booked' | 'blocked'>('all');
  const [batchLoadingAction, setBatchLoadingAction] = useState<BatchActionType>(null);
  const [togglingSlotTime, setTogglingSlotTime] = useState<string | null>(null);

  // Period / Vacation Blocking Modal State
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [rangeStartDate, setRangeStartDate] = useState(selectedDateForSlots);
  const [rangeEndDate, setRangeEndDate] = useState(shiftDateString(selectedDateForSlots, 7));
  const [rangeScope, setRangeScope] = useState<'day' | 'morning' | 'afternoon'>('day');
  const [rangeSubmitting, setRangeSubmitting] = useState(false);

  const slotDateMeta = formatSlotDateLabel(selectedDateForSlots, lang);

  const slotStats = useMemo(() => {
    return {
      total: slotList.length,
      available: slotList.filter((s) => s.available && s.reason !== 'blocked').length,
      booked: slotList.filter((s) => !s.available && s.reason === 'booked').length,
      blocked: slotList.filter((s) => s.reason === 'blocked').length,
    };
  }, [slotList]);

  const morningSlots = useMemo(() => {
    return slotList.filter((s) => MORNING_TIMES.includes(s.time));
  }, [slotList]);

  const afternoonSlots = useMemo(() => {
    return slotList.filter((s) => AFTERNOON_TIMES.includes(s.time));
  }, [slotList]);

  // Handle individual slot click with local loading state
  const handleSlotClick = async (time: string) => {
    if (togglingSlotTime || batchLoadingAction || loadingSlots) return;
    setTogglingSlotTime(time);
    try {
      await toggleSlot(time);
    } finally {
      setTogglingSlotTime(null);
    }
  };

  // Handle batch blocking actions (morning, afternoon, full day, unblock all)
  const handleBatchAction = async (action: 'block_morning' | 'block_afternoon' | 'block_all' | 'unblock_all') => {
    if (batchLoadingAction || slotDateMeta.isSunday) return;
    setBatchLoadingAction(action);

    try {
      let scope: 'day' | 'morning' | 'afternoon' = 'day';
      let act: 'block' | 'unblock' = 'block';

      if (action === 'block_morning') {
        scope = 'morning';
        act = 'block';
      } else if (action === 'block_afternoon') {
        scope = 'afternoon';
        act = 'block';
      } else if (action === 'block_all') {
        scope = 'day';
        act = 'block';
      } else if (action === 'unblock_all') {
        scope = 'day';
        act = 'unblock';
      }

      const res = await fetch('/api/admin/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateForSlots, scope, action: act }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la modification des créneaux');
      }

      if (refreshSlots) {
        refreshSlots(selectedDateForSlots);
      }

      // Show user feedback toast
      const actionLabels = {
        block_morning: txt('Matinée Bloquée', 'Morning Blocked', 'Manhã Bloqueada'),
        block_afternoon: txt('Après-midi Bloqué', 'Afternoon Blocked', 'Tarde Bloqueada'),
        block_all: txt('Journée Entière Bloquée', 'Full Day Blocked', 'Dia Inteiro Bloqueado'),
        unblock_all: txt('Journée Débloquée', 'Day Unblocked', 'Dia Desbloqueado'),
      };

      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: actionLabels[action],
          message: `${selectedDateForSlots} • ${data.processedSlots ?? 0} ${txt('créneaux mis à jour', 'slots updated', 'horários atualizados')}`,
        });
      }
    } catch (err: any) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur de Modification', 'Modification Error', 'Erro na Alteração'),
          message: err.message || 'Impossible de mettre à jour les créneaux',
        });
      }
    } finally {
      setBatchLoadingAction(null);
    }
  };

  // Handle period / range blocking submit
  const handleRangeSubmit = async (action: 'block' | 'unblock') => {
    if (rangeSubmitting) return;
    setRangeSubmitting(true);

    try {
      const res = await fetch('/api/admin/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: rangeStartDate,
          endDate: rangeEndDate,
          scope: rangeScope,
          action,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du traitement de la période');
      }

      if (refreshSlots) {
        refreshSlots(selectedDateForSlots);
      }

      setIsRangeModalOpen(false);

      if (onActionToast) {
        onActionToast({
          type: 'success',
          title:
            action === 'block'
              ? txt('Période Bloquée avec Succès', 'Period Blocked Successfully', 'Período Bloqueado com Sucesso')
              : txt('Période Débloquée', 'Period Unblocked', 'Período Desbloqueado'),
          message: `${rangeStartDate} → ${rangeEndDate} (${data.totalDays ?? 0} ${txt('jours', 'days', 'dias')}, ${data.processedSlots ?? 0} ${txt('créneaux', 'slots', 'vagas')})`,
        });
      }
    } catch (err: any) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur', 'Error', 'Erro'),
          message: err.message,
        });
      }
    } finally {
      setRangeSubmitting(false);
    }
  };

  const apptMap = useMemo(() => {
    const map = new Map<string, Appointment>();
    appointments.forEach((a) => map.set(a.id, a));
    return map;
  }, [appointments]);

  const filterSlotItem = (st: SlotInfo) => {
    if (slotFilter === 'available') return st.available && st.reason !== 'blocked';
    if (slotFilter === 'booked') return !st.available && st.reason === 'booked';
    if (slotFilter === 'blocked') return st.reason === 'blocked';
    return true;
  };

  const renderSlotCard = (st: SlotInfo) => {
    const bookedAppt = st.appointmentId
      ? apptMap.get(st.appointmentId) || null
      : null;

    const isBlocked = st.reason === 'blocked';
    const isBooked = !st.available && st.reason === 'booked';
    const isSunday = st.reason === 'sunday';
    const isThisSlotToggling = togglingSlotTime === st.time;

    return (
      <motion.div
        key={st.time}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          if (!isSunday && !isBooked && !loadingSlots && !batchLoadingAction && !isThisSlotToggling) {
            handleSlotClick(st.time);
          }
        }}
        className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[110px] select-none relative ${
          !isSunday && !isBooked ? 'cursor-pointer hover:shadow-xs' : ''
        } ${
          isBlocked
            ? 'bg-[#FEF2F2] border-[#FECACA]'
            : isBooked
            ? 'bg-[#F8FAFC] border-[#E2E8F0]'
            : isSunday
            ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-50 cursor-not-allowed'
            : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
        } ${isThisSlotToggling ? 'ring-2 ring-blue-500/50 animate-pulse' : ''}`}
      >
        {/* Top: Time & Status */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-sm text-[#0F172A] flex items-center gap-1.5">
            {st.time}
            {isThisSlotToggling && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            )}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              isBlocked
                ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                : isBooked
                ? 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1]'
                : isSunday
                ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
                : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
            }`}
          >
            {isBlocked
              ? txt('Bloqué', 'Blocked', 'Bloqueado')
              : isBooked
              ? txt('Réservé', 'Booked', 'Ocupado')
              : isSunday
              ? txt('Fermé', 'Closed', 'Fechado')
              : txt('Libre', 'Open', 'Livre')}
          </span>
        </div>

        {/* Middle: Patient detail or status text */}
        {isBooked ? (
          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0] mb-2 space-y-0.5">
            <div className="font-semibold text-xs text-[#0F172A] truncate">
              {bookedAppt?.patientName ?? txt('Patient réservé', 'Patient booked', 'Utente registado')}
            </div>
            {bookedAppt && (
              <div className="text-[11px] text-[#64748B] truncate">
                {getServiceName(bookedAppt.service, lang)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#64748B] mb-2">
            {isBlocked
              ? txt('Indisponible aux réservations', 'Unavailable for booking', 'Indisponível para marcações')
              : isSunday
              ? txt('Fermeture hebdomadaire', 'Weekly closing', 'Encerramento semanal')
              : txt('Disponible à la réservation', 'Available for booking', 'Livre para marcação')}
          </div>
        )}

        {/* Action Button */}
        {!isSunday && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isBooked && !loadingSlots && !batchLoadingAction && !isThisSlotToggling) {
                handleSlotClick(st.time);
              }
            }}
            disabled={isBooked || batchLoadingAction !== null || isThisSlotToggling}
            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all touch-target flex items-center justify-center gap-1.5 ${
              isBooked
                ? 'opacity-40 cursor-not-allowed bg-transparent text-[#94A3B8]'
                : isThisSlotToggling
                ? 'bg-[#E2E8F0] text-[#0F172A]'
                : isBlocked
                ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] active:scale-[0.98]'
                : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] active:scale-[0.98]'
            }`}
          >
            {isThisSlotToggling ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{txt('En cours...', 'Updating...', 'A atualizar...')}</span>
              </>
            ) : isBlocked ? (
              <>
                <IconCheck size={13} className="text-[#991B1B]" />
                <span>{txt('Débloquer', 'Unblock', 'Desbloquear')}</span>
              </>
            ) : isBooked ? (
              <span>{txt('Occupé', 'Booked', 'Ocupado')}</span>
            ) : (
              <>
                <IconBan size={13} className="text-[#64748B]" />
                <span>{txt('Bloquer', 'Block', 'Bloquear')}</span>
              </>
            )}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Active Batch Loading Notification Banner */}
      <AnimatePresence>
        {batchLoadingAction && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-[#0F172A] text-white rounded-xl flex items-center justify-between shadow-md text-xs font-medium"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>
                {batchLoadingAction === 'block_morning' && txt('Blocage des créneaux du matin en cours...', 'Blocking morning slots in progress...', 'A bloquear horários da manhã...')}
                {batchLoadingAction === 'block_afternoon' && txt('Blocage des créneaux de l’après-midi en cours...', 'Blocking afternoon slots in progress...', 'A bloquear horários da tarde...')}
                {batchLoadingAction === 'block_all' && txt('Blocage de toute la journée en cours...', 'Blocking full day in progress...', 'A bloquear o dia inteiro...')}
                {batchLoadingAction === 'unblock_all' && txt('Déblocage de tous les créneaux en cours...', 'Unblocking all slots in progress...', 'A desbloquear todos os horários...')}
              </span>
            </div>
            <span className="font-mono text-[11px] text-white/70">{selectedDateForSlots}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4 sm:space-y-5">
        {/* Header & Date Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base sm:text-lg text-[#0F172A] tracking-tight">
                {txt('Créneaux & Horaires', 'Schedule & Slot Management', 'Gestão de Horários & Agenda')}
              </h3>
              {slotDateMeta.isSunday ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B]">
                  {txt('Dimanche fermé', 'Sunday closed', 'Domingo fechado')}
                </span>
              ) : slotStats.blocked === slotStats.total && slotStats.total > 0 ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
                  {txt('Journée Fermée / Bloquée', 'Day Fully Blocked', 'Dia Bloqueado')}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[#64748B]">
              {slotDateMeta.title} • {slotDateMeta.subtitle}
            </p>
          </div>

          {/* Date controls & Period button */}
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setRangeStartDate(selectedDateForSlots);
                setRangeEndDate(shiftDateString(selectedDateForSlots, 7));
                setIsRangeModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] transition-colors touch-target shadow-2xs"
            >
              <IconCalendarOff size={15} className="text-[#64748B]" />
              <span>{txt('Bloquer une période / Vacances', 'Block Period / Vacations', 'Bloquear Período / Férias')}</span>
            </button>

            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                onClick={() => setSelectedDateForSlots((prev) => shiftDateString(prev, -1))}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
                title={txt('Jour précédent', 'Previous day', 'Dia anterior')}
              >
                <IconChevronLeft size={16} />
              </button>

              <button
                onClick={() => setSelectedDateForSlots(todayStr)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedDateForSlots === todayStr
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {txt('Auj.', 'Today', 'Hoje')}
              </button>

              <button
                onClick={() => setSelectedDateForSlots((prev) => shiftDateString(prev, 1))}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
                title={txt('Jour suivant', 'Next day', 'Dia seguinte')}
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <input
              type="date"
              value={selectedDateForSlots}
              onChange={(e) => setSelectedDateForSlots(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-[#0F172A] transition-colors cursor-pointer"
            />
          </div>
        </div>

        {/* 7-Day Quick Strip */}
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">
            {txt('7 Prochains Jours', 'Next 7 Days', 'Próximos 7 Dias')}
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {next7Days.map((dateStr) => {
              const meta = formatSlotDateLabel(dateStr, lang);
              const isSelected = selectedDateForSlots === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateForSlots(dateStr)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 touch-target ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs font-semibold'
                      : meta.isSunday
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">
                    {meta.title.substring(0, 3)}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                    {meta.subtitle}
                  </span>
                  {meta.isSunday ? (
                    <span className="text-[9px] font-medium text-rose-500/80 mt-0.5">
                      {txt('Fermé', 'Closed', 'Fechado')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                {txt('Total', 'Total', 'Total')}
              </div>
              <div className="text-xl font-bold text-[#0F172A]">{slotStats.total}</div>
            </div>
            <IconClock size={18} className="text-[#94A3B8]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#166534]">
                {txt('Libres', 'Available', 'Livres')}
              </div>
              <div className="text-xl font-bold text-[#166534]">{slotStats.available}</div>
            </div>
            <IconCheck size={18} className="text-[#166534]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#334155]">
                {txt('Réservés', 'Booked', 'Ocupados')}
              </div>
              <div className="text-xl font-bold text-[#334155]">{slotStats.booked}</div>
            </div>
            <IconLock size={18} className="text-[#64748B]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#991B1B]">
                {txt('Bloqués', 'Blocked', 'Bloqueados')}
              </div>
              <div className="text-xl font-bold text-[#991B1B]">{slotStats.blocked}</div>
            </div>
            <IconBan size={18} className="text-[#991B1B]" />
          </div>
        </div>

        {/* Filter Pills & Batch Action Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
            {[
              { id: 'all', label: txt(`Tous (${slotList.length})`, `All (${slotList.length})`, `Todos (${slotList.length})`) },
              { id: 'available', label: txt(`Libres (${slotStats.available})`, `Open (${slotStats.available})`, `Livres (${slotStats.available})`) },
              { id: 'booked', label: txt(`Réservés (${slotStats.booked})`, `Booked (${slotStats.booked})`, `Ocupados (${slotStats.booked})`) },
              { id: 'blocked', label: txt(`Bloqués (${slotStats.blocked})`, `Blocked (${slotStats.blocked})`, `Bloqueados (${slotStats.blocked})`) },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSlotFilter(tab.id as typeof slotFilter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  slotFilter === tab.id
                    ? 'bg-[#0F172A] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Actions Toolbar with Live Spinners */}
          {!slotDateMeta.isSunday && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBatchAction('block_morning')}
                disabled={batchLoadingAction !== null || loadingSlots}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold transition-all disabled:opacity-50 touch-target flex items-center gap-1.5 active:scale-[0.98]"
              >
                {batchLoadingAction === 'block_morning' ? (
                  <div className="w-3 h-3 border-2 border-[#334155] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <IconSun size={14} className="text-[#F59E0B]" />
                )}
                <span>
                  {batchLoadingAction === 'block_morning'
                    ? txt('Blocage...', 'Blocking...', 'A bloquear...')
                    : txt('Bloquer Matin', 'Block Morning', 'Bloquear Manhã')}
                </span>
              </button>

              <button
                onClick={() => handleBatchAction('block_afternoon')}
                disabled={batchLoadingAction !== null || loadingSlots}
                className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-semibold transition-all disabled:opacity-50 touch-target flex items-center gap-1.5 active:scale-[0.98]"
              >
                {batchLoadingAction === 'block_afternoon' ? (
                  <div className="w-3 h-3 border-2 border-[#334155] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <IconSunset size={14} className="text-[#D97706]" />
                )}
                <span>
                  {batchLoadingAction === 'block_afternoon'
                    ? txt('Blocage...', 'Blocking...', 'A bloquear...')
                    : txt('Bloquer Après-midi', 'Block Afternoon', 'Bloquear Tarde')}
                </span>
              </button>

              <button
                onClick={() => handleBatchAction('block_all')}
                disabled={batchLoadingAction !== null || loadingSlots}
                className="px-3 py-1.5 rounded-lg bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] border border-[#FECACA] text-xs font-bold transition-all disabled:opacity-50 touch-target flex items-center gap-1.5 active:scale-[0.98]"
              >
                {batchLoadingAction === 'block_all' ? (
                  <div className="w-3 h-3 border-2 border-[#991B1B] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <IconBan size={14} className="text-[#991B1B]" />
                )}
                <span>
                  {batchLoadingAction === 'block_all'
                    ? txt('Fermeture...', 'Blocking...', 'A fechar...')
                    : txt('Bloquer Jour', 'Block Day', 'Bloquear Dia')}
                </span>
              </button>

              <button
                onClick={() => handleBatchAction('unblock_all')}
                disabled={batchLoadingAction !== null || loadingSlots}
                className="px-3 py-1.5 rounded-lg bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] border border-[#BBF7D0] text-xs font-bold transition-all disabled:opacity-50 touch-target flex items-center gap-1.5 active:scale-[0.98]"
              >
                {batchLoadingAction === 'unblock_all' ? (
                  <div className="w-3 h-3 border-2 border-[#166534] border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <IconCheck size={14} className="text-[#166534]" />
                )}
                <span>
                  {batchLoadingAction === 'unblock_all'
                    ? txt('Ouverture...', 'Unblocking...', 'A reabrir...')
                    : txt('Débloquer Tout', 'Unblock All', 'Desbloquear Tudo')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Morning & Afternoon Grids */}
        <div className="space-y-5 pt-1">
          {loadingSlots && slotList.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
              <span>{txt('Chargement des créneaux...', 'Loading slots...', 'A carregar horários...')}</span>
            </div>
          ) : (
            <>
              {/* Morning */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <IconSun size={17} className="text-[#F59E0B]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      {txt('Matinée (08:00 – 12:30)', 'Morning (08:00 – 12:30)', 'Manhã (08:00 – 12:30)')}
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {morningSlots.filter((s) => s.available && s.reason !== 'blocked').length}{' '}
                    {txt('libres', 'open', 'livres')}
                  </span>
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {morningSlots.filter(filterSlotItem).map(renderSlotCard)}
                </div>
              </div>

              {/* Afternoon */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <IconSunset size={17} className="text-[#D97706]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                      {txt('Après-midi (14:00 – 18:30)', 'Afternoon (14:00 – 18:30)', 'Tarde (14:00 – 18:30)')}
                    </h4>
                  </div>
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {afternoonSlots.filter((s) => s.available && s.reason !== 'blocked').length}{' '}
                    {txt('libres', 'open', 'livres')}
                  </span>
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {afternoonSlots.filter(filterSlotItem).map(renderSlotCard)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Period / Vacation Blocking Modal */}
      <ResponsiveModal
        isOpen={isRangeModalOpen}
        onClose={() => {
          if (!rangeSubmitting) setIsRangeModalOpen(false);
        }}
        title={txt('Fermeture Exceptionnelle / Période', 'Block Period / Vacation Days', 'Bloquear Período / Férias')}
        subtitle={txt(
          'Bloquer ou débloquer une plage de dates (congés, vacances, jours fériés)',
          'Block or unblock date range for vacations and clinic closure',
          'Bloquear ou reabrir múltiplos dias para férias e encerramentos'
        )}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
              <IconAlertCircle size={16} className="text-[#2563EB]" />
              <span>{txt('Gestion multi-jours sécurisée', 'Safe multi-day management', 'Gestão segura de múltiplos dias')}</span>
            </div>
            <p className="text-[#64748B] text-[11px]">
              {txt(
                'Les rendez-vous patients existants sont automatiquement protégés et ne seront pas écrasés.',
                'Existing booked appointments are automatically protected and will not be overwritten.',
                'As consultas já marcadas por utentes são protegidas e não serão canceladas.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#475569]">
                {txt('Date de début', 'Start Date', 'Data de Início')}
              </label>
              <input
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-bold outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[#475569]">
                {txt('Date de fin', 'End Date', 'Data de Fim')}
              </label>
              <input
                type="date"
                value={rangeEndDate}
                min={rangeStartDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-bold outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-[#475569]">
              {txt('Créneaux concernés', 'Slot Scope', 'Horários Abrangidos')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'day' as const, label: txt('Journée entière', 'Full Day', 'Dia Inteiro') },
                { id: 'morning' as const, label: txt('Matin uniquement', 'Morning Only', 'Apenas Manhã') },
                { id: 'afternoon' as const, label: txt('Après-midi uniquem.', 'Afternoon Only', 'Apenas Tarde') },
              ].map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setRangeScope(sc.id)}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                    rangeScope === sc.id
                      ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-2xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => handleRangeSubmit('unblock')}
              disabled={rangeSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#BBF7D0] bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {rangeSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-[#166534] border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconCheck size={15} />
              )}
              <span>{txt('Débloquer la période', 'Unblock Period', 'Desbloquear Período')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleRangeSubmit('block')}
              disabled={rangeSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {rangeSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconBan size={15} />
              )}
              <span>{txt('Bloquer la période', 'Block Period', 'Bloquear Período')}</span>
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
});