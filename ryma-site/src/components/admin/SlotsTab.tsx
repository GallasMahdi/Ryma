'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCheck,
  IconLock,
  IconBan,
  IconSun,
  IconSunset,
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
  toggleSlot: (time: string) => void;
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
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

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

  const morningSlots = useMemo(() => {
    return slotList.filter(s => MORNING_TIMES.includes(s.time));
  }, [slotList]);

  const afternoonSlots = useMemo(() => {
    return slotList.filter(s => AFTERNOON_TIMES.includes(s.time));
  }, [slotList]);

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
          toggleSlot('08:30');
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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => {
          if (!isSunday && !isBooked && !loadingSlots && !batchProcessing) {
            toggleSlot(st.time);
          }
        }}
        className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col justify-between min-h-[105px] select-none ${
          !isSunday && !isBooked ? 'cursor-pointer hover:shadow-xs' : ''
        } ${
          isBlocked
            ? 'bg-[#FEF2F2] border-[#FECACA]'
            : isBooked
            ? 'bg-[#F8FAFC] border-[#E2E8F0]'
            : isSunday
            ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-50 cursor-not-allowed'
            : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
        }`}
      >
        {/* Top: Time & Status */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-semibold text-sm text-[#0F172A]">
            {st.time}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
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
              ? txt('Indisponible', 'Unavailable', 'Indisponível')
              : isSunday
              ? txt('Fermeture', 'Closed', 'Encerrado')
              : txt('Disponible à la réservation', 'Available for booking', 'Livre para marcação')}
          </div>
        )}

        {/* Action Button */}
        {!isSunday && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isBooked && !loadingSlots && !batchProcessing) {
                toggleSlot(st.time);
              }
            }}
            disabled={isBooked || batchProcessing}
            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors touch-target flex items-center justify-center ${
              isBooked
                ? 'opacity-40 cursor-not-allowed bg-transparent text-[#94A3B8]'
                : isBlocked
                ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
                : 'bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0]'
            }`}
          >
            {isBlocked
              ? txt('Débloquer', 'Unblock', 'Desbloquear')
              : isBooked
              ? txt('Occupé', 'Booked', 'Ocupado')
              : txt('Bloquer', 'Block', 'Bloquear')}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4 sm:space-y-5">
        {/* Header & Date Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base sm:text-lg text-[#0F172A]">
                {txt('Créneaux & Horaires', 'Schedule & Slot Management', 'Gestão de Horários & Agenda')}
              </h3>
              {slotDateMeta.isSunday && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B]">
                  {txt('Dimanche fermé', 'Sunday closed', 'Domingo fechado')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              {slotDateMeta.title} • {slotDateMeta.subtitle}
            </p>
          </div>

          {/* Date controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, -1))}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
                title={txt('Jour précédent', 'Previous day', 'Dia anterior')}
              >
                <IconChevronLeft size={16} />
              </button>

              <button
                onClick={() => setSelectedDateForSlots(todayStr)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedDateForSlots === todayStr
                    ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {txt("Auj.", 'Today', 'Hoje')}
              </button>

              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, 1))}
                className="p-1.5 rounded-md text-[#64748B] hover:text-[#0F172A] transition-colors touch-target flex items-center justify-center"
                title={txt('Jour suivant', 'Next day', 'Dia seguinte')}
              >
                <IconChevronRight size={16} />
              </button>
            </div>

            <input
              type="date"
              value={selectedDateForSlots}
              onChange={e => setSelectedDateForSlots(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        {/* 7-Day Quick Strip */}
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-[#64748B] font-medium">
            {txt('7 Prochains Jours', 'Next 7 Days', 'Próximos 7 Dias')}
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {next7Days.map(dateStr => {
              const meta = formatSlotDateLabel(dateStr, lang);
              const isSelected = selectedDateForSlots === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateForSlots(dateStr)}
                  className={`p-2.5 rounded-xl border text-center transition-colors flex flex-col items-center justify-center gap-0.5 touch-target ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs font-semibold'
                      : meta.isSunday
                      ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                  }`}
                >
                  <span className="text-[10px] uppercase font-semibold">
                    {meta.title.substring(0, 3)}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[#64748B]'}`}>
                    {meta.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#64748B]">{txt('Total', 'Total', 'Total')}</div>
              <div className="text-xl font-semibold text-[#0F172A]">{slotStats.total}</div>
            </div>
            <IconClock size={18} className="text-[#94A3B8]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#166534]">{txt('Libres', 'Available', 'Livres')}</div>
              <div className="text-xl font-semibold text-[#166534]">{slotStats.available}</div>
            </div>
            <IconCheck size={18} className="text-[#166534]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#334155]">{txt('Réservés', 'Booked', 'Ocupados')}</div>
              <div className="text-xl font-semibold text-[#334155]">{slotStats.booked}</div>
            </div>
            <IconLock size={18} className="text-[#64748B]" />
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#991B1B]">{txt('Bloqués', 'Blocked', 'Bloqueados')}</div>
              <div className="text-xl font-semibold text-[#991B1B]">{slotStats.blocked}</div>
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
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSlotFilter(tab.id as typeof slotFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  slotFilter === tab.id
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Actions Toolbar */}
          {!slotDateMeta.isSunday && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => handleBatchAction('block_morning')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] text-xs font-medium transition-colors disabled:opacity-50 touch-target"
              >
                {txt('Bloquer Matin', 'Block Morning', 'Bloquear Manhã')}
              </button>

              <button
                onClick={() => handleBatchAction('block_afternoon')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] text-xs font-medium transition-colors disabled:opacity-50 touch-target"
              >
                {txt('Bloquer Après-midi', 'Block Afternoon', 'Bloquear Tarde')}
              </button>

              <button
                onClick={() => handleBatchAction('block_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] text-xs font-medium transition-colors disabled:opacity-50 touch-target"
              >
                {txt('Bloquer Jour', 'Block Day', 'Bloquear Dia')}
              </button>

              <button
                onClick={() => handleBatchAction('unblock_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#166534] hover:bg-[#BBF7D0] text-xs font-medium transition-colors disabled:opacity-50 touch-target"
              >
                {txt('Débloquer Tout', 'Unblock All', 'Desbloquear Tudo')}
              </button>
            </div>
          )}
        </div>

        {/* Morning & Afternoon Grids */}
        <div className="space-y-5 pt-1">
          {loadingSlots && slotList.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              <span>{txt('Chargement des créneaux...', 'Loading slots...', 'A carregar horários...')}</span>
            </div>
          ) : (
            <>
              {/* Morning */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <IconSun size={17} className="text-[#F59E0B]" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      {txt('Matinée (08:00 – 12:30)', 'Morning (08:00 – 12:30)', 'Manhã (08:00 – 12:30)')}
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {morningSlots.filter(s => s.available && s.reason !== 'blocked').length} {txt('libres', 'open', 'livres')}
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
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                      {txt('Après-midi (14:00 – 18:30)', 'Afternoon (14:00 – 18:30)', 'Tarde (14:00 – 18:30)')}
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#64748B]">
                    {afternoonSlots.filter(s => s.available && s.reason !== 'blocked').length} {txt('libres', 'open', 'livres')}
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
    </div>
  );
}