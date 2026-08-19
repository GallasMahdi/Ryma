'use client';

import React from 'react';
import Link from 'next/link';
import { Lang } from '@/lib/i18n';
import {
  IconPlus,
  IconRefresh,
  IconExternalLink,
  IconLock,
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
  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-serif font-bold text-xs">
          R
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#0F172A] tracking-tight">
            Ryma Clinic
          </span>
          <span className="text-[#CBD5E1]">/</span>
          <span className="text-xs text-[#64748B] font-medium hidden sm:inline">
            {lang === 'pt' ? 'Gestão Clínica' : lang === 'en' ? 'Clinic Management' : 'Gestion Clinique'}
          </span>
          {/* Live Real-time connection badge */}
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[10px] font-mono font-medium">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'}`} />
            <span className="hidden md:inline">{isLive ? (lang === 'fr' ? 'En direct' : lang === 'en' ? 'Live' : 'Em direto') : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Export CSV */}
        <a
          href="/api/admin/export?type=appointments"
          target="_blank"
          download
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          title={lang === 'pt' ? 'Exportar em CSV' : lang === 'en' ? 'Export to CSV' : 'Exporter en CSV'}
        >
          <span>{lang === 'pt' ? 'Exportar CSV' : lang === 'en' ? 'Export CSV' : 'Export CSV'}</span>
        </a>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          title={lang === 'pt' ? 'Atualizar' : lang === 'en' ? 'Refresh' : 'Actualiser'}
          className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
        >
          <IconRefresh size={15} className={loadingAppointments ? 'animate-spin text-[#2563EB]' : ''} />
        </button>

        {/* New Appointment — Primary Button */}
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs transition-colors"
        >
          <IconPlus size={15} />
          <span>
            {lang === 'pt'
              ? 'Nova Consulta'
              : lang === 'en'
              ? 'New Appointment'
              : 'Nouveau Rendez-vous'}
          </span>
        </button>

        <div className="h-4 w-px bg-[#E2E8F0] mx-1" />

        {/* View Site */}
        <Link
          href="/"
          target="_blank"
          className="hidden lg:inline-flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors"
        >
          <span>{lang === 'pt' ? 'Website' : lang === 'en' ? 'Website' : 'Site'}</span>
          <IconExternalLink size={13} />
        </Link>

        {/* Language Switch */}
        <button
          onClick={toggleLang}
          className="text-xs px-2 py-1 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors uppercase font-medium"
        >
          {lang.toUpperCase()}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1 text-xs text-[#991B1B] hover:text-[#7F1D1D] px-2 py-1.5 rounded-lg hover:bg-[#FEE2E2]/50 transition-colors font-medium"
          title={lang === 'pt' ? 'Terminar Sessão' : lang === 'en' ? 'Sign Out' : 'Déconnexion'}
        >
          <IconLock size={13} />
          <span className="hidden md:inline">
            {lang === 'pt' ? 'Sair' : lang === 'en' ? 'Logout' : 'Quitter'}
          </span>
        </button>
      </div>
    </header>
  );
}