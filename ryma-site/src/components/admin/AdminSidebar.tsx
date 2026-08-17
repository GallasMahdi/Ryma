'use client';

import React from 'react';
import {
  IconListCheck,
  IconCalendarEvent,
  IconChartBar,
  IconNotes,
  IconSparkles,
} from '@tabler/icons-react';

import { Lang } from '@/lib/i18n';

interface AdminSidebarProps {
  activeTab: 'appointments' | 'slots' | 'analytics' | 'patients';
  setActiveTab: (tab: 'appointments' | 'slots' | 'analytics' | 'patients') => void;
  lang: Lang;
  totalAppointments: number;
  totalNotes: number;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  lang,
  totalAppointments,
  totalNotes,
}: AdminSidebarProps) {
  const navItems = [
    {
      id: 'appointments' as const,
      label: lang === 'pt' ? 'Consultas' : lang === 'en' ? 'Appointments' : 'Rendez-vous',
      icon: IconListCheck,
      badge: totalAppointments,
    },
    {
      id: 'slots' as const,
      label: lang === 'pt' ? 'Horários & Agenda' : lang === 'en' ? 'Slots & Schedule' : 'Créneaux & Planning',
      icon: IconCalendarEvent,
      badge: null,
    },
    {
      id: 'analytics' as const,
      label: lang === 'pt' ? 'Estatísticas' : lang === 'en' ? 'Analytics' : 'Statistiques',
      icon: IconChartBar,
      badge: null,
    },
    {
      id: 'patients' as const,
      label: lang === 'pt' ? 'Fichas de Doentes' : lang === 'en' ? 'Patient Records' : 'Dossiers Patients',
      icon: IconNotes,
      badge: totalNotes,
    },
  ];

  return (
    <aside className="w-60 bg-[#FAFAF9] border-e border-[#E2E8F0] p-3 hidden md:flex flex-col justify-between shrink-0 z-10">
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 pt-2">
          {lang === 'pt' ? 'Navegação' : lang === 'en' ? 'Navigation' : 'Navigation'}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} className={isActive ? 'text-white' : 'text-[#64748B]'} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
          <span>{lang === 'pt' ? 'Sistema Ativo' : lang === 'en' ? 'System Ready' : 'Système Prêt'}</span>
        </div>
        <span className="font-mono text-[10px] text-[#94A3B8]">v2.1</span>
      </div>
    </aside>
  );
}