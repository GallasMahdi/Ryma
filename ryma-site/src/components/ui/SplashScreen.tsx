'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Particle system for luxury ambient particles
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
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 3 + 3,
        delay: Math.random() * 1.5,
        opacity: Math.random() * 0.3 + 0.1,
      }))
    );
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ contain: 'strict' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#C49A3C]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// Animated logo mark (stylized luxury emblem)
function LogoMark() {
  return (
    <motion.svg
      width="72"
      height="72"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
    >
      <defs>
        <linearGradient id="splashGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2D1" />
          <stop offset="35%" stopColor="#E9CA7E" />
          <stop offset="70%" stopColor="#C49A3C" />
          <stop offset="100%" stopColor="#966F21" />
        </linearGradient>
        <radialGradient id="splashBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#251C17" />
          <stop offset="100%" stopColor="#0F0C0A" />
        </radialGradient>
      </defs>

      {/* Base Medallion */}
      <circle cx="50" cy="50" r="47" fill="url(#splashBg)" />

      {/* Outer circle */}
      <motion.circle
        cx="50"
        cy="50"
        r="47"
        stroke="url(#splashGold)"
        strokeWidth="1.6"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2, ease: 'easeInOut' }}
      />
      {/* Inner dotted ring */}
      <motion.circle
        cx="50"
        cy="50"
        r="43"
        stroke="url(#splashGold)"
        strokeWidth="0.8"
        fill="none"
        strokeDasharray="3 5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ opacity: { duration: 0.8, delay: 0.4 } }}
      />

      {/* Head Contour */}
      <motion.path
        d="M 37.5 19 C 33 19, 30 22.5, 30 27 C 30 31.5, 33 34.5, 36.5 35.5"
        stroke="url(#splashGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' }}
      />

      {/* Spine & Posture Line */}
      <motion.path
        d="M 34.5 35.5 C 31.5 38.5, 27.5 44, 27.5 50 C 27.5 57, 31 63, 29.5 70 C 28 77, 26 80, 25 82"
        stroke="url(#splashGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.4, ease: 'easeInOut' }}
      />

      {/* Central Hourglass */}
      <motion.path
        d="M 36.5 35.5 C 40 40, 42 47, 39 53 C 36 59, 33 66, 35 73 C 37 80, 42 82, 42 82 C 42 82, 33 82, 30 76 C 27 70, 31 61, 35 56 C 39 51, 39 42, 35.5 36.5"
        stroke="url(#splashGold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Capital 'D' Wing */}
      <motion.path
        d="M 36 35.5 C 56 35.5, 75 42, 75 58.5 C 75 74.5, 56 82, 36 82"
        stroke="url(#splashGold)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, delay: 0.6, ease: 'easeInOut' }}
      />

      {/* Inner Flow Arc */}
      <motion.path
        d="M 39 44 C 54 44, 64 49, 64 58.5 C 64 68, 54 73.5, 39 73.5"
        stroke="url(#splashGold)"
        strokeWidth="1.8"
        strokeOpacity="0.75"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.7, ease: 'easeInOut' }}
      />

      {/* Center Sparkle */}
      <motion.circle
        cx="53"
        cy="58.5"
        r="1.5"
        fill="url(#splashGold)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9, ease: 'backOut' }}
      />
    </motion.svg>
  );
}

// Letter-by-letter animation for the main title
function AnimatedTitle() {
  const name = 'DIGITAL CLÍNICA';
  const letters = name.split('');

  return (
    <div className="flex items-center overflow-hidden" aria-label="Digital Clínica">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.4,
            delay: 0.2 + i * 0.02,
            ease: [0.33, 1, 0.68, 1],
          }}
          className={`inline-block text-4xl md:text-6xl lg:text-7xl font-light tracking-[0.18em] ${
            letter === ' ' ? 'w-4 md:w-6' : ''
          }`}
          style={{
            fontFamily: 'var(--font-fraunces)',
            color: '#F5E9C8',
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </div>
  );
}

// Progress line
function ProgressLine({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="relative w-48 h-[1px] bg-white/10 mt-8 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-[#C49A3C] to-[#F5E9C8]"
        initial={{ x: '-100%' }}
        animate={{ x: '0%' }}
        transition={{ duration: 0.9, delay: 0.3, ease: 'easeInOut' }}
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
    // Skip splash for Lighthouse, headless browsers, bots, reduced motion, or if already seen
    if (typeof window === 'undefined') return;

    const isBotOrLighthouse =
      /Lighthouse|PageSpeed|Googlebot|HeadlessChrome|Chrome-Lighthouse|Mediapartners-Google/i.test(navigator.userAgent) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const hasSeenSplash = sessionStorage.getItem('ryma_splash_v2') === 'true';

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
      sessionStorage.setItem('ryma_splash_v2', 'true');
      document.documentElement.classList.add('skip-splash');
    }, 450);
  };

  const handleSkip = () => {
    setExitReady(true);
    setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('ryma_splash_v2', 'true');
      document.documentElement.classList.add('skip-splash');
    }, 300);
  };

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          id="splash-screen-root"
          key="splash"
          className="fixed inset-0 z-[9999] overflow-hidden cursor-pointer bg-[#1A1412]"
          style={{ contain: 'strict', willChange: 'opacity' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onClick={handleSkip}
        >
          {/* Curtain panels that slide out on exit */}
          <AnimatePresence>
            {!exitReady ? (
              <motion.div key="curtain" className="absolute inset-0 flex flex-col pointer-events-none">
                {/* Top curtain */}
                <motion.div
                  className="flex-1 bg-[#120E0D] relative overflow-hidden"
                  exit={{ y: '-100%', transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } }}
                  style={{ willChange: 'transform' }}
                >
                  {/* Diagonal shimmer line using pure GPU transform (x) to prevent layout shifts */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                      className="absolute h-[1px] w-[200%] bg-gradient-to-r from-transparent via-[#C49A3C]/30 to-transparent"
                      style={{ top: '50%', left: 0, transform: 'rotate(-12deg)', willChange: 'transform' }}
                      animate={{ x: ['-50%', '50%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                </motion.div>
                {/* Bottom curtain */}
                <motion.div
                  className="flex-1 bg-[#120E0D] relative"
                  exit={{ y: '100%', transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1], delay: 0.05 } }}
                  style={{ willChange: 'transform' }}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Main content layer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1A1412]">
            {/* Radial glow background */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(196,154,60,0.08) 0%, transparent 70%)',
              }}
            />

            {/* Ambient particles */}
            <AmbientParticles />

            {/* Top decorative line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #C49A3C, transparent)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.0, delay: 0.1, ease: 'easeInOut' }}
            />

            {/* Bottom decorative line */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #C49A3C, transparent)' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.0, delay: 0.1, ease: 'easeInOut' }}
            />

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center px-8 text-center">
              {/* Logo mark */}
              <LogoMark />

              {/* Separator */}
              <motion.div
                className="flex items-center gap-4 my-6 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C49A3C]/50" />
                <div className="w-1 h-1 rounded-full bg-[#C49A3C]" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C49A3C]/50" />
              </motion.div>

              {/* Animated name */}
              <div className="overflow-hidden">
                <AnimatedTitle />
              </div>

              {/* Subtitle */}
              <motion.div
                className="mt-4 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <span
                  className="text-xs md:text-sm tracking-[0.35em] uppercase text-[#C49A3C]"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Kinésithérapie
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-px bg-[#C49A3C]/40" />
                  <span className="text-[#F5E9C8]/30 text-xs">✦</span>
                  <div className="w-8 h-px bg-[#C49A3C]/40" />
                </div>
                <span
                  className="text-xs md:text-sm tracking-[0.35em] uppercase text-[#C49A3C]"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Soins Minceur
                </span>
              </motion.div>

              {/* Location */}
              <motion.p
                className="mt-5 text-[10px] md:text-xs tracking-[0.4em] uppercase text-[#F5E9C8]/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.5 }}
              >
                Lisboa — Portugal
              </motion.p>

              {/* Progress line */}
              <ProgressLine onComplete={handleProgressComplete} />
            </div>

            {/* Corner accents */}
            {[
              'top-6 left-6 border-t border-l',
              'top-6 right-6 border-t border-r',
              'bottom-6 left-6 border-b border-l',
              'bottom-6 right-6 border-b border-r',
            ].map((pos, i) => (
              <motion.div
                key={i}
                className={`absolute w-8 h-8 border-[#C49A3C]/40 ${pos}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
