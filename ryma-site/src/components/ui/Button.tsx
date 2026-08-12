import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-4 py-2 text-xs tracking-wider',
    md: 'px-6 py-3 text-sm tracking-wide',
    lg: 'px-8 py-4 text-base tracking-wide',
  };

  const variants = {
    primary:
      'bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] font-semibold shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.5)] hover:scale-[1.02] active:scale-[0.98]',
    secondary:
      'bg-[#1A1412] text-[#F5E9C8] hover:bg-[#2A2018] hover:shadow-[0_4px_20px_rgba(26,20,18,0.3)] hover:scale-[1.02] active:scale-[0.98]',
    outline:
      'border-2 border-[#C49A3C] text-[#9A7428] bg-white hover:bg-[#C49A3C] hover:text-[#1A1412] hover:scale-[1.02] active:scale-[0.98] shadow-sm',
    ghost:
      'text-[#8A8078] hover:text-[#1A1412] hover:bg-[#F4F2EE]',
  };

  const combinedClasses = `${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}
