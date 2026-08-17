'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import { SERVICES } from '@/data/services';
import { VALID_TIME_SLOTS } from '@/lib/validation';

import { Lang } from '@/lib/i18n';

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

export function AddAppointmentModal({
  isOpen,
  onClose,
  lang,
  newForm,
  setNewForm,
  addingError,
  addingLoading,
  onSubmit,
}: AddAppointmentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-lg w-full shadow-lg space-y-5 font-sans"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="font-semibold text-base text-[#0F172A]">
                {lang === 'pt' ? 'Marcar Nova Consulta' : lang === 'en' ? 'Create Appointment' : 'Créer un Rendez-vous'}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <IconX size={18} />
              </button>
            </div>

            {addingError && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg text-[#991B1B] text-xs font-medium">
                {addingError}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#475569] font-medium block mb-1">
                  {lang === 'pt' ? 'Nome do Utente *' : lang === 'en' ? 'Patient Name *' : 'Nom du Patient *'}
                </label>
                <input
                  type="text"
                  required
                  value={newForm.patientName}
                  onChange={e => setNewForm(p => ({ ...p, patientName: e.target.value }))}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#475569] font-medium block mb-1">
                    {lang === 'pt' ? 'Telefone *' : lang === 'en' ? 'Phone *' : 'Téléphone *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={newForm.phone}
                    onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[#475569] font-medium block mb-1">Email</label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#475569] font-medium block mb-1">
                  {lang === 'pt' ? 'Tratamento *' : lang === 'en' ? 'Service *' : 'Soin *'}
                </label>
                <select
                  value={newForm.service}
                  onChange={e => setNewForm(p => ({ ...p, service: e.target.value }))}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                >
                  {SERVICES.map(s => (
                    <option key={s.slug} value={s.slug}>
                      {s.name[lang] || s.name.pt || s.name.fr} ({s.price} €)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#475569] font-medium block mb-1">
                    {lang === 'pt' ? 'Data *' : lang === 'en' ? 'Date *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[#475569] font-medium block mb-1">
                    {lang === 'pt' ? 'Horário *' : lang === 'en' ? 'Time Slot *' : 'Horaire *'}
                  </label>
                  <select
                    value={newForm.startTime}
                    onChange={e => setNewForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
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
                <label className="text-[#475569] font-medium block mb-1">
                  {lang === 'pt' ? 'Notas / Observações' : lang === 'en' ? 'Notes' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] resize-none transition-colors"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors text-xs"
                >
                  {lang === 'pt' ? 'Cancelar' : lang === 'en' ? 'Cancel' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={addingLoading}
                  className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs disabled:opacity-50 transition-colors"
                >
                  {addingLoading
                    ? (lang === 'pt' ? 'A criar...' : lang === 'en' ? 'Creating...' : 'Création...')
                    : (lang === 'pt' ? 'Guardar Consulta' : lang === 'en' ? 'Save Appointment' : 'Créer le rendez-vous')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}