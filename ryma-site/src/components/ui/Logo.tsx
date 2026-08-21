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
 * Option 6: Haute-Couture Continuous Single-Line Art
 * Silhouette & Letter "D" Emblem for Digital Clínica.
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
        {/* Luxury Gold Metallic Gradient */}
        <linearGradient id={`gold-line-${gradientId}`} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFF2D1" />
          <stop offset="25%" stopColor="#E9CA7E" />
          <stop offset="55%" stopColor="#C49A3C" />
          <stop offset="85%" stopColor="#966F21" />
          <stop offset="100%" stopColor="#6C4D0F" />
        </linearGradient>

        {/* Shimmer Highlight */}
        <linearGradient id={`shimmer-line-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#F5E3B8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C49A3C" stopOpacity="0.6" />
        </linearGradient>

        {/* Deep Luxury Dark Medallion Gradient */}
        <radialGradient id={`medallion-bg-${gradientId}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#251C17" />
          <stop offset="68%" stopColor="#140F0D" />
          <stop offset="100%" stopColor="#0A0807" />
        </radialGradient>

        {/* Outer Glow */}
        <filter id={`line-glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Medallion Background */}
      {variant !== 'monochrome' && (
        <>
          <circle cx="50" cy="50" r="47" fill={`url(#medallion-bg-${gradientId})`} />
          <circle
            cx="50"
            cy="50"
            r="47"
            stroke={`url(#gold-line-${gradientId})`}
            strokeWidth="1.6"
            strokeOpacity="0.85"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            stroke={`url(#shimmer-line-${gradientId})`}
            strokeWidth="0.75"
            strokeDasharray="2.5 4"
            strokeOpacity="0.4"
          />
          {/* Subtle Cardinal Luxury Dots */}
          <circle cx="50" cy="5.5" r="1.4" fill={`url(#gold-line-${gradientId})`} />
          <circle cx="94.5" cy="50" r="1.4" fill={`url(#gold-line-${gradientId})`} />
          <circle cx="50" cy="94.5" r="1.4" fill={`url(#gold-line-${gradientId})`} />
          <circle cx="5.5" cy="50" r="1.4" fill={`url(#gold-line-${gradientId})`} />
        </>
      )}

      {/* Option 6 Continuous Line Art: Silhouette & Letter D */}
      <g filter={variant === 'gold' ? `url(#line-glow-${gradientId})` : undefined}>
        {/* Head Contour of Silhouette */}
        <path
          d="M 37.5 19 C 33 19, 30 22.5, 30 27 C 30 31.5, 33 34.5, 36.5 35.5"
          stroke={`url(#gold-line-${gradientId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Feminine Spine, Neck, Waist & Hip Contour (Left Side) */}
        <path
          d="M 34.5 35.5 C 31.5 38.5, 27.5 44, 27.5 50 C 27.5 57, 31 63, 29.5 70 C 28 77, 26 80, 25 82"
          stroke={`url(#gold-line-${gradientId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Infinity / Hourglass Figure Curve */}
        <path
          d="M 36.5 35.5 C 40 40, 42 47, 39 53 C 36 59, 33 66, 35 73 C 37 80, 42 82, 42 82 C 42 82, 33 82, 30 76 C 27 70, 31 61, 35 56 C 39 51, 39 42, 35.5 36.5"
          stroke={`url(#gold-line-${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The Expansive Capital "D" Dynamic Outer Wing (Right Side) */}
        <path
          d="M 36 35.5 C 56 35.5, 75 42, 75 58.5 C 75 74.5, 56 82, 36 82"
          stroke={`url(#gold-line-${gradientId})`}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Aesthetic Light Flow Arc */}
        <path
          d="M 39 44 C 54 44, 64 49, 64 58.5 C 64 68, 54 73.5, 39 73.5"
          stroke={`url(#shimmer-line-${gradientId})`}
          strokeWidth="1.8"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />

        {/* Sparkle Accent */}
        <circle cx="53" cy="58.5" r="1.5" fill={`url(#shimmer-line-${gradientId})`} />
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
