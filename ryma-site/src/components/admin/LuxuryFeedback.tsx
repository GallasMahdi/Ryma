'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';

export interface LuxuryToast {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number;
}

interface LuxuryToastContainerProps {
  toasts: LuxuryToast[];
  onDismiss: (id: string) => void;
}

export const LuxuryToastContainer = React.memo(function LuxuryToastContainer({ toasts, onDismiss }: LuxuryToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-[999999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-[#E9E6DF] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.1)] flex items-start gap-3.5"
          >
            {/* Top gold accent line */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2.5px] ${
                toast.type === 'success'
                  ? 'bg-gradient-to-r from-[#6F8F72] via-[#C6A15B] to-[#6F8F72]'
                  : toast.type === 'error'
                  ? 'bg-gradient-to-r from-[#A9655F] via-[#E8A0A0] to-[#A9655F]'
                  : toast.type === 'loading'
                  ? 'bg-gradient-to-r from-[#C6A15B] via-[#E8D7B0] to-[#C6A15B] animate-pulse'
                  : 'bg-gradient-to-r from-[#9B793A] to-[#C6A15B]'
              }`}
            />

            {/* Icon */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                toast.type === 'success'
                  ? 'bg-[#6F8F72]/15 text-[#6F8F72] border border-[#6F8F72]/30'
                  : toast.type === 'error'
                  ? 'bg-[#A9655F]/15 text-[#A9655F] border border-[#A9655F]/30'
                  : toast.type === 'loading'
                  ? 'bg-[#C6A15B]/15 text-[#C6A15B] border border-[#C6A15B]/30'
                  : 'bg-[#9B793A]/15 text-[#9B793A] border border-[#9B793A]/30'
              }`}
            >
              {toast.type === 'success' && <IconCheck size={18} strokeWidth={2.5} />}
              {toast.type === 'error' && <IconAlertCircle size={18} strokeWidth={2.5} />}
              {toast.type === 'loading' && <IconLoader2 size={18} className="animate-spin" strokeWidth={2.5} />}
              {toast.type === 'info' && <IconInfoCircle size={18} strokeWidth={2.5} />}
            </div>

            {/* Text details */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="font-serif font-bold text-sm text-[#202020] leading-tight">
                {toast.title}
              </div>
              {toast.message && (
                <div className="font-sans text-xs text-[#77736B] mt-1 leading-relaxed break-words">
                  {toast.message}
                </div>
              )}
            </div>

            {/* Dismiss button */}
            {toast.type !== 'loading' && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-[#77736B] hover:text-[#202020] p-1 rounded-lg hover:bg-[#FAFAF8] transition-colors shrink-0"
              >
                <IconX size={15} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

/**
 * Top Global Progress Bar for Async Operations
 */
interface LuxuryProgressBarProps {
  isLoading: boolean;
}

export const LuxuryProgressBar = React.memo(function LuxuryProgressBar({ isLoading }: LuxuryProgressBarProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999999] h-[3px] pointer-events-none overflow-hidden bg-transparent"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: 'easeInOut',
            }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent shadow-[0_0_12px_#C6A15B]"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});
