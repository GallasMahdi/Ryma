'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage, Lang } from '@/lib/i18n';
import { LogoIcon } from '@/components/ui/Logo';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconArrowLeft,
  IconShieldCheck,
  IconSparkles,
  IconAlertCircle,
  IconLoader2,
  IconCheck,
  IconShieldLock,
  IconClock,
  IconHelpCircle,
  IconX,
  IconMail,
  IconPhone,
  IconServer,
  IconKey,
} from '@tabler/icons-react';

export default function AdminLoginPage() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Mouse spotlight position
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // Update Lisbon time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-PT', {
          timeZone: 'Europe/Lisbon',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Track mouse for ambient spotlight
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Detect Caps Lock
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwd || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, remember: rememberMe }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.replace('/admin');
          router.refresh();
        }, 400);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            lang === 'fr'
              ? 'Trop de tentatives. Veuillez patienter 15 minutes.'
              : lang === 'en'
                ? 'Too many attempts. Please wait 15 minutes.'
                : 'Muitas tentativas. Por favor aguarde 15 minutos.'
          );
        } else {
          setError(
            lang === 'fr'
              ? 'Mot de passe incorrect'
              : lang === 'en'
                ? 'Invalid password credentials'
                : 'Palavra-passe incorreta'
          );
        }
        setPwd('');
      }
    } catch {
      setError(
        lang === 'fr'
          ? 'Erreur réseau. Veuillez réessayer.'
          : lang === 'en'
            ? 'Network error. Please try again.'
            : 'Erro de rede. Por favor tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const languages: { code: Lang; label: string; flag: string }[] = [
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen w-full bg-[#FAFAF8] text-[#1A1412] flex flex-col justify-between overflow-x-hidden font-sans selection:bg-[#C49A3C]/20 selection:text-[#1A1412]"
    >
      {/* Dynamic Ambient Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-60 hidden md:block"
        style={{
          background: `radial-gradient(650px circle at ${mousePos.x}px ${mousePos.y}px, rgba(196, 154, 60, 0.08), transparent 80%)`,
        }}
      />

      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[550px] bg-gradient-to-b from-[#E8C97A]/15 via-[#C49A3C]/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-[20%] right-[-5%] w-[550px] h-[550px] bg-[#C49A3C]/6 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(rgba(196, 154, 60, 0.22) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-20 p-4 sm:p-6 md:px-10 flex items-center justify-between">
        {/* Return link */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-medium text-[#8A8078] hover:text-[#1A1412] transition-colors py-1.5 px-3 rounded-full hover:bg-black/5"
        >
          <IconArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>{lang === 'fr' ? 'Site public' : lang === 'en' ? 'Public site' : 'Website público'}</span>
        </Link>

        {/* Right side widgets: Live Status & Language */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clinic Time & Status Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#C49A3C]/20 text-[11px] text-[#4A4540] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="font-medium">Lisboa:</span>
            <span className="font-mono text-[#1A1412] font-semibold">{currentTime || '--:--:--'}</span>
            <span className="text-[#8A8078]">WET</span>
          </div>

          {/* Minimalist Language Switcher */}
          <div className="flex items-center bg-white/80 backdrop-blur-md p-1 rounded-full border border-[#C49A3C]/20 shadow-2xs">
            {languages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-all duration-200 ${
                  lang === l.code
                    ? 'bg-[#1A1412] text-white shadow-xs'
                    : 'text-[#8A8078] hover:text-[#1A1412]'
                }`}
              >
                <span className="mr-1">{l.flag}</span>
                <span className="uppercase tracking-wider">{l.code}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Centerpiece Login Form */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[425px]"
        >
          {/* Card */}
          <div className="relative rounded-3xl bg-white/95 backdrop-blur-xl border border-[#C49A3C]/25 p-7 sm:p-9 shadow-[0_20px_50px_rgba(26,20,18,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
            {/* Top decorative subtle badge */}
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C49A3C]/10 border border-[#C49A3C]/20 text-[10px] font-mono font-semibold tracking-wider text-[#9A7428] uppercase">
                <IconSparkles size={10} />
                <span>
                  {lang === 'fr' ? 'Portail de Gestion' : lang === 'en' ? 'Management Portal' : 'Portal de Gestão'}
                </span>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-1 text-[10px] font-medium text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" style={{ animationDuration: '2.5s' }} />
                <span>Online</span>
              </div>
            </div>

            {/* Brand Logo Presentation */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-3.5 group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#C49A3C]/20 to-[#E8C97A]/40 rounded-2xl blur-md scale-110 opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-[#FAFAF8] to-[#F4F2EE] border border-[#C49A3C]/30 flex items-center justify-center p-2.5 shadow-inner">
                  <LogoIcon size={52} variant="gold" />
                </div>
                {/* Micro active shield indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#1A1412] text-[#E8C97A] border-2 border-white flex items-center justify-center shadow-xs">
                  <IconShieldCheck size={11} />
                </div>
              </div>

              <h1 className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-[#1A1412]">
                Digital Clínica
              </h1>
              <p className="text-xs text-[#8A8078] mt-1 max-w-[280px]">
                {lang === 'fr'
                  ? 'Espace sécurisé réservé aux praticiens et administrateurs'
                  : lang === 'en'
                    ? 'Secure environment for clinic practitioners & administrators'
                    : 'Acesso seguro reservado a profissionais e administração'}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="admin-password"
                    className="block text-[11px] font-semibold text-[#4A4540] tracking-wide uppercase font-mono"
                  >
                    {lang === 'fr' ? 'Mot de passe maître' : lang === 'en' ? 'Master Password' : 'Palavra-passe'}
                  </label>

                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    className="text-[11px] text-[#9A7428] hover:text-[#1A1412] font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    <IconHelpCircle size={12} />
                    <span>{lang === 'fr' ? 'Aide' : lang === 'en' ? 'Need help?' : 'Ajuda'}</span>
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A8078] group-focus-within:text-[#C49A3C] transition-colors">
                    <IconShieldLock size={18} />
                  </div>

                  <input
                    id="admin-password"
                    type={showPwd ? 'text' : 'password'}
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    autoFocus
                    className={`w-full bg-[#FAFAF8] text-[#1A1412] placeholder:text-[#B8B0A8] rounded-xl pl-10 pr-12 py-3.5 text-sm transition-all outline-hidden ${
                      error
                        ? 'border-2 border-[#DC2626] bg-[#FEF2F2]/50 ring-2 ring-[#DC2626]/10'
                        : 'border border-[#C49A3C]/30 focus:border-[#C49A3C] focus:bg-white focus:ring-3 focus:ring-[#C49A3C]/15 shadow-inner'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#8A8078] hover:text-[#1A1412] rounded-lg transition-colors focus:outline-none"
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>

                {/* Caps Lock Alert */}
                <AnimatePresence>
                  {capsLockActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[11px] text-[#D97706] font-medium flex items-center gap-1.5 pt-1 px-1"
                    >
                      <IconAlertCircle size={13} />
                      <span>
                        {lang === 'fr'
                          ? 'Touche Verrouillage Majuscule activée'
                          : lang === 'en'
                            ? 'Caps Lock is ON'
                            : 'Aviso: Caps Lock está ativo'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember session toggle */}
              <div className="flex items-center justify-between pt-0.5 pb-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#C49A3C]/40 text-[#1A1412] focus:ring-[#C49A3C] accent-[#1A1412] cursor-pointer"
                  />
                  <span className="text-[11px] text-[#64748B]">
                    {lang === 'fr' ? 'Garder la session active (8h)' : lang === 'en' ? 'Keep session active (8h)' : 'Manter sessão iniciada (8h)'}
                  </span>
                </label>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs font-medium flex items-center gap-2 shadow-xs"
                    role="alert"
                  >
                    <IconAlertCircle size={16} className="shrink-0 text-[#DC2626]" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Unlock Button */}
              <button
                type="submit"
                disabled={loading || !pwd || success}
                className="w-full relative group overflow-hidden py-3.5 px-6 rounded-xl bg-[#1A1412] hover:bg-[#2C2420] active:scale-[0.99] text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {/* Subtle gold hover border shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8C97A]/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

                {loading ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin text-[#E8C97A]" />
                    <span>
                      {lang === 'fr'
                        ? 'Vérification sécurisée...'
                        : lang === 'en'
                          ? 'Verifying credentials...'
                          : 'A verificar credenciais...'}
                    </span>
                  </>
                ) : success ? (
                  <>
                    <IconCheck size={18} className="text-[#22C55E]" />
                    <span>
                      {lang === 'fr'
                        ? 'Accès autorisé'
                        : lang === 'en'
                          ? 'Access Granted'
                          : 'Acesso Autorizado'}
                    </span>
                  </>
                ) : (
                  <>
                    <IconLock size={16} className="text-[#E8C97A]" />
                    <span>
                      {lang === 'fr'
                        ? 'Déverrouiller le Portail'
                        : lang === 'en'
                          ? 'Unlock Management Portal'
                          : 'Desbloquear Portal de Gestão'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Keyboard shortcut hint */}
            <div className="mt-5 text-center">
              <span className="text-[11px] text-[#8A8078] inline-flex items-center gap-1.5">
                <span>{lang === 'fr' ? 'Appuyez sur' : lang === 'en' ? 'Press' : 'Prima'}</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#F4F2EE] border border-[#C49A3C]/20 rounded text-[#4A4540]">
                  ↵ Enter
                </kbd>
                <span>{lang === 'fr' ? 'pour vous connecter' : lang === 'en' ? 'to log in' : 'para aceder'}</span>
              </span>
            </div>
          </div>

          {/* Minimalist Security Trust Row */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-[#8A8078]">
            <div className="flex items-center gap-1">
              <IconServer size={11} className="text-[#C49A3C]" />
              <span>IronSession™</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <IconShieldCheck size={11} className="text-[#22C55E]" />
              <span>RateLimit Guard</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <IconKey size={11} className="text-[#C49A3C]" />
              <span>Bcrypt v2</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="relative z-20 p-4 sm:p-6 text-center text-xs text-[#8A8078] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#4A4540]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span>SSL 256-bit Encrypted Session</span>
        </div>
        <span className="hidden sm:inline text-[#C49A3C]/40">•</span>
        <div className="text-[11px]">
          Digital Clínica © 2026 — Lisboa, Portugal
        </div>
      </footer>

      {/* Security & Access Assistance Modal */}
      <AnimatePresence>
        {helpOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHelpOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#C49A3C]/30 z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] border border-[#C49A3C]/30 flex items-center justify-center text-[#C49A3C]">
                    <IconKey size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#1A1412]">
                      {lang === 'fr' ? 'Assistance Connexion' : lang === 'en' ? 'Access Assistance' : 'Ajuda de Acesso'}
                    </h3>
                    <p className="text-[11px] text-[#8A8078]">
                      {lang === 'fr' ? 'Protocole de sécurité de la clinique' : lang === 'en' ? 'Clinic security protocol' : 'Protocolo de segurança da clínica'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1 rounded-lg text-[#8A8078] hover:text-[#1A1412] hover:bg-black/5 transition-colors"
                >
                  <IconX size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#4A4540] bg-[#FAFAF8] p-4 rounded-xl border border-[#E2E8F0]">
                <p>
                  {lang === 'fr'
                    ? 'L’accès à ce portail est strictement restreint. Si vous avez oublié la clé de sécurité, veuillez contacter la direction :'
                    : lang === 'en'
                      ? 'Access to this portal is strictly restricted. If you forgot the security key, please contact administration:'
                      : 'O acesso a este portal é restrito. Se esqueceu a chave de segurança, por favor contacte a administração:'}
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-[#1A1412] font-medium">
                    <IconMail size={14} className="text-[#C49A3C]" />
                    <span className="font-mono text-[11px]">admin@digitalclinica.pt</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1A1412] font-medium">
                    <IconPhone size={14} className="text-[#C49A3C]" />
                    <span className="font-mono text-[11px]">+351 912 000 000</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="px-4 py-2 text-xs font-medium bg-[#1A1412] text-white rounded-xl hover:bg-[#2C2420] transition-colors"
                >
                  {lang === 'fr' ? 'Fermer' : lang === 'en' ? 'Close' : 'Fechar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

