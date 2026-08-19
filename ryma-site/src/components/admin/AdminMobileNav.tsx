'use client';

import React from 'react';
import {
  IconCalendarEvent,
  IconListCheck,
  IconNotes,
  IconChartBar,
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-white border-t border-[#E2E8F0] shadow-md px-2 pt-1 pb-safe font-sans"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative min-h-[48px] touch-target ${
                isActive
                  ? 'text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {isActive && (
                <div className="absolute inset-x-2 top-1 bottom-1 bg-[#F1F5F9] rounded-lg -z-10" />
              )}

              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.75}
                  className={isActive ? 'text-[#0F172A]' : 'text-[#64748B]'}
                />
                {tab.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-full leading-none ${
                      isActive
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[11px] font-medium mt-0.5 tracking-tight ${
                  isActive ? 'font-semibold text-[#0F172A]' : 'text-[#64748B]'
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
