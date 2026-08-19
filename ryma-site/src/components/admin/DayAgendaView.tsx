'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconChevronLeft,
  IconChevronRight,
  IconBrandWhatsapp,
  IconNotes,
  IconCheck,
  IconX,
  IconClock,
  IconPhoneCall,
  IconAlertCircle,
  IconCalendar,
} from '@tabler/icons-react';
import {
  Appointment,
  AppointmentStatus,
  STATUS_CONFIG,
  getServiceName,
  getServicePrice,
  formatSlotDateLabel,
  shiftDateString,
  formatLocalDate,
} from '@/types/admin';
import { Lang } from '@/lib/i18n';

interface DayAgendaViewProps {
  appointments: Appointment[];
  lang: Lang;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
  noShowCounts?: Record<string, number>;
  recentNewIds?: Set<string>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function DayAgendaView({
  appointments,
  lang,
  updateStatus,
  softDeleteAppointment,
  openPatientNote,
  setConfirmDialog,
  noShowCounts,
  recentNewIds,
}: DayAgendaViewProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Generate 7-day strip around selected date
  const dayStrip = useMemo(() => {
    const list: string[] = [];
    const base = new Date(selectedDate + 'T12:00:00');
    // 2 days before, selected day, 4 days after
    for (let i = -2; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      list.push(formatLocalDate(d));
    }
    return list;
  }, [selectedDate]);

  // Appointments for the selected day, sorted chronologically
  const dayAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [appointments, selectedDate]);

  const dateMeta = formatSlotDateLabel(selectedDate, lang);

  return (
    <div className="space-y-4 font-sans">
      {/* Date Switcher Header */}
      <div className="bg-white border border-[#E9E6DF] rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(prev => shiftDateString(prev, -1))}
            className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#1A1412] hover:border-[#C49A3C] transition-all touch-target flex items-center justify-center"
            title={txt('Jour précédent', 'Previous day', 'Dia anterior')}
          >
            <IconChevronLeft size={18} />
          </button>

          <div className="text-center min-w-0 px-2">
            <div className="font-serif font-bold text-base sm:text-lg text-[#1A1412] capitalize truncate">
              {dateMeta.title}
            </div>
            <div className="font-mono text-xs text-[#77736B]">
              {dateMeta.subtitle} · {dayAppointments.length}{' '}
              {dayAppointments.length === 1
                ? txt('rendez-vous', 'appointment', 'consulta')
                : txt('rendez-vous', 'appointments', 'consultas')}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                selectedDate === todayStr
                  ? 'bg-[#C49A3C] text-white shadow-xs'
                  : 'bg-[#FAF6EE] border border-[#E8D7B0] text-[#9A7428] hover:bg-[#F5E9C8]'
              }`}
            >
              {txt("Auj.", 'Today', 'Hoje')}
            </button>

            <button
              onClick={() => setSelectedDate(prev => shiftDateString(prev, 1))}
              className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#1A1412] hover:border-[#C49A3C] transition-all touch-target flex items-center justify-center"
              title={txt('Jour suivant', 'Next day', 'Dia seguinte')}
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Horizontal Day Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-touch py-1">
          {dayStrip.map(ds => {
            const isSel = ds === selectedDate;
            const isToday = ds === todayStr;
            const meta = formatSlotDateLabel(ds, lang);
            const count = appointments.filter(a => a.date === ds).length;

            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex-1 min-w-[58px] py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative touch-target ${
                  isSel
                    ? 'bg-[#1A1412] border-[#1A1412] text-white shadow-md scale-[1.02]'
                    : isToday
                    ? 'bg-[#FAF6EE] border-[#E8D7B0] text-[#9A7428]'
                    : 'bg-[#FAFAF8] border-[#E9E6DF] text-[#4A4540] hover:bg-white'
                }`}
              >
                <span className="text-[9.5px] font-mono uppercase tracking-wider font-semibold opacity-80">
                  {meta.title.substring(0, 3)}
                </span>
                <span className="font-serif font-bold text-sm leading-tight mt-0.5">
                  {ds.split('-')[2]}
                </span>
                {count > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSel ? 'bg-[#E8C97A]' : 'bg-[#C49A3C]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Timeline List */}
      {dayAppointments.length === 0 ? (
        <div className="bg-white border border-[#E9E6DF] rounded-2xl p-8 sm:p-12 text-center space-y-2 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#C49A3C] flex items-center justify-center mx-auto">
            <IconCalendar size={24} />
          </div>
          <h4 className="font-serif font-bold text-base text-[#1A1412]">
            {txt('Aucun rendez-vous pour ce jour', 'No appointments for this day', 'Nenhuma consulta para este dia')}
          </h4>
          <p className="text-xs text-[#77736B] max-w-sm mx-auto">
            {txt(
              'Aucun soin n’est programmé à cette date. Utilisez le bouton "Nouveau RDV" pour planifier une séance.',
              'No appointments are scheduled on this date. Click "New Appt" to book a patient.',
              'Não existem consultas agendadas nesta data. Clique em "Nova Consulta" para agendar.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayAppointments.map(appt => {
            const st = STATUS_CONFIG[appt.status];
            const price = getServicePrice(appt.service);
            const initials = getInitials(appt.patientName);
            const isNew = recentNewIds?.has(appt.id);
            const noShows = noShowCounts?.[appt.phone] ?? 0;

            return (
              <div
                key={appt.id}
                className={`bg-white border rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 relative overflow-hidden ${
                  isNew
                    ? 'border-[#C49A3C] bg-[#FAF6EE]/50 ring-1 ring-[#C49A3C]'
                    : 'border-[#E9E6DF] hover:border-[#D3CEB8]'
                }`}
              >
                {/* Left status color bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    appt.status === 'CONFIRMED'
                      ? 'bg-[#22C55E]'
                      : appt.status === 'PENDING'
                      ? 'bg-[#F59E0B]'
                      : appt.status === 'COMPLETED'
                      ? 'bg-[#3B82F6]'
                      : 'bg-[#EF4444]'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-2">
                  {/* Time + Patient Identity */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#1A1412] min-w-[54px] shrink-0">
                      <IconClock size={14} className="text-[#C49A3C] mb-0.5" />
                      <span className="font-mono font-bold text-xs">
                        {appt.startTime}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-serif font-bold text-sm sm:text-base text-[#1A1412] truncate">
                          {appt.patientName}
                        </span>
                        {isNew && (
                          <span className="bg-[#C49A3C] text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                            {txt('NOUV.', 'NEW', 'NOVO')}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${st.bg} ${st.color} ${st.border}`}>
                          {st[lang] || st.pt || st.fr}
                        </span>
                        {noShows >= 2 && (
                          <span className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-[10px] font-medium px-1.5 py-0.2 rounded flex items-center gap-1">
                            <IconAlertCircle size={11} />
                            <span>{noShows} {txt('annulations', 'cancels', 'cancelamentos')}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#77736B]">
                        <span className="font-medium text-[#4A4540]">
                          {getServiceName(appt.service, lang)}
                        </span>
                        {price > 0 && (
                          <>
                            <span className="text-[#D3CEB8]">•</span>
                            <span className="font-mono font-bold text-[#C49A3C]">
                              {price} €
                            </span>
                          </>
                        )}
                        <span className="text-[#D3CEB8]">•</span>
                        <a
                          href={`tel:${appt.phone}`}
                          className="flex items-center gap-1 text-[#4A4540] hover:text-[#C49A3C] transition-colors"
                        >
                          <IconPhoneCall size={12} />
                          <span>{appt.phone}</span>
                        </a>
                      </div>

                      {appt.notes && (
                        <div className="text-[11px] text-[#77736B] bg-[#FAFAF8] p-2 rounded-xl border border-[#E9E6DF] mt-1 max-w-xl">
                          {appt.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E9E6DF] justify-end shrink-0 flex-wrap">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${appt.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        lang === 'fr'
                          ? `Bonjour ${appt.patientName}, nous vous rappelons votre rendez-vous pour ${getServiceName(appt.service, 'fr')} le ${appt.date} à ${appt.startTime} au Cabinet Ryma Kiné.`
                          : lang === 'en'
                          ? `Hello ${appt.patientName}, reminder for your appointment for ${getServiceName(appt.service, 'en')} on ${appt.date} at ${appt.startTime} at Ryma Kiné Clinic.`
                          : `Olá ${appt.patientName}, lembramos a sua consulta de ${getServiceName(appt.service, 'pt')} no dia ${appt.date} às ${appt.startTime} na Clínica Ryma Kiné.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] hover:bg-[#DCFCE7] transition-all touch-target flex items-center justify-center"
                      title="WhatsApp"
                    >
                      <IconBrandWhatsapp size={16} />
                    </a>

                    {/* Patient File */}
                    <button
                      onClick={() => openPatientNote(appt)}
                      className="p-2 rounded-xl border border-[#E9E6DF] bg-[#FAFAF8] text-[#4A4540] hover:bg-[#F4F2EE] transition-all touch-target flex items-center justify-center"
                      title={txt('Dossier patient', 'Patient file', 'Ficha do doente')}
                    >
                      <IconNotes size={16} />
                    </button>

                    {/* Status actions */}
                    {appt.status !== 'CONFIRMED' && appt.status !== 'CANCELLED' && (
                      <button
                        onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                        className="px-3 py-2 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] hover:bg-[#BBF7D0] text-xs font-semibold transition-all touch-target flex items-center gap-1"
                      >
                        <IconCheck size={14} />
                        <span>{txt('Confirmer', 'Confirm', 'Confirmar')}</span>
                      </button>
                    )}

                    {appt.status === 'CONFIRMED' && (
                      <button
                        onClick={() => updateStatus(appt.id, 'COMPLETED')}
                        className="px-3 py-2 rounded-xl bg-[#DBEAFE] border border-[#BFDBFE] text-[#1E40AF] hover:bg-[#BFDBFE] text-xs font-semibold transition-all touch-target flex items-center gap-1"
                      >
                        <IconCheck size={14} />
                        <span>{txt('Terminer', 'Complete', 'Concluir')}</span>
                      </button>
                    )}

                    {appt.status !== 'CANCELLED' && (
                      <button
                        onClick={() =>
                          setConfirmDialog({
                            title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                            onConfirm: () => softDeleteAppointment(appt.id),
                          })
                        }
                        className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2] transition-all touch-target flex items-center justify-center"
                        title={txt('Annuler', 'Cancel', 'Cancelar')}
                      >
                        <IconX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
