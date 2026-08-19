'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconExternalLink,
  IconBuildingHospital,
} from '@tabler/icons-react';

export default function AdminLoginPage() {
  const { lang, toggleLang } = useLanguage();
  const router = useRouter();
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      if (res.ok) {
        router.replace('/admin');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            lang === 'fr'
              ? 'Trop de tentatives. Veuillez attendre 15 minutes.'
              : lang === 'en'
              ? 'Too many attempts. Please wait 15 minutes.'
              : 'Muitas tentativas. Por favor aguarde 15 minutos.'
          );
        } else {
          setError(
            lang === 'fr'
              ? 'Identifiants incorrects'
              : lang === 'en'
              ? 'Invalid credentials'
              : 'Credenciais inválidas'
          );
        }
        setPwd('');
      }
    } catch {
      setError(
        lang === 'fr'
          ? 'Erreur réseau. Réessayez.'
          : lang === 'en'
          ? 'Network error. Try again.'
          : 'Erro de rede. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getLangLabel = () => {
    if (lang === 'fr') return '🇫🇷 Français';
    if (lang === 'en') return '🇬🇧 English';
    return '🇵🇹 Português';
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between overflow-hidden font-sans">
      {/* Top header */}
      <div className="relative z-10 p-4 sm:p-6 md:p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shadow-xs">
            <IconBuildingHospital size={20} />
          </div>
          <div>
            <div className="font-semibold text-base sm:text-lg text-[#0F172A]">RYMA OUICHKA</div>
            <div className="text-[11px] font-medium uppercase text-[#64748B] tracking-wider">
              {lang === 'fr' ? 'Portail Administratif' : lang === 'en' ? 'Admin Portal' : 'Portal Administrativo'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleLang}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-xs font-semibold"
          >
            🌐 {getLangLabel()}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#334155] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors shadow-xs font-medium"
          >
            <span>{lang === 'fr' ? 'Site public' : lang === 'en' ? 'Public Website' : 'Website Público'}</span>
            <IconExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Center login form */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="p-6 sm:p-8 md:p-10 rounded-2xl bg-white border border-[#E2E8F0] shadow-xl">
            <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center mx-auto mb-6 border border-[#E2E8F0]">
              <IconLock size={26} />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-1.5">
                {lang === 'fr' ? 'Connexion Administration' : lang === 'en' ? 'Admin Login' : 'Acesso Administrativo'}
              </h1>
              <p className="text-xs text-[#64748B]">
                {lang === 'fr'
                  ? 'Saisissez votre mot de passe pour accéder au tableau de bord'
                  : lang === 'en'
                  ? 'Enter your password to access the administration dashboard'
                  : 'Introduza a sua palavra-passe para aceder ao painel de controlo'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  placeholder={lang === 'fr' ? 'Mot de passe' : lang === 'en' ? 'Password' : 'Palavra-passe'}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  className={`w-full bg-[#F8FAFC] border text-[#0F172A] placeholder:text-[#94A3B8] rounded-xl pl-4 pr-12 py-3.5 text-xs sm:text-sm focus:outline-none transition-colors ${
                    error
                      ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                      : 'border-[#E2E8F0] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A] transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer' : 'Afficher'}
                >
                  {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-[#EF4444] text-xs text-center font-medium" role="alert">
                  ⚠️ {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !pwd}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs sm:text-sm shadow-xs hover:shadow active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed touch-target"
              >
                {loading
                  ? (lang === 'fr' ? 'Vérification...' : lang === 'en' ? 'Verifying...' : 'A verificar...')
                  : (lang === 'fr' ? 'Déverrouiller le Portail' : lang === 'en' ? 'Unlock Portal' : 'Desbloquear Portal')}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-4 sm:p-6 text-center text-xs text-[#64748B]">
        {lang === 'fr'
          ? 'Clinique Ryma Ouichka — Lisbonne, Portugal • Accès sécurisé'
          : lang === 'en'
          ? 'Ryma Ouichka Clinic — Lisbon, Portugal • Secure Access'
          : 'Clínica Ryma Ouichka — Lisboa, Portugal • Acesso Seguro'}
      </div>
    </div>
  );
}
