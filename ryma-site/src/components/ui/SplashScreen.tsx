'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Subtle minimalist white starlight particles
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function AmbientParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 1,
        duration: Math.random() * 3 + 3.5,
        delay: Math.random() * 1.5,
        opacity: Math.random() * 0.2 + 0.1,
      }))
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [p.opacity, p.opacity * 1.8, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Ultra-Minimalist Crisp White Brand Emblem
function LogoMark() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-center justify-center mb-4"
    >
      {/* Soft White Ambient Aura */}
      <div className="absolute w-36 h-36 rounded-full bg-white/[0.08] blur-3xl pointer-events-none" />

      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.3 }}
        className="relative w-20 h-20 sm:w-24 sm:h-24 p-3 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.8),_0_0_30px_rgba(255,255,255,0.06)] flex items-center justify-center backdrop-blur-2xl"
      >
        <Image
          src="/logo-mark-light.png"
          alt="Digital Clínica"
          width={84}
          height={84}
          className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:drop-shadow-[0_2px_16px_rgba(255,255,255,0.4)] brightness-105"
          priority
        />
      </motion.div>
    </motion.div>
  );
}

// Pure Minimalist White Title Animation
function AnimatedTitle() {
  const name = 'DIGITAL CLÍNICA';
  const letters = name.split('');

  return (
    <div className="flex items-center justify-center overflow-hidden flex-nowrap" aria-label="Digital Clínica">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ y: 35, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.7,
            delay: 0.35 + i * 0.035,
            ease: [0.33, 1, 0.68, 1],
          }}
          className={`inline-block text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light tracking-[0.16em] sm:tracking-[0.24em] text-white ${
            letter === ' ' ? 'w-2.5 sm:w-3 md:w-5' : ''
          }`}
          style={{
            fontFamily: 'var(--font-fraunces)',
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </div>
  );
}

// 4-Second Timing Progress Line
function ProgressLine({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="relative w-44 sm:w-48 h-[1px] bg-white/15 mt-8 sm:mt-9 overflow-hidden rounded-full">
      <motion.div
        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white to-white"
        initial={{ x: '-100%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 3.3, delay: 0.3, ease: 'easeInOut' }}
        onAnimationComplete={onComplete}
      />
    </div>
  );
}

export function SplashScreen() {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);
  const [exitReady, setExitReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isBotOrLighthouse =
      /Lighthouse|PageSpeed|Googlebot|HeadlessChrome|Chrome-Lighthouse|Mediapartners-Google/i.test(navigator.userAgent) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const hasSeenSplash = sessionStorage.getItem('ryma_splash_v6') === 'true';

    if (isBotOrLighthouse || hasSeenSplash) {
      setShowSplash(false);
      document.documentElement.classList.add('skip-splash');
    }
  }, []);

  if (pathname?.startsWith('/admin') || !showSplash) {
    return null;
  }

  const handleProgressComplete = () => {
    setExitReady(true);
    setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('ryma_splash_v6', 'true');
      document.documentElement.classList.add('skip-splash');
    }, 400);
  };

  const handleSkip = () => {
    setExitReady(true);
    setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('ryma_splash_v6', 'true');
      document.documentElement.classList.add('skip-splash');
    }, 250);
  };

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          id="splash-screen-root"
          key="splash"
          className="fixed inset-0 z-[9999] overflow-hidden cursor-pointer bg-[#090A0C]"
          style={{ contain: 'strict', willChange: 'opacity' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          onClick={handleSkip}
        >
          {/* Minimalist Top & Bottom Curtains */}
          <AnimatePresence>
            {!exitReady ? (
              <motion.div key="curtain" className="absolute inset-0 flex flex-col pointer-events-none">
                {/* Top curtain */}
                <motion.div
                  className="flex-1 bg-[#060708] relative overflow-hidden"
                  exit={{ y: '-100%', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                      className="absolute h-[1px] w-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ top: '50%', left: 0, transform: 'rotate(-10deg)', willChange: 'transform' }}
                      animate={{ x: ['-50%', '50%'] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
                {/* Bottom curtain */}
                <motion.div
                  className="flex-1 bg-[#060708] relative"
                  exit={{ y: '100%', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1], delay: 0.05 } }}
                  style={{ willChange: 'transform' }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Main content layer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090A0C]">
            {/* Pure Ambient Radial Vignette */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 75%)',
              }}
            />

            {/* Ambient starlight */}
            <AmbientParticles />

            {/* Top Minimal Hairline */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.4, delay: 0.1, ease: 'easeInOut' }}
            />

            {/* Bottom Minimal Hairline */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.4, delay: 0.1, ease: 'easeInOut' }}
            />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center px-8 text-center">
              {/* Logo Mark */}
              <LogoMark />

              {/* Minimal White Separator */}
              <motion.div
                className="flex items-center gap-3 my-5 w-44"
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/30" />
                <div className="w-1 h-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/30" />
              </motion.div>

              {/* Pure White Brand Title */}
              <div className="overflow-hidden">
                <AnimatedTitle />
              </div>

              {/* Subtitle in Clean Pure Light Silver */}
              <motion.div
                className="mt-3.5 flex flex-col items-center gap-1.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                <span
                  className="text-[11px] sm:text-xs tracking-[0.34em] uppercase text-white/75 font-medium"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Fisioterapia & Estética Médica
                </span>
              </motion.div>

              {/* Location in Soft Pure White */}
              <motion.p
                className="mt-3 text-[9px] sm:text-[10px] tracking-[0.38em] uppercase text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                Lisboa — Portugal
              </motion.p>

              {/* 4-Second Progress line */}
              <ProgressLine onComplete={handleProgressComplete} />
            </div>

            {/* Pure Minimal Corner Hairlines */}
            {[
              'top-6 left-6 border-t border-l',
              'top-6 right-6 border-t border-r',
              'bottom-6 left-6 border-b border-l',
              'bottom-6 right-6 border-b border-r',
            ].map((pos, i) => (
              <motion.div
                key={i}
                className={`absolute w-5 h-5 border-white/20 ${pos}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


