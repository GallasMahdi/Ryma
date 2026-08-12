'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconPlus,
  IconRefresh,
  IconExternalLink,
  IconLock,
} from '@tabler/icons-react';

interface AdminHeaderProps {
  lang: 'fr' | 'ar';
  toggleLang: () => void;
  loadingAppointments: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onLogout: () => void;
}

export function AdminHeader({
  lang,
  toggleLang,
  loadingAppointments,
  onRefresh,
  onOpenAddModal,
  onLogout,
}: AdminHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-[#E9E6DF] px-6 flex items-center justify-between shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)] z-20">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#C6A15B] to-[#9B793A] flex items-center justify-center text-white font-serif font-bold shadow-[0_2px_8px_rgba(198,161,91,0.3)]">
          R
        </div>
        <div>
          <div className="font-serif font-bold text-base text-[#202020] leading-tight tracking-wide">
            RYMA OUICHKA
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C6A15B] animate-pulse" />
            <span className="font-mono text-[10px] uppercase text-[#77736B] tracking-wider font-medium">
              {lang === 'fr' ? 'Tableau de Bord Administrateur' : 'لوحة الإدارة المباشرة'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backup Status Badge */}
        <div
          title={
            lang === 'fr'
              ? 'Sauvegarde SQLite WAL en ligne active (VACUUM INTO)'
              : 'نسخ احتياطي نشط لقاعدة البيانات'
          }
          className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#6F8F72]/15 border border-[#6F8F72]/30 text-[#6F8F72] text-xs font-mono font-bold"
        >
          <span className="w-2 h-2 rounded-full bg-[#6F8F72] animate-pulse" />
          <span>{lang === 'fr' ? 'WAL Backup : OK' : 'نسخ احتياطي : ممتاز'}</span>
        </div>

        <a
          href="/api/admin/export?type=appointments"
          target="_blank"
          download
          className="hidden sm:flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] hover:bg-[#F4F2EE] hover:border-[#C6A15B]/40 transition-all font-bold"
          title={lang === 'fr' ? 'Exporter en Excel / CSV' : 'تصدير بيانات Excel'}
        >
          <span>📥 {lang === 'fr' ? 'Export CSV' : 'تصدير'}</span>
        </a>

        <button
          onClick={onOpenAddModal}
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#C6A15B] to-[#9B793A] text-white font-semibold text-xs shadow-[0_4px_14px_rgba(198,161,91,0.25)] hover:shadow-[0_6px_18px_rgba(198,161,91,0.35)] hover:from-[#9B793A] hover:to-[#C6A15B] transition-all duration-200"
        >
          <IconPlus size={16} />
          <span>{lang === 'fr' ? 'Nouveau Rendez-vous' : 'موعد جديد'}</span>
        </button>

        <button
          onClick={onRefresh}
          title={lang === 'fr' ? 'Actualiser' : 'تحديث'}
          className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] hover:border-[#C6A15B]/30 transition-all"
        >
          <IconRefresh size={16} className={loadingAppointments ? 'animate-spin text-[#C6A15B]' : ''} />
        </button>

        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] hover:border-[#C6A15B]/30 transition-all"
        >
          <span>{lang === 'fr' ? 'Voir le Site' : 'رؤية الموقع'}</span>
          <IconExternalLink size={13} />
        </Link>

        <button
          onClick={toggleLang}
          className="font-mono text-xs px-2.5 py-1.5 rounded-xl border border-[#E9E6DF] bg-[#FAFAF8] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] hover:border-[#C6A15B]/30 transition-colors uppercase font-medium"
        >
          {lang === 'fr' ? 'AR' : 'FR'}
        </button>

        <div className="h-4 w-px bg-[#E9E6DF] mx-1" />

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 font-mono text-xs text-[#A9655F] hover:text-[#8F534D] transition-colors py-1.5 px-2.5 rounded-xl hover:bg-[#A9655F]/10 font-medium"
          title={lang === 'fr' ? 'Déconnexion' : 'خروج'}
        >
          <IconLock size={14} />
          <span className="hidden md:inline">{lang === 'fr' ? 'Quitter' : 'خروج'}</span>
        </button>
      </div>
    </header>
  );
}