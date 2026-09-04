'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconShieldCheck,
  IconAlertCircle,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onSuccess: (expiresAt: number) => void;
  onCancel: () => void;
  lang: Lang;
}

export const OwnerAuthModal = React.memo(function OwnerAuthModal({
  isOpen,
  onSuccess,
  onCancel,
  lang,
}: OwnerAuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/analytics/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            txt(
              'Mot de passe propriétaire incorrect.',
              'Incorrect owner password.',
              'Palavra-passe de proprietário incorreta.'
            )
        );
      }

      setPassword('');
      onSuccess(data.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Erreur d’authentification');
      inputRef.current?.focus();
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#0A0D1A]/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="owner-auth-title"
        >
          {/* Backdrop Click to Cancel */}
          <div className="absolute inset-0" onClick={onCancel} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 font-sans overscroll-contain"
          >
            {/* Header / Accent Ribbon */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] p-6 text-white text-center relative">
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Fermer"
              >
                <IconX size={18} />
              </button>

              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-[#F3E5AB] shadow-inner">
                <IconLock size={28} className="stroke-[2]" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#7C3AED]/30 border border-[#A78BFA]/40 text-[#C4B5FD] text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                <IconShieldCheck size={13} />
                <span>{txt('Accès Restreint', 'Restricted Access', 'Acesso Restrito')}</span>
              </div>

              <h3 id="owner-auth-title" className="text-xl font-bold tracking-tight">
                {txt(
                  'Autorisation Propriétaire Requise',
                  'Owner Authorization Required',
                  'Autorização do Proprietário'
                )}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1.5 max-w-xs mx-auto leading-relaxed">
                {txt(
                  'Les statistiques contiennent des informations financières et d’activité hautement confidentielles.',
                  'Analytics contains restricted financial and business performance data.',
                  'As estatísticas contêm dados financeiros e de faturação confidenciais.'
                )}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5 text-[#991B1B] text-xs font-medium"
                >
                  <IconAlertCircle size={16} className="shrink-0 mt-0.5 text-[#EF4444]" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="owner-password-input"
                  className="block text-xs font-semibold text-[#334155]"
                >
                  {txt(
                    'Mot de passe Propriétaire Analytics',
                    'Owner Analytics Password',
                    'Palavra-passe do Proprietário'
                  )}
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="owner-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={loading}
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 pe-10 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pe-3 flex items-center text-[#64748B] hover:text-[#0F172A] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] pt-0.5">
                  {txt(
                    'Une fois vérifié, l’accès sera déverrouillé pendant 15 minutes.',
                    'Once authorized, access remains unlocked for 15 minutes.',
                    'Após verificação, o acesso ficará disponível durante 15 minutos.'
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
                >
                  {txt('Annuler', 'Cancel', 'Cancelar')}
                </button>

                <button
                  type="submit"
                  disabled={loading || !password.trim()}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] hover:from-[#6D28D9] hover:to-[#4C1D95] text-white text-xs font-bold shadow-md shadow-[#7C3AED]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <IconLoader2 size={16} className="animate-spin" />
                      <span>{txt('Vérification...', 'Verifying...', 'A verificar...')}</span>
                    </>
                  ) : (
                    <>
                      <IconLock size={15} />
                      <span>
                        {txt(
                          'Déverrouiller les Statistiques',
                          'Unlock Analytics',
                          'Desbloquear Estatísticas'
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
