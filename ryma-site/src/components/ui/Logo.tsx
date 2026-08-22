import React from 'react';
import Image from 'next/image';

export interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'gold' | 'light' | 'dark' | 'monochrome';
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  useFullImage?: boolean;
}

/**
 * Official Digital Clínica Monogram & Silhouette Mark Icon (48x48 default)
 */
export function LogoIcon({
  size = 48,
  className = '',
  variant = 'gold',
  alt = 'Digital Clínica Emblem',
}: {
  size?: number;
  className?: string;
  variant?: 'gold' | 'light' | 'dark' | 'monochrome';
  alt?: string;
}) {
  const isLight = variant === 'light';
  const src = isLight ? '/logo-mark-light.png' : '/logo-mark.png';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none"
        priority
      />
    </div>
  );
}

/**
 * Complete Brand Header Logo with Typography or Full Image Asset
 */
export function Logo({
  className = '',
  size = 48,
  variant = 'gold',
  showText = true,
  subtitle,
  useFullImage = false,
}: LogoProps) {
  const isLight = variant === 'light';

  if (useFullImage) {
    // Aspect ratio of full logo is ~ 404 / 168 ≈ 2.4
    const fullWidth = Math.round(size * 2.4);
    const imgSrc = isLight ? '/logo-full-light.png' : '/logo-full.png';

    return (
      <div className={`relative inline-flex items-center select-none ${className}`}>
        <Image
          src={imgSrc}
          alt="Digital Clínica"
          width={fullWidth}
          height={size}
          className="h-auto max-h-[48px] w-auto object-contain pointer-events-none"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative group shrink-0">
        <LogoIcon size={size} variant={variant} />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-tight">
          <span
            className={`font-serif text-base sm:text-lg font-bold tracking-tight transition-colors ${
              isLight ? 'text-white group-hover:text-[#E8C97A]' : 'text-[#1A1412] group-hover:text-[#9A7428]'
            }`}
          >
            Digital Clínica
          </span>
          <span
            className={`font-mono text-[9px] sm:text-[9.5px] font-semibold tracking-[0.18em] uppercase mt-0.5 ${
              isLight ? 'text-[#C49A3C]' : 'text-[#8A6A24]'
            }`}
          >
            {subtitle || 'Fisioterapia & Estética'}
          </span>
        </div>
      )}
    </div>
  );
}

