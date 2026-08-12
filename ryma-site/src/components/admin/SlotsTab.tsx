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

interface SlotsTabProps {
  lang: 'fr' | 'ar';
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
        className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[125px] ${
          !isSunday && !isBooked ? 'cursor-pointer hover:scale-[1.02]' : ''
        } ${
          isBlocked
            ? 'bg-[#FDF3F2] border-[#A9655F]/30 hover:border-[#A9655F]'
            : isBooked
            ? 'bg-[#FAF6EE] border-[#C6A15B]/40 shadow-xs'
            : isSunday
            ? 'bg-[#FAFAF8] border-[#E9E6DF] opacity-60 cursor-not-allowed'
            : 'bg-white border-[#E9E6DF] hover:border-[#C6A15B] hover:bg-[#FAF6EE]/40 shadow-xs'
        }`}
      >
        {/* Top bar: Time & Status Badge */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-base font-bold text-[#202020] tracking-wide">
            {st.time}
          </span>
          <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
            isBlocked
              ? 'bg-[#A9655F]/15 text-[#A9655F] border-[#A9655F]/30'
              : isBooked
              ? 'bg-[#C6A15B]/20 text-[#9B793A] border-[#C6A15B]/30'
              : isSunday
              ? 'bg-[#77736B]/10 text-[#77736B] border-[#77736B]/20'
              : 'bg-[#6F8F72]/15 text-[#6F8F72] border-[#6F8F72]/30'
          }`}>
            {isBlocked
              ? (lang === 'fr' ? '🚫 Bloqué' : 'محظور')
              : isBooked
              ? (lang === 'fr' ? '🔒 Réservé' : 'محجوز')
              : isSunday
              ? (lang === 'fr' ? 'Fermé' : 'مغلق')
              : (lang === 'fr' ? '✓ Libre' : 'متاح')}
          </span>
        </div>

        {/* Patient info if booked */}
        {isBooked ? (
          <div className="text-xs space-y-1 bg-white/90 p-2.5 rounded-xl border border-[#E8D7B0] mb-2 shadow-xs">
            <div className="font-bold text-[#202020] truncate flex items-center gap-1.5">
              <IconUser size={13} className="text-[#C6A15B] shrink-0" />
              <span className="truncate">{bookedAppt?.patientName ?? (lang === 'fr' ? 'Patient enregistré' : 'مريض')}</span>
            </div>
            {bookedAppt && (
              <div className="text-[11px] text-[#9B793A] truncate font-mono font-medium flex items-center gap-1">
                <IconStethoscope size={12} className="shrink-0" />
                <span className="truncate">{getServiceName(bookedAppt.service, lang)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-[#77736B] font-mono mb-2">
            {isBlocked
              ? (lang === 'fr' ? 'Créneau bloqué' : 'وقت محظور')
              : isSunday
              ? (lang === 'fr' ? 'Fermeture hebdomadaire' : 'عطلة أسبوعية')
              : (lang === 'fr' ? 'Cliquez pour bloquer' : 'انقر للحظر')}
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
            className={`w-full py-1.5 px-3 rounded-xl font-mono text-[11px] font-semibold transition-all mt-auto flex items-center justify-center gap-1.5 ${
              isBooked
                ? 'opacity-40 cursor-not-allowed bg-black/5 text-[#77736B]'
                : isBlocked
                ? 'bg-[#A9655F]/15 hover:bg-[#A9655F]/25 text-[#A9655F] border border-[#A9655F]/30'
                : 'bg-[#6F8F72]/15 hover:bg-[#6F8F72]/25 text-[#6F8F72] border border-[#6F8F72]/30'
            }`}
          >
            {isBlocked
              ? (lang === 'fr' ? 'Débloquer' : 'إلغاء الحظر')
              : isBooked
              ? (lang === 'fr' ? 'Créneau réservé' : 'محجوز')
              : (lang === 'fr' ? 'Bloquer ce créneau' : 'حظر هذا الوقت')}
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-[#E9E6DF] space-y-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">

        {/* Header & Date Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#E9E6DF]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-serif text-xl font-bold text-[#202020]">
                {lang === 'fr' ? 'Planning & Créneaux Horaires' : 'جدول الأوقات والحجوزات'}
              </h3>
              {slotDateMeta.isSunday && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#A9655F]/10 border border-[#A9655F]/30 text-[#A9655F] font-semibold">
                  {lang === 'fr' ? 'Cabinet Fermé (Dimanche)' : 'العيادة مغلقة (الأحد)'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#77736B] font-mono">
              {slotDateMeta.title} • {slotDateMeta.subtitle}
            </p>
          </div>

          {/* Navigation Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#FAFAF8] p-1 rounded-2xl border border-[#E9E6DF]">
              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, -1))}
                className="p-2 rounded-xl text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] transition-all"
                title={lang === 'fr' ? 'Jour précédent' : 'اليوم السابق'}
              >
                <IconChevronLeft size={18} />
              </button>

              <button
                onClick={() => setSelectedDateForSlots(todayStr)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                  selectedDateForSlots === todayStr
                    ? 'bg-[#C6A15B] text-white shadow-xs'
                    : 'text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE]'
                }`}
              >
                {lang === 'fr' ? "Aujourd'hui" : 'اليوم'}
              </button>

              <button
                onClick={() => setSelectedDateForSlots(prev => shiftDateString(prev, 1))}
                className="p-2 rounded-xl text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] transition-all"
                title={lang === 'fr' ? 'Jour suivant' : 'اليوم التالي'}
              >
                <IconChevronRight size={18} />
              </button>
            </div>

            {/* Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDateForSlots}
                onChange={e => setSelectedDateForSlots(e.target.value)}
                className="bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] px-3.5 py-2 rounded-2xl font-mono text-xs focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B] font-semibold"
              />
            </div>
          </div>
        </div>

        {/* 7-Day Quick Date Strip / Carousel */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase text-[#77736B] tracking-wider font-semibold">
            {lang === 'fr' ? 'Accès Rapide (7 Prochains Jours)' : 'وصول سريع (الأيام السبعة القادمة)'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {next7Days.map(dateStr => {
              const meta = formatSlotDateLabel(dateStr, lang);
              const isSelected = selectedDateForSlots === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDateForSlots(dateStr)}
                  className={`p-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#C6A15B] to-[#9B793A] border-[#C6A15B] text-white shadow-[0_4px_16px_rgba(198,161,91,0.25)] scale-[1.02]'
                      : meta.isSunday
                      ? 'bg-[#FAFAF8] border-[#A9655F]/20 text-[#A9655F]/70 hover:bg-[#FDF3F2]'
                      : 'bg-white border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:border-[#C6A15B]/50 hover:bg-[#FAF6EE]'
                  }`}
                >
                  <span className="font-mono text-[11px] uppercase font-bold tracking-wider opacity-90">
                    {meta.title}
                  </span>
                  <span className="font-mono text-xs font-semibold">
                    {meta.subtitle.split(' ')[0]} {meta.subtitle.split(' ')[1]}
                  </span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Density, Status Stats & Occupancy Gauge */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E9E6DF] flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase font-semibold text-[#77736B]">{lang === 'fr' ? 'Créneaux Total' : 'إجمالي المواعيد'}</div>
                <div className="font-mono text-lg font-bold text-[#202020]">{slotStats.total}</div>
              </div>
              <IconClock size={20} className="text-[#77736B]" />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#6F8F72]/10 border border-[#6F8F72]/30 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase font-semibold text-[#6F8F72]">{lang === 'fr' ? 'Libres' : 'متاحة'}</div>
                <div className="font-mono text-lg font-bold text-[#6F8F72]">{slotStats.available}</div>
              </div>
              <IconCheck size={20} className="text-[#6F8F72]" />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6EE] border border-[#C6A15B]/30 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase font-semibold text-[#9B793A]">{lang === 'fr' ? 'Réservés' : 'محجوزة'}</div>
                <div className="font-mono text-lg font-bold text-[#9B793A]">{slotStats.booked}</div>
              </div>
              <IconLock size={20} className="text-[#9B793A]" />
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FDF3F2] border border-[#A9655F]/30 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase font-semibold text-[#A9655F]">{lang === 'fr' ? 'Bloqués' : 'محظورة'}</div>
                <div className="font-mono text-lg font-bold text-[#A9655F]">{slotStats.blocked}</div>
              </div>
              <IconBan size={20} className="text-[#A9655F]" />
            </div>
          </div>

          {/* Daily Occupancy Rate Bar */}
          {!slotDateMeta.isSunday && (
            <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E9E6DF] space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-semibold text-[#202020] flex items-center gap-1.5">
                  <span>📊 {lang === 'fr' ? 'Occupabilité de la journée' : 'نسبة اشغال اليوم'}</span>
                  <span className="text-[#9B793A] font-bold">({occupancyRate}%)</span>
                </span>
                <span className="text-[#77736B] text-[11px]">
                  {slotStats.booked} / {slotList.filter(s => s.reason !== 'sunday').length} {lang === 'fr' ? 'créneaux occupés' : 'موعد محجوز'}
                </span>
              </div>
              <div className="w-full bg-[#E9E6DF] rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${occupancyRate}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#C6A15B] to-[#9B793A]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Batch Actions & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 pb-1 border-t border-[#E9E6DF]">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
            <span className="text-[#77736B] me-1 flex items-center gap-1 font-semibold text-[11px]">
              <IconFilter size={14} />
              <span>{lang === 'fr' ? 'Filtre:' : 'تصفية:'}</span>
            </span>
            {[
              { id: 'all', label: lang === 'fr' ? `Tous (${slotList.length})` : `الكل (${slotList.length})` },
              { id: 'available', label: lang === 'fr' ? `Libres (${slotStats.available})` : `متاح (${slotStats.available})` },
              { id: 'booked', label: lang === 'fr' ? `Réservés (${slotStats.booked})` : `محجوز (${slotStats.booked})` },
              { id: 'blocked', label: lang === 'fr' ? `Bloqués (${slotStats.blocked})` : `محظور (${slotStats.blocked})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSlotFilter(tab.id as typeof slotFilter)}
                className={`px-3 py-1.5 rounded-xl transition-all font-semibold whitespace-nowrap ${
                  slotFilter === tab.id
                    ? 'bg-[#C6A15B] text-white shadow-xs'
                    : 'bg-[#FAFAF8] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Batch Actions Buttons for Kiné */}
          {!slotDateMeta.isSunday && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBatchAction('block_morning')}
                disabled={batchProcessing || loadingSlots}
                className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#9B793A] hover:bg-[#F4ECE0] font-mono text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title={lang === 'fr' ? 'Bloquer tous les créneaux libres du matin' : 'حظر صبيحة اليوم'}
              >
                <IconSun size={14} className="text-[#C6A15B]" />
                <span>{lang === 'fr' ? 'Bloquer Matin' : 'حظر الصباح'}</span>
              </button>

              <button
                onClick={() => handleBatchAction('block_afternoon')}
                disabled={batchProcessing || loadingSlots}
                className="px-3 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#9B793A] hover:bg-[#F4ECE0] font-mono text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title={lang === 'fr' ? 'Bloquer tous les créneaux libres de l\'après-midi' : 'حظر مسائية اليوم'}
              >
                <IconSunset size={14} className="text-[#C6A15B]" />
                <span>{lang === 'fr' ? 'Bloquer Après-midi' : 'حظر المساء'}</span>
              </button>

              <button
                onClick={() => handleBatchAction('block_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-3 py-1.5 rounded-xl bg-[#FDF3F2] border border-[#A9655F]/30 text-[#A9655F] hover:bg-[#A9655F]/20 font-mono text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title={lang === 'fr' ? 'Bloquer toute la journée (congé/formation)' : 'حظر اليوم بالكامل'}
              >
                <IconLock size={14} />
                <span>{lang === 'fr' ? 'Tout bloquer' : 'حظر الكل'}</span>
              </button>

              <button
                onClick={() => handleBatchAction('unblock_all')}
                disabled={batchProcessing || loadingSlots}
                className="px-3 py-1.5 rounded-xl bg-[#6F8F72]/15 border border-[#6F8F72]/30 text-[#6F8F72] hover:bg-[#6F8F72]/25 font-mono text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title={lang === 'fr' ? 'Débloquer tous les créneaux bloqués' : 'إلغاء حظر الكل'}
              >
                <IconBolt size={14} />
                <span>{lang === 'fr' ? 'Tout débloquer' : 'إلغاء الحظر'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Shift Division Display: Morning & Afternoon */}
        <div className="space-y-6 pt-2">
          {loadingSlots && slotList.length === 0 ? (
            <div className="py-16 text-center text-[#77736B] font-mono text-xs flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
              <span>{lang === 'fr' ? 'Chargement du planning...' : 'جارٍ تحميل الجدول...'}</span>
            </div>
          ) : (
            <>
              {/* 🌅 Session du Matin */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E9E6DF]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] flex items-center justify-center text-[#C6A15B]">
                      <IconSun size={16} />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-[#202020]">
                        {lang === 'fr' ? 'Session du Matin (08:00 – 12:30)' : 'الفترة الصباحية (08:00 – 12:30)'}
                      </h4>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#77736B] font-medium">
                    {morningSlots.filter(s => s.available && s.reason !== 'blocked').length} {lang === 'fr' ? 'libres' : 'متاح'} • {morningSlots.filter(s => !s.available && s.reason === 'booked').length} {lang === 'fr' ? 'réservés' : 'محجوز'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {morningSlots.filter(filterSlotItem).map(renderSlotCard)}
                </div>
              </div>

              {/* ☀️ Session de l'Après-midi */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E9E6DF]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] flex items-center justify-center text-[#C6A15B]">
                      <IconSunset size={16} />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-[#202020]">
                        {lang === 'fr' ? "Session de l'Après-midi (14:00 – 18:30)" : 'الفترة المسائية (14:00 – 18:30)'}
                      </h4>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-[#77736B] font-medium">
                    {afternoonSlots.filter(s => s.available && s.reason !== 'blocked').length} {lang === 'fr' ? 'libres' : 'متاح'} • {afternoonSlots.filter(s => !s.available && s.reason === 'booked').length} {lang === 'fr' ? 'réservés' : 'محجوز'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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