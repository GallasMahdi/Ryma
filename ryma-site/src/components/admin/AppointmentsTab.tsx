'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconListCheck,
  IconStethoscope,
  IconCalendar,
  IconPhoneCall,
  IconMail,
  IconBrandWhatsapp,
  IconNotes,
  IconTrash,
  IconLayoutGrid,
  IconTable,
  IconTimeline,
  IconCurrencyDinar,
  IconUser,
  IconAlertCircle,
  IconClock,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import {
  Appointment,
  AppointmentStatus,
  STATUS_CONFIG,
  getServiceName,
  getServicePrice,
} from '@/types/admin';

import { Lang } from '@/lib/i18n';

interface AppointmentsTabProps {
  lang: Lang;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: AppointmentStatus | 'all';
  setFilter: (st: AppointmentStatus | 'all') => void;
  appointmentsError: string | null;
  loadingAppointments: boolean;
  filteredAppointments: Appointment[];
  updateStatus: (id: string, status: AppointmentStatus) => void;
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
  softDeleteAppointment: (id: string) => void;
  openPatientNote: (appt: Appointment) => void;
  noShowCounts?: Record<string, number>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'P';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppointmentsTab({
  lang,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  appointmentsError,
  loadingAppointments,
  filteredAppointments,
  updateStatus,
  setConfirmDialog,
  softDeleteAppointment,
  openPatientNote,
  noShowCounts,
}: AppointmentsTabProps) {
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'grouped'>('cards');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter, dateFilter, viewMode, itemsPerPage]);

  // Filter by date on top of status and search filter
  const displayedAppointments = useMemo(() => {
    return filteredAppointments.filter(item => {
      if (dateFilter === 'today') return item.date === todayStr;
      if (dateFilter === 'tomorrow') return item.date === tomorrowStr;
      if (dateFilter === 'upcoming') return item.date >= todayStr;
      return true;
    });
  }, [filteredAppointments, dateFilter, todayStr, tomorrowStr]);

  // Pagination calculations
  const totalItems = displayedAppointments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedAppointments = useMemo(() => {
    return displayedAppointments.slice(startIndex, endIndex);
  }, [displayedAppointments, startIndex, endIndex]);

  // Compute summary stats for all matching items before pagination
  const summaryMetrics = useMemo(() => {
    const totalCount = displayedAppointments.length;
    const pendingCount = displayedAppointments.filter(a => a.status === 'PENDING').length;
    const todayCount = displayedAppointments.filter(a => a.date === todayStr).length;
    const totalRevenue = displayedAppointments
      .filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED')
      .reduce((sum, a) => sum + getServicePrice(a.service), 0);

    return { totalCount, pendingCount, todayCount, totalRevenue };
  }, [displayedAppointments, todayStr]);

  // Grouped by date map for grouped view mode (paginated)
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    paginatedAppointments.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [paginatedAppointments]);

  const renderAppointmentCard = (item: Appointment) => {
    const st = STATUS_CONFIG[item.status];
    const price = getServicePrice(item.service);
    const initials = getInitials(item.patientName);

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E9E6DF] hover:border-[#C6A15B]/40 p-4 md:p-5 rounded-2xl transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4 flex-1">
          {/* Patient Avatar Initials */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FAF6EE] to-[#F4ECE0] border border-[#E8D7B0] flex items-center justify-center text-[#9B793A] font-serif font-bold text-sm shrink-0 shadow-xs">
            {initials}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif font-bold text-base text-[#202020]">
                {item.patientName}
              </span>
              <span className={`font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                {st[lang] || st.pt || st.fr}
              </span>
              {(noShowCounts?.[item.phone] ?? 0) >= 2 && (
                <span className="bg-[#A9655F]/15 border border-[#A9655F]/30 text-[#A9655F] font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <IconAlertCircle size={12} />
                  <span>{txt(`Client Risqué (${noShowCounts![item.phone]} Annulations)`, `High-Risk Client (${noShowCounts![item.phone]} Cancellations)`, `Cliente de Risco (${noShowCounts![item.phone]} Cancelamentos)`)}</span>
                </span>
              )}
              {price > 0 && (
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FAF6EE] text-[#9B793A] border border-[#E8D7B0]">
                  {price} TND
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#77736B]">
              <span className="flex items-center gap-1.5 text-[#9B793A] font-mono font-medium">
                <IconStethoscope size={14} className="text-[#C6A15B]" />
                {getServiceName(item.service, lang)}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[#C6A15B] font-semibold">
                <IconCalendar size={14} />
                {item.date} • {item.startTime}
              </span>
              <a
                href={`tel:${item.phone}`}
                className="flex items-center gap-1.5 font-mono text-[#77736B] hover:text-[#202020] transition-colors"
              >
                <IconPhoneCall size={14} />
                {item.phone}
              </a>
              {item.email && (
                <span className="flex items-center gap-1.5 font-mono text-[#77736B]">
                  <IconMail size={14} />
                  {item.email}
                </span>
              )}
            </div>

            {item.notes && (
              <div className="text-xs text-[#77736B] bg-[#FAFAF8] p-2.5 rounded-xl border border-[#E9E6DF] mt-1 max-w-2xl">
                📝 {item.notes}
              </div>
            )}
          </div>
        </div>

        {/* Status Change & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-[#E9E6DF] w-full md:w-auto justify-end">
          {/* WhatsApp Direct Reminder Link */}
          <a
            href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
              lang === 'fr'
                ? `Bonjour ${item.patientName}, nous vous rappelons votre rendez-vous pour ${getServiceName(item.service, 'fr')} le ${item.date} à ${item.startTime} au Cabinet Ryma Kiné. Merci de confirmer votre présence.`
                : lang === 'en'
                ? `Hello ${item.patientName}, this is a reminder for your appointment for ${getServiceName(item.service, 'en')} on ${item.date} at ${item.startTime} at Ryma Kiné Clinic. Please confirm your attendance.`
                : `Olá ${item.patientName}, lembramos a sua consulta de ${getServiceName(item.service, 'pt')} no dia ${item.date} às ${item.startTime} na Clínica Ryma Kiné. Por favor confirme a sua presença.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors shadow-xs flex items-center gap-1 font-mono text-xs font-bold"
            title={txt('Rappel WhatsApp', 'WhatsApp Reminder', 'Lembrete WhatsApp')}
          >
            <IconBrandWhatsapp size={16} />
            <span className="hidden xl:inline">{txt('Rappel', 'Reminder', 'Lembrete')}</span>
          </a>

          {/* Patient Dossier Trigger */}
          <button
            onClick={() => openPatientNote(item)}
            className="p-2 px-3 rounded-xl bg-[#FAF6EE] border border-[#E8D7B0] text-[#9B793A] hover:bg-[#F4ECE0] transition-colors flex items-center gap-1.5 text-xs font-mono font-semibold shadow-xs"
            title={txt('Dossier Patient', 'Patient File', 'Ficha do Doente')}
          >
            <IconNotes size={16} className="text-[#C6A15B]" />
            <span className="hidden sm:inline">{txt('Dossier', 'File', 'Ficha')}</span>
          </button>

          {/* Quick Status Modifiers */}
          {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
            <button
              onClick={() => updateStatus(item.id, 'CONFIRMED')}
              className="px-3 py-1.5 rounded-xl bg-[#6F8F72]/15 border border-[#6F8F72]/30 text-[#6F8F72] font-mono text-xs font-semibold hover:bg-[#6F8F72]/25 transition-colors"
            >
              ✓ {txt('Confirmer', 'Confirm', 'Confirmar')}
            </button>
          )}

          {item.status === 'CONFIRMED' && (
            <button
              onClick={() => updateStatus(item.id, 'COMPLETED')}
              className="px-3 py-1.5 rounded-xl bg-[#5B82A6]/15 border border-[#5B82A6]/30 text-[#5B82A6] font-mono text-xs font-semibold hover:bg-[#5B82A6]/25 transition-colors"
            >
              ✓ {txt('Terminer', 'Complete', 'Concluir')}
            </button>
          )}

          {item.status !== 'CANCELLED' && (
            <button
              onClick={() => setConfirmDialog({
                title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                onConfirm: () => softDeleteAppointment(item.id)
              })}
              className="p-2 rounded-xl bg-[#A9655F]/10 border border-[#A9655F]/20 text-[#A9655F] hover:bg-[#A9655F]/20 transition-colors"
              title={txt('Annuler', 'Cancel', 'Cancelar')}
            >
              <IconTrash size={16} />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Control Bar: Search, Status Filter, Date Filter & View Switcher */}
      <div className="flex flex-col space-y-3 bg-white p-4 rounded-3xl border border-[#E9E6DF] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        
        {/* Top Row: Search & View Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={txt('Rechercher patient, téléphone, soin...', 'Search patient, phone, care...', 'Pesquisar doente, telefone, cuidado...')}
              className="w-full bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] placeholder-[#77736B]/50 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B] transition-all font-sans"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#FAFAF8] p-1 rounded-2xl border border-[#E9E6DF] shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'cards'
                  ? 'bg-white text-[#202020] shadow-xs border border-[#E9E6DF]'
                  : 'text-[#77736B] hover:text-[#202020]'
              }`}
              title={txt('Vue Cartes', 'Card View', 'Vista Cartões')}
            >
              <IconLayoutGrid size={15} className={viewMode === 'cards' ? 'text-[#C6A15B]' : ''} />
              <span className="hidden md:inline">{txt('Cartes', 'Cards', 'Cartões')}</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-[#202020] shadow-xs border border-[#E9E6DF]'
                  : 'text-[#77736B] hover:text-[#202020]'
              }`}
              title={txt('Vue Tableau', 'Table View', 'Vista Tabela')}
            >
              <IconTable size={15} className={viewMode === 'table' ? 'text-[#C6A15B]' : ''} />
              <span className="hidden md:inline">{txt('Tableau', 'Table', 'Tabela')}</span>
            </button>

            <button
              onClick={() => setViewMode('grouped')}
              className={`p-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-white text-[#202020] shadow-xs border border-[#E9E6DF]'
                  : 'text-[#77736B] hover:text-[#202020]'
              }`}
              title={txt('Vue par Date', 'View by Date', 'Vista por Data')}
            >
              <IconTimeline size={15} className={viewMode === 'grouped' ? 'text-[#C6A15B]' : ''} />
              <span className="hidden md:inline">{txt('Par Date', 'By Date', 'Por Data')}</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Status Filter Pills & Date Filter Pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-[#E9E6DF]">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 font-mono text-xs">
            {(['all', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-xl transition-all font-semibold whitespace-nowrap ${
                  filter === st
                    ? 'bg-gradient-to-r from-[#C6A15B] to-[#9B793A] text-white shadow-xs'
                    : 'bg-[#FAFAF8] text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE]'
                }`}
              >
                {st === 'all'
                  ? txt('Tous les statuts', 'All statuses', 'Todos os estados')
                  : STATUS_CONFIG[st][lang] || STATUS_CONFIG[st].pt || STATUS_CONFIG[st].fr}
              </button>
            ))}
          </div>

          {/* Quick Date Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
            <span className="text-[#77736B] text-[11px] font-semibold me-1">📅 {txt('Période:', 'Period:', 'Período:')}</span>
            {[
              { id: 'all', label: txt('Toutes dates', 'All dates', 'Todas as datas') },
              { id: 'today', label: txt("Aujourd'hui", 'Today', 'Hoje') },
              { id: 'tomorrow', label: txt('Demain', 'Tomorrow', 'Amanhã') },
              { id: 'upcoming', label: txt('À venir', 'Upcoming', 'Próximas') },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as typeof dateFilter)}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                  dateFilter === d.id
                    ? 'bg-[#202020] text-white'
                    : 'bg-[#FAFAF8] text-[#77736B] hover:text-[#202020] border border-[#E9E6DF]'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {appointmentsError && (
        <div className="p-4 bg-[#A9655F]/10 border border-[#A9655F]/30 rounded-2xl text-[#A9655F] text-sm font-mono font-semibold">
          ⚠️ {appointmentsError}
        </div>
      )}

      {/* Main Content Render based on viewMode */}
      {loadingAppointments ? (
        <div className="py-20 text-center text-[#77736B] font-mono text-sm flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
          <span>{txt('Chargement des rendez-vous...', 'Loading appointments...', 'A carregar consultas...')}</span>
        </div>
      ) : displayedAppointments.length === 0 ? (
        <div className="py-20 text-center text-[#77736B] bg-white rounded-3xl border border-[#E9E6DF] shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
          <IconListCheck size={44} className="mx-auto text-[#C6A15B] opacity-40" />
          <p className="font-serif text-base font-bold text-[#202020]">{txt('Aucun rendez-vous trouvé', 'No appointments found', 'Nenhuma consulta encontrada')}</p>
          <p className="font-mono text-xs text-[#77736B]">{txt('Essayez de réinitialiser vos filtres ou d\'effectuer une autre recherche', 'Try resetting your filters or performing another search', 'Tente reiniciar os seus filtros ou efetuar outra pesquisa')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'cards' ? (
            /* 1. CARDS VIEW */
            <div className="grid grid-cols-1 gap-3">
              {paginatedAppointments.map(renderAppointmentCard)}
            </div>
          ) : viewMode === 'table' ? (
            /* 2. HIGH DENSITY TABLE VIEW */
            <div className="bg-white rounded-3xl border border-[#E9E6DF] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#FAFAF8] border-b border-[#E9E6DF] font-mono uppercase text-[10px] text-[#77736B] font-semibold">
                    <tr>
                      <th className="p-4">{txt('Patient', 'Patient', 'Doente')}</th>
                      <th className="p-4">{txt('Soin & Tarif', 'Care & Price', 'Cuidado & Preço')}</th>
                      <th className="p-4">{txt('Date & Heure', 'Date & Time', 'Data & Hora')}</th>
                      <th className="p-4">{txt('Statut', 'Status', 'Estado')}</th>
                      <th className="p-4 text-right">{txt('Actions', 'Actions', 'Ações')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E6DF]">
                    {paginatedAppointments.map(item => {
                      const st = STATUS_CONFIG[item.status];
                      const price = getServicePrice(item.service);
                      const initials = getInitials(item.patientName);

                      return (
                        <tr key={item.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FAF6EE] to-[#F4ECE0] border border-[#E8D7B0] flex items-center justify-center text-[#9B793A] font-serif font-bold text-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-[#202020] text-sm">{item.patientName}</div>
                                <div className="font-mono text-[11px] text-[#77736B]">{item.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-[#9B793A] font-mono">{getServiceName(item.service, lang)}</div>
                            <div className="font-mono text-[11px] text-[#77736B]">{price} TND</div>
                          </td>
                          <td className="p-4 font-mono font-medium text-[#C6A15B]">
                            {item.date} • {item.startTime}
                          </td>
                          <td className="p-4">
                            <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.bg} ${st.color} ${st.border}`}>
                              {st[lang] || st.pt || st.fr}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title="WhatsApp"
                              >
                                <IconBrandWhatsapp size={15} />
                              </a>
                              <button
                                onClick={() => openPatientNote(item)}
                                className="p-1.5 rounded-lg bg-[#FAF6EE] text-[#9B793A] hover:bg-[#F4ECE0] transition-colors"
                                title={txt('Dossier Patient', 'Patient File', 'Ficha do Doente')}
                              >
                                <IconNotes size={15} />
                              </button>
                              {item.status !== 'CONFIRMED' && item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'CONFIRMED')}
                                  className="px-2.5 py-1 rounded-lg bg-[#6F8F72]/15 text-[#6F8F72] font-mono text-[11px] font-semibold hover:bg-[#6F8F72]/25"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => updateStatus(item.id, 'COMPLETED')}
                                  className="px-2.5 py-1 rounded-lg bg-[#5B82A6]/15 text-[#5B82A6] font-mono text-[11px] font-semibold hover:bg-[#5B82A6]/25"
                                >
                                  ✓
                                </button>
                              )}
                              {item.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => setConfirmDialog({
                                    title: txt('Annuler ce rendez-vous ?', 'Cancel this appointment?', 'Cancelar esta consulta?'),
                                    onConfirm: () => softDeleteAppointment(item.id)
                                  })}
                                  className="p-1.5 rounded-lg bg-[#A9655F]/10 text-[#A9655F] hover:bg-[#A9655F]/20"
                                  title={txt('Annuler', 'Cancel', 'Cancelar')}
                                >
                                  <IconTrash size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 3. GROUPED TIMELINE VIEW */
            <div className="space-y-6">
              {groupedByDate.map(([date, appts]) => {
                const isToday = date === todayStr;
                const isTomorrow = date === tomorrowStr;

                return (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E9E6DF]">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className={`px-2.5 py-1 rounded-xl font-bold ${
                          isToday
                            ? 'bg-[#C6A15B] text-white shadow-xs'
                            : isTomorrow
                            ? 'bg-[#202020] text-white'
                            : 'bg-[#FAF6EE] text-[#9B793A] border border-[#E8D7B0]'
                        }`}>
                          {isToday ? txt("Aujourd'hui", 'Today', 'Hoje') : isTomorrow ? txt('Demain', 'Tomorrow', 'Amanhã') : date}
                        </span>
                        <span className="text-[#77736B] font-semibold">{date}</span>
                      </div>
                      <span className="font-mono text-xs text-[#77736B]">
                        {appts.length} {txt('rendez-vous', 'appointments', 'consultas')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {appts.map(renderAppointmentCard)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-[#E9E6DF] shadow-[0_2px_8px_rgba(0,0,0,0.02)] font-mono text-xs">
            <div className="flex items-center gap-3 text-[#77736B]">
              <span>
                {txt(
                  `Affichage ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} sur ${totalItems} rendez-vous`,
                  `Showing ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} of ${totalItems} appointments`,
                  `A mostrar ${totalItems > 0 ? startIndex + 1 : 0} – ${endIndex} de ${totalItems} consultas`
                )}
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="hidden md:inline">{txt('Par page:', 'Per page:', 'Por página:')}</span>
                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  className="bg-[#FAFAF8] border border-[#E9E6DF] text-[#202020] px-2 py-1 rounded-lg focus:outline-none focus:border-[#C6A15B] font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={txt('Page précédente', 'Previous page', 'Página anterior')}
                >
                  <IconChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    // Render page number buttons cleanly (or ellipsis if too many)
                    if (
                      totalPages > 7 &&
                      p !== 1 &&
                      p !== totalPages &&
                      Math.abs(p - currentPage) > 1
                    ) {
                      if (p === 2 || p === totalPages - 1) {
                        return <span key={p} className="px-1 text-[#77736B]">.</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-8 h-8 rounded-xl font-bold transition-all text-xs ${
                          currentPage === p
                            ? 'bg-[#C6A15B] text-white shadow-xs'
                            : 'bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-[#77736B] hover:text-[#202020] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title={txt('Page suivante', 'Next page', 'Página seguinte')}
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}