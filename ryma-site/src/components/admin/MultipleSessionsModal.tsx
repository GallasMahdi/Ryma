'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IconCalendarEvent,
  IconClock,
  IconCheck,
  IconAlertTriangle,
  IconTrash,
  IconPlus,
  IconCalendarRepeat,
  IconAlertCircle,
  IconStethoscope,
  IconUser,
  IconPhone,
  IconSparkles,
  IconChevronRight,
  IconX,
  IconLoader2,
  IconLock,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVICES } from '@/data/services';
import { VALID_TIME_SLOTS } from '@/lib/validation';
import { Lang } from '@/lib/i18n';
import { PatientRecord, Appointment, CoverageType } from '@/types/admin';
import { ResponsiveModal } from './ResponsiveModal';
import { EvaScorePicker } from './EvaScorePicker';

interface MultipleSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  patientsList?: PatientRecord[];
  initialPatient?: PatientRecord | null;
  onSuccess?: (createdAppointments: Appointment[]) => void;
  onActionToast?: (toast: { type: 'success' | 'error' | 'info' | 'loading'; title: string; message?: string }) => void;
}

interface DaySlotPattern {
  dayOfWeek: number; // 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  startTime: string;
}

interface PreviewSessionItem {
  sessionIndex: number;
  date: string;
  startTime: string;
  dayOfWeek: number;
  dayNamePt: string;
  dayNameFr: string;
  dayNameEn: string;
  available: boolean;
  conflictReason: 'booked' | 'blocked' | 'sunday' | 'past' | null;
  availableFreeSlots?: string[];
  allDaySlots?: { time: string; available: boolean; reason?: string }[];
}

const WEEKDAYS = [
  { day: 1, labelPt: 'Seg', fullPt: 'Segunda-feira', labelFr: 'Lun', labelEn: 'Mon' },
  { day: 2, labelPt: 'Ter', fullPt: 'Terça-feira',   labelFr: 'Mar', labelEn: 'Tue' },
  { day: 3, labelPt: 'Qua', fullPt: 'Quarta-feira',  labelFr: 'Mer', labelEn: 'Wed' },
  { day: 4, labelPt: 'Qui', fullPt: 'Quinta-feira',  labelFr: 'Jeu', labelEn: 'Thu' },
  { day: 5, labelPt: 'Sex', fullPt: 'Sexta-feira',   labelFr: 'Ven', labelEn: 'Fri' },
  { day: 6, labelPt: 'Sáb', fullPt: 'Sábado',        labelFr: 'Sam', labelEn: 'Sat' },
];

export function MultipleSessionsModal({
  isOpen,
  onClose,
  lang,
  patientsList = [],
  initialPatient = null,
  onSuccess,
  onActionToast,
}: MultipleSessionsModalProps) {
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  // Form states
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [coverageType, setCoverageType] = useState<CoverageType>('PARTICULAR');
  const [coverageProvider, setCoverageProvider] = useState('');
  const [coverageNumber, setCoverageNumber] = useState('');
  const [serviceSlug, setServiceSlug] = useState(SERVICES[0]?.slug || 'kinesitherapie-generale');
  const [initialEvaScore, setInitialEvaScore] = useState<number>(7);

  // Recurrence settings
  const [totalSessions, setTotalSessions] = useState(10);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedulePatterns, setSchedulePatterns] = useState<DaySlotPattern[]>([
    { dayOfWeek: 1, startTime: '09:00' }, // Mon 09:00
    { dayOfWeek: 3, startTime: '14:30' }, // Wed 14:30
    { dayOfWeek: 5, startTime: '10:00' }, // Fri 10:00
  ]);

  // Preview state
  const [previewSessions, setPreviewSessions] = useState<PreviewSessionItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  // Sync initial patient when opened
  useEffect(() => {
    if (initialPatient) {
      setPatientName(initialPatient.patientName);
      setPhone(initialPatient.phone);
      setEmail(initialPatient.email || '');
      setPatientId(initialPatient.id);
      setCoverageType((initialPatient.coverageType as CoverageType) || 'PARTICULAR');
      setCoverageProvider(initialPatient.coverageProvider || '');
      setCoverageNumber(initialPatient.coverageNumber || '');
      if (initialPatient.totalPrescribedSessions && initialPatient.totalPrescribedSessions > 0) {
        setTotalSessions(initialPatient.totalPrescribedSessions);
      }
    } else {
      setPatientName('');
      setPhone('');
      setEmail('');
      setPatientId(undefined);
      setCoverageType('PARTICULAR');
      setCoverageProvider('');
      setCoverageNumber('');
    }
    setPreviewSessions([]);
    setHasCalculated(false);
    setPreviewError(null);
  }, [initialPatient, isOpen]);
  const handleSetTotalSessions = (cnt: number) => {
    const validCnt = Math.max(1, cnt);
    setTotalSessions(validCnt);
    setSchedulePatterns(prev => {
      if (prev.length > validCnt) {
        return prev.slice(0, validCnt);
      }
      return prev;
    });
    setHasCalculated(false);
    setPreviewError(null);
  };

  // Toggle or add weekday pattern with totalSessions upper bound enforcement
  const toggleWeekday = (dayOfWeek: number) => {
    setSchedulePatterns(prev => {
      const exists = prev.some(p => p.dayOfWeek === dayOfWeek);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(p => p.dayOfWeek !== dayOfWeek);
      } else {
        // Enforce: Cannot select more recurring days in a week than total sessions requested
        if (prev.length >= totalSessions) {
          return prev;
        }
        const defaultTime = dayOfWeek === 6 ? '09:00' : '10:00';
        return [...prev, { dayOfWeek, startTime: defaultTime }].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      }
    });
    setHasCalculated(false);
    setPreviewError(null);
  };

  // Explicitly remove a weekday pattern via the dedicated X button
  const removeWeekday = (dayOfWeek: number) => {
    setSchedulePatterns(prev => {
      if (prev.length === 1) {
        setPreviewError(
          txt(
            'Veuillez conserver au moins un jour de récurrence.',
            'Please keep at least one recurring day.',
            'Mantenha pelo menos um dia de recorrência selecionado.'
          )
        );
        return prev;
      }
      return prev.filter(p => p.dayOfWeek !== dayOfWeek);
    });
    setHasCalculated(false);
    setPreviewError(null);
  };

  const updatePatternTime = (dayOfWeek: number, startTime: string) => {
    setSchedulePatterns(prev =>
      prev.map(p => (p.dayOfWeek === dayOfWeek ? { ...p, startTime } : p))
    );
    setHasCalculated(false);
  };

  // Preview API calculation
  const handleCalculatePreview = async () => {
    if (schedulePatterns.length === 0) {
      setPreviewError(txt('Veuillez sélectionner au moins un jour.', 'Please select at least one day.', 'Por favor, selecione pelo menos um dia da semana.'));
      return;
    }

    setLoadingPreview(true);
    setPreviewError(null);

    try {
      const res = await fetch('/api/admin/appointments/multiple/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          totalSessions,
          scheduleSlots: schedulePatterns,
          serviceSlug,
          patientPhone: phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao calcular calendário');
      }

      setPreviewSessions(data.preview || []);
      setHasCalculated(true);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Inline adjustment for a single preview session
  const handleAdjustSession = (index: number, newDate: string, newTime: string) => {
    setPreviewSessions(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          date: newDate,
          startTime: newTime,
        };
      }
      return updated;
    });

    // Re-verify the adjusted session with custom explicit dates
    recheckExplicitSessions(
      previewSessions.map((s, idx) =>
        idx === index ? { date: newDate, startTime: newTime } : { date: s.date, startTime: s.startTime }
      )
    );
  };

  const recheckExplicitSessions = async (explicitSessions: { date: string; startTime: string }[]) => {
    setLoadingPreview(true);
    try {
      const res = await fetch('/api/admin/appointments/multiple/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explicitSessions,
          serviceSlug,
          patientPhone: phone,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.preview)) {
        setPreviewSessions(data.preview);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingPreview(false);
    }
  };

  // Final confirmation: Commit multiple sessions
  const handleConfirmBooking = async () => {
    if (!patientName.trim() || !phone.trim()) {
      setPreviewError(txt('Nom et téléphone du patient requis.', 'Patient name and phone required.', 'O nome e telefone do utente são obrigatórios.'));
      return;
    }

    if (previewSessions.length === 0) {
      setPreviewError(txt('Veuillez d\'abord calculer le calendrier.', 'Please calculate schedule first.', 'Por favor, calcule primeiro o calendário.'));
      return;
    }

    const hasConflicts = previewSessions.some(s => !s.available);
    if (hasConflicts) {
      setPreviewError(
        txt(
          'Des créneaux sont en conflit. Veuillez ajuster les horaires marqués en rouge.',
          'Some slots have conflicts. Please adjust highlighted slots before confirming.',
          'Existem horários com conflito (ocupados ou bloqueados). Ajuste os itens assinalados a vermelho antes de confirmar.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    setPreviewError(null);

    try {
      const res = await fetch('/api/admin/appointments/multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service: serviceSlug,
          patientId,
          coverageType,
          coverageProvider: coverageProvider || undefined,
          coverageNumber: coverageNumber || undefined,
          sessions: previewSessions.map(s => ({
            date: s.date,
            startTime: s.startTime,
            notes: s.sessionIndex === 1
              ? `Sessão #1 • Plano de Tratamento (${totalSessions} sessões) • EVA Inicial: ${initialEvaScore}/10`
              : `Sessão #${s.sessionIndex} • Plano de Tratamento (${totalSessions} sessões)`,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.conflicts && Array.isArray(data.conflicts)) {
          // Concurrency conflict detected at server commit time
          setPreviewError(
            txt(
              'Un créneau vient d\'être réservé par un autre utilisateur. Veuillez recalculer le calendrier.',
              'A slot was just booked by another user. Please recalculate the schedule.',
              'Um dos horários acabou de ser ocupado. Por favor, recalcule o calendário.'
            )
          );
          handleCalculatePreview();
          return;
        }
        throw new Error(data.message || data.error || 'Erro ao criar marcações em lote');
      }

      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: txt('Plano de Sessões Criado', 'Multiple Sessions Booked', 'Plano de Sessões Criado'),
          message: `${patientName} • ${data.count || previewSessions.length} sessões agendadas com sucesso.`,
        });
      }

      if (onSuccess && Array.isArray(data.appointments)) {
        onSuccess(data.appointments);
      }

      onClose();
    } catch (err: any) {
      setPreviewError(err.message || 'Erro inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const conflictCount = useMemo(
    () => previewSessions.filter(s => !s.available).length,
    [previewSessions]
  );

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Agendamento de Múltiplas Sessões', 'Multiple Sessions Scheduler', 'Agendamento de Múltiplas Sessões')}
      subtitle={txt('Configuração de plano com bloqueio automático e sincronização em tempo real', 'Recurring plan with automatic slot blocking and live sync', 'Configuração de plano com bloqueio automático e sincronização em tempo real')}
      maxWidth="2xl"
    >
      <div className="relative space-y-4 font-sans text-xs min-h-[380px]">
        {/* Advanced Glassmorphic Scanning Overlay while calculating/verifying */}
        <AnimatePresence>
          {loadingPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute -inset-2 z-50 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-xl select-none"
            >
              <div className="relative flex items-center justify-center">
                {/* Radial Glow Aura */}
                <div className="absolute -inset-3 rounded-full bg-emerald-500/15 blur-lg animate-pulse" />
                {/* Outer spinning ring */}
                <div className="w-16 h-16 rounded-full border-3 border-[#E2E8F0] border-t-[#0F172A] border-r-[#0F172A] animate-spin" />
                {/* Inner counter-spinning ring */}
                <div className="absolute w-10 h-10 rounded-full border-2 border-emerald-200 border-b-emerald-600 animate-[spin_1.2s_linear_infinite_reverse]" />
                <IconSparkles className="absolute text-[#0F172A]" size={20} />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="font-bold text-sm text-[#0F172A]">
                  {txt('Vérification des disponibilités en temps réel...', 'Checking live schedule availability...', 'A verificar disponibilidade em tempo real...')}
                </h4>
                <p className="text-[11px] text-[#64748B] font-medium leading-relaxed">
                  {txt(
                    `Analyse de ${totalSessions} séances contre les créneaux occupés, bloqués et fermetures cliniques.`,
                    `Testing ${totalSessions} sessions against booked slots, admin blocks and clinic closures.`,
                    `A validar ${totalSessions} sessões contra consultas ocupadas, bloqueios e domingos.`
                  )}
                </p>
              </div>

              {/* Shimmer Scanning Bar */}
              <div className="w-52 h-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#0F172A] to-transparent animate-[shimmer_1.2s_infinite]" />
              </div>

              <span className="text-[10px] font-bold text-[#94A3B8] tracking-wider uppercase">
                {txt('Patientez un instant', 'Please wait a moment', 'Por favor, aguarde')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert Box */}
        {previewError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-start gap-2.5">
            <IconAlertCircle className="shrink-0 mt-0.5 text-rose-600" size={18} />
            <span className="leading-relaxed">{previewError}</span>
          </div>
        )}

        {/* 1. Patient & Treatment Information */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#0F172A] text-xs pb-1 border-b border-[#E2E8F0]">
            <IconUser size={16} className="text-[#64748B]" />
            <span>{txt('Informations Patient & Soin', 'Patient & Service Details', 'Dados do Utente & Tratamento')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#475569] block">
                  {txt('Nom du Patient *', 'Patient Name *', 'Nome do Utente *')}
                </label>
                {Boolean(initialPatient || patientId) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] font-bold bg-[#E2E8F0]/60 px-1.5 py-0.5 rounded-md">
                    <IconLock size={11} className="text-[#64748B]" />
                    {txt('Fixé', 'Locked', 'Fixado')}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={Boolean(initialPatient || patientId)}
                  value={patientName}
                  onChange={e => {
                    if (Boolean(initialPatient || patientId)) return;
                    setPatientName(e.target.value);
                    setHasCalculated(false);
                  }}
                  placeholder="Ex: Maria Silva"
                  className={`w-full rounded-xl p-2.5 text-xs focus:outline-none ${
                    Boolean(initialPatient || patientId)
                      ? 'bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] cursor-not-allowed select-none font-semibold pr-8'
                      : 'bg-white border border-[#CBD5E1] text-[#0F172A] focus:border-[#0F172A]'
                  }`}
                />
                {Boolean(initialPatient || patientId) && (
                  <IconLock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#475569] block">
                  {txt('Téléphone *', 'Phone *', 'Telefone *')}
                </label>
                {Boolean(initialPatient || patientId) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] font-bold bg-[#E2E8F0]/60 px-1.5 py-0.5 rounded-md">
                    <IconLock size={11} className="text-[#64748B]" />
                    {txt('Fixé', 'Locked', 'Fixado')}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="tel"
                  required
                  readOnly={Boolean(initialPatient || patientId)}
                  value={phone}
                  onChange={e => {
                    if (Boolean(initialPatient || patientId)) return;
                    setPhone(e.target.value);
                    setHasCalculated(false);
                  }}
                  placeholder="+351 912 345 678"
                  className={`w-full rounded-xl p-2.5 text-xs focus:outline-none ${
                    Boolean(initialPatient || patientId)
                      ? 'bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] cursor-not-allowed select-none font-semibold pr-8'
                      : 'bg-white border border-[#CBD5E1] text-[#0F172A] focus:border-[#0F172A]'
                  }`}
                />
                {Boolean(initialPatient || patientId) && (
                  <IconLock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Soin / Prestation *', 'Treatment / Service *', 'Tratamento / Cuidado *')}
              </label>
              <select
                value={serviceSlug}
                onChange={e => {
                  setServiceSlug(e.target.value);
                  setHasCalculated(false);
                }}
                className="w-full bg-white border border-[#CBD5E1] text-[#0F172A] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#0F172A]"
              >
                {SERVICES.map(s => (
                  <option key={s.slug} value={s.slug}>
                    {s.name[lang] || s.name.pt || s.name.fr} ({s.price} €)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Nombre de Séances *', 'Total Sessions *', 'Número de Sessões *')}
              </label>
              <div className="flex items-center gap-1.5">
                {[5, 10, 15, 20].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSetTotalSessions(cnt)}
                    className={`flex-1 py-2 rounded-xl font-bold transition-colors ${
                      totalSessions === cnt
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={totalSessions}
                  onChange={e => handleSetTotalSessions(parseInt(e.target.value) || 1)}
                  className="w-14 bg-white border border-[#CBD5E1] text-[#0F172A] rounded-xl p-2 text-center font-bold text-xs focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>
          </div>

          {/* Intake Pain Score (EVA Baseline) */}
          <div className="pt-3 border-t border-[#E2E8F0]">
            <EvaScorePicker
              value={initialEvaScore}
              onChange={setInitialEvaScore}
              lang={lang}
              showLabel={true}
            />
          </div>
        </div>

        {/* 2. Recurrence Schedule Builder */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between font-bold text-[#0F172A] text-xs pb-1 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <IconCalendarRepeat size={16} className="text-[#64748B]" />
              <span>{txt('Régularité & Horaires Hebdomadaires', 'Weekly Recurrence & Time Slots', 'Dias da Semana & Horários Recorrentes')}</span>
              <span className="text-[10px] font-bold text-[#475569] bg-white px-2 py-0.5 rounded-md border border-[#CBD5E1] shadow-2xs">
                {schedulePatterns.length} / {Math.min(6, totalSessions)} {txt('jours', 'days', 'dias')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-[#64748B]">
                {txt('Date de Début:', 'Start Date:', 'Início:')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setHasCalculated(false);
                }}
                className="bg-white border border-[#CBD5E1] text-[#0F172A] rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          {/* Weekday Pickers & Times */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {WEEKDAYS.map(w => {
              const activePattern = schedulePatterns.find(p => p.dayOfWeek === w.day);
              const isActive = Boolean(activePattern);
              const isBlockedByLimit = !isActive && schedulePatterns.length >= totalSessions;

              return (
                <div
                  key={w.day}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-white border-[#0F172A] shadow-2xs'
                      : isBlockedByLimit
                      ? 'bg-[#F1F5F9]/60 border-[#E2E8F0] opacity-40'
                      : 'bg-[#F1F5F9] border-[#E2E8F0] opacity-75 hover:opacity-100 hover:border-[#CBD5E1]'
                  }`}
                  title={
                    isBlockedByLimit
                      ? txt(
                          `Maximum de ${totalSessions} jour(s) sélectionnable(s) pour ce plan`,
                          `Maximum of ${totalSessions} day(s) selectable for this plan`,
                          `Máximo de ${totalSessions} dia(s) selecionável(is) para este plano`
                        )
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-xs select-none ${
                          isActive ? 'bg-[#0F172A] text-white' : 'bg-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        {lang === 'fr' ? w.labelFr : lang === 'en' ? w.labelEn : w.labelPt}
                      </span>
                      <span className="text-[11px] font-bold text-[#64748B]">
                        {lang === 'fr' ? w.labelFr : lang === 'en' ? w.labelEn : w.labelPt}
                      </span>
                    </div>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => removeWeekday(w.day)}
                        className="w-5 h-5 rounded-md bg-rose-50 hover:bg-rose-100 active:scale-90 text-rose-600 hover:text-rose-700 flex items-center justify-center transition-all border border-rose-200 shadow-2xs"
                        title={txt(`Supprimer le ${w.labelFr}`, `Remove ${w.labelEn}`, `Remover ${w.labelPt}`)}
                        aria-label={txt(`Supprimer le ${w.labelFr}`, `Remove ${w.labelEn}`, `Remover ${w.labelPt}`)}
                      >
                        <IconX size={12} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBlockedByLimit}
                        onClick={() => toggleWeekday(w.day)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                          isBlockedByLimit
                            ? 'text-[#94A3B8] cursor-not-allowed'
                            : 'text-[#0F172A] hover:bg-[#CBD5E1]/60 active:scale-95'
                        }`}
                      >
                        + {txt('Ajouter', 'Add', 'Adicionar')}
                      </button>
                    )}
                  </div>

                  {isActive && activePattern && (
                    <select
                      value={activePattern.startTime}
                      onChange={e => updatePatternTime(w.day, e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-lg p-1.5 font-bold text-xs focus:outline-none focus:border-[#0F172A]"
                    >
                      {VALID_TIME_SLOTS.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={handleCalculatePreview}
              disabled={loadingPreview || isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.98] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 touch-target"
            >
              {loadingPreview ? (
                <>
                  <IconLoader2 size={16} className="animate-spin text-emerald-400" />
                  <span>
                    {txt(
                      `Vérification de ${totalSessions} séances...`,
                      `Verifying ${totalSessions} sessions...`,
                      `A verificar ${totalSessions} sessões...`
                    )}
                  </span>
                </>
              ) : (
                <>
                  <IconSparkles size={16} />
                  <span>
                    {txt(
                      'Calculer & Vérifier Disponibilités',
                      'Calculate & Check Availability',
                      'Calcular & Verificar Disponibilidades'
                    )}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3. Real-Time Slot Validation Preview Table */}
        {hasCalculated && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between font-bold text-[#0F172A] text-xs pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <IconCalendarEvent size={16} className="text-[#0F172A]" />
                <span>
                  {txt('Planning Prévisionnel', 'Generated Schedule Preview', 'Pré-visualização do Plano Gerado')} ({previewSessions.length} {txt('séances', 'sessions', 'sessões')})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {conflictCount === 0 ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    <IconCheck size={14} />
                    {txt('Tous les créneaux sont libres', 'All slots available', 'Todos os horários disponíveis')}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    <IconAlertTriangle size={14} />
                    {conflictCount} {txt('conflit(s) détecté(s)', 'conflict(s) detected', 'conflito(s) detetado(s)')}
                  </span>
                )}
              </div>
            </div>

            {/* List of planned sessions with conflict badges & inline adjustments */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-[#F1F5F9]">
              {previewSessions.map((sess, idx) => (
                <div
                  key={sess.sessionIndex}
                  className={`pt-2 first:pt-0 p-2.5 rounded-xl transition-all ${
                    sess.available ? 'hover:bg-[#F8FAFC]' : 'bg-rose-50/60 border border-rose-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 text-white ${
                        sess.available ? 'bg-[#0F172A]' : 'bg-rose-700'
                      }`}>
                        #{sess.sessionIndex}
                      </span>
                      <div>
                        <span className="font-bold text-[#0F172A] block">
                          {lang === 'fr' ? sess.dayNameFr : lang === 'en' ? sess.dayNameEn : sess.dayNamePt}, {sess.date}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748B]">
                          {sess.startTime} • {SERVICES.find(s => s.slug === serviceSlug)?.name[lang] || serviceSlug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status badge */}
                      {sess.available ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[11px] flex items-center gap-1">
                          <IconCheck size={13} />
                          {txt('Disponível', 'Available', 'Disponível')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-md font-bold text-[11px] flex items-center gap-1">
                            <IconX size={13} />
                            {sess.conflictReason === 'blocked'
                              ? txt('Bloqué', 'Blocked', 'Bloqueado')
                              : sess.conflictReason === 'sunday'
                              ? txt('Dimanche', 'Sunday', 'Domingo')
                              : sess.conflictReason === 'past'
                              ? txt('Passé', 'Past', 'Passado')
                              : txt('Occupé', 'Booked', 'Ocupado')}
                          </span>

                          {/* Time select fallback */}
                          <select
                            value={sess.startTime}
                            onChange={e => handleAdjustSession(idx, sess.date, e.target.value)}
                            className="bg-white border border-rose-300 text-[#0F172A] rounded-md px-2 py-1 text-[11px] font-bold focus:outline-none focus:border-rose-500"
                          >
                            {VALID_TIME_SLOTS.map(t => {
                              const isSlotFree = sess.availableFreeSlots?.includes(t);
                              return (
                                <option key={t} value={t}>
                                  {isSlotFree ? `✓ ${t} (${txt('Libre', 'Free', 'Livre')})` : `✕ ${t}`}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Free slots directly exposed in green for 1-click conflict resolution */}
                  {!sess.available && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#334155] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
                          {txt('Horaires libres disponibles ce jour-là :', 'Available free slots this day:', 'Horários livres disponíveis neste dia:')}
                        </span>
                        <span className="text-[10px] text-[#64748B] font-medium hidden sm:inline">
                          {txt('Cliquez sur un créneau vert pour l’appliquer', 'Click a green slot to select', 'Clique num horário verde para selecionar')}
                        </span>
                      </div>

                      {sess.availableFreeSlots && sess.availableFreeSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {sess.availableFreeSlots.map(freeTime => (
                            <button
                              key={freeTime}
                              type="button"
                              onClick={() => handleAdjustSession(idx, sess.date, freeTime)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-300 text-emerald-800 text-[11px] font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1"
                              title={txt(`Choisir ${freeTime}`, `Pick ${freeTime}`, `Escolher ${freeTime}`)}
                            >
                              <IconCheck size={12} className="text-emerald-600 shrink-0" />
                              <span>{freeTime}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] font-medium text-rose-700 italic">
                          {txt('Aucun créneau libre disponible à cette date.', 'No free slots available on this date.', 'Nenhum horário livre disponível nesta data.')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] font-bold text-xs transition-colors"
          >
            {txt('Annuler', 'Cancel', 'Cancelar')}
          </button>

          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={!hasCalculated || conflictCount > 0 || isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>{txt('Confirmation en cours...', 'Booking sessions...', 'A confirmar agendamento...')}</span>
            ) : (
              <>
                <IconCheck size={16} />
                <span>
                  {txt(
                    `Confirmer et Bloquer (${previewSessions.length} Séances)`,
                    `Confirm and Block (${previewSessions.length} Sessions)`,
                    `Confirmar e Bloquear (${previewSessions.length} Sessões)`
                  )}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
