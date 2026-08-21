'use client';

import React from 'react';
import Link from 'next/link';
import { Lang } from '@/lib/i18n';
import { LogoIcon } from '@/components/ui/Logo';
import {
  IconPlus,
  IconRefresh,
  IconExternalLink,
  IconLock,
  IconFileSpreadsheet,
} from '@tabler/icons-react';

interface AdminHeaderProps {
  lang: Lang;
  toggleLang: () => void;
  loadingAppointments: boolean;
  isLive?: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onLogout: () => void;
}

export function AdminHeader({
  lang,
  toggleLang,
  loadingAppointments,
  isLive = true,
  onRefresh,
  onOpenAddModal,
  onLogout,
}: AdminHeaderProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  return (
    <header className="h-14 md:h-16 bg-white border-b border-[#E2E8F0] px-3.5 sm:px-5 md:px-6 flex items-center justify-between shrink-0 z-30 sticky top-0 font-sans">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="shrink-0 flex items-center justify-center select-none">
          <LogoIcon size={32} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-semibold text-sm sm:text-base text-[#0F172A] tracking-tight truncate">
            Digital Clínica
          </span>
          <span className="text-[#CBD5E1] hidden sm:inline">/</span>
          <span className="text-xs text-[#64748B] font-medium hidden md:inline truncate">
            {txt('Administration Clinique', 'Clinic Management', 'Gestão Clínica')}
          </span>

          {/* Live Real-time SSE Connection Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ml-1 ${
              isLive
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
            }`}
            title={isLive ? txt('Connexion en direct active', 'Live real-time sync active', 'Sincronização em direto ativa') : txt('Hors ligne', 'Offline', 'Offline')}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isLive ? 'bg-[#22C55E] animate-pulse' : 'bg-[#94A3B8]'
              }`}
            />
            <span className="hidden sm:inline font-semibold">
              {isLive ? txt('Direct', 'Live', 'Direto') : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Export CSV (Desktop / Tablet) */}
        <a
          href="/api/admin/export?type=appointments"
          target="_blank"
          download
          className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
          title={txt('Exporter les rendez-vous en CSV', 'Export appointments to CSV', 'Exportar consultas em CSV')}
        >
          <IconFileSpreadsheet size={15} className="text-[#64748B]" />
          <span>CSV</span>
        </a>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loadingAppointments}
          title={txt('Actualiser', 'Refresh', 'Atualizar')}
          className="p-2 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] active:scale-95 transition-all touch-target flex items-center justify-center"
        >
          <IconRefresh
            size={16}
            className={loadingAppointments ? 'animate-spin text-[#2563EB]' : ''}
          />
        </button>

        {/* New Appointment Primary Button */}
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs shadow-xs hover:shadow transition-all touch-target"
        >
          <IconPlus size={16} />
          <span className="hidden xs:inline sm:inline">
            {txt('Nouveau RDV', 'New Appt', 'Nova Consulta')}
          </span>
        </button>

        <div className="h-4 w-px bg-[#E2E8F0] mx-0.5 sm:mx-1" />

        {/* Public Website Link (Desktop) */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors font-medium"
          title={txt('Voir le site public', 'View public website', 'Ver site público')}
        >
          <span>{txt('Site', 'Site', 'Site')}</span>
          <IconExternalLink size={13} />
        </Link>

        {/* Language Switch */}
        <button
          onClick={toggleLang}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#334155] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors font-semibold uppercase touch-target flex items-center justify-center"
          title={txt('Changer de langue', 'Switch language', 'Mudar idioma')}
        >
          {lang}
        </button>

        {/* Logout (Desktop & Tablet) */}
        <button
          onClick={onLogout}
          className="hidden sm:inline-flex items-center gap-1 text-xs text-[#991B1B] hover:text-[#7F1D1D] px-2.5 py-1.5 rounded-lg hover:bg-[#FEE2E2]/50 transition-colors font-medium"
          title={txt('Déconnexion', 'Sign Out', 'Terminar Sessão')}
        >
          <IconLock size={14} />
          <span className="hidden lg:inline">
            {txt('Quitter', 'Logout', 'Sair')}
          </span>
        </button>
      </div>
    </header>
  );
}