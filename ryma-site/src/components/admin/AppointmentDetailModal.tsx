'use client';

import React from 'react';
import {
  IconX,
  IconCheck,
  IconClock,
  IconCalendar,
  IconPhoneCall,
  IconMail,
  IconBrandWhatsapp,
  IconNotes,
  IconReceiptTax,
  IconAlertCircle,
  IconShieldCheck,
  IconStethoscope,
  IconCopy,
} from '@tabler/icons-react';
import {
  Appointment,
  AppointmentStatus,
  STATUS_CONFIG,
  getServiceName,
  getServicePrice,
  formatSlotDateLabel,
} from '@/types/admin';
import { Lang } from '@/lib/i18n';
import { ResponsiveModal } from './ResponsiveModal';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  lang: Lang;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  setConfirmDialog?: (dlg: { title: string; onConfirm: () => void } | null) => void;
  onOpenCreateInvoice?: (appt: Appointment) => void;
  openWhatsAppModal?: (appt: Appointment) => void;
  noShowCounts?: Record<string, number>;
  recentNewIds?: Set<string>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  lang,
  updateStatus,
  softDeleteAppointment,
  openPatientNote,
  setConfirmDialog,
  onOpenCreateInvoice,
  openWhatsAppModal,
  noShowCounts,
  recentNewIds,
}: AppointmentDetailModalProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  if (!appointment) return null;

  const st = STATUS_CONFIG[appointment.status];
  const price = getServicePrice(appointment.service);
  const initials = getInitials(appointment.patientName);
  const isNew = recentNewIds?.has(appointment.id);
  const noShows = noShowCounts?.[appointment.phone] ?? 0;
  const dateMeta = formatSlotDateLabel(appointment.date, lang);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(appointment.phone);
  };

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Détails du Rendez-vous', 'Appointment Details', 'Detalhes da Consulta')}
      subtitle={`${dateMeta.title} · ${appointment.startTime}`}
      maxWidth="md"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Patient Identity & Status Banner */}
        <div className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ring-2 ring-[#0F172A]/10">
              {initials}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-base text-[#0F172A] truncate">
                  {appointment.patientName}
                </span>
                {isNew && (
                  <span className="bg-[#C49A3C] text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase animate-pulse">
                    {txt('NOUVEAU', 'NEW', 'NOVO')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className={`font-semibold px-2 py-0.5 rounded-md border ${st.bg} ${st.color} ${st.border}`}>
                  {st[lang] || st.pt || st.fr}
                </span>
                {price > 0 && (
                  <span className="font-bold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                    {price} €
                  </span>
                )}
              </div>
            </div>
          </div>

          {noShows >= 2 && (
            <span className="bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
              <IconAlertCircle size={12} />
              <span>{noShows} {txt('annulations', 'cancels', 'faltas')}</span>
            </span>
          )}
        </div>

        {/* Treatment & Time Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <IconStethoscope size={13} className="text-[#2563EB]" />
              <span>{txt('Soin / Traitement', 'Treatment / Service', 'Tratamento / Cuidado')}</span>
            </div>
            <div className="font-semibold text-[#0F172A] text-xs">
              {getServiceName(appointment.service, lang)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <IconCalendar size={13} className="text-[#C49A3C]" />
              <span>{txt('Date & Horaire', 'Date & Slot', 'Data & Horário')}</span>
            </div>
            <div className="font-semibold text-[#0F172A] text-xs">
              {appointment.date} @ <span className="font-bold text-[#2563EB]">{appointment.startTime}</span>
            </div>
          </div>
        </div>

        {/* Contact Info & Actions */}
        <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
          <div className="text-[10px] uppercase font-bold text-[#64748B]">
            {txt('Coordonnées du Patient', 'Contact Information', 'Contactos do Utente')}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <a
                href={`tel:${appointment.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs transition-colors"
              >
                <IconPhoneCall size={14} className="text-[#2563EB]" />
                <span>{appointment.phone}</span>
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] transition-colors"
                title={txt('Copier le numéro', 'Copy phone', 'Copiar telefone')}
              >
                <IconCopy size={13} />
              </button>
            </div>

            {appointment.email && (
              <a
                href={`mailto:${appointment.email}`}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#0F172A] transition-colors truncate max-w-xs"
              >
                <IconMail size={14} />
                <span className="truncate">{appointment.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Insurance Coverage Details if any */}
        {(appointment.coverageType || appointment.coverageProvider) && (
          <div className="p-3 rounded-xl bg-[#F0FDF4]/50 border border-[#DCFCE7] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#166534] flex items-center gap-1">
              <IconShieldCheck size={13} />
              <span>{txt('Couverture Santé / Assurance', 'Insurance Coverage', 'Regime de Saúde / Seguro')}</span>
            </div>
            <div className="text-xs text-[#166534] font-medium flex items-center gap-2">
              <span className="font-bold">{appointment.coverageType || 'PARTICULAR'}</span>
              {appointment.coverageProvider && <span>· {appointment.coverageProvider}</span>}
              {appointment.coverageNumber && (
                <span className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#BBF7D0]">
                  #{appointment.coverageNumber}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Patient Triage Notes */}
        {appointment.notes && (
          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <div className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
              <IconNotes size={13} />
              <span>{txt('Notes cliniques / Symptômes', 'Clinical Notes / Symptoms', 'Notas / Sintomas')}</span>
            </div>
            <div className="text-xs text-[#334155] leading-relaxed">
              {appointment.notes}
            </div>
          </div>
        )}

        {/* Clinical Operations Hub (WhatsApp, EHR, Invoice) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {openWhatsAppModal ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                openWhatsAppModal(appointment);
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#DCFCE7] text-[#166534] transition-colors"
            >
              <IconBrandWhatsapp size={18} className="mb-0.5" />
              <span className="font-bold text-[11px]">WhatsApp</span>
            </button>
          ) : (
            <a
              href={`https://wa.me/${appointment.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#DCFCE7] text-[#166534] transition-colors"
            >
              <IconBrandWhatsapp size={18} className="mb-0.5" />
              <span className="font-bold text-[11px]">WhatsApp</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              openPatientNote(appointment);
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#0F172A] transition-colors"
          >
            <IconNotes size={18} className="mb-0.5 text-[#2563EB]" />
            <span className="font-bold text-[11px]">{txt('Dossier EHR', 'EHR File', 'Ficha Utente')}</span>
          </button>

          {onOpenCreateInvoice ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateInvoice(appointment);
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F5E9C8] border border-[#E8DCC0] text-[#9A7428] transition-colors"
            >
              <IconReceiptTax size={18} className="mb-0.5 text-[#C49A3C]" />
              <span className="font-bold text-[11px]">{txt('Facture', 'Invoice', 'Fatura')}</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        {/* Status Transition Action Buttons */}
        <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
          <div>
            {appointment.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => {
                  if (setConfirmDialog) {
                    setConfirmDialog({
                      title: txt(
                        `Annuler le rendez-vous de ${appointment.patientName} ?`,
                        `Cancel appointment for ${appointment.patientName}?`,
                        `Cancelar a consulta de ${appointment.patientName}?`
                      ),
                      onConfirm: () => {
                        softDeleteAppointment(appointment.id);
                        onClose();
                      },
                    });
                  } else {
                    softDeleteAppointment(appointment.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] font-semibold text-xs border border-[#FECACA] transition-colors flex items-center gap-1.5"
              >
                <IconX size={15} />
                <span>{txt('Annuler Consulta', 'Cancel Appt', 'Cancelar Consulta')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {appointment.status !== 'CONFIRMED' && appointment.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => {
                  updateStatus(appointment.id, 'CONFIRMED');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] font-bold text-xs border border-[#BBF7D0] transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <IconCheck size={15} />
                <span>{txt('Confirmer', 'Confirm', 'Confirmar')}</span>
              </button>
            )}

            {appointment.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => {
                  updateStatus(appointment.id, 'COMPLETED');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#DBEAFE] hover:bg-[#BFDBFE] text-[#1E40AF] font-bold text-xs border border-[#BFDBFE] transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <IconCheck size={15} />
                <span>{txt('Terminer Soin', 'Complete Session', 'Concluir Consulta')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] font-semibold text-xs border border-[#E2E8F0] transition-colors"
            >
              {txt('Fermer', 'Close', 'Fechar')}
            </button>
          </div>
        </div>
      </div>
    </ResponsiveModal>
  );
}
