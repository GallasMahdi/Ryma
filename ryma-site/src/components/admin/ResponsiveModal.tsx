'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}

const MAX_WIDTH_CLASSES = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
};

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
}: ResponsiveModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-0"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Box */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-white border border-[#E9E6DF] rounded-t-3xl md:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.15)] flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden`}
          >
            {/* Top gold accent line */}
            <div className="h-1 w-full bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#C49A3C] shrink-0" />

            {/* Mobile Drag Indicator Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-12 h-1.5 rounded-full bg-[#E2E8F0]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3.5 md:px-6 md:py-4 border-b border-[#E9E6DF] flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0 pr-2">
                <h3 className="font-serif font-bold text-base md:text-lg text-[#1A1412] truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#77736B] font-mono mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-[#77736B] hover:text-[#1A1412] hover:bg-[#F4F2EE] transition-colors shrink-0 touch-target flex items-center justify-center"
                  aria-label="Fermer"
                >
                  <IconX size={18} />
                </button>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
