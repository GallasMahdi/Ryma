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
              : 'محاولات كثيرة جداً. يرجى الانتظار 15 دقيقة.'
          );
        } else {
          // Generic error — never reveals why the login failed
          setError(
            lang === 'fr'
              ? 'Identifiants incorrects'
              : 'بيانات الدخول غير صحيحة'
          );
        }
        setPwd('');
      }
    } catch {
      setError(lang === 'fr' ? 'Erreur réseau. Réessayez.' : 'خطأ في الشبكة. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#FAFAF8] text-[#202020] flex flex-col justify-between overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C6A15B]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#E8D7B0]/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Top header */}
      <div className="relative z-10 p-6 md:p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF6EE] border border-[#E8D7B0] flex items-center justify-center shadow-sm">
            <IconBuildingHospital size={20} className="text-[#C6A15B]" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold tracking-wide text-[#202020]">RYMA OUICHKA</div>
            <div className="font-mono text-[10px] uppercase text-[#77736B] tracking-widest">Portail Administratif</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="font-mono text-xs px-3 py-1.5 rounded-xl border border-[#E9E6DF] bg-white text-[#77736B] hover:text-[#202020] hover:border-[#C6A15B]/40 hover:bg-[#FAF6EE] transition-all uppercase shadow-sm"
          >
            🌐 {lang === 'fr' ? 'العربية' : 'Français'}
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs px-3.5 py-1.5 rounded-xl bg-white border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:border-[#C6A15B]/40 hover:bg-[#FAF6EE] transition-all shadow-sm"
          >
            <span>{lang === 'fr' ? 'Site public' : 'الموقع الرئيسي'}</span>
            <IconExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Center login form */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="p-8 md:p-10 rounded-3xl bg-white/95 backdrop-blur-2xl border border-[#E9E6DF] shadow-[0_25px_60px_rgba(0,0,0,0.06)] relative overflow-hidden">
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FAF6EE] to-[#F4F2EE] border border-[#E8D7B0] flex items-center justify-center mx-auto mb-6 shadow-[0_4px_20px_rgba(198,161,91,0.15)]">
              <IconLock size={28} className="text-[#C6A15B]" />
            </div>

            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#202020] mb-2">
                {lang === 'fr' ? 'Connexion Administration' : 'تسجيل دخول الإدارة'}
              </h1>
              <p className="text-xs text-[#77736B] font-sans">
                {lang === 'fr'
                  ? 'Saisissez votre mot de passe pour accéder au tableau de bord'
                  : 'أدخل كلمة المرور للوصول إلى لوحة التحكم'}
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  placeholder={lang === 'fr' ? 'Mot de passe' : 'كلمة المرور'}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  className={`w-full bg-[#FAFAF8] border text-[#202020] placeholder-[#77736B]/50 rounded-xl pl-4 pr-12 py-4 text-sm focus:outline-none transition-all ${
                    error
                      ? 'border-[#A9655F] ring-2 ring-[#A9655F]/20'
                      : 'border-[#E9E6DF] focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#77736B] hover:text-[#202020] transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#A9655F] text-xs font-mono text-center font-semibold"
                  role="alert"
                >
                  ⚠️ {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || !pwd}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#C6A15B] to-[#9B793A] text-white font-semibold text-sm shadow-[0_4px_20px_rgba(198,161,91,0.3)] hover:shadow-[0_6px_25px_rgba(198,161,91,0.45)] hover:from-[#9B793A] hover:to-[#C6A15B] active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? (lang === 'fr' ? 'Vérification...' : 'جارٍ التحقق...')
                  : (lang === 'fr' ? 'Déverrouiller le Portail' : 'دخول اللوحة')}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-6 text-center text-xs font-mono text-[#77736B]/80">
        Cabinet Ryma Ouichka — Ezzahra, Tunisie • Accès sécurisé
      </div>
    </div>
  );
}
