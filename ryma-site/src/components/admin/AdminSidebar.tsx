'use client';

import React from 'react';
import {
  IconListCheck,
  IconCalendarEvent,
  IconChartBar,
  IconNotes,
  IconSparkles,
} from '@tabler/icons-react';

interface AdminSidebarProps {
  activeTab: 'appointments' | 'slots' | 'analytics' | 'patients';
  setActiveTab: (tab: 'appointments' | 'slots' | 'analytics' | 'patients') => void;
  lang: 'fr' | 'ar';
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
  return (
    <aside className="w-64 bg-white border-e border-[#E9E6DF] p-4 hidden md:flex flex-col justify-between shrink-0 shadow-[1px_0_3px_rgba(0,0,0,0.02)] z-10">
      <div className="space-y-6">
        <div className="font-mono text-[10px] uppercase text-[#77736B] tracking-widest px-3 font-semibold">
          {lang === 'fr' ? 'Menu Principal' : 'القائمة الرئيسية'}
        </div>

        <nav className="space-y-1.5">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs font-semibold transition-all ${
              activeTab === 'appointments'
                ? 'bg-[#FAF6EE] text-[#9B793A] border border-[#C6A15B]/30 shadow-[0_2px_8px_rgba(198,161,91,0.08)]'
                : 'text-[#77736B] hover:text-[#202020] hover:bg-[#FAFAF8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconListCheck size={18} className={activeTab === 'appointments' ? 'text-[#C6A15B]' : ''} />
              <span>{lang === 'fr' ? 'Rendez-vous' : 'المواعيد'}</span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'appointments'
                ? 'bg-[#C6A15B]/20 text-[#9B793A]'
                : 'bg-[#F4F2EE] text-[#77736B]'
            }`}>{totalAppointments}</span>
          </button>

          <button
            onClick={() => setActiveTab('slots')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs font-semibold transition-all ${
              activeTab === 'slots'
                ? 'bg-[#FAF6EE] text-[#9B793A] border border-[#C6A15B]/30 shadow-[0_2px_8px_rgba(198,161,91,0.08)]'
                : 'text-[#77736B] hover:text-[#202020] hover:bg-[#FAFAF8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconCalendarEvent size={18} className={activeTab === 'slots' ? 'text-[#C6A15B]' : ''} />
              <span>{lang === 'fr' ? 'Créneaux & Planning' : 'إدارة التوقيت'}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-[#FAF6EE] text-[#9B793A] border border-[#C6A15B]/30 shadow-[0_2px_8px_rgba(198,161,91,0.08)]'
                : 'text-[#77736B] hover:text-[#202020] hover:bg-[#FAFAF8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconChartBar size={18} className={activeTab === 'analytics' ? 'text-[#C6A15B]' : ''} />
              <span>{lang === 'fr' ? 'Statistiques' : 'الإحصائيات'}</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-mono text-xs font-semibold transition-all ${
              activeTab === 'patients'
                ? 'bg-[#FAF6EE] text-[#9B793A] border border-[#C6A15B]/30 shadow-[0_2px_8px_rgba(198,161,91,0.08)]'
                : 'text-[#77736B] hover:text-[#202020] hover:bg-[#FAFAF8]'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconNotes size={18} className={activeTab === 'patients' ? 'text-[#C6A15B]' : ''} />
              <span>{lang === 'fr' ? 'Dossiers Patients' : 'ملفات المرضى'}</span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'patients'
                ? 'bg-[#C6A15B]/20 text-[#9B793A]'
                : 'bg-[#F4F2EE] text-[#77736B]'
            }`}>{totalNotes}</span>
          </button>
        </nav>
      </div>

      <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#E9E6DF] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#C6A15B]">
          <IconSparkles size={16} />
          <span>Cabinet Ryma</span>
        </div>
        <p className="text-[11px] text-[#77736B] leading-relaxed font-sans">
          Base de données SQLite synchronisée. Accès sécurisé HTTP-Only.
        </p>
      </div>
    </aside>
  );
}