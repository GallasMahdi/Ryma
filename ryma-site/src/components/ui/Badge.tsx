import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'bronze' | 'rose' | 'gold' | 'outline';
  className?: string;
}

export function Badge({
  children,
  variant = 'gold',
  className = '',
}: BadgeProps) {
  const variants = {
    gold:    'bg-[#F5E9C8] text-[#9A7428] border-[#C49A3C]/40',
    teal:    'bg-[#F5E9C8] text-[#9A7428] border-[#C49A3C]/40',
    bronze:  'bg-[#FAF0DC] text-[#9A7428] border-[#E8C97A]/50',
    rose:    'bg-[#FDF0F0] text-[#B87070] border-[#E8A0A0]/40',
    outline: 'bg-transparent text-[#8A8078] border-[#D4CEBE]',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono tracking-wider border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
