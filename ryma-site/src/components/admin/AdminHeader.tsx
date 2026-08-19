'use client';

import React from 'react';
import Link from 'next/link';
import { Lang } from '@/lib/i18n';
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
    <header className="h-14 md:h-16 bg-white/95 backdrop-blur-xl border-b border-[#E9E6DF] px-3.5 sm:px-5 md:px-6 flex items-center justify-between shrink-0 z-30 sticky top-0">
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1A1412] to-[#2E2420] flex items-center justify-center text-[#E8C97A] font-serif font-bold text-sm shadow-sm shrink-0 border border-[#C49A3C]/30">
          R
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-serif font-bold text-sm sm:text-base text-[#1A1412] tracking-tight truncate">
            Ryma Kiné
          </span>
          <span className="text-[#D3CEB8] hidden sm:inline">/</span>
          <span className="text-xs text-[#77736B] font-mono hidden md:inline truncate">
            {txt('Administration', 'Management', 'Gestão')}
          </span>

          {/* Live Real-time SSE Connection Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium shrink-0 ml-1 ${
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
          className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-xl border border-[#E9E6DF] text-[#4A4540] hover:bg-[#FAF6EE] hover:border-[#E8D7B0] hover:text-[#9A7428] transition-all"
          title={txt('Exporter les rendez-vous en CSV', 'Export appointments to CSV', 'Exportar consultas em CSV')}
        >
          <IconFileSpreadsheet size={14} className="text-[#C49A3C]" />
          <span>CSV</span>
        </a>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loadingAppointments}
          title={txt('Actualiser', 'Refresh', 'Atualizar')}
          className="p-2 rounded-xl border border-[#E9E6DF] text-[#77736B] hover:text-[#1A1412] hover:bg-[#FAF6EE] hover:border-[#E8D7B0] active:scale-95 transition-all touch-target flex items-center justify-center"
        >
          <IconRefresh
            size={16}
            className={loadingAppointments ? 'animate-spin text-[#C49A3C]' : ''}
          />
        </button>

        {/* New Appointment Primary Button */}
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#1A1412] hover:bg-[#2E2420] text-white font-medium text-xs shadow-sm hover:shadow-md active:scale-95 transition-all touch-target"
        >
          <IconPlus size={16} className="text-[#E8C97A]" />
          <span className="hidden xs:inline sm:inline">
            {txt('Nouveau RDV', 'New Appt', 'Nova Consulta')}
          </span>
        </button>

        <div className="h-4 w-px bg-[#E9E6DF] mx-0.5 sm:mx-1" />

        {/* Public Website Link (Desktop) */}
        <Link
          href="/"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1 text-xs text-[#77736B] hover:text-[#1A1412] px-2 py-1.5 rounded-xl hover:bg-[#FAF6EE] transition-colors font-mono"
          title={txt('Voir le site public', 'View public website', 'Ver site público')}
        >
          <span>{txt('Site', 'Site', 'Site')}</span>
          <IconExternalLink size={13} />
        </Link>

        {/* Language Switch */}
        <button
          onClick={toggleLang}
          className="text-xs px-2.5 py-1.5 rounded-xl border border-[#E9E6DF] text-[#4A4540] hover:text-[#1A1412] hover:bg-[#FAF6EE] hover:border-[#E8D7B0] transition-all font-mono font-bold uppercase touch-target flex items-center justify-center"
          title={txt('Changer de langue', 'Switch language', 'Mudar idioma')}
        >
          {lang}
        </button>

        {/* Logout (Desktop & Tablet) */}
        <button
          onClick={onLogout}
          className="hidden sm:inline-flex items-center gap-1 text-xs text-[#991B1B] hover:text-[#7F1D1D] px-2.5 py-1.5 rounded-xl hover:bg-[#FEE2E2]/60 transition-colors font-mono font-semibold"
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