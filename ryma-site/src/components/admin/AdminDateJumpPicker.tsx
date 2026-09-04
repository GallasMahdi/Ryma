'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconSparkles,
  IconX,
  IconCheck,
  IconClock,
  IconArrowRight,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { formatLocalDate } from '@/types/admin';

interface AdminDateJumpPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  lang: Lang;
  appointmentDatesMap?: Record<string, number>; // date -> count of appointments
  showAllOption?: boolean;
  onClearDateFilter?: () => void;
  isDateFilterActive?: boolean;
  buttonVariant?: 'header' | 'toolbar' | 'compact';
}

const MONTH_NAMES: Record<Lang, string[]> = {
  pt: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  fr: [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ],
};

const WEEKDAY_NAMES: Record<Lang, string[]> = {
  pt: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export const AdminDateJumpPicker = React.memo(function AdminDateJumpPicker({
  selectedDate,
  onSelectDate,
  lang,
  appointmentDatesMap = {},
  showAllOption = false,
  onClearDateFilter,
  isDateFilterActive = false,
  buttonVariant = 'header',
}: AdminDateJumpPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatLocalDate(d);
  }, []);

  // Calendar display state (Year and Month being viewed in picker)
  const [viewYear, setViewYear] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[0], 10);
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return parseInt(selectedDate.split('-')[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  // Sync view when selectedDate changes externally
  useEffect(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [selectedDate]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(todayStr);
    setIsOpen(false);
  };

  const handleJumpTomorrow = () => {
    onSelectDate(tomorrowStr);
    setIsOpen(false);
  };

  const handleJumpNextWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const dateStr = formatLocalDate(d);
    onSelectDate(dateStr);
    setIsOpen(false);
  };

  const handleJumpNextMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const dateStr = formatLocalDate(d);
    onSelectDate(dateStr);
    setIsOpen(false);
  };

  // Generate calendar days for viewYear / viewMonth
  const calendarDays = useMemo(() => {
    if (!isOpen) return [];
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Monday as 0, Sunday as 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isPast: boolean;
      appointmentCount: number;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0, 12, 0, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPast: dateStr < todayStr,
        appointmentCount: appointmentDatesMap[dateStr] || 0,
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPast: dateStr < todayStr,
        appointmentCount: appointmentDatesMap[dateStr] || 0,
      });
    }

    // Next month padding to complete 42 grid cells (6 rows)
    const remaining = 42 - days.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPast: dateStr < todayStr,
        appointmentCount: appointmentDatesMap[dateStr] || 0,
      });
    }

    return days;
  }, [isOpen, viewYear, viewMonth, selectedDate, todayStr, appointmentDatesMap]);

  // Formatted date label for trigger button
  const formattedTriggerLabel = useMemo(() => {
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      return txt('Choisir une date', 'Pick a date', 'Escolher data');
    }
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'pt-PT';
    return dateObj.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate, lang]);

  const calendarBody = (
    <div className="space-y-3.5">
      {/* Header with Month/Year Navigation */}
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5 sm:pb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-8 h-8 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] flex items-center justify-center transition-colors touch-target"
          title={txt('Mois précédent', 'Previous month', 'Mês anterior')}
        >
          <IconChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs font-bold text-[#0F172A] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          >
            {MONTH_NAMES[lang].map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs font-bold text-[#0F172A] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          >
            {Array.from({ length: 7 }, (_, i) => 2024 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="w-8 h-8 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] flex items-center justify-center transition-colors touch-target"
          title={txt('Mois suivant', 'Next month', 'Mês seguinte')}
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {/* Quick Presets Strip */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-medium">
        <button
          type="button"
          onClick={handleJumpToday}
          className={`py-1.5 sm:py-1 px-1 rounded-lg border text-center transition-colors truncate ${
            selectedDate === todayStr
              ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold'
              : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
          }`}
        >
          {txt('Aujourd’hui', 'Today', 'Hoje')}
        </button>
        <button
          type="button"
          onClick={handleJumpTomorrow}
          className={`py-1.5 sm:py-1 px-1 rounded-lg border text-center transition-colors truncate ${
            selectedDate === tomorrowStr
              ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold'
              : 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]'
          }`}
        >
          {txt('Demain', 'Tomorrow', 'Amanhã')}
        </button>
        <button
          type="button"
          onClick={handleJumpNextWeek}
          className="py-1.5 sm:py-1 px-1 rounded-lg bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-center transition-colors truncate"
        >
          +7 {txt('Jours', 'Days', 'Dias')}
        </button>
        <button
          type="button"
          onClick={handleJumpNextMonth}
          className="py-1.5 sm:py-1 px-1 rounded-lg bg-[#F8FAFC] text-[#334155] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-center transition-colors truncate"
        >
          +1 {txt('Mois', 'Month', 'Mês')}
        </button>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAY_NAMES[lang].map((w, idx) => (
          <div
            key={idx}
            className={`text-[10px] font-bold uppercase tracking-wider py-1 ${
              idx === 6 ? 'text-[#94A3B8]' : 'text-[#64748B]'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix (7x6) */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const isSunday = (idx % 7) === 6;
          return (
            <button
              key={day.dateStr + idx}
              type="button"
              onClick={() => {
                onSelectDate(day.dateStr);
                setIsOpen(false);
              }}
              className={`h-9 rounded-xl text-xs font-semibold flex flex-col items-center justify-center relative transition-all touch-manipulation ${
                day.isSelected
                  ? 'bg-[#0F172A] text-white shadow-md ring-2 ring-[#C49A3C]/40 font-bold z-10'
                  : day.isToday
                  ? 'bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] font-bold'
                  : !day.isCurrentMonth
                  ? 'text-[#CBD5E1] hover:bg-[#F8FAFC]'
                  : isSunday
                  ? 'text-[#94A3B8] bg-[#F8FAFC]/50 hover:bg-[#F1F5F9]'
                  : 'text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              <span>{day.dayNumber}</span>
              {day.appointmentCount > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                    day.isSelected ? 'bg-[#C49A3C]' : 'bg-[#2563EB]'
                  }`}
                  title={`${day.appointmentCount} ${txt('rendez-vous', 'appointments', 'consultas')}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Actions: Native Input Jump & Show All */}
      <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#64748B] font-medium">
            {txt('Saisie:', 'Type:', 'Digitar:')}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                onSelectDate(e.target.value);
                setIsOpen(false);
              }
            }}
            className="px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] font-medium focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
          />
        </div>

        {showAllOption && (
          <button
            type="button"
            onClick={() => {
              if (onClearDateFilter) onClearDateFilter();
              setIsOpen(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-semibold text-[11px] transition-colors touch-target"
          >
            {txt('Voir tout', 'Show all', 'Ver tudo')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      {buttonVariant === 'header' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            isOpen
              ? 'bg-[#0F172A] text-white border-[#0F172A] ring-2 ring-[#0F172A]/20'
              : isDateFilterActive
              ? 'bg-[#FAF6EE] text-[#C49A3C] border-[#C49A3C] font-bold'
              : 'bg-white hover:bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0]'
          }`}
          title={txt('Sélecteur direct de calendrier', 'Jump to date in calendar', 'Salto direto de data no calendário')}
        >
          <div className="w-5 h-5 rounded-md bg-[#0F172A]/5 group-hover:bg-[#0F172A]/10 flex items-center justify-center text-[#C49A3C]">
            <IconCalendar size={13} />
          </div>
          <span className="capitalize">{formattedTriggerLabel}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-mono">
            {selectedDate}
          </span>
        </button>
      ) : buttonVariant === 'toolbar' ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isOpen || isDateFilterActive
              ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
              : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
          }`}
        >
          <IconCalendarEvent size={14} className={isDateFilterActive ? 'text-[#C49A3C]' : ''} />
          <span>{isDateFilterActive ? formattedTriggerLabel : txt('Date spécifique', 'Specific date', 'Data específica')}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] transition-colors"
          title={txt('Calendrier', 'Calendar', 'Calendário')}
        >
          <IconCalendar size={15} />
        </button>
      )}

      {/* Floating Popover Modal on Desktop / Bottom Sheet Modal on Mobile */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Desktop: Pure floating dropdown popover (no DOM layout disruption) */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="hidden sm:block absolute right-0 mt-2 z-50 w-[360px] bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl p-4 font-sans"
            >
              {calendarBody}
            </motion.div>

            {/* Mobile: Native slide-up bottom sheet with backdrop */}
            <div className="sm:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[99998]"
                aria-hidden="true"
              />

              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-[99999] w-full max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl border-t border-[#E2E8F0] shadow-2xl p-4 pb-8 space-y-3 font-sans"
              >
                {/* Mobile Sheet Handle & Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9] relative">
                  <div className="w-10 h-1 rounded-full bg-[#CBD5E1] mx-auto absolute left-1/2 -translate-x-1/2 -top-1" />
                  <div className="flex items-center gap-1.5 pt-1.5">
                    <IconCalendar size={16} className="text-[#C49A3C]" />
                    <span className="font-bold text-sm text-[#0F172A]">
                      {txt('Accéder à une Date', 'Jump to Date', 'Ir para Data')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors touch-target flex items-center justify-center"
                    aria-label="Fermer"
                  >
                    <IconX size={18} />
                  </button>
                </div>

                {calendarBody}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});
