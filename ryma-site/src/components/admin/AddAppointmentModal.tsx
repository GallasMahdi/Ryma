'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import { SERVICES } from '@/data/services';
import { VALID_TIME_SLOTS } from '@/lib/validation';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fr' | 'ar';
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
        <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-[#E9E6DF] p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-[0_20px_60px_rgba(0,0,0,0.12)] space-y-5 relative overflow-hidden font-sans"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C6A15B] via-[#E8D7B0] to-[#9B793A]" />

            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold text-[#202020]">
                {lang === 'fr' ? 'Créer un Rendez-vous' : 'إضافة موعد جديد'}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-xl text-[#77736B] hover:text-[#202020] hover:bg-[#FAFAF8] transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            {addingError && (
              <div className="p-3 bg-[#A9655F]/10 border border-[#A9655F]/30 rounded-xl text-[#A9655F] text-xs font-mono font-semibold">
                ⚠️ {addingError}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-[#77736B] font-semibold uppercase block mb-1">Nom du Patient *</label>
                <input
                  type="text"
                  required
                  value={newForm.patientName}
                  onChange={e => setNewForm(p => ({ ...p, patientName: e.target.value }))}
                  className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#77736B] font-semibold uppercase block mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    required
                    value={newForm.phone}
                    onChange={e => setNewForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="text-[#77736B] font-semibold uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={newForm.email}
                    onChange={e => setNewForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#77736B] font-semibold uppercase block mb-1">Soin *</label>
                <select
                  value={newForm.service}
                  onChange={e => setNewForm(p => ({ ...p, service: e.target.value }))}
                  className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
                >
                  {SERVICES.map(s => (
                    <option key={s.slug} value={s.slug}>
                      {s.name[lang]} ({s.price} TND)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#77736B] font-semibold uppercase block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={e => setNewForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
                  />
                </div>
                <div>
                  <label className="text-[#77736B] font-semibold uppercase block mb-1">Horaire *</label>
                  <select
                    value={newForm.startTime}
                    onChange={e => setNewForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]"
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
                <label className="text-[#77736B] font-semibold uppercase block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] rounded-xl p-3 focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B] resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] font-mono transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addingLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C6A15B] to-[#9B793A] text-white font-mono font-bold shadow-[0_4px_14px_rgba(198,161,91,0.25)] hover:from-[#9B793A] hover:to-[#C6A15B] disabled:opacity-50 transition-all"
                >
                  {addingLoading ? 'Création...' : 'Créer le rendez-vous'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}