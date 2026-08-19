'use client';

import React from 'react';
import {
  IconCalendarEvent,
  IconListCheck,
  IconNotes,
  IconChartBar,
  IconPlus,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';

export type AdminTab = 'appointments' | 'slots' | 'analytics' | 'patients';

interface AdminMobileNavProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  lang: Lang;
  totalAppointments: number;
  totalNotes: number;
  onOpenAddModal: () => void;
}

export function AdminMobileNav({
  activeTab,
  setActiveTab,
  lang,
  totalAppointments,
  totalNotes,
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
      id: 'analytics' as const,
      label: lang === 'pt' ? 'Mais' : lang === 'en' ? 'More' : 'Plus',
      icon: IconChartBar,
      badge: null,
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-white/95 backdrop-blur-xl border-t border-[#E9E6DF] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-safe"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 relative min-h-[48px] touch-target ${
                isActive
                  ? 'text-[#C49A3C]'
                  : 'text-[#77736B] hover:text-[#1A1412] active:scale-95'
              }`}
            >
              {/* Active gold background pill */}
              {isActive && (
                <div className="absolute inset-x-2 top-1 bottom-1 bg-[#FAF6EE] rounded-xl -z-10 border border-[#E8D7B0]/60" />
              )}

              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.75}
                  className={isActive ? 'text-[#C49A3C]' : 'text-[#77736B]'}
                />
                {tab.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-none shadow-xs ${
                      isActive
                        ? 'bg-[#C49A3C] text-white'
                        : 'bg-[#E9E6DF] text-[#4A4540]'
                    }`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-sans font-medium mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-[#1A1412]' : 'text-[#77736B]'
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
