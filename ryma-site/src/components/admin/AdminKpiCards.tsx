'use client';

import React from 'react';
import { Lang } from '@/lib/i18n';
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconChecklist,
  IconCurrencyEuro,
  IconLock,
  IconShieldLock,
  IconLockOpen,
} from '@tabler/icons-react';

interface StatsProps {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  revenue: number;
}

interface AdminKpiCardsProps {
  stats: StatsProps;
  lang: Lang;
  isAnalyticsUnlocked?: boolean;
  onUnlockClick?: () => void;
}

export function AdminKpiCards({
  stats,
  lang,
  isAnalyticsUnlocked = false,
  onUnlockClick,
}: AdminKpiCardsProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const items = [
    {
      id: 'total',
      label: txt('Total Rendez-vous', 'Total Appts', 'Total Consultas'),
      value: stats.total,
      badge: null,
      badgeColor: '',
      icon: IconCalendarEvent,
      iconBg: 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]',
      valColor: 'text-[#0F172A]',
      isRevenue: false,
    },
    {
      id: 'confirmed',
      label: txt('Confirmés', 'Confirmed', 'Confirmados'),
      value: stats.confirmed,
      badge: stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : null,
      badgeColor: 'bg-[#DCFCE7] text-[#166534]',
      icon: IconCheck,
      iconBg: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
      valColor: 'text-[#166534]',
      isRevenue: false,
    },
    {
      id: 'pending',
      label: txt('En Attente', 'Pending', 'Pendentes'),
      value: stats.pending,
      badge: stats.pending > 0 ? txt('À valider', 'Review', 'Rever') : null,
      badgeColor: 'bg-[#FEF9C3] text-[#854D0E]',
      icon: IconClock,
      iconBg: 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]',
      valColor: 'text-[#854D0E]',
      isRevenue: false,
    },
    {
      id: 'completed',
      label: txt('Terminés', 'Completed', 'Concluídos'),
      value: stats.completed,
      badge: null,
      badgeColor: '',
      icon: IconChecklist,
      iconBg: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
      valColor: 'text-[#1E40AF]',
      isRevenue: false,
    },
    {
      id: 'revenue',
      label: isAnalyticsUnlocked
        ? txt('Revenu Estimé', 'Est. Revenue', 'Receita Estimada')
        : txt('Receita (Proprietário)', 'Revenue (Owner)', 'Receita (Proprietário)'),
      value: isAnalyticsUnlocked ? `${stats.revenue} €` : '•••• €',
      badge: isAnalyticsUnlocked
        ? txt('Déverrouillé', 'Unlocked', 'Desbloqueado')
        : txt('Verrouillé', 'Locked', 'Bloqueado'),
      badgeColor: isAnalyticsUnlocked
        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
        : 'bg-amber-100 text-amber-800 border border-amber-300',
      icon: isAnalyticsUnlocked ? IconCurrencyEuro : IconShieldLock,
      iconBg: isAnalyticsUnlocked
        ? 'bg-[#F5E9C8] text-[#8A6A24] border-[#C49A3C]/40'
        : 'bg-[#EDE9FE] text-[#7C3AED] border-[#DDD6FE]',
      valColor: isAnalyticsUnlocked ? 'text-[#0F172A]' : 'text-[#7C3AED] tracking-widest',
      isRevenue: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-sans">
      {items.map((it) => {
        const Icon = it.icon;

        if (it.isRevenue) {
          return (
            <div
              key={it.id}
              onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
              role={!isAnalyticsUnlocked ? 'button' : undefined}
              tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
              onKeyDown={(e) => {
                if (!isAnalyticsUnlocked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onUnlockClick?.();
                }
              }}
              title={
                !isAnalyticsUnlocked
                  ? txt(
                      'Cliquez pour déverrouiller l’accès propriétaire',
                      'Click to unlock owner access',
                      'Clique para desbloquear o acesso de proprietário'
                    )
                  : undefined
              }
              className={`p-4 rounded-xl border flex flex-col justify-between shadow-xs transition-all col-span-2 sm:col-span-2 lg:col-span-1 select-none ${
                isAnalyticsUnlocked
                  ? 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1]'
                  : 'bg-gradient-to-br from-[#FAF5FF] via-white to-[#F5F3FF] border-[#DDD6FE] hover:border-[#7C3AED] hover:shadow-md cursor-pointer group'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-transform ${
                      !isAnalyticsUnlocked ? 'group-hover:scale-110' : ''
                    } ${it.iconBg}`}
                  >
                    <Icon size={15} strokeWidth={2} />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] truncate">
                    {it.label}
                  </span>
                </div>

                {it.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${it.badgeColor}`}
                  >
                    {isAnalyticsUnlocked ? <IconLockOpen size={11} /> : <IconLock size={11} />}
                    <span>{it.badge}</span>
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className={`text-2xl font-bold tracking-tight ${it.valColor}`}>
                  {it.value}
                </div>

                {!isAnalyticsUnlocked && (
                  <span className="text-[11px] font-semibold text-[#7C3AED] group-hover:underline flex items-center gap-0.5">
                    <span>{txt('Déverrouiller', 'Unlock', 'Desbloquear')}</span>
                    <span>→</span>
                  </span>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={it.id}
            className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between shadow-xs transition-colors hover:border-[#CBD5E1]"
          >
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${it.iconBg}`}
                >
                  <Icon size={15} strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#64748B] truncate">
                  {it.label}
                </span>
              </div>
              {it.badge && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${it.badgeColor}`}
                >
                  {it.badge}
                </span>
              )}
            </div>

            <div className={`text-2xl font-bold tracking-tight ${it.valColor}`}>
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}