'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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
  IconAlertCircle,
  IconLoader2,
  IconCheck,
  IconShieldLock,
  IconHelpCircle,
  IconX,
  IconMail,
  IconPhone,
  IconKey,
  IconFingerprint,
  IconServer,
} from '@tabler/icons-react';

/* ─── Floating particle dot ─────────────────────────────── */
function Particle({ x, y, delay, dur }: { x: number; y: number; delay: number; dur: number }) {
  return (
    <motion.div
      className="absolute w-[2px] h-[2px] rounded-full bg-[#C49A3C]/60"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.round(Math.random() * 100),
  y: Math.round(Math.random() * 100),
  delay: Math.round(Math.random() * 5 * 10) / 10,
  dur: 3 + Math.round(Math.random() * 4 * 10) / 10,
}));

/* ─── Main Page ─────────────────────────────────────────── */
export default function AdminLoginPage() {
  const { lang, setLang } = useLanguage();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  /* Live clock */
  useEffect(() => {
    const tick = () =>
      setCurrentTime(
        new Date().toLocaleTimeString('pt-PT', {
          timeZone: 'Europe/Lisbon',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Auto-focus */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 600);
  }, []);

  const handleCapsLock = (e: React.KeyboardEvent) => {
    if (e.getModifierState) setCapsLock(e.getModifierState('CapsLock'));
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
        setTimeout(() => { router.replace('/admin'); router.refresh(); }, 700);
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setError(
            lang === 'fr' ? 'Trop de tentatives. Veuillez patienter 15 minutes.'
            : lang === 'en' ? 'Too many attempts. Please wait 15 minutes.'
            : 'Muitas tentativas. Por favor aguarde 15 minutos.'
          );
        } else {
          setError(
            lang === 'fr' ? 'Mot de passe incorrect'
            : lang === 'en' ? 'Invalid password'
            : 'Palavra-passe incorreta'
          );
        }
        setPwd('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setError(
        lang === 'fr' ? 'Erreur réseau. Réessayez.'
        : lang === 'en' ? 'Network error. Try again.'
        : 'Erro de rede. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const languages: { code: Lang; flag: string; label: string }[] = [
    { code: 'pt', flag: '🇵🇹', label: 'PT' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
  ];

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#060A0F]">

      {/* ═══ LEFT PANEL — atmospheric image ═══ */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/hero/therapy.jpg"
            alt="Digital Clínica — Sala de Tratamentos"
            fill
            priority
            className="object-cover object-center"
            sizes="55vw"
          />
          {/* Deep dark overlay — bottom to top gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060A0F]/90 via-[#060A0F]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060A0F]/95 via-transparent to-[#060A0F]/30" />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map(p => <Particle key={p.id} {...p} />)}
        </div>

        {/* Content over the image */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Top: back link */}
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[13px] font-medium text-white/50 hover:text-white/90 transition-all duration-300"
          >
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-white/15 group-hover:border-white/40 group-hover:bg-white/10 transition-all duration-300">
              <IconArrowLeft size={13} />
            </span>
            <span>{lang === 'fr' ? 'Site public' : lang === 'en' ? 'Public site' : 'Site público'}</span>
          </Link>

          {/* Center: hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md"
          >
            {/* Small badge */}
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border border-[#C49A3C]/30 bg-[#C49A3C]/10 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C] animate-pulse" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-[#E8C97A]">
                Portal de Gestão
              </span>
            </div>

            <h1 className="font-serif text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
              Digital<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8C97A] to-[#C49A3C]">
                Clínica
              </span>
            </h1>
            <p className="text-[15px] text-white/55 leading-relaxed max-w-sm">
              {lang === 'fr'
                ? 'Espace sécurisé réservé aux administrateurs et praticiens autorisés.'
                : lang === 'en'
                  ? 'Secure management environment for authorized clinic staff and administrators.'
                  : 'Ambiente seguro de gestão para profissionais e administradores autorizados.'}
            </p>
          </motion.div>

          {/* Bottom: security badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap gap-3"
          >
            {[
              { icon: <IconServer size={12} />, label: 'IronSession™' },
              { icon: <IconShieldCheck size={12} />, label: 'Rate-Limited' },
              { icon: <IconKey size={12} />, label: 'Bcrypt v2' },
            ].map(b => (
              <div
                key={b.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40"
              >
                {b.icon}
                <span>{b.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — login form ═══ */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">

        {/* Mobile: back link */}
        <div className="lg:hidden absolute top-5 left-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[12px] font-medium text-white/40 hover:text-white/80 transition-colors"
          >
            <IconArrowLeft size={14} />
            <span>{lang === 'fr' ? 'Retour' : lang === 'en' ? 'Back' : 'Voltar'}</span>
          </Link>
        </div>

        {/* Language + time strip — top right */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          {/* Clock — desktop only */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">{currentTime || '--:--:--'}</span>
          </div>

          {/* Language switcher */}
          <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-full p-0.5">
            {languages.map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all duration-200 ${
                  lang === l.code
                    ? 'bg-[#C49A3C] text-[#060A0F]'
                    : 'text-white/35 hover:text-white/70'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── The Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-[400px]"
        >
          {/* Logo block */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#C49A3C]/40 to-[#E8C97A]/20 blur-xl scale-125" />
              <div className="relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-b from-[#1C2030] to-[#111520] border border-[#C49A3C]/25 flex items-center justify-center shadow-[0_0_0_1px_rgba(196,154,60,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <LogoIcon size={48} variant="gold" />
              </div>
              {/* Verified badge */}
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#060A0F] flex items-center justify-center shadow-lg">
                <IconShieldCheck size={12} strokeWidth={2.5} className="text-white" />
              </div>
            </div>

            <h2 className="text-[22px] font-serif font-bold text-white tracking-tight">
              {lang === 'fr' ? 'Accès Administration'
               : lang === 'en' ? 'Admin Access'
               : 'Acesso de Administração'}
            </h2>
            <p className="text-[12px] text-white/35 mt-1">
              Digital Clínica &mdash; Lisboa, Portugal
            </p>
          </div>

          {/* Divider line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#C49A3C]/25 to-transparent mb-7" />

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="text-[11px] font-semibold tracking-widest uppercase text-white/40 font-mono"
                >
                  {lang === 'fr' ? 'Mot de passe' : lang === 'en' ? 'Password' : 'Palavra-passe'}
                </label>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-[#C49A3C]/70 hover:text-[#E8C97A] transition-colors"
                >
                  <IconHelpCircle size={11} />
                  <span>{lang === 'fr' ? 'Aide' : lang === 'en' ? 'Help' : 'Ajuda'}</span>
                </button>
              </div>

              <div className="relative">
                {/* Lock icon */}
                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-200 ${inputFocused ? 'text-[#C49A3C]' : 'text-white/25'}`}>
                  <IconShieldLock size={17} />
                </div>

                <input
                  ref={inputRef}
                  id="admin-password"
                  type={showPwd ? 'text' : 'password'}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  className={`
                    w-full rounded-xl pl-11 pr-12 py-3.5 text-sm text-white font-mono
                    bg-white/5 backdrop-blur-sm
                    border transition-all duration-200 outline-none
                    placeholder:text-white/20
                    ${error
                      ? 'border-red-500/60 bg-red-500/5 ring-2 ring-red-500/15'
                      : inputFocused
                        ? 'border-[#C49A3C]/60 ring-2 ring-[#C49A3C]/15 bg-white/8'
                        : 'border-white/10 hover:border-white/20'
                    }
                  `}
                />

                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/25 hover:text-white/70 transition-colors"
                >
                  {showPwd ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>

              {/* Caps Lock */}
              <AnimatePresence>
                {capsLock && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-1.5 text-[11px] text-amber-400/80 pt-1 px-1"
                  >
                    <IconAlertCircle size={12} />
                    <span>
                      {lang === 'fr' ? 'Verr. Maj activé'
                       : lang === 'en' ? 'Caps Lock is ON'
                       : 'Caps Lock está ativo'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative w-9 h-5 rounded-full border transition-all duration-300 flex-shrink-0 ${
                  rememberMe
                    ? 'bg-[#C49A3C] border-[#C49A3C]'
                    : 'bg-white/5 border-white/15'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  rememberMe ? 'left-[18px]' : 'left-0.5'
                }`} />
              </div>
              <span className="text-[12px] text-white/40 group-hover:text-white/60 transition-colors">
                {lang === 'fr' ? 'Garder la session (8h)'
                 : lang === 'en' ? 'Stay signed in (8h)'
                 : 'Manter sessão (8h)'}
              </span>
            </label>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  role="alert"
                  className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[12px] font-medium"
                >
                  <IconAlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !pwd || success}
              className="relative w-full group overflow-hidden rounded-xl py-3.5 px-6 font-semibold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: success
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #C49A3C, #9A7428)',
                boxShadow: success
                  ? '0 0 30px rgba(34,197,94,0.3)'
                  : '0 0 30px rgba(196,154,60,0.25)',
              }}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

              <span className="relative flex items-center justify-center gap-2 text-[#060A0F]">
                {loading ? (
                  <>
                    <IconLoader2 size={17} className="animate-spin" />
                    <span>{lang === 'fr' ? 'Vérification...' : lang === 'en' ? 'Verifying...' : 'A verificar...'}</span>
                  </>
                ) : success ? (
                  <>
                    <IconCheck size={17} strokeWidth={2.5} />
                    <span>{lang === 'fr' ? 'Accès autorisé' : lang === 'en' ? 'Access Granted' : 'Acesso Autorizado'}</span>
                  </>
                ) : (
                  <>
                    <IconFingerprint size={17} />
                    <span>{lang === 'fr' ? 'Accéder au portail' : lang === 'en' ? 'Access Portal' : 'Entrar no Portal'}</span>
                  </>
                )}
              </span>
            </button>

            {/* Enter hint */}
            <p className="text-center text-[11px] text-white/20">
              {lang === 'fr' ? 'Appuyez sur' : lang === 'en' ? 'Press' : 'Prima'}{' '}
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white/8 border border-white/15 rounded text-white/40">↵ Enter</kbd>{' '}
              {lang === 'fr' ? 'pour continuer' : lang === 'en' ? 'to continue' : 'para continuar'}
            </p>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-white/20">
            <span className="w-1 h-1 rounded-full bg-emerald-400/60" />
            <span>SSL 256-bit</span>
            <span className="text-white/10">·</span>
            <span>Digital Clínica © 2026</span>
          </div>
        </motion.div>
      </div>

      {/* ═══ Help Modal ═══ */}
      <AnimatePresence>
        {helpOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHelpOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #0F1520 0%, #111827 100%)',
                border: '1px solid rgba(196,154,60,0.2)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#C49A3C]/15 border border-[#C49A3C]/25 flex items-center justify-center text-[#C49A3C]">
                    <IconKey size={17} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {lang === 'fr' ? 'Assistance Connexion' : lang === 'en' ? 'Access Help' : 'Ajuda de Acesso'}
                    </p>
                    <p className="text-[11px] text-white/35">
                      {lang === 'fr' ? 'Protocole de sécurité' : lang === 'en' ? 'Security protocol' : 'Protocolo de segurança'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/8 transition-all"
                >
                  <IconX size={17} />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 space-y-4">
                <p className="text-[13px] text-white/55 leading-relaxed">
                  {lang === 'fr'
                    ? 'L\'accès à ce portail est strictement réservé. Si vous avez oublié la clé, veuillez contacter la direction :'
                    : lang === 'en'
                      ? 'Access to this portal is strictly restricted. If you forgot your credentials, contact administration:'
                      : 'O acesso a este portal é restrito. Se esqueceu as credenciais, contacte a administração:'}
                </p>
                <div className="space-y-2.5 p-4 rounded-xl bg-white/3 border border-white/8">
                  <div className="flex items-center gap-3 text-[12px]">
                    <IconMail size={14} className="text-[#C49A3C] shrink-0" />
                    <span className="font-mono text-white/70">admin@digitalclinica.pt</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px]">
                    <IconPhone size={14} className="text-[#C49A3C] shrink-0" />
                    <span className="font-mono text-white/70">+351 912 000 000</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className="px-5 py-2 text-[12px] font-semibold rounded-xl text-[#060A0F] transition-all"
                  style={{ background: 'linear-gradient(135deg, #C49A3C, #9A7428)' }}
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
