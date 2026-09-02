'use client';

import React from 'react';
import { ResponsiveModal } from './ResponsiveModal';
import { AppointmentStatus } from '@/types/admin';
import { Lang } from '@/lib/i18n';
import { IconSearch, IconFilter, IconCheck, IconRotate } from '@tabler/icons-react';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: AppointmentStatus | 'all';
  setFilter: (s: AppointmentStatus | 'all') => void;
  dateFilter: 'all' | 'today' | 'tomorrow' | 'upcoming';
  setDateFilter: (d: 'all' | 'today' | 'tomorrow' | 'upcoming') => void;
  specificDateFilter?: string | null;
  setSpecificDateFilter?: (d: string | null) => void;
  onReset: () => void;
  totalResults: number;
}

export function FilterSheet({
  isOpen,
  onClose,
  lang,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  dateFilter,
  setDateFilter,
  specificDateFilter = null,
  setSpecificDateFilter,
  onReset,
  totalResults,
}: FilterSheetProps) {
  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const statusOptions: Array<{ id: AppointmentStatus | 'all'; label: string }> = [
    { id: 'all', label: txt('Tous les statuts', 'All statuses', 'Todos os estados') },
    { id: 'CONFIRMED', label: txt('Confirmés', 'Confirmed', 'Confirmados') },
    { id: 'PENDING', label: txt('En attente', 'Pending', 'Pendentes') },
    { id: 'COMPLETED', label: txt('Terminés', 'Completed', 'Concluídos') },
    { id: 'CANCELLED', label: txt('Annulés', 'Cancelled', 'Cancelados') },
  ];

  const dateOptions: Array<{ id: 'all' | 'today' | 'tomorrow' | 'upcoming'; label: string }> = [
    { id: 'all', label: txt('Toutes les dates', 'All dates', 'Todas as datas') },
    { id: 'today', label: txt("Aujourd'hui", 'Today', 'Hoje') },
    { id: 'tomorrow', label: txt('Demain', 'Tomorrow', 'Amanhã') },
    { id: 'upcoming', label: txt('À venir', 'Upcoming', 'Próximas') },
  ];

  const isFiltered = searchQuery || filter !== 'all' || dateFilter !== 'all' || specificDateFilter !== null;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Filtres & Recherche', 'Filters & Search', 'Filtros & Pesquisa')}
      subtitle={txt(`${totalResults} résultats correspondants`, `${totalResults} matching results`, `${totalResults} resultados encontrados`)}
      maxWidth="md"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Search Bar */}
        <div className="space-y-1.5">
          <label className="font-semibold uppercase tracking-wider text-[#475569] text-[11px]">
            {txt('Recherche patient', 'Patient search', 'Pesquisa do utente')}
          </label>
          <div className="relative">
            <IconSearch
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={txt('Nom, téléphone, traitement...', 'Name, phone, service...', 'Nome, telefone, tratamento...')}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1.5">
          <label className="font-semibold uppercase tracking-wider text-[#475569] text-[11px]">
            {txt('Statut du rendez-vous', 'Appointment status', 'Estado da consulta')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {statusOptions.map(opt => {
              const isSelected = filter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5 touch-target ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#0F172A] text-white font-semibold shadow-xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {isSelected && <IconCheck size={14} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter & Specific Date Jump */}
        <div className="space-y-1.5">
          <label className="font-semibold uppercase tracking-wider text-[#475569] text-[11px]">
            {txt('Période / Date', 'Period / Date', 'Período / Data')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dateOptions.map(opt => {
              const isSelected = dateFilter === opt.id && !specificDateFilter;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.id);
                    if (setSpecificDateFilter) setSpecificDateFilter(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5 touch-target ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#0F172A] text-white font-semibold shadow-xs'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {isSelected && <IconCheck size={14} />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Specific Date Picker Input */}
          <div className="pt-2">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#475569] whitespace-nowrap">
                {txt('Date exacte:', 'Exact date:', 'Data exata:')}
              </span>
              <input
                type="date"
                value={specificDateFilter || ''}
                onChange={(e) => {
                  if (setSpecificDateFilter) {
                    setSpecificDateFilter(e.target.value || null);
                    if (e.target.value) setDateFilter('all');
                  }
                }}
                className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs text-[#0F172A] font-semibold focus:outline-none focus:ring-1 focus:ring-[#0F172A]"
              />
              {specificDateFilter && (
                <button
                  type="button"
                  onClick={() => {
                    if (setSpecificDateFilter) setSpecificDateFilter(null);
                  }}
                  className="p-1 rounded-md text-[#991B1B] hover:bg-[#FEE2E2] transition-colors"
                  title="Effacer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
          {isFiltered ? (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#991B1B] hover:text-[#7F1D1D] p-2"
            >
              <IconRotate size={15} />
              <span>{txt('Réinitialiser', 'Reset', 'Repor')}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs transition-colors shadow-xs touch-target"
          >
            {txt('Appliquer les filtres', 'Apply filters', 'Aplicar filtros')}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
