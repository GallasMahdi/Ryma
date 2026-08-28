'use client';

import React from 'react';
import {
  IconListCheck,
  IconCalendarEvent,
  IconChartBar,
  IconNotes,
  IconReceiptTax,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLifebuoy,
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
  isLoading?: boolean;
  isAnalyticsUnlocked?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenHelpdesk?: () => void;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  lang,
  totalAppointments,
  totalNotes,
  totalInvoices,
  isLoading = false,
  isAnalyticsUnlocked = false,
  isCollapsed = false,
  onToggleCollapse,
  onOpenHelpdesk,
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
      badge: isAnalyticsUnlocked ? '🔓' : '🔒',
    },
  ];

  return (
    <aside
      className={`bg-[#FAFAF9] border-e border-[#E2E8F0] hidden md:flex flex-col justify-between shrink-0 z-20 select-none font-sans transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-3.5'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-1 min-h-[22px]">
          {!isCollapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] px-1 truncate">
              {txt('Navigation', 'Navigation', 'Navegação')}
            </span>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={
                isCollapsed
                  ? txt('Agrandir le menu (Ctrl+B)', 'Expand sidebar (Ctrl+B)', 'Expandir menu (Ctrl+B)')
                  : txt('Réduire le menu (Ctrl+B)', 'Collapse sidebar (Ctrl+B)', 'Recolher menu (Ctrl+B)')
              }
              className={`p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/70 transition-colors flex items-center justify-center ${
                isCollapsed ? 'w-full' : 'shrink-0'
              }`}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <IconLayoutSidebarLeftExpand size={18} />
              ) : (
                <IconLayoutSidebarLeftCollapse size={18} />
              )}
            </button>
          )}
        </div>

        <nav className="space-y-1" aria-label="Menu latéral">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? `${item.label} (${item.sublabel})` : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-sans transition-all duration-150 text-left relative group ${
                  isActive
                    ? 'bg-[#0F172A] text-white shadow-xs font-semibold'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] font-medium'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={`shrink-0 ${isActive ? 'text-white' : 'text-[#64748B] group-hover:text-[#0F172A]'}`}
                  />
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <div className="truncate text-xs">
                        {item.label}
                      </div>
                    </div>
                  )}
                </div>

                {isLoading && (item.id === 'appointments' || item.id === 'patients') && totalAppointments === 0 ? (
                  <span className="w-5 h-4 bg-slate-200/80 rounded-md animate-pulse shrink-0" />
                ) : item.badge !== null && (typeof item.badge === 'string' || item.badge > 0) ? (
                  isCollapsed ? (
                    <span
                      className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-[#38BDF8] text-[#0F172A]'
                          : 'bg-[#0F172A] text-white'
                      }`}
                    >
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                        typeof item.badge === 'string'
                          ? (isAnalyticsUnlocked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                          : (isActive ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="space-y-2 pt-2 border-t border-[#E2E8F0]/80">
        {onOpenHelpdesk && (
          <button
            type="button"
            onClick={onOpenHelpdesk}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
            } rounded-xl text-xs font-medium text-[#9A7428] hover:text-[#1A1412] bg-[#FAFAF8] hover:bg-[#C49A3C]/10 border border-[#C49A3C]/30 transition-colors shadow-2xs`}
            title={txt('Support Technique & Helpdesk', 'Clinic Support & Helpdesk', 'Suporte Técnico & Ajuda')}
          >
            <IconLifebuoy size={18} className="text-[#C49A3C] shrink-0" />
            {!isCollapsed && <span>{txt('Support & Aide', 'Support & Help', 'Suporte & Ajuda')}</span>}
          </button>
        )}

        {/* System Status Card */}
        {isCollapsed ? (
          <div
            className="p-2 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shadow-xs"
            title={txt('Système Prêt (v2.4)', 'System Ready (v2.4)', 'Sistema Ativo (v2.4)')}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#166534] animate-pulse" />
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 text-[#166534] font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
              <span>{txt('Système Prêt', 'System Ready', 'Sistema Ativo')}</span>
            </div>
            <span className="font-mono text-[10px] text-[#94A3B8]">
              v2.4
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}