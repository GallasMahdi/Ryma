'use client';

import React from 'react';
import { SERVICES } from '@/data/services';
import { VALID_TIME_SLOTS } from '@/lib/validation';
import { Lang } from '@/lib/i18n';
import { ResponsiveModal } from './ResponsiveModal';
import { IconAlertCircle } from '@tabler/icons-react';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  newForm: {
    patientName: string;
    phone: string;
    email: string;
    service: string;
    date: string;
    startTime: string;
    notes: string;
  };
  setNewForm: React.Dispatch<
    React.SetStateAction<{
      patientName: string;
      phone: string;
      email: string;
      service: string;
      date: string;
      startTime: string;
      notes: string;
    }>
  >;
  addingError: string | null;
  addingLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddAppointmentModal = React.memo(function AddAppointmentModal({
  isOpen,
  onClose,
  lang,
  newForm,
  setNewForm,
  addingError,
  addingLoading,
  onSubmit,
}: AddAppointmentModalProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Nouveau Rendez-vous', 'Create Appointment', 'Marcar Nova Consulta')}
      subtitle={txt('Enregistrement rapide d’une consultation', 'Quick booking form', 'Formulário de marcação rápida')}
      maxWidth="md"
    >
      {addingError && (
        <div className="mb-4 p-3.5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#991B1B] text-xs font-medium flex items-center gap-2">
          <IconAlertCircle size={16} />
          <span>{addingError}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3.5 font-sans text-xs">
        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Nom du Patient *', 'Patient Name *', 'Nome do Utente *')}
          </label>
          <input
            type="text"
            required
            value={newForm.patientName}
            onChange={e => setNewForm(p => ({ ...p, patientName: e.target.value }))}
            placeholder={txt('Ex: Sophie Bernard', 'E.g. John Doe', 'Ex: Maria Silva')}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Téléphone *', 'Phone *', 'Telefone *')}
            </label>
            <input
              type="tel"
              required
              value={newForm.phone}
              onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="+351 912 345 678"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Email', 'Email', 'Email')}
            </label>
            <input
              type="email"
              value={newForm.email}
              onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))}
              placeholder="patient@email.com"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Soin / Prestation *', 'Treatment / Service *', 'Tratamento *')}
          </label>
          <select
            value={newForm.service}
            onChange={e => setNewForm(p => ({ ...p, service: e.target.value }))}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors font-sans"
          >
            {SERVICES.map(s => (
              <option key={s.slug} value={s.slug}>
                {s.name[lang] || s.name.pt || s.name.fr} ({s.price} €)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Date *', 'Date *', 'Data *')}
            </label>
            <input
              type="date"
              required
              value={newForm.date}
              onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Horaire *', 'Time Slot *', 'Horário *')}
            </label>
            <select
              value={newForm.startTime}
              onChange={e => setNewForm(p => ({ ...p, startTime: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors font-sans"
            >
              {VALID_TIME_SLOTS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Notes / Remarques', 'Notes / Remarks', 'Notas / Observações')}
          </label>
          <textarea
            rows={2}
            value={newForm.notes}
            onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
            placeholder={txt('Précisions sur la consultation...', 'Optional details...', 'Detalhes opcionais...')}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors resize-none"
          />
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors"
          >
            {txt('Annuler', 'Cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={addingLoading}
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium disabled:opacity-50 transition-colors shadow-xs touch-target"
          >
            {addingLoading
              ? txt('Création...', 'Creating...', 'A criar...')
              : txt('Valider le Rendez-vous', 'Confirm Appointment', 'Confirmar Consulta')}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
});