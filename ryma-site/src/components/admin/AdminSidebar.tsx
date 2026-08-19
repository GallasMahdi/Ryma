'use client';

import React from 'react';
import {
  IconListCheck,
  IconCalendarEvent,
  IconChartBar,
  IconNotes,
  IconActivity,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { AdminTab } from './AdminMobileNav';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
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
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const navItems = [
    {
      id: 'appointments' as const,
      label: txt('Rendez-vous', 'Appointments', 'Consultas'),
      sublabel: txt('Planning & Liste', 'List & Schedule', 'Lista e Agenda'),
      icon: IconListCheck,
      badge: totalAppointments,
    },
    {
      id: 'slots' as const,
      label: txt('Créneaux & Horaires', 'Slots & Hours', 'Horários & Vagas'),
      sublabel: txt('Disponibilités', 'Availability', 'Disponibilidades'),
      icon: IconCalendarEvent,
      badge: null,
    },
    {
      id: 'patients' as const,
      label: txt('Dossiers Patients', 'Patient Records', 'Fichas de Utentes'),
      sublabel: txt('EMR & Suivi EVA', 'EMR & Pain Scale', 'Processos & EVA'),
      icon: IconNotes,
      badge: totalNotes,
    },
    {
      id: 'analytics' as const,
      label: txt('Statistiques', 'Analytics & Reports', 'Estatísticas'),
      sublabel: txt('Rapports & Revenus', 'Reports & Revenue', 'Relatórios & Receita'),
      icon: IconChartBar,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-[#FAFAF8] border-e border-[#E9E6DF] p-3.5 hidden md:flex flex-col justify-between shrink-0 z-20 select-none">
      <div className="space-y-5">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#77736B] px-3 pt-1">
          {txt('Navigation Principale', 'Main Navigation', 'Navegação Principal')}
        </div>

        <nav className="space-y-1.5" aria-label="Menu latéral">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-sans transition-all duration-200 text-left relative group ${
                  isActive
                    ? 'bg-white text-[#1A1412] shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#E8D7B0]'
                    : 'text-[#4A4540] hover:text-[#1A1412] hover:bg-[#F4F2EE] border border-transparent'
                }`}
              >
                {/* Gold left bar on active */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#C49A3C] rounded-r-full" />
                )}

                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#FAF6EE] text-[#C49A3C] border border-[#E8D7B0]'
                        : 'bg-[#F4F2EE] text-[#77736B] group-hover:text-[#1A1412]'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold truncate ${isActive ? 'text-[#1A1412]' : 'text-[#4A4540]'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] font-mono text-[#77736B] truncate">
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-[#C49A3C] text-white shadow-xs'
                        : 'bg-[#E9E6DF] text-[#4A4540]'
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

      {/* System Status Card */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E9E6DF] text-xs font-mono text-[#77736B] space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#166534] font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span>{txt('Système Opérationnel', 'System Online', 'Sistema Operacional')}</span>
          </div>
          <span className="text-[10px] font-bold text-[#C49A3C] bg-[#FAF6EE] px-1.5 py-0.5 rounded border border-[#E8D7B0]">
            v2.4
          </span>
        </div>
        <div className="text-[10px] text-[#77736B] leading-relaxed">
          {txt('Cabinet Ryma Kiné • Lisbonne', 'Ryma Kiné Clinic • Lisbon', 'Clínica Ryma Kiné • Lisboa')}
        </div>
      </div>
    </aside>
  );
}