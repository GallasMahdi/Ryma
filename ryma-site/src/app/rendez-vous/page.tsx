'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, Service } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconCheck, IconArrowLeft, IconArrowRight, IconClock, IconBrandWhatsapp } from '@tabler/icons-react';

interface SlotInfo {
  time: string;
  available: boolean;
  reason: 'booked' | 'blocked' | 'sunday' | null;
  appointmentId: string | null;
}

// ── helpers ────────────────────────────────────────────────
type BookingStep = 1 | 2 | 3 | 4 | 5; // 5 = success

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAY_NAMES_FR = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
const DAY_NAMES_AR = ['أح','إث','ثل','أر','خم','جم','سب'];

// ── Step Indicator ───────────────────────────────────────────
function StepIndicator({ step, lang }: { step: BookingStep; lang: string }) {
  const steps = lang === 'fr'
    ? ['Soin', 'Date', 'Créneau', 'Coordonnées']
    : ['العلاج', 'التاريخ', 'التوقيت', 'بياناتك'];

  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((label, i) => {
        const n = i + 1;
        const isActive = step === n;
        const isDone = step > n;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                isDone ? 'bg-[#9A7428] text-white shadow-sm' :
                isActive ? 'bg-[#C49A3C] text-white shadow-[0_4px_16px_rgba(196,154,60,0.35)]' :
                'bg-[#F5E9C8] text-[#8A8078] border border-[#E8E2D8]'
              }`}>
                {isDone ? <IconCheck size={18} /> : n}
              </div>
              <span className={`font-mono text-[11px] font-semibold tracking-wide hidden sm:block ${
                isActive ? 'text-[#C49A3C]' : isDone ? 'text-[#9A7428]' : 'text-[#8A8078]'
              }`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-1 rounded-full max-w-[56px] transition-colors duration-300 ${isDone ? 'bg-[#9A7428]' : 'bg-[#F5E9C8]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function RendezVousPage() {
  const { lang, t } = useLanguage();

  const [step, setStep] = useState<BookingStep>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [loading, setLoading] = useState(false);

  // Slots loaded from the real API
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Fetch real slot availability from the API when a date is selected
  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    try {
      const res = await fetch(`/api/slots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots ?? []);
      }
    } catch {
      // On error, leave slots empty — user can refresh
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  const [slotError, setSlotError] = useState<string | null>(null);

  // Generate calendar data
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);
  const days: (number | null)[] = Array.from({ length: firstDay }, () => null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const handleDateClick = (d: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dateStr < todayStr) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSlotError(null);
  };

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setLoading(true);
    setSlotError(null);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: form.name,
          phone: form.phone,
          email: form.email || undefined,
          notes: form.notes || undefined,
          service: selectedService.slug,
          date: selectedDate,
          startTime: selectedSlot,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === 'slot_taken' || data.error === 'slot_blocked') {
          setSlotError(
            lang === 'fr'
              ? "Ce créneau vient tout juste d'être réservé par une autre personne. Veuillez sélectionner un autre horaire."
              : "تم حجز هذا التوقيت للتو من طرف شخص آخر. يرجى اختيار توقيت آخر."
          );
          setSelectedSlot(null);
          // Refresh slots to get latest availability
          await fetchSlots(selectedDate);
          setStep(3);
        } else {
          setSlotError(data.error ?? (lang === 'fr' ? 'Erreur de réservation. Réessayez.' : 'خطأ في الحجز. حاول مجدداً.'));
        }
        return;
      }

      setStep(5);
    } catch {
      setSlotError(lang === 'fr' ? 'Erreur réseau. Réessayez.' : 'خطأ في الشبكة. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-[#D4CEBE] text-[#1A1412] placeholder-[#8A8078] rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#C49A3C] focus:ring-1 focus:ring-[#C49A3C]/40 transition-colors shadow-sm";

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="pt-28 pb-8 text-center bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="mx-auto max-w-2xl px-6">
          <Badge variant="gold" className="mb-4">
            {lang === 'fr' ? 'Réservation en ligne' : 'الحجز عبر الإنترنت'}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1412] mb-3">
            {t.booking.title}
          </h1>
          <p className="text-[#6B6058] text-base md:text-lg max-w-lg mx-auto">{t.booking.subtitle}</p>
        </div>
      </section>

      {/* ── Booking Wizard ───────────────────────────── */}
      <section className="py-8 pb-24 bg-[#FAFAF8] min-h-[60vh]">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <StepIndicator step={step} lang={lang} />

          <AnimatePresence mode="wait">
            {/* STEP 1: Choose Service */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
              >
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mb-6 text-center">{t.booking.step1Title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SERVICES.map(service => (
                    <button
                      key={service.slug}
                      id={`service-${service.slug}`}
                      onClick={() => { setSelectedService(service); setStep(2); }}
                      className={`text-start p-5 bg-white border rounded-2xl transition-all duration-200 group hover:border-[#C49A3C]/60 hover:shadow-sm ${
                        selectedService?.slug === service.slug 
                          ? 'border-[#C49A3C] ring-1 ring-[#C49A3C] shadow-[0_4px_16px_rgba(196,154,60,0.08)] bg-[#FDFAF4]' 
                          : 'border-[#E8E2D8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-mono text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          service.pole === 'kinesitherapie' ? 'bg-[#F5E9C8] text-[#9A7428]' : 'bg-[#FDFAF4] text-[#C49A3C] border border-[#C49A3C]/20'
                        }`}>
                          {service.pole === 'kinesitherapie' ? (lang === 'fr' ? 'Kiné' : 'علاج طبيعي') : (lang === 'fr' ? 'Minceur' : 'تنحيف')}
                        </span>
                        <span className="font-mono text-[15px] font-bold text-[#C49A3C]">{service.price} {t.common.currency}</span>
                      </div>
                      <div className="font-semibold text-[#1A1412] group-hover:text-[#9A7428] transition-colors text-base mb-2 leading-tight">
                        {service.name[lang]}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#8A8078]">
                        <IconClock size={14} className="text-[#C49A3C]" />
                        {service.duration}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 2: Choose Date */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412]">{t.booking.step2Title}</h2>
                  {selectedService && (
                    <Badge variant="gold" className="self-start sm:self-auto">{selectedService.name[lang]}</Badge>
                  )}
                </div>

                <div className="bg-white border border-[#C49A3C]/20 rounded-2xl p-6 md:p-8 shadow-sm">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E2D8]">
                    <button
                      onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                      className="p-2 rounded-xl hover:bg-[#F5E9C8] text-[#8A8078] hover:text-[#9A7428] transition-colors"
                    >
                      <IconArrowLeft size={20} className="rtl-flip" />
                    </button>
                    <span className="font-serif text-xl font-bold text-[#1A1412] capitalize">
                      {lang === 'fr' ? MONTH_NAMES_FR[calMonth] : MONTH_NAMES_AR[calMonth]} {calYear}
                    </span>
                    <button
                      onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                      className="p-2 rounded-xl hover:bg-[#F5E9C8] text-[#8A8078] hover:text-[#9A7428] transition-colors"
                    >
                      <IconArrowRight size={20} className="rtl-flip" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {(lang === 'fr' ? DAY_NAMES_FR : DAY_NAMES_AR).map(d => (
                      <div key={d} className="text-center font-mono text-xs font-bold text-[#9A7428] py-1 uppercase">{d}</div>
                    ))}
                  </div>

                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((d, i) => {
                      if (!d) return <div key={`empty-${i}`} />;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const isPast = dateStr < todayStr;
                      const isSelected = dateStr === selectedDate;
                      const isSunday = new Date(calYear, calMonth, d).getDay() === 0;

                      return (
                        <button
                          key={d}
                          onClick={() => !isPast && !isSunday && handleDateClick(d)}
                          disabled={isPast || isSunday}
                          className={`aspect-square rounded-xl text-[15px] font-semibold transition-all duration-200 flex items-center justify-center ${
                            isSelected ? 'bg-[#C49A3C] text-white shadow-[0_4px_12px_rgba(196,154,60,0.3)]' :
                            isPast || isSunday ? 'text-[#D4CEBE] bg-[#FAFAF8] cursor-not-allowed' :
                            'text-[#1A1412] bg-white border border-[#E8E2D8] hover:border-[#C49A3C] hover:text-[#9A7428] hover:bg-[#FDFAF4]'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>

                  {selectedDate && (
                    <div className="mt-6 text-center font-mono text-sm font-semibold text-[#9A7428] bg-[#F5E9C8] py-2 rounded-lg border border-[#C49A3C]/20">
                      ✓ {new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-TN' : 'ar-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-8">
                  <Button variant="outline" onClick={() => setStep(1)} className="px-5">
                    <IconArrowLeft size={16} className="me-2 rtl-flip" />
                    {t.common.back}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                    disabled={!selectedDate}
                    className="px-8"
                  >
                    {t.common.next}
                    <IconArrowRight size={16} className="ms-2 rtl-flip" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Choose Slot */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
              >
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mb-3">{t.booking.step3Title}</h2>
                <p className="text-[#6B6058] text-[15px] mb-8">
                  {t.booking.availableSlots} <span className="font-semibold text-[#9A7428]">{selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-TN' : 'ar-TN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </p>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12 text-[#8A8078]">
                    <div className="w-6 h-6 border-2 border-[#C49A3C] border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="font-mono text-sm">{lang === 'fr' ? 'Chargement des créneaux...' : 'جارٍ تحميل المواعيد...'}</span>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-10 text-[#8A8078] font-mono text-sm">
                    {lang === 'fr' ? 'Aucun créneau disponible pour cette date.' : 'لا توجد مواعيد متاحة لهذا اليوم.'}
                  </div>
                ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      id={`slot-${slot.time}`}
                      onClick={() => slot.available && setSelectedSlot(slot.time)}
                      disabled={!slot.available}
                      className={`py-3.5 px-2 rounded-xl font-mono text-[15px] text-center transition-all duration-200 border ${
                        selectedSlot === slot.time
                          ? 'bg-[#C49A3C] text-white font-bold border-[#C49A3C] shadow-[0_4px_12px_rgba(196,154,60,0.3)]'
                          : slot.available
                          ? 'bg-white border-[#E8E2D8] text-[#1A1412] font-semibold hover:border-[#C49A3C] hover:text-[#9A7428] hover:bg-[#FDFAF4]'
                          : 'bg-[#FAFAF8] border-[#E8E2D8]/50 text-[#D4CEBE] cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                )}

                <div className="flex flex-wrap items-center gap-6 mt-8 p-4 bg-white border border-[#E8E2D8] rounded-xl text-xs text-[#6B6058] font-mono font-medium justify-center">
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-white border border-[#E8E2D8]" /> {lang === 'fr' ? 'Disponible' : 'متاح'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-[#FAFAF8] border border-[#E8E2D8]/50" /> {lang === 'fr' ? 'Réservé' : 'محجوز'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-[#C49A3C] shadow-sm" /> {lang === 'fr' ? 'Sélectionné' : 'مختار'}
                  </span>
                </div>

                {slotError && (
                  <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-sans text-center">
                    ⚠️ {slotError}
                  </div>
                )}

                <div className="flex items-center justify-between mt-8">
                  <Button variant="outline" onClick={() => setStep(2)} className="px-5">
                    <IconArrowLeft size={16} className="me-2 rtl-flip" />
                    {t.common.back}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep(4)}
                    disabled={!selectedSlot}
                    className="px-8"
                  >
                    {t.common.next}
                    <IconArrowRight size={16} className="ms-2 rtl-flip" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Personal Details */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
              >
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mb-6">{t.booking.step4Title}</h2>

                {/* Summary */}
                <div className="bg-white border border-[#C49A3C]/30 rounded-2xl p-5 md:p-6 mb-8 shadow-sm">
                  <div className="grid grid-cols-3 gap-4 text-center divide-x divide-[#E8E2D8]">
                    <div className="px-2">
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'fr' ? 'Soin' : 'العلاج'}</div>
                      <div className="text-[13px] md:text-sm font-semibold text-[#1A1412] leading-tight">{selectedService?.name[lang]}</div>
                    </div>
                    <div className="px-2">
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'fr' ? 'Date' : 'التاريخ'}</div>
                      <div className="text-[13px] md:text-sm font-semibold text-[#1A1412] capitalize">
                        {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-TN' : 'ar-TN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="px-2">
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'fr' ? 'Heure' : 'الوقت'}</div>
                      <div className="text-base md:text-lg font-mono font-bold text-[#C49A3C]">{selectedSlot}</div>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={e => { e.preventDefault(); handleSubmit(); }}
                  className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                        {t.booking.fullName} *
                      </label>
                      <input
                        id="booking-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={lang === 'fr' ? 'Votre nom complet' : 'اسمك الكامل'}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                        {t.booking.phoneLabel} *
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+216 XX XXX XXX"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                      {t.booking.emailLabel}
                    </label>
                    <input
                      id="booking-email"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder={lang === 'fr' ? 'votre@email.com' : 'بريدك@email.com'}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                      {t.booking.notesLabel}
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={3}
                      value={form.notes}
                      onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder={lang === 'fr' ? 'Motif de consultation, antécédents importants...' : 'سبب الاستشارة، تاريخ طبي مهم...'}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6 mt-4 border-t border-[#E8E2D8]">
                    <Button type="button" variant="outline" onClick={() => setStep(3)}>
                      <IconArrowLeft size={16} className="me-2 rtl-flip" />
                      {t.common.back}
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading || !form.name || !form.phone} className="px-8">
                      {loading ? '...' : t.booking.confirmBooking}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 5: Success */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 15 }}
                  className="w-24 h-24 rounded-full bg-[#F5E9C8] border-4 border-[#C49A3C] flex items-center justify-center mx-auto mb-8 shadow-sm"
                >
                  <IconCheck size={44} className="text-[#9A7428]" />
                </motion.div>

                <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412] mb-4">
                  {t.booking.successTitle}
                </h2>
                <p className="text-[#6B6058] text-base mb-4 max-w-md mx-auto leading-relaxed">{t.booking.successMessage}</p>
                <p className="font-mono text-[13px] font-bold text-[#9A7428] mb-10 bg-[#FDFAF4] border border-[#C49A3C]/20 py-2 px-4 rounded-full inline-block">
                  {t.booking.reminderInfo}
                </p>

                <div className="bg-white border border-[#E8E2D8] p-6 mb-10 max-w-sm mx-auto rounded-2xl shadow-sm">
                  <div className="grid grid-cols-3 text-center gap-4 divide-x divide-[#E8E2D8]">
                    <div className="px-1">
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'fr' ? 'Soin' : 'العلاج'}</div>
                      <div className="text-xs font-semibold text-[#1A1412] mt-1 leading-tight">{selectedService?.name[lang]}</div>
                    </div>
                    <div className="px-1">
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'fr' ? 'Date' : 'التاريخ'}</div>
                      <div className="text-xs font-semibold text-[#1A1412] mt-1">
                        {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-TN' : 'ar-TN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="px-1">
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'fr' ? 'Heure' : 'الوقت'}</div>
                      <div className="font-mono text-[15px] font-bold text-[#C49A3C] mt-1">{selectedSlot}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button href="/" variant="outline" className="w-full sm:w-auto justify-center">
                    {t.common.backToHome}
                  </Button>
                  <Button
                    href={`https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`}
                    variant="primary"
                    className="w-full sm:w-auto justify-center"
                  >
                    <IconBrandWhatsapp size={18} className="me-2" />
                    WhatsApp
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
