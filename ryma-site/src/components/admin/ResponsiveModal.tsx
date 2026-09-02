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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 font-sans"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-0 touch-none"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Box */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-white border border-[#E2E8F0] rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden overscroll-contain`}
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3.5 md:px-6 md:py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0 pr-2">
                <h3 className="font-semibold text-base md:text-lg text-[#0F172A] truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#64748B] mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0 touch-target flex items-center justify-center"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
