import React from 'react';

export interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'gold' | 'light' | 'dark' | 'monochrome';
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

/**
 * High-precision vector emblem for Digital Clínica.
 * Crafted with luxury golden gradients, therapeutic spine/alignment arcs, and diamond sparkle.
 */
export function LogoIcon({
  size = 40,
  className = '',
  variant = 'gold',
}: {
  size?: number;
  className?: string;
  variant?: 'gold' | 'light' | 'dark' | 'monochrome';
}) {
  const gradientId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Digital Clínica Logo"
    >
      <defs>
        {/* Luxury Gold Linear Gradient */}
        <linearGradient id={`gold-primary-${gradientId}`} x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#FFF2D1" />
          <stop offset="25%" stopColor="#E9CA7E" />
          <stop offset="55%" stopColor="#C49A3C" />
          <stop offset="85%" stopColor="#966F21" />
          <stop offset="100%" stopColor="#6C4D0F" />
        </linearGradient>

        {/* Soft Gold Shimmer */}
        <linearGradient id={`gold-light-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#F5E3B8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C49A3C" stopOpacity="0.6" />
        </linearGradient>

        {/* Deep Luxury Dark Backdrop Gradient */}
        <radialGradient id={`bg-radial-${gradientId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#251C17" />
          <stop offset="70%" stopColor="#171210" />
          <stop offset="100%" stopColor="#0D0A08" />
        </radialGradient>

        {/* Outer Glow Filter */}
        <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Rounded Shield / Circle */}
      {variant !== 'monochrome' && (
        <>
          <circle
            cx="50"
            cy="50"
            r="47"
            fill={`url(#bg-radial-${gradientId})`}
          />
          {/* Subtle Inner Shadow Border */}
          <circle
            cx="50"
            cy="50"
            r="47"
            stroke={`url(#gold-primary-${gradientId})`}
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            stroke={`url(#gold-light-${gradientId})`}
            strokeWidth="0.75"
            strokeDasharray="2 4"
            strokeOpacity="0.45"
          />
        </>
      )}

      {/* Cardinal Luxury Accents (12, 3, 6, 9 o'clock) */}
      <circle cx="50" cy="5" r="1.5" fill={`url(#gold-primary-${gradientId})`} />
      <circle cx="95" cy="50" r="1.5" fill={`url(#gold-primary-${gradientId})`} />
      <circle cx="50" cy="95" r="1.5" fill={`url(#gold-primary-${gradientId})`} />
      <circle cx="5" cy="50" r="1.5" fill={`url(#gold-primary-${gradientId})`} />

      {/* Central Therapeutic Alignment & Monogram Emblem ("D" & "C" + Wellness Spine) */}
      <g filter={variant === 'gold' ? `url(#glow-${gradientId})` : undefined}>
        {/* The Sculpted Spine/Stem: Vertical posture curve */}
        <path
          d="M33 24 C 33 24, 38 40, 36 52 C 34 64, 33 76, 33 76"
          stroke={`url(#gold-primary-${gradientId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Golden Serifs for the Spine */}
        <path
          d="M27 24 L39 24"
          stroke={`url(#gold-primary-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M27 76 L39 76"
          stroke={`url(#gold-primary-${gradientId})`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Dynamic Outer "D" Wing / Organic Harmony Arc */}
        <path
          d="M35 24.5 C 56 24.5, 75 35, 75 50 C 75 65, 56 75.5, 35 75.5"
          stroke={`url(#gold-primary-${gradientId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Inner Harmonic Aesthetic Wave (Representing lymphatic drainage & cellular renewal) */}
        <path
          d="M36 34 C 48 34, 62 41, 62 50 C 62 59, 48 66, 36 66"
          stroke={`url(#gold-light-${gradientId})`}
          strokeWidth="1.8"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />

        {/* Central Diamond Sparkle: Medical & Aesthetic Precision */}
        <path
          d="M51 44 Q 51 50, 57 50 Q 51 50, 51 56 Q 51 50, 45 50 Q 51 50, 51 44 Z"
          fill={`url(#gold-light-${gradientId})`}
        />
      </g>
    </svg>
  );
}

/**
 * Complete Brand Header Logo with Typography
 */
export function Logo({
  className = '',
  size = 38,
  variant = 'gold',
  showText = true,
  subtitle,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative group shrink-0">
        <LogoIcon size={size} variant={variant} />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#1A1412] group-hover:text-[#9A7428] transition-colors">
            Digital Clínica
          </span>
          <span className="font-mono text-[9px] sm:text-[9.5px] font-semibold tracking-[0.18em] text-[#C49A3C] uppercase mt-0.5">
            {subtitle || 'Fisioterapia & Estética'}
          </span>
        </div>
      )}
    </div>
  );
}
