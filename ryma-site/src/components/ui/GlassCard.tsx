import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function GlassCard({
  children,
  className = '',
  hoverEffect = true,
}: GlassCardProps) {
  return (
    <div
      className={`bg-white border border-[rgba(196,154,60,0.15)] rounded-2xl shadow-[0_2px_16px_rgba(196,154,60,0.06),_0_1px_4px_rgba(0,0,0,0.04)] p-6 md:p-8 ${
        hoverEffect
          ? 'transition-all duration-300 hover:border-[rgba(196,154,60,0.4)] hover:shadow-[0_8px_40px_rgba(196,154,60,0.16),_0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-1'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
