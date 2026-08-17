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
  IconBolt,
  IconFilter,
  IconUser,
  IconStethoscope,
} from '@tabler/icons-react';
import {
  SlotInfo,
  Appointment,
  formatSlotDateLabel,
  shiftDateString,
  getServiceName,
} from '@/types/admin';

import { Lang } from '@/lib/i18n';

interface SlotsTabProps {
  lang: Lang;
  selectedDateForSlots: string;
  setSelectedDateForSlots: React.Dispatch<React.SetStateAction<string>>;
  todayStr: string;
  next7Days: string[];
  slotList: SlotInfo[];
  loadingSlots: boolean;
  appointments: Appointment[];
  toggleSlot: (date: string, time: string) => void;
  refreshSlots?: (date: string) => void;
}

const MORNING_TIMES = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const AFTERNOON_TIMES = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

export function SlotsTab({
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
}: SlotsTabProps) {
  const [slotFilter, setSlotFilter] = useState<'all' | 'available' | 'booked' | 'blocked'>('all');
  const [batchProcessing, setBatchProcessing] = useState(false);

  const slotDateMeta = formatSlotDateLabel(selectedDateForSlots, lang);

  const slotStats = useMemo(() => {
    return {
      total: slotList.length,
      available: slotList.filter(s => s.available && s.reason !== 'blocked').length,
      booked: slotList.filter(s => !s.available && s.reason === 'booked').length,
      blocked: slotList.filter(s => s.reason === 'blocked').length,
    };
  }, [slotList]);

  const occupancyRate = useMemo(() => {
    const valid = slotList.filter(s => s.reason !== 'sunday').length;
    if (valid === 0) return 0;
    return Math.round((slotStats.booked / valid) * 100);
  }, [slotList, slotStats.booked]);

  // Morning vs Afternoon split
  const morningSlots = useMemo(() => {
    return slotList.filter(s => MORNING_TIMES.includes(s.time));
  }, [slotList]);

  const afternoonSlots = useMemo(() => {
    return slotList.filter(s => AFTERNOON_TIMES.includes(s.time));
  }, [slotList]);

  // Batch action handlers — uses atomic server transaction
  const handleBatchAction = async (action: 'block_morning' | 'block_afternoon' | 'block_all' | 'unblock_all') => {
    if (batchProcessing || slotDateMeta.isSunday) return;
    setBatchProcessing(true);

    try {
      let scope: 'day' | 'morning' | 'afternoon' = 'day';
      let act: 'block' | 'unblock' = 'block';

      if (action === 'block_morning') { scope = 'morning'; act = 'block'; }
      else if (action === 'block_afternoon') { scope = 'afternoon'; act = 'block'; }
      else if (action === 'block_all') { scope = 'day'; act = 'block'; }
      else if (action === 'unblock_all') { scope = 'day'; act = 'unblock'; }

      const res = await fetch('/api/admin/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateForSlots, scope, action: act }),
      });

      if (res.ok) {
        if (refreshSlots) {
          refreshSlots(selectedDateForSlots);
        } else {
          toggleSlot(selectedDateForSlots, '08:30');
        }
      }
    } catch {
      /* silent */
    } finally {
      setBatchProcessing(false);
    }
  };

  const filterSlotItem = (st: SlotInfo) => {
    if (slotFilter === 'available') return st.available && st.reason !== 'blocked';
    if (slotFilter === 'booked') return !st.available && st.reason === 'booked';
    if (slotFilter === 'blocked') return st.reason === 'blocked';
    return true;
  };

  const renderSlotCard = (st: SlotInfo) => {
    const bookedAppt = st.appointmentId
      ? appointments.find(a => a.id === st.appointmentId)
      : null;

    const isBlocked = st.reason === 'blocked';
    const isBooked = !st.available && st.reason === 'booked';
    const isSunday = st.reason === 'sunday';

    return (
      <motion.div
        key={st.time}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          if (!isSunday && !isBooked && !loadingSlots && !batchProcessing) {
            toggleSlot(selectedDateForSlots, st.time);
          }
        }}
        className={`p-3 rounded-xl border transition-colors flex flex-col justify-between min-h-[96px] ${
          !isSunday && !isBooked ? 'cursor-pointer' : ''
        } ${
          isBlocked
            ? 'bg-[#FEF2F2] border-[#FECACA]'
            : isBooked
            ? 'bg-[#F8FAFC] border-[#CBD5E1]'
            : isSunday
            ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-50 cursor-not-allowed'
            : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
        }`}
      >
        {/* Top bar: Time & Status Badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-[#0F172A]">
            {st.time}
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
            isBlocked
              ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
              : isBooked
              ? 'bg-[#E2E8F0] text-[#334155] border-[#CBD5E1]'
              : isSunday
              ? 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]'
              : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
          }`}>
            {isBlocked
              ? (lang === 'pt' ? 'Bloqueado' : lang === 'en' ? 'Blocked' : 'Bloqué')
              : isBooked
              ? (lang === 'pt' ? 'Ocupado' : lang === 'en' ? 'Booked' : 'Réservé')
              : isSunday
              ? (lang === 'pt' ? 'Encerrado' : lang === 'en' ? 'Closed' : 'Fermé')
              : (lang === 'pt' ? 'Disponível' : lang === 'en' ? 'Available' : 'Libre')}
          </span>
        </div>

        {/* Patient info if booked */}
        {isBooked ? (
          <div className="text-xs bg-white p-2 rounded border border-[#E2E8F0] mb-2 space-y-0.5">
            <div className="font-medium text-[#0F172A] truncate">
              {bookedAppt?.patientName ?? (lang === 'pt' ? 'Utente registado' : lang === 'en' ? 'Patient booked' : 'Patient')}
            </div>
            {bookedAppt && (
              <div className="text-[11px] text-[#64748B] truncate">
                {getServiceName(bookedAppt.service, lang)}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-[#64748B] mb-2">
            {isBlocked
              ? (lang === 'pt' ? 'Indisponível' : lang === 'en' ? 'Unavailable' : 'Indisponible')
              : isSunday
              ? (lang === 'pt' ? 'Encerramento' : lang === 'en' ? 'Closed' : 'Fermé')
              : (lang === 'pt' ? 'Livre para marcação' : lang === 'en' ? 'Open for booking' : 'Libre')}
          </div>
        )}

        {/* Action button */}
        {!isSunday && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isBooked && !loadingSlots && !batchProcessing) {
                toggleSlot(selectedDateForSlots, st.time);
              }
            }}
            disabled={isBooked || batchProcessing}
            className={`w-full py-1 px-2.5 rounded text-[11px] font-medium transition-colors mt-auto ${
              isBooked
                ? 'opacity-40 cursor-not-allowed bg-transparent text-[#94A3B8]'
                : isBlocked
                ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
                : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
            }`}
          >
            {isBlocked
              ? (lang === 'pt' ? 'Desbloquear' : lang === 'en' ? 'Unblock' : 'Débloquer')
              : isBooked
              ? (lang === 'pt' ? 'Ocupado' : lang === 'en' ? 'Booked' : 'Réservé')
              : (lang === 'pt' ? 'Bloquear' : lang === 'en' ? 'Block' : 'Bloquer')}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] space-y-5">

        {/* Header & Date Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h3 className="text-base font-semibold text-[#0F172A]">
                {lang === 'pt' ? 'Gestão de Horários & Agenda' : lang === 'en' ? 'Schedule & Slot Management' : 'Planning & Créneaux Horaires'}
              </h3>
              {slotDateMeta.isSunday && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] font-medium">
                  {lang === 'pt' ? 'Domingo Encerrado' : lang === 'en' ? 'Closed (Sunday)' : 'Fermé (Dimanche)'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#77736B] font-mono">
              {slotDateMeta.title} • {slotDateMeta.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, -1))}
                className="p-1.5 rounded text-[#64748B] hover:text-[#0F172A] transition-colors"
                title={lang === 'pt' ? 'Dia anterior' : lang === 'en' ? 'Previous day' : 'Jour précédent'}
              >
                <IconChevronLeft size={16} />
              </button>

              <button
                onClick={() => setSelectedDateForSlots(todayStr)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedDateForSlots === todayStr
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {lang === 'pt' ? 'Hoje' : lang === 'en' ? 'Today' : "Aujourd'hui"}
              </button>

              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, 1))}
                className="p-1.5 rounded text-[#64748B] hover:text-[#0F172A] transition-colors"
                title={lang === 'pt' ? 'Dia seguinte' : lang === 'en' ? 'Next day' : 'Jour suivant'}
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            {/* Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDateForSlots}
                onChange={e => setSelectedDateForSlots(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 7-Day Quick Date Strip */}
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-medium">
            {lang === 'pt' ? 'Próximos 7 Dias' : lang === 'en' ? 'Next 7 Days' : '7 Prochains Jours'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {next7Days.map(dateStr => {
              const meta = formatSlotDateLabel(dateStr, lang);
              const isSelected = selectedDateForSlots === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateForSlots(dateStr)}
                  className={`p-2.5 rounded-xl border text-center transition-colors flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#0F172A] text-white'
                      : meta.isSunday
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                  }`}
                >
                  <span className="text-[11px] uppercase font-semibold">
                    {meta.title}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                    {meta.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Density, Status Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">{lang === 'pt' ? 'Total' : lang === 'en' ? 'Total' : 'Total'}</div>
              <div className="text-xl font-semibold text-[#0F172A]">{slotStats.total}</div>
            </div>
            <IconClock size={18} className="text-[#94A3B8]" />
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#166534]">{lang === 'pt' ? 'Livres' : lang === 'en' ? 'Available' : 'Libres'}</div>
              <div className="text-xl font-semibold text-[#166534]">{slotStats.available}</div>
            </div>
            <IconCheck size={18} className="text-[#166534]" />
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#334155]">{lang === 'pt' ? 'Reservados' : lang === 'en' ? 'Booked' : 'Réservés'}</div>
              <div className="text-xl font-semibold text-[#334155]">{slotStats.booked}</div>
            </div>
            <IconLock size={18} className="text-[#64748B]" />
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#991B1B]">{lang === 'pt' ? 'Bloqueados' : lang === 'en' ? 'Blocked' : 'Bloqués'}</div>
              <div className="text-xl font-semibold text-[#991B1B]">{slotStats.blocked}</div>
            </div>
            <IconBan size={18} className="text-[#991B1B]" />
          </div>
        </div>

        {/* Quick Batch Actions & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 pb-1 border-t border-[#E2E8F0]">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {[
              { id: 'all', label: lang === 'pt' ? `Todos (${slotList.length})` : lang === 'en' ? `All (${slotList.length})` : `Tous (${slotList.length})` },
              { id: 'available', label: lang === 'pt' ? `Livres (${slotStats.available})` : lang === 'en' ? `Available (${slotStats.available})` : `Libres (${slotStats.available})` },
              { id: 'booked', label: lang === 'pt' ? `Reservados (${slotStats.booked})` : lang === 'en' ? `Booked (${slotStats.booked})` : `Réservés (${slotStats.booked})` },
              { id: 'blocked', label: lang === 'pt' ? `Bloqueados (${slotStats.blocked})` : lang === 'en' ? `Blocked (${slotStats.blocked})` : `Bloqués (${slotStats.blocked})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSlotFilter(tab.id as typeof slotFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  slotFilter === tab.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Actions Buttons */}
          {!slotDateMeta.isSunday && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBatchAction('block_morning')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {lang === 'pt' ? 'Bloquear Manhã' : lang === 'en' ? 'Block Morning' : 'Bloquer Matin'}
              </button>

              <button
                onClick={() => handleBatchAction('block_afternoon')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {lang === 'pt' ? 'Bloquear Tarde' : lang === 'en' ? 'Block Afternoon' : 'Bloquer Après-midi'}
              </button>

              <button
                onClick={() => handleBatchAction('block_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {lang === 'pt' ? 'Bloquear Dia' : lang === 'en' ? 'Block Day' : 'Bloquer Jour'}
              </button>

              <button
                onClick={() => handleBatchAction('unblock_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-xs font-medium transition-colors disabled:opacity-50"
              >
                {lang === 'pt' ? 'Desbloquear Tudo' : lang === 'en' ? 'Unblock All' : 'Tout Débloquer'}
              </button>
            </div>
          )}
        </div>

        {/* Shift Division Display: Morning & Afternoon */}
        <div className="space-y-5 pt-1">
          {loadingSlots && slotList.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] text-xs flex items-center justify-center gap-2.5">
              <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              <span>{lang === 'pt' ? 'A carregar horários...' : lang === 'en' ? 'Loading schedule...' : 'Chargement du planning...'}</span>
            </div>
          ) : (
            <>
              {/* Morning Session */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                    {lang === 'pt' ? 'Manhã (08:00 – 12:30)' : lang === 'en' ? 'Morning (08:00 – 12:30)' : 'Matin (08:00 – 12:30)'}
                  </h4>
                  <span className="text-[11px] text-[#64748B]">
                    {morningSlots.filter(s => s.available && s.reason !== 'blocked').length} livres • {morningSlots.filter(s => !s.available && s.reason === 'booked').length} ocupados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {morningSlots.filter(filterSlotItem).map(renderSlotCard)}
                </div>
              </div>

              {/* Afternoon Session */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                    {lang === 'pt' ? 'Tarde (14:00 – 18:30)' : lang === 'en' ? 'Afternoon (14:00 – 18:30)' : 'Après-midi (14:00 – 18:30)'}
                  </h4>
                  <span className="text-[11px] text-[#64748B]">
                    {afternoonSlots.filter(s => s.available && s.reason !== 'blocked').length} livres • {afternoonSlots.filter(s => !s.available && s.reason === 'booked').length} ocupados
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {afternoonSlots.filter(filterSlotItem).map(renderSlotCard)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}