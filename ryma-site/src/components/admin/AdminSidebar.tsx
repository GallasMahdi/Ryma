'use client';

import React from 'react';
import {
  IconListCheck,
  IconCalendarEvent,
  IconChartBar,
  IconNotes,
  IconReceiptTax,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { AdminTab } from './AdminMobileNav';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  lang: Lang;
  totalAppointments: number;
  totalNotes: number;
  totalInvoices?: number;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  lang,
  totalAppointments,
  totalNotes,
  totalInvoices,
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
      id: 'invoices' as const,
      label: txt('Facturation & Recibos', 'Invoicing & Receipts', 'Faturação & Recibos'),
      sublabel: txt('NIF & Reçus Fiscaux', 'NIF & Tax Receipts', 'Recibos Fiscais & NIF'),
      icon: IconReceiptTax,
      badge: totalInvoices && totalInvoices > 0 ? totalInvoices : null,
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
    <aside className="w-64 bg-[#FAFAF9] border-e border-[#E2E8F0] p-3.5 hidden md:flex flex-col justify-between shrink-0 z-20 select-none font-sans">
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-3 pt-1">
          {txt('Navigation', 'Navigation', 'Navegação')}
        </div>

        <nav className="space-y-1" aria-label="Menu latéral">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-sans transition-all duration-150 text-left relative ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-xs font-semibold'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={isActive ? 'text-white' : 'text-[#64748B]'}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-xs">
                      {item.label}
                    </div>
                  </div>
                </div>

                {item.badge !== null && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
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

      {/* System Status Card */}
      <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-[#166534] font-medium text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
          <span>{txt('Système Prêt', 'System Ready', 'Sistema Ativo')}</span>
        </div>
        <span className="font-mono text-[10px] text-[#94A3B8]">
          v2.4
        </span>
      </div>
    </aside>
  );
}