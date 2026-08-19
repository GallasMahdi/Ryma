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

  const isFiltered = searchQuery || filter !== 'all' || dateFilter !== 'all';

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Filtres & Recherche', 'Filters & Search', 'Filtros & Pesquisa')}
      subtitle={txt(`${totalResults} résultats correspondants`, `${totalResults} matching results`, `${totalResults} resultados encontrados`)}
      maxWidth="md"
    >
      <div className="space-y-5 font-sans">
        {/* Search Bar */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-bold uppercase text-[#77736B]">
            {txt('Recherche patient', 'Patient search', 'Pesquisa do utente')}
          </label>
          <div className="relative">
            <IconSearch
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736B]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={txt('Nom, téléphone, traitement...', 'Name, phone, service...', 'Nome, telefone, tratamento...')}
              className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#1A1412] rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#C49A3C] focus:ring-1 focus:ring-[#C49A3C] transition-colors"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase text-[#77736B]">
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
                      ? 'bg-[#1A1412] border-[#1A1412] text-white font-bold shadow-xs'
                      : 'bg-[#FAFAF8] border-[#E9E6DF] text-[#4A4540] hover:bg-[#F4F2EE]'
                  }`}
                >
                  {isSelected && <IconCheck size={14} className="text-[#E8C97A]" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold uppercase text-[#77736B]">
            {txt('Période', 'Period', 'Período')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dateOptions.map(opt => {
              const isSelected = dateFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateFilter(opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5 touch-target ${
                    isSelected
                      ? 'bg-[#1A1412] border-[#1A1412] text-white font-bold shadow-xs'
                      : 'bg-[#FAFAF8] border-[#E9E6DF] text-[#4A4540] hover:bg-[#F4F2EE]'
                  }`}
                >
                  {isSelected && <IconCheck size={14} className="text-[#E8C97A]" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#E9E6DF] flex items-center justify-between gap-3">
          {isFiltered ? (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#991B1B] hover:text-[#7F1D1D] p-2"
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
            className="px-5 py-3 rounded-2xl bg-[#1A1412] hover:bg-[#2E2420] text-white font-semibold text-xs transition-all shadow-md touch-target"
          >
            {txt('Appliquer les filtres', 'Apply filters', 'Aplicar filtros')}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
