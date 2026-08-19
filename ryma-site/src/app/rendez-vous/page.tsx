'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, Service } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  IconCheck, IconArrowLeft, IconArrowRight, IconClock, IconBrandWhatsapp,
  IconAlertCircle, IconX, IconUser, IconPhone, IconMail, IconLoader2,
  IconCalendarX, IconWifi, IconSearch, IconSparkles, IconStethoscope,
  IconFlame, IconActivity, IconHeartbeat, IconDroplet, IconBolt,
  IconRipple, IconShieldCheck,
} from '@tabler/icons-react';
import { playSoftClick } from '@/lib/sound';

function getBookingServiceIcon(iconKey: string, size = 18) {
  switch (iconKey) {
    case 'spine':
      return <IconActivity size={size} />;
    case 'pelvis':
      return <IconHeartbeat size={size} />;
    case 'hands':
      return <IconStethoscope size={size} />;
    case 'lymph':
      return <IconDroplet size={size} />;
    case 'electric':
      return <IconBolt size={size} />;
    case 'wave':
      return <IconRipple size={size} />;
    case 'bubble':
      return <IconSparkles size={size} />;
    case 'radio':
      return <IconFlame size={size} />;
    default:
      return <IconShieldCheck size={size} />;
  }
}

interface SlotInfo {
  time: string;
  available: boolean;
  reason: 'booked' | 'blocked' | 'sunday' | null;
  appointmentId: string | null;
}

// ── Enterprise Booking Toast System ────────────────────────────────────────────
type BookingToastType = 'error' | 'success' | 'info' | 'loading';

interface BookingToast {
  id: string;
  type: BookingToastType;
  title: string;
  message?: string;
  field?: string; // which input field caused this error
  duration?: number;
}

function BookingToastBanner({
  toasts,
  onDismiss,
}: {
  toasts: BookingToast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-6 right-4 sm:right-6 z-[999999] flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-[380px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -28, x: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.94 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white/98 backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.12)] flex items-start gap-3.5 p-4"
            style={{
              borderColor:
                toast.type === 'error' ? 'rgba(169,101,95,0.25)' :
                toast.type === 'success' ? 'rgba(111,143,114,0.25)' :
                toast.type === 'loading' ? 'rgba(196,154,60,0.25)' :
                'rgba(232,226,216,1)',
            }}
          >
            {/* Animated gradient accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2.5px]"
              style={{
                background:
                  toast.type === 'error'
                    ? 'linear-gradient(90deg, #A9655F, #E8A0A0, #A9655F)'
                    : toast.type === 'success'
                    ? 'linear-gradient(90deg, #6F8F72, #C6A15B, #6F8F72)'
                    : toast.type === 'loading'
                    ? 'linear-gradient(90deg, #C6A15B, #E8D7B0, #C6A15B)'
                    : 'linear-gradient(90deg, #9B793A, #C6A15B)',
              }}
            />

            {/* Countdown progress bar (shrinks over toast duration) */}
            {toast.type !== 'loading' && (
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] origin-left"
                style={{
                  background:
                    toast.type === 'error' ? 'rgba(169,101,95,0.4)' :
                    toast.type === 'success' ? 'rgba(111,143,114,0.4)' :
                    'rgba(196,154,60,0.4)',
                }}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{
                  duration: (toast.duration ?? (toast.type === 'error' ? 5000 : 3500)) / 1000,
                  ease: 'linear',
                }}
              />
            )}

            {/* Icon bubble */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background:
                  toast.type === 'error' ? 'rgba(169,101,95,0.12)' :
                  toast.type === 'success' ? 'rgba(111,143,114,0.12)' :
                  toast.type === 'loading' ? 'rgba(196,154,60,0.12)' :
                  'rgba(155,121,58,0.12)',
                color:
                  toast.type === 'error' ? '#A9655F' :
                  toast.type === 'success' ? '#6F8F72' :
                  toast.type === 'loading' ? '#C49A3C' :
                  '#9B793A',
                borderColor:
                  toast.type === 'error' ? 'rgba(169,101,95,0.25)' :
                  toast.type === 'success' ? 'rgba(111,143,114,0.25)' :
                  toast.type === 'loading' ? 'rgba(196,154,60,0.25)' :
                  'rgba(155,121,58,0.25)',
              }}
            >
              {toast.type === 'error' && <IconAlertCircle size={18} strokeWidth={2.5} />}
              {toast.type === 'success' && <IconCheck size={18} strokeWidth={2.5} />}
              {toast.type === 'loading' && <IconLoader2 size={18} className="animate-spin" strokeWidth={2.5} />}
              {toast.type === 'info' && <IconAlertCircle size={18} strokeWidth={2.5} />}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="font-serif font-bold text-sm text-[#1A1412] leading-tight">
                {toast.title}
              </div>
              {toast.message && (
                <div className="font-mono text-[11px] text-[#6B6058] mt-1 leading-relaxed">
                  {toast.message}
                </div>
              )}
            </div>

            {/* Dismiss */}
            {toast.type !== 'loading' && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 rounded-lg text-[#8A8078] hover:text-[#1A1412] hover:bg-[#F5EFE6] transition-colors"
              >
                <IconX size={14} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
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
const MONTH_NAMES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DAY_NAMES_FR = ['Di','Lu','Ma','Me','Je','Ve','Sa'];
const DAY_NAMES_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Step Indicator ───────────────────────────────────────────
function StepIndicator({ step, lang }: { step: BookingStep; lang: string }) {
  const steps = lang === 'pt'
    ? ['Tratamento', 'Data', 'Horário', 'Os Seus Dados']
    : lang === 'en'
    ? ['Treatment', 'Date', 'Slot', 'Your Info']
    : ['Soin', 'Date', 'Créneau', 'Coordonnées'];

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
  const [step1Pole, setStep1Pole] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const [step1Search, setStep1Search] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    coverageType: 'PARTICULAR' as 'PARTICULAR' | 'INSURANCE' | 'ADSE' | 'OTHER',
    coverageProvider: '',
  });
  const [loading, setLoading] = useState(false);

  const filteredStep1Services = SERVICES.filter((s) => {
    const matchesPole = step1Pole === 'all' || s.pole === step1Pole;
    if (!matchesPole) return false;
    const query = step1Search.toLowerCase().trim();
    if (!query) return true;
    const name = (s.name[lang] || s.name.pt || s.name.en || s.name.fr || '').toLowerCase();
    const desc = (s.shortDesc[lang] || s.shortDesc.pt || s.shortDesc.en || s.shortDesc.fr || '').toLowerCase();
    return name.includes(query) || desc.includes(query);
  });

  // ── Enterprise Toast System ─────────────────────────────────────────────────
  const [toasts, setToasts] = useState<BookingToast[]>([]);
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const showToast = useCallback((toast: Omit<BookingToast, 'id'>) => {
    const id = 'bt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    setToasts(prev => [{ id, ...toast }, ...prev.slice(0, 3)]);
    if (toast.type !== 'loading') {
      const ms = toast.duration ?? (toast.type === 'error' ? 5000 : 3500);
      toastTimers.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        delete toastTimers.current[id];
      }, ms);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  // Track which fields have errors for red-ring highlighting
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const markFieldError = useCallback((field: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: true }));
    // Auto-clear highlight after 3 s so it doesn't stay red forever
    setTimeout(() => setFieldErrors(prev => ({ ...prev, [field]: false })), 3000);
  }, []);

  // Slots loaded from the real API
  const [availableSlots, setAvailableSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Fetch real slot availability from the API when a date is selected
  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    setSlotError(null);
    try {
      const res = await fetch(`/api/slots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots ?? []);
      } else {
        // API error (500 etc.) — show actionable error, not "no slots"
        setSlotError(
          lang === 'pt' ? 'Erro ao carregar horários. Por favor, tente novamente.' :
          lang === 'en' ? 'Error loading slots. Please try again.' :
          'Erreur lors du chargement des créneaux. Veuillez réessayer.'
        );
      }
    } catch {
      setSlotError(
        lang === 'pt' ? 'Sem ligação. Verifique a sua internet e tente novamente.' :
        lang === 'en' ? 'Connection error. Check your internet and try again.' :
        'Erreur de connexion. Vérifiez votre internet et réessayez.'
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [lang]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  // Ref to the booking wizard section — used to scroll into view on step changes
  const bookingRef = useRef<HTMLElement>(null);

  // Scroll the booking wizard into view on every step transition
  useEffect(() => {
    if (!bookingRef.current) return;
    const top = bookingRef.current.getBoundingClientRect().top + window.scrollY - 90; // 90px offset for fixed nav
    window.scrollTo({ top, behavior: 'smooth' });
  }, [step]);

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

    // ── Client-side field validation with per-field toast ──────────────────────
    const nameTrimmed = form.name.trim();
    const phoneTrimmed = form.phone.trim();
    const emailTrimmed = form.email.trim();

    if (!nameTrimmed || nameTrimmed.length < 2) {
      markFieldError('name');
      showToast({
        type: 'error',
        title:
          lang === 'pt' ? 'Nome obrigatório' :
          lang === 'en' ? 'Name required' :
          'Nom requis',
        message:
          lang === 'pt' ? 'Por favor, introduza o seu nome completo (mínimo 2 caracteres).' :
          lang === 'en' ? 'Please enter your full name (at least 2 characters).' :
          'Veuillez saisir votre nom complet (2 caractères minimum).',
        field: 'name',
      });
      return;
    }

    if (!phoneTrimmed) {
      markFieldError('phone');
      showToast({
        type: 'error',
        title:
          lang === 'pt' ? 'Telefone obrigatório' :
          lang === 'en' ? 'Phone required' :
          'Téléphone requis',
        message:
          lang === 'pt' ? 'Introduza o seu número de telefone para confirmar a marcação.' :
          lang === 'en' ? 'Enter your phone number to confirm your booking.' :
          'Veuillez entrer votre numéro de téléphone pour confirmer le rendez-vous.',
        field: 'phone',
      });
      return;
    }

    // Basic phone format sanity check (must have at least 7 digits)
    const digitsOnly = phoneTrimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      markFieldError('phone');
      showToast({
        type: 'error',
        title:
          lang === 'pt' ? 'Telefone inválido' :
          lang === 'en' ? 'Invalid phone number' :
          'Numéro invalide',
        message:
          lang === 'pt' ? 'O número de telefone parece inválido. Exemplo: +351 912 345 678' :
          lang === 'en' ? 'The phone number looks invalid. Example: +351 912 345 678' :
          'Le numéro de téléphone semble invalide. Exemple: +351 912 345 678',
        field: 'phone',
      });
      return;
    }

    // Email format check (if filled)
    if (emailTrimmed) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
      if (!emailOk) {
        markFieldError('email');
        showToast({
          type: 'error',
          title:
            lang === 'pt' ? 'Email inválido' :
            lang === 'en' ? 'Invalid email' :
            'Email invalide',
          message:
            lang === 'pt' ? 'O formato do email não é válido. Exemplo: nome@exemplo.pt' :
            lang === 'en' ? 'Invalid email format. Example: name@example.com' :
            'Format email invalide. Exemple: nom@exemple.fr',
          field: 'email',
        });
        return;
      }
    }

    setLoading(true);
    setSlotError(null);

    // Loading toast
    const loadingToastId = showToast({
      type: 'loading',
      title:
        lang === 'pt' ? 'A confirmar a sua marcação…' :
        lang === 'en' ? 'Confirming your booking…' :
        'Confirmation en cours…',
    });

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: nameTrimmed,
          phone: phoneTrimmed,
          email: emailTrimmed || undefined,
          notes: form.notes || undefined,
          coverageType: form.coverageType,
          coverageProvider: form.coverageProvider || undefined,
          service: selectedService.slug,
          date: selectedDate,
          startTime: selectedSlot,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Dismiss loading toast
      dismissToast(loadingToastId);

      if (!res.ok) {
        if (data.error === 'slot_taken' || data.error === 'slot_blocked') {
          setSlotError(null);
          showToast({
            type: 'error',
            title:
              lang === 'pt' ? 'Horário já reservado' :
              lang === 'en' ? 'Slot no longer available' :
              'Créneau non disponible',
            message:
              lang === 'pt' ? 'Este horário acabou de ser reservado. Iremos mostrar os horários disponíveis.' :
              lang === 'en' ? 'This slot was just taken. We will show you the available slots.' :
              'Ce créneau vient d\u2019être réservé. Nous affichons les créneaux disponibles.',
            duration: 5000,
          });
          setSelectedSlot(null);
          await fetchSlots(selectedDate);
          setStep(3);
        } else if (res.status === 429) {
          showToast({
            type: 'error',
            title:
              lang === 'pt' ? 'Demasiadas tentativas' :
              lang === 'en' ? 'Too many attempts' :
              'Trop de tentatives',
            message:
              lang === 'pt' ? 'Aguarde um momento antes de tentar novamente.' :
              lang === 'en' ? 'Please wait a moment before trying again.' :
              'Veuillez patienter avant de réessayer.',
            duration: 6000,
          });
        } else {
          showToast({
            type: 'error',
            title:
              lang === 'pt' ? 'Erro no agendamento' :
              lang === 'en' ? 'Booking error' :
              'Erreur de réservation',
            message: data.error ?? (
              lang === 'pt' ? 'Ocorreu um erro. Por favor tente novamente.' :
              lang === 'en' ? 'An error occurred. Please try again.' :
              'Une erreur est survenue. Veuillez réessayer.'
            ),
            duration: 5000,
          });
        }
        return;
      }

      // Success toast
      showToast({
        type: 'success',
        title:
          lang === 'pt' ? 'Marcação confirmada! 🎉' :
          lang === 'en' ? 'Booking confirmed! 🎉' :
          'Rendez-vous confirmé ! 🎉',
        message:
          lang === 'pt' ? `${selectedService.name.pt ?? selectedService.name.fr} — ${selectedDate} às ${selectedSlot}` :
          lang === 'en' ? `${selectedService.name.en ?? selectedService.name.fr} — ${selectedDate} at ${selectedSlot}` :
          `${selectedService.name.fr} — ${selectedDate} à ${selectedSlot}`,
        duration: 6000,
      });

      setStep(5);
    } catch {
      dismissToast(loadingToastId);
      showToast({
        type: 'error',
        title:
          lang === 'pt' ? 'Erro de ligação' :
          lang === 'en' ? 'Connection error' :
          'Erreur de connexion',
        message:
          lang === 'pt' ? 'Verifique a sua ligação à internet e tente novamente.' :
          lang === 'en' ? 'Check your internet connection and try again.' :
          'Vérifiez votre connexion Internet et réessayez.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border text-[#1A1412] placeholder-[#8A8078] rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all shadow-sm";
  const inputCls = (field: string) =>
    `${inputClass} ${
      fieldErrors[field]
        ? 'border-[#A9655F] ring-2 ring-[#A9655F]/30 focus:border-[#A9655F] focus:ring-[#A9655F]/30'
        : 'border-[#D4CEBE] focus:border-[#C49A3C] focus:ring-1 focus:ring-[#C49A3C]/40'
    }`;

  return (
    <>
      {/* ── Enterprise Toast Banner ────────────────────────────────────────── */}
      <BookingToastBanner toasts={toasts} onDismiss={dismissToast} />
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="pt-28 pb-8 text-center bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="mx-auto max-w-2xl px-6">
          <Badge variant="gold" className="mb-4">
            {lang === 'pt' ? 'Agendamento Online' : lang === 'en' ? 'Online Booking' : 'Réservation en ligne'}
          </Badge>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1412] mb-3">
            {t.booking.title}
          </h1>
          <p className="text-[#6B6058] text-base md:text-lg max-w-lg mx-auto">{t.booking.subtitle}</p>
        </div>
      </section>

      {/* ── Booking Wizard ────────────────────────────────────────── */}
      <section ref={bookingRef} className="py-8 pb-24 bg-[#FAFAF8] min-h-[60vh]">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <StepIndicator step={step} lang={lang} />

          <AnimatePresence mode="wait">
            {/* STEP 1: Choose Service */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center mb-8">
                  <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
                    — {lang === 'pt' ? 'Etapa 1 de 4' : lang === 'en' ? 'Step 1 of 4' : 'Étape 1 sur 4'} —
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-3">
                    {t.booking.step1Title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6B6058] max-w-lg mx-auto">
                    {lang === 'pt'
                      ? 'Selecione o cuidado ou protocolo pretendido. Emitimos faturas com cédula profissional para efeitos de seguro.'
                      : lang === 'en'
                      ? 'Select your desired treatment or assessment. Medical invoices issued for insurance reimbursement.'
                      : 'Sélectionnez votre soin ou bilan initial. Factures conformes délivrées pour vos mutuelles.'}
                  </p>

                  {/* Pole Filter & Search Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                    <div className="inline-flex p-1 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => { setStep1Pole('all'); playSoftClick(); }}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          step1Pole === 'all'
                            ? 'bg-[#C49A3C] text-white shadow-xs'
                            : 'text-[#6B6058] hover:text-[#1A1412]'
                        }`}
                      >
                        {lang === 'pt' ? 'Todos (13)' : lang === 'en' ? 'All (13)' : 'Tous (13)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStep1Pole('kinesitherapie'); playSoftClick(); }}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          step1Pole === 'kinesitherapie'
                            ? 'bg-[#C49A3C] text-white shadow-xs'
                            : 'text-[#6B6058] hover:text-[#1A1412]'
                        }`}
                      >
                        {lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStep1Pole('minceur'); playSoftClick(); }}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          step1Pole === 'minceur'
                            ? 'bg-[#C49A3C] text-white shadow-xs'
                            : 'text-[#6B6058] hover:text-[#1A1412]'
                        }`}
                      >
                        {lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
                      </button>
                    </div>

                    <div className="relative w-full sm:w-52">
                      <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8078]" />
                      <input
                        type="text"
                        value={step1Search}
                        onChange={(e) => setStep1Search(e.target.value)}
                        placeholder={lang === 'pt' ? 'Pesquisar tratamento...' : lang === 'en' ? 'Search treatment...' : 'Rechercher un soin...'}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E8E2D8] rounded-full text-xs text-[#1A1412] focus:outline-none focus:border-[#C49A3C] transition-colors shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {filteredStep1Services.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    {filteredStep1Services.map(service => {
                      const isSelected = selectedService?.slug === service.slug;
                      const isKine = service.pole === 'kinesitherapie';
                      const serviceName = service.name[lang] || service.name.pt || service.name.en || service.name.fr;
                      const serviceDesc = service.shortDesc[lang] || service.shortDesc.pt || service.shortDesc.en || service.shortDesc.fr;

                      return (
                        <button
                          key={service.slug}
                          id={`service-${service.slug}`}
                          type="button"
                          onClick={() => {
                            playSoftClick();
                            setSelectedService(service);
                            setStep(2);
                          }}
                          className={`relative text-start p-4 sm:p-5 rounded-2xl transition-all duration-300 group border cursor-pointer ${
                            isSelected
                              ? 'border-[#C49A3C] bg-gradient-to-br from-[#FFFDF9] to-[#FAF5EA] ring-2 ring-[#C49A3C]/50 shadow-[0_8px_25px_rgba(196,154,60,0.18)] scale-[1.01]'
                              : 'border-[#E8E2D8] bg-white hover:border-[#C49A3C]/60 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          {/* Top bar: Icon + Category Badge + Price */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                  isKine
                                    ? 'bg-[#FAF5EA] text-[#8A6A24] border border-[#C49A3C]/30 group-hover:bg-[#C49A3C] group-hover:text-white'
                                    : 'bg-[#FAF6F0] text-[#C49A3C] border border-[#C49A3C]/30 group-hover:bg-[#9A7428] group-hover:text-white'
                                }`}
                              >
                                {getBookingServiceIcon(service.icon, 18)}
                              </div>

                              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-[#FAF8F5] border border-[#E8E2D8] text-[#7A7065]">
                                {isKine
                                  ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
                                  : lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 text-[11px] font-mono text-[#8A8078] bg-[#FAF8F5] px-2 py-0.5 rounded-md border border-[#E8E2D8]/70">
                                <IconClock size={12} className="text-[#C49A3C]" />
                                <span>{service.duration}</span>
                              </div>
                              <span className="font-mono text-base font-bold text-[#C49A3C]">
                                {service.price} {t.common.currency}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="font-serif font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors text-base sm:text-lg mb-1 leading-snug">
                            {serviceName}
                          </div>

                          {/* Short Description */}
                          <p className="text-xs text-[#6B6058] line-clamp-2 leading-relaxed font-normal mb-3">
                            {serviceDesc}
                          </p>

                          {/* Bottom Selection Hint */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-[#E8E2D8]/70 text-[11px] font-semibold text-[#8A6A24]">
                            <span className="flex items-center gap-1">
                              <IconSparkles size={13} className="text-[#C49A3C]" />
                              {isKine
                                ? (lang === 'pt' ? 'Comparticipado ADSE / Seguros' : lang === 'en' ? 'Insurance receipts provided' : 'Facture conforme mutuelle')
                                : (lang === 'pt' ? 'Tecnologia 100% Não Invasiva' : lang === 'en' ? '100% Non-invasive protocol' : '100% Non-invasif')}
                            </span>

                            <span className="inline-flex items-center gap-1 text-xs text-[#C49A3C] font-bold group-hover:translate-x-1 transition-transform">
                              <span>{lang === 'pt' ? 'Escolher' : lang === 'en' ? 'Select' : 'Choisir'}</span>
                              <IconArrowRight size={13} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white border border-[#E8E2D8] rounded-2xl p-6 shadow-xs max-w-sm mx-auto">
                    <p className="text-xs text-[#8A8078] mb-2">
                      {lang === 'pt' ? 'Nenhum tratamento encontrado.' : lang === 'en' ? 'No treatments found.' : 'Aucun soin trouvé.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setStep1Search(''); setStep1Pole('all'); }}
                      className="text-xs font-bold text-[#C49A3C] hover:underline"
                    >
                      {lang === 'pt' ? 'Limpar pesquisa' : lang === 'en' ? 'Clear search' : 'Réinitialiser'}
                    </button>
                  </div>
                )}
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
                    <Badge variant="gold" className="self-start sm:self-auto">{selectedService.name[lang] || selectedService.name.pt || selectedService.name.en || selectedService.name.fr}</Badge>
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
                      {(lang === 'pt' ? MONTH_NAMES_PT : lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_FR)[calMonth]} {calYear}
                    </span>
                    <button
                      onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                      className="p-2 rounded-xl hover:bg-[#F5E9C8] text-[#8A8078] hover:text-[#9A7428] transition-colors"
                    >
                      <IconArrowRight size={20} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {(lang === 'pt' ? DAY_NAMES_PT : lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_FR).map((d: string) => (
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
                      ✓ {new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-8">
                  <Button variant="outline" onClick={() => setStep(1)} className="px-5">
                    <IconArrowLeft size={16} className="me-2" />
                    {t.common.back}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep(3)}
                    disabled={!selectedDate}
                    className="px-8"
                  >
                    {t.common.next}
                    <IconArrowRight size={16} className="ms-2" />
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
                  {t.booking.availableSlots} <span className="font-semibold text-[#9A7428]">{selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </p>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12 text-[#8A8078]">
                    <div className="w-6 h-6 border-2 border-[#C49A3C] border-t-transparent rounded-full animate-spin mr-3" />
                    <span className="font-mono text-sm">{lang === 'pt' ? 'A carregar horários...' : lang === 'en' ? 'Loading slots...' : 'Chargement des créneaux...'}</span>
                  </div>
                ) : slotError ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#FDF3F3] border border-[#E8C8C8] flex items-center justify-center text-[#A9655F] text-xl">⚠️</div>
                    <p className="text-[#A9655F] font-mono text-sm text-center max-w-xs">{slotError}</p>
                    <button
                      onClick={() => selectedDate && fetchSlots(selectedDate)}
                      className="px-5 py-2.5 rounded-xl bg-[#C49A3C] text-white font-mono text-sm font-semibold hover:bg-[#9A7428] transition-colors"
                    >
                      {lang === 'pt' ? '↺ Tentar novamente' : lang === 'en' ? '↺ Try again' : '↺ Réessayer'}
                    </button>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-10 text-[#8A8078] font-mono text-sm">
                    {lang === 'pt' ? 'Nenhum horário disponível para esta data.' : lang === 'en' ? 'No slots available for this date.' : 'Aucun créneau disponible pour cette date.'}
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
                    <span className="w-3.5 h-3.5 rounded-sm bg-white border border-[#E8E2D8]" /> {lang === 'pt' ? 'Disponível' : lang === 'en' ? 'Available' : 'Disponible'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-[#FAFAF8] border border-[#E8E2D8]/50" /> {lang === 'pt' ? 'Reservado' : lang === 'en' ? 'Booked' : 'Réservé'}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm bg-[#C49A3C] shadow-sm" /> {lang === 'pt' ? 'Selecionado' : lang === 'en' ? 'Selected' : 'Sélectionné'}
                  </span>
                </div>



                <div className="flex items-center justify-between mt-8">
                  <Button variant="outline" onClick={() => setStep(2)} className="px-5">
                    <IconArrowLeft size={16} className="me-2" />
                    {t.common.back}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep(4)}
                    disabled={!selectedSlot}
                    className="px-8"
                  >
                    {t.common.next}
                    <IconArrowRight size={16} className="ms-2" />
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
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'pt' ? 'Tratamento' : lang === 'en' ? 'Treatment' : 'Soin'}</div>
                      <div className="text-[13px] md:text-sm font-semibold text-[#1A1412] leading-tight">{selectedService?.name[lang] || selectedService?.name.pt || selectedService?.name.en || selectedService?.name.fr}</div>
                    </div>
                    <div className="px-2">
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'pt' ? 'Data' : lang === 'en' ? 'Date' : 'Date'}</div>
                      <div className="text-[13px] md:text-sm font-semibold text-[#1A1412] capitalize">
                        {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="px-2">
                      <div className="font-mono text-[11px] font-bold text-[#9A7428] uppercase tracking-wider mb-2">{lang === 'pt' ? 'Horário' : lang === 'en' ? 'Slot' : 'Heure'}</div>
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
                        value={form.name}
                        onChange={e => { setForm(p => ({ ...p, name: e.target.value })); if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: false })); }}
                        placeholder={lang === 'pt' ? 'O seu nome completo' : lang === 'en' ? 'Your full name' : 'Votre nom complet'}
                        className={inputCls('name')}
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                        {t.booking.phoneLabel} *
                      </label>
                      <input
                        id="booking-phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: false })); }}
                        placeholder="+351 9XX XXX XXX"
                        className={inputCls('phone')}
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
                      onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: false })); }}
                      placeholder={lang === 'pt' ? 'seu.email@exemplo.pt' : lang === 'en' ? 'your.email@example.com' : 'votre@email.com'}
                      className={inputCls('email')}
                    />
                  </div>

                  {/* Coverage Selector */}
                  <div>
                    <label className="font-mono text-xs font-semibold text-[#8A8078] uppercase tracking-wide block mb-2">
                      {lang === 'pt' ? 'Regime / Cobertura de Saúde' : lang === 'en' ? 'Healthcare Coverage' : 'Prise en charge / Couverture'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'PARTICULAR', label: lang === 'pt' ? 'Particular' : lang === 'en' ? 'Private' : 'Privé', sub: lang === 'pt' ? 'Sem seguro' : lang === 'en' ? 'Self-pay' : 'Sans mutuelle' },
                        { id: 'INSURANCE', label: lang === 'pt' ? 'Seguro de Saúde' : lang === 'en' ? 'Health Insurance' : 'Assurance / Mutuelle', sub: 'Médis, Multicare...' },
                        { id: 'ADSE', label: 'ADSE / Subsistema', sub: lang === 'pt' ? 'Regime Livre' : lang === 'en' ? 'Public Subsystem' : 'Secteur public' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, coverageType: item.id as any }))}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            form.coverageType === item.id
                              ? 'border-[#C49A3C] bg-[#FAF6EE] ring-1 ring-[#C49A3C]/50'
                              : 'border-[#E8E2D8] bg-white hover:border-[#C49A3C]/30'
                          }`}
                        >
                          <div className={`text-xs font-bold ${form.coverageType === item.id ? 'text-[#9A7428]' : 'text-[#1A1412]'}`}>
                            {item.label}
                          </div>
                          <div className="text-[10px] text-[#8A8078] font-mono mt-0.5">
                            {item.sub}
                          </div>
                        </button>
                      ))}
                    </div>
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
                      placeholder={lang === 'pt' ? 'Motivo da consulta, sintomas, antecedentes...' : lang === 'en' ? 'Reason for visit, symptoms, medical history...' : 'Motif de consultation, antécédents importants...'}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-6 mt-4 border-t border-[#E8E2D8]">
                    <Button type="button" variant="outline" onClick={() => setStep(3)}>
                      <IconArrowLeft size={16} className="me-2" />
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
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'pt' ? 'Tratamento' : lang === 'en' ? 'Treatment' : 'Soin'}</div>
                      <div className="text-xs font-semibold text-[#1A1412] mt-1 leading-tight">{selectedService?.name[lang] || selectedService?.name.pt || selectedService?.name.en || selectedService?.name.fr}</div>
                    </div>
                    <div className="px-1">
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'pt' ? 'Data' : lang === 'en' ? 'Date' : 'Date'}</div>
                      <div className="text-xs font-semibold text-[#1A1412] mt-1">
                        {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="px-1">
                      <div className="font-mono text-[10px] font-bold text-[#8A8078] uppercase mb-1">{lang === 'pt' ? 'Horário' : lang === 'en' ? 'Slot' : 'Heure'}</div>
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
