'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import {
  IconKey,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconCheck,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';

interface ChangeOwnerPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast: (msg: string) => void;
  lang: Lang;
}

export const ChangeOwnerPasswordModal = React.memo(function ChangeOwnerPasswordModal({
  isOpen,
  onClose,
  onSuccessToast,
  lang,
}: ChangeOwnerPasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!currentPassword) {
      setError(txt('Veuillez entrer le mot de passe actuel.', 'Please enter current password.', 'Insira a palavra-passe atual.'));
      return;
    }

    if (newPassword.length < 8) {
      setError(txt('Le nouveau mot de passe doit comporter au moins 8 caractères.', 'New password must have at least 8 characters.', 'A nova palavra-passe deve ter pelo menos 8 caracteres.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(txt('Les nouveaux mots de passe ne correspondent pas.', 'New passwords do not match.', 'As novas palavras-passe não coincidem.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/analytics/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de modification');
      }

      onSuccessToast(
        txt(
          'Mot de passe propriétaire mis à jour avec succès.',
          'Owner password successfully updated.',
          'Palavra-passe do proprietário atualizada com sucesso.'
        )
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#0A0D1A]/70 backdrop-blur-sm font-sans"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 font-sans overscroll-contain"
          >
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                  <IconKey size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    {txt('Changer Mot de Passe Propriétaire', 'Change Owner Password', 'Alterar Palavra-passe do Proprietário')}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    {txt('Protège l’accès aux Statistiques & Revenus', 'Protects access to Analytics & Revenue', 'Protege o acesso a Estatísticas e Receita')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              {error && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 text-[#991B1B] text-xs font-medium">
                  <IconAlertCircle size={15} className="shrink-0 text-[#EF4444]" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#475569]">
                  {txt('Mot de passe propriétaire actuel', 'Current owner password', 'Palavra-passe atual')}
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 pe-10 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pe-2.5 flex items-center text-[#64748B]"
                  >
                    {showCurrent ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#475569]">
                  {txt('Nouveau mot de passe (min 8 car.)', 'New password (min 8 chars)', 'Nova palavra-passe (mín 8 car.)')}
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 pe-10 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pe-2.5 flex items-center text-[#64748B]"
                  >
                    {showNew ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#475569]">
                  {txt('Confirmer le nouveau mot de passe', 'Confirm new password', 'Confirmar nova palavra-passe')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs font-medium text-[#475569] hover:bg-[#F1F5F9]"
                >
                  {txt('Annuler', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold shadow-sm"
                >
                  {loading ? (
                    <IconLoader2 size={14} className="animate-spin" />
                  ) : (
                    <IconCheck size={14} />
                  )}
                  <span>{txt('Enregistrer', 'Save', 'Guardar')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
