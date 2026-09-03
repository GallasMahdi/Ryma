'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  IconCalendarEvent,
  IconListCheck,
  IconNotes,
  IconChartBar,
  IconReceiptTax,
  IconMessageHeart,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';

export type AdminTab = 'appointments' | 'slots' | 'patients' | 'invoices' | 'reviews' | 'analytics';

interface AdminMobileNavProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  lang: Lang;
  totalAppointments: number;
  totalNotes: number;
  totalInvoices?: number;
  totalReviews?: number;
  isAnalyticsUnlocked?: boolean;
  onOpenAddModal: () => void;
}

export function AdminMobileNav({
  activeTab,
  setActiveTab,
  lang,
  totalAppointments,
  totalNotes,
  totalInvoices,
  totalReviews,
  isAnalyticsUnlocked = false,
  onOpenAddModal,
}: AdminMobileNavProps) {
  const tabs = [
    {
      id: 'appointments' as const,
      label: lang === 'pt' ? 'Consultas' : lang === 'en' ? 'Appts' : 'RDV',
      icon: IconListCheck,
      badge: totalAppointments > 0 ? totalAppointments : null,
    },
    {
      id: 'slots' as const,
      label: lang === 'pt' ? 'Agenda' : lang === 'en' ? 'Schedule' : 'Planning',
      icon: IconCalendarEvent,
      badge: null,
    },
    {
      id: 'patients' as const,
      label: lang === 'pt' ? 'Doentes' : lang === 'en' ? 'Patients' : 'Patients',
      icon: IconNotes,
      badge: totalNotes > 0 ? totalNotes : null,
    },
    {
      id: 'invoices' as const,
      label: lang === 'pt' ? 'Recibos' : lang === 'en' ? 'Invoices' : 'Factures',
      icon: IconReceiptTax,
      badge: totalInvoices && totalInvoices > 0 ? totalInvoices : null,
    },
    {
      id: 'reviews' as const,
      label: lang === 'pt' ? 'Avis' : lang === 'en' ? 'Reviews' : 'Avis',
      icon: IconMessageHeart,
      badge: totalReviews && totalReviews > 0 ? totalReviews : null,
    },
    {
      id: 'analytics' as const,
      label: lang === 'pt' ? 'Stats' : lang === 'en' ? 'Stats' : 'Stats',
      icon: IconChartBar,
      badge: isAnalyticsUnlocked ? '🔓' : '🔒',
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-[#FAF6EE]/95 backdrop-blur-xl border-t border-[#C49A3C]/25 shadow-[0_-4px_25px_rgba(196,154,60,0.1)] px-2 pt-1.5 pb-safe font-sans"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all relative min-h-[50px] touch-target select-none ${
                isActive
                  ? 'text-[#8A6A24] font-bold'
                  : 'text-[#8A8078] hover:text-[#1A1412] font-medium'
              }`}
            >
              {/* Animated Floating Luxury Gold Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeAdminMobilePill"
                  className="absolute inset-x-1 top-0.5 bottom-0.5 rounded-xl border border-[#C49A3C]/60 bg-gradient-to-br from-[#F5E9C8] via-[#FAF5EC] to-[#EEDBB2] shadow-[0_2px_12px_rgba(196,154,60,0.25)] -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={isActive ? { scale: [1, 1.15, 1], y: -1 } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.3 : 1.75}
                    className={isActive ? 'text-[#8A6A24]' : 'text-[#8A8078]'}
                  />
                </motion.div>

                {tab.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none transition-all ${
                      typeof tab.badge === 'string'
                        ? (isAnalyticsUnlocked ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300')
                        : isActive
                        ? 'bg-gradient-to-r from-[#C49A3C] via-[#D4AF37] to-[#E8C97A] text-[#1A1412] border border-[#FFF8E7] shadow-[0_2px_8px_rgba(196,154,60,0.4)]'
                        : 'bg-[#F5E9C8] text-[#8A6A24] border border-[#C49A3C]/30'
                    }`}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] mt-0.5 tracking-tight transition-colors ${
                  isActive ? 'font-bold text-[#1A1412]' : 'font-medium text-[#7A6B5D]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
