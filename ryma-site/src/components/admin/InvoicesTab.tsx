'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconReceiptTax,
  IconPlus,
  IconSearch,
  IconDownload,
  IconPrinter,
  IconBrandWhatsapp,
  IconCheck,
  IconClock,
  IconCreditCard,
  IconTrendingUp,
  IconShieldCheck,
  IconBuildingHospital,
  IconFilter,
  IconUser,
  IconCalendar,
  IconRefresh,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLock,
  IconLockOpen,
  IconShieldLock,
  IconLoader2,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import {
  Invoice,
  InvoiceStats,
  InvoicePaymentStatus,
  PaymentMethod,
  PatientRecord,
  Appointment,
  CreateInvoiceInput,
} from '@/types/admin';
import dynamic from 'next/dynamic';

const CreateInvoiceModal = dynamic(
  () => import('./CreateInvoiceModal').then(m => m.CreateInvoiceModal)
);
const InvoiceDetailModal = dynamic(
  () => import('./InvoiceDetailModal').then(m => m.InvoiceDetailModal)
);

interface InvoicesTabProps {
  invoices: Invoice[];
  stats: InvoiceStats | null;
  loading: boolean;
  onRefresh: () => void;
  onCreated: (invoice: Invoice) => void;
  onUpdateStatus: (id: string, newStatus: InvoicePaymentStatus, newMethod?: PaymentMethod) => void;
  onDelete: (id: string) => void;
  patients: PatientRecord[];
  appointments: Appointment[];
  isAnalyticsUnlocked?: boolean;
  onUnlockClick?: () => void;
  lang: Lang;
}

export const InvoicesTab = React.memo(function InvoicesTab({
  invoices,
  stats,
  loading,
  onRefresh,
  onCreated,
  onUpdateStatus,
  onDelete,
  patients,
  appointments,
  isAnalyticsUnlocked = false,
  onUnlockClick,
  lang,
}: InvoicesTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoicePaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [prefilledData, setPrefilledData] = useState<Partial<CreateInvoiceInput> | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const handleInlineStatusToggle = async (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (updatingStatusId === inv.id) return;

    setUpdatingStatusId(inv.id);
    const newStatus: InvoicePaymentStatus = inv.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';

    try {
      await onUpdateStatus(inv.id, newStatus, inv.paymentMethod);
    } finally {
      setTimeout(() => {
        setUpdatingStatusId(null);
      }, 350);
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === 'all' || inv.paymentMethod === methodFilter;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.patientName.toLowerCase().includes(q) ||
        inv.patientPhone.includes(q) ||
        inv.patientNif.includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.serviceName.toLowerCase().includes(q);

      return matchesStatus && matchesMethod && matchesSearch;
    });
  }, [invoices, statusFilter, methodFilter, search]);

  // Reset to page 1 on filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter, pageSize]);

  // Pagination bounds & slice
  const totalItems = filteredInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedInvoices = useMemo(() => {
    return filteredInvoices.slice(startIndex, endIndex);
  }, [filteredInvoices, startIndex, endIndex]);

  // Smart page numbers generator (with ellipsis)
  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    const delta = 1;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [totalPages, safeCurrentPage]);

  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const handleOpenDetail = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDetailOpen(true);
  };

  const handleCreateNew = (prefill?: Partial<CreateInvoiceInput>) => {
    setPrefilledData(prefill || null);
    setIsCreateOpen(true);
  };

  const handleExportCsv = () => {
    window.location.href = '/api/admin/export?type=invoices';
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      {/* ── Top Financial KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Revenue */}
        <div
          onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
          role={!isAnalyticsUnlocked ? 'button' : undefined}
          tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
          title={!isAnalyticsUnlocked ? txt('Cliquez pour déverrouiller', 'Click to unlock', 'Clique para desbloquear') : undefined}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all select-none ${
            isAnalyticsUnlocked
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-gradient-to-br from-[#FAF5FF] via-white to-[#F5F3FF] border-[#DDD6FE] hover:border-[#7C3AED] hover:shadow-md cursor-pointer group'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {isAnalyticsUnlocked
                ? txt('Facturation Totale', 'Total Revenue', 'Faturação Total')
                : txt('Revenu (Propriétaire)', 'Revenue (Owner)', 'Faturação (Proprietário)')}
            </span>
            <div className={`p-1.5 rounded-lg ${isAnalyticsUnlocked ? 'bg-[#0F172A] text-[#C49A3C]' : 'bg-[#EDE9FE] text-[#7C3AED]'}`}>
              {isAnalyticsUnlocked ? <IconTrendingUp size={15} /> : <IconShieldLock size={15} />}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-1">
              <p className={`text-xl sm:text-2xl font-bold font-mono ${isAnalyticsUnlocked ? 'text-[#0F172A]' : 'text-[#7C3AED] tracking-widest'}`}>
                {isAnalyticsUnlocked
                  ? `${(stats?.totalRevenue ?? 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-PT', { minimumFractionDigits: 2 })} €`
                  : '•••• €'}
              </p>
              {!isAnalyticsUnlocked && (
                <span className="text-[10px] font-bold text-[#7C3AED] group-hover:underline flex items-center gap-0.5">
                  <IconLock size={10} />
                  <span>{txt('Déverrouiller', 'Unlock', 'Desbloquear')}</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
              {stats?.countTotal ?? 0} {txt('documents émis', 'issued invoices', 'documentos emitidos')}
            </p>
          </div>
        </div>

        {/* Total Paid */}
        <div
          onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
          role={!isAnalyticsUnlocked ? 'button' : undefined}
          tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all select-none ${
            isAnalyticsUnlocked
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {txt('Total Encaissé', 'Total Collected', 'Total Liquidado')}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <IconCheck size={15} />
            </div>
          </div>
          <div>
            <p className={`text-xl sm:text-2xl font-bold font-mono ${isAnalyticsUnlocked ? 'text-emerald-700' : 'text-[#94A3B8] tracking-widest'}`}>
              {isAnalyticsUnlocked
                ? `${(stats?.totalPaid ?? 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-PT', { minimumFractionDigits: 2 })} €`
                : '•••• €'}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              {stats?.countPaid ?? 0} {txt('reçus réglés', 'paid receipts', 'recibos quitados')}
            </p>
          </div>
        </div>

        {/* Pending Amount */}
        <div
          onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
          role={!isAnalyticsUnlocked ? 'button' : undefined}
          tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all select-none ${
            isAnalyticsUnlocked
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              {txt('En Attente', 'Pending Amount', 'Em Aberto')}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <IconClock size={15} />
            </div>
          </div>
          <div>
            <p className={`text-xl sm:text-2xl font-bold font-mono ${isAnalyticsUnlocked ? 'text-amber-700' : 'text-[#94A3B8] tracking-widest'}`}>
              {isAnalyticsUnlocked
                ? `${(stats?.totalPending ?? 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-PT', { minimumFractionDigits: 2 })} €`
                : '•••• €'}
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
              {stats?.countPending ?? 0} {txt('factures en attente', 'pending invoices', 'faturas pendentes')}
            </p>
          </div>
        </div>

        {/* Average Ticket */}
        <div
          onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
          role={!isAnalyticsUnlocked ? 'button' : undefined}
          tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
          className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all select-none ${
            isAnalyticsUnlocked
              ? 'bg-white border-[#E2E8F0]'
              : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1] cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {txt('Panier Moyen', 'Average Ticket', 'Ticket Médio')}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <IconReceiptTax size={15} />
            </div>
          </div>
          <div>
            <p className={`text-xl sm:text-2xl font-bold font-mono ${isAnalyticsUnlocked ? 'text-[#0F172A]' : 'text-[#94A3B8] tracking-widest'}`}>
              {isAnalyticsUnlocked
                ? `${(stats?.avgTicket ?? 0).toFixed(2)} €`
                : '•••• €'}
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
              {txt('par acte clinique', 'per session', 'por ato clínico')}
            </p>
          </div>
        </div>

        {/* Insurance Ratio */}
        <div
          onClick={!isAnalyticsUnlocked ? onUnlockClick : undefined}
          role={!isAnalyticsUnlocked ? 'button' : undefined}
          tabIndex={!isAnalyticsUnlocked ? 0 : undefined}
          className={`col-span-2 lg:col-span-1 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all select-none ${
            isAnalyticsUnlocked
              ? 'bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white'
              : 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white/90 hover:brightness-110 cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-between text-white/70 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8C97A]">
              {txt('Mutuelles & ADSE', 'Insurance & ADSE', 'Seguros & ADSE')}
            </span>
            <div className="p-1.5 rounded-lg bg-white/10 text-[#E8C97A]">
              <IconBuildingHospital size={15} />
            </div>
          </div>
          <div>
            <p className={`text-xl sm:text-2xl font-bold font-mono text-white ${!isAnalyticsUnlocked ? 'tracking-widest' : ''}`}>
              {isAnalyticsUnlocked ? `${stats?.insuranceShare ?? 0} %` : '•• %'}
            </p>
            <p className="text-[10px] text-white/70 mt-0.5 font-medium">
              {txt('des soins facturés', 'of billed care', 'dos tratamentos faturados')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Action Bar ──────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={txt(
              'Rechercher par patient, NIF, Nº reçu (ex: FR 2026/0001) ou téléphone...',
              'Search by Patient, NIF, Invoice # (e.g. FR 2026/0001) or Phone...',
              'Pesquisar por Utente, NIF, Nº Recibo (ex: FR 2026/0001) ou Telefone...'
            )}
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none transition-all placeholder:text-[#94A3B8]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Middle: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none"
          >
            <option value="all">{txt('Tous les Statuts', 'All Statuses', 'Todos os Estados')}</option>
            <option value="PAID">{txt('✓ Payés / Réglés', '✓ Paid / Settled', '✓ Pagos / Quitados')}</option>
            <option value="PENDING">{txt('⏱ En Attente', '⏱ Pending', '⏱ Pendentes')}</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none"
          >
            <option value="all">{txt('Tous les Modes', 'All Payment Methods', 'Todos os Meios')}</option>
            <option value="MULTIBANCO">Multibanco (TPA)</option>
            <option value="MBWAY">MB Way</option>
            <option value="CASH">{txt('Espèces', 'Cash', 'Numerário')}</option>
            <option value="CARD">{txt('Carte Bancaire', 'Card', 'Cartão')}</option>
            <option value="TRANSFER">{txt('Virement', 'Bank Transfer', 'Transferência')}</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:bg-[#E2E8F0] transition-colors"
            title={txt('Actualiser la liste', 'Refresh list', 'Atualizar lista')}
          >
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <IconDownload size={15} />
            <span className="hidden sm:inline">{txt('Exporter CSV', 'Export CSV', 'Exportar CSV')}</span>
          </button>

          {/* New Invoice Button */}
          <button
            type="button"
            onClick={() => handleCreateNew()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-105 transition-all"
          >
            <IconPlus size={16} />
            <span>{txt('Émettre un Reçu', 'Issue Receipt', 'Emitir Recibo')}</span>
          </button>
        </div>
      </div>

      {/* ── Invoices List Table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading && invoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#C49A3C] border-t-transparent rounded-full animate-spin" />
            <span>{txt('Chargement des documents de facturation...', 'Loading billing documents...', 'A carregar documentos de faturação...')}</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-[#CBD5E1]">
              <IconReceiptTax size={26} />
            </div>
            <div>
              <p className="font-bold text-[#475569]">
                {txt('Aucune facture ou reçu trouvé', 'No invoices or receipts found', 'Nenhuma fatura ou recibo encontrado')}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                {search || statusFilter !== 'all' || methodFilter !== 'all'
                  ? txt('Essayez de modifier les filtres de recherche.', 'Try modifying your search filters.', 'Experimente alterar os filtros de pesquisa.')
                  : txt('Cliquez sur "+ Émettre un Reçu" pour générer votre premier reçu.', 'Click "+ Issue Receipt" to generate your first invoice.', 'Clique no botão "+ Emitir Recibo" para gerar o primeiro recibo clínico.')}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => handleCreateNew()}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0F172A] text-white font-bold text-xs"
              >
                {txt('+ Émettre le Premier Reçu', '+ Issue First Receipt', '+ Emitir Primeiro Recibo')}
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Table Header Summary & Page Size */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[11px]">
                  {totalItems > 0 ? (
                    <>
                      {txt('Affichage', 'Showing', 'A mostrar')}{' '}
                      <strong className="text-[#0F172A] font-mono">{startIndex + 1}–{endIndex}</strong>{' '}
                      {txt('sur', 'of', 'de')}{' '}
                      <strong className="text-[#0F172A] font-mono">{totalItems}</strong>{' '}
                      {txt('factures et reçus', 'invoices & receipts', 'faturas e recibos')}
                    </>
                  ) : (
                    txt('0 document trouvé', '0 invoices found', '0 documentos encontrados')
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#64748B]">
                  {txt('Lignes par page :', 'Rows per page:', 'Linhas por página:')}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-[11px] font-bold text-[#0F172A] outline-none cursor-pointer"
                  title={txt('Lignes par page', 'Rows per page', 'Itens por página')}
                >
                  <option value={10}>10 / {txt('p.', 'p.', 'pág')}</option>
                  <option value={25}>25 / {txt('p.', 'p.', 'pág')}</option>
                  <option value={50}>50 / {txt('p.', 'p.', 'pág')}</option>
                  <option value={100}>100 / {txt('p.', 'p.', 'pág')}</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">{txt('Document', 'Document', 'Documento')}</th>
                    <th className="py-3 px-4">{txt('Patient & NIF', 'Patient & NIF', 'Utente & NIF')}</th>
                    <th className="py-3 px-4">{txt('Soin / Traitement', 'Treatment / Service', 'Tratamento / Serviço')}</th>
                    <th className="py-3 px-4 text-center">{txt('Mutuelle / ADSE', 'Insurance / ADSE', 'Seguro / ADSE')}</th>
                    <th className="py-3 px-4 text-center">{txt('Paiement', 'Payment', 'Pagamento')}</th>
                    <th className="py-3 px-4 text-right">{txt('Montant Total', 'Total Amount', 'Valor Total')}</th>
                    <th className="py-3 px-4 text-center">{txt('Statut', 'Status', 'Estado')}</th>
                    <th className="py-3 px-4 text-right">{txt('Actions', 'Actions', 'Ações')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {paginatedInvoices.map((inv) => {
                    const isPaid = inv.paymentStatus === 'PAID';
                    const dateStr = inv.createdAt.split('T')[0];

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => handleOpenDetail(inv)}
                        className="hover:bg-[#F8FAFC]/80 cursor-pointer transition-colors group"
                      >
                        {/* Document Number & Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-mono font-bold text-[#0F172A] group-hover:text-[#C49A3C] transition-colors">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                            <IconCalendar size={11} /> {dateStr}
                          </p>
                        </td>

                        {/* Patient Name & NIF */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#0F172A] line-clamp-1">{inv.patientName}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#64748B] font-mono">
                            <span>NIF: <strong>{inv.patientNif}</strong></span>
                            <span>•</span>
                            <span>{inv.patientPhone}</span>
                          </div>
                        </td>

                        {/* Service Name */}
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#1E293B] line-clamp-1">{inv.serviceName}</p>
                          <p className="text-[10px] text-[#C49A3C] font-semibold">
                            {inv.vatRate === 0
                              ? txt('Exonéré Art. 9 CIVA', 'Exempt Art. 9 CIVA', 'Isento Art. 9º CIVA')
                              : `IVA ${inv.vatRate}%`}
                          </p>
                        </td>

                        {/* Insurance / Subsistema */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {inv.coverageProvider ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <IconBuildingHospital size={12} />
                              {inv.coverageProvider}
                            </span>
                          ) : inv.coverageType === 'ADSE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              ADSE
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#94A3B8]">{txt('Privé', 'Private', 'Particular')}</span>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-[#F1F5F9] text-[#475569]">
                            {inv.paymentMethod}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-sm text-[#0F172A]">
                            {inv.amount.toFixed(2)} €
                          </span>
                        </td>

                        {/* Status with Advanced Enterprise Inline Quick-Action Toggle & Live Feedback */}
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <motion.button
                            type="button"
                            disabled={updatingStatusId === inv.id}
                            onClick={(e) => handleInlineStatusToggle(inv, e)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            className={`group/status inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-2xs select-none ${
                              updatingStatusId === inv.id
                                ? 'bg-slate-100 text-slate-500 border border-slate-300 opacity-80 cursor-wait'
                                : isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-xs cursor-pointer'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-xs cursor-pointer'
                            }`}
                            title={
                              isPaid
                                ? (inv.paidAt
                                    ? `${txt('Payé le', 'Paid on', 'Pago em')} ${new Date(inv.paidAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'pt-PT')} • ${txt('Cliquer pour marquer EN ATTENTE', 'Click to mark as PENDING', 'Clique para marcar como PENDENTE')}`
                                    : txt('Cliquer pour marquer EN ATTENTE', 'Click to mark as PENDING', 'Clique para marcar como PENDENTE'))
                                : txt('Cliquer pour marquer PAYÉ', 'Click to mark as PAID', 'Clique para marcar como PAGO')
                            }
                          >
                            {updatingStatusId === inv.id ? (
                              <IconLoader2 size={12} className="animate-spin text-slate-600 shrink-0" />
                            ) : isPaid ? (
                              <IconCheck size={12} className="text-emerald-600 group-hover/status:scale-110 transition-transform shrink-0" />
                            ) : (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                            )}
                            <span>
                              {updatingStatusId === inv.id
                                ? txt('Mise à jour...', 'Updating...', 'A atualizar...')
                                : isPaid
                                ? txt('Payé', 'Paid', 'Pago')
                                : txt('En Attente', 'Pending', 'Pendente')}
                            </span>
                          </motion.button>
                        </td>

                        {/* Action Shortcuts */}
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsDetailOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                              title={txt('Voir / Imprimer le reçu', 'View / Print Invoice', 'Ver / Imprimir Fatura-Recibo')}
                            >
                              <IconPrinter size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const cleanPhone = inv.patientPhone.replace(/[^0-9]/g, '');
                                const msg = encodeURIComponent(
                                  `Olá ${inv.patientName}! 👋\n` +
                                  `Recibo da *Digital Clínica*:\n` +
                                  `🧾 *Nº:* ${inv.invoiceNumber}\n` +
                                  `🩺 *Tratamento:* ${inv.serviceName}\n` +
                                  `💰 *Valor:* ${inv.amount.toFixed(2)} €\n` +
                                  `📌 *NIF:* ${inv.patientNif}\n` +
                                  `✅ *Estado:* ${isPaid ? 'PAGO / Quitado' : 'Pendente'}`
                                );
                                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title={txt('Envoyer par WhatsApp', 'Send via WhatsApp', 'Enviar por WhatsApp')}
                            >
                              <IconBrandWhatsapp size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Advanced Pagination Footer Bar */}
            {totalPages > 1 && (
              <div className="p-3 bg-white border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[#64748B]">
                  {txt('Page', 'Page', 'Página')}{' '}
                  <strong className="text-[#0F172A] font-mono">{safeCurrentPage}</strong>{' '}
                  {txt('sur', 'of', 'de')}{' '}
                  <strong className="text-[#0F172A] font-mono">{totalPages}</strong>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={txt('Première page', 'First page', 'Primeira página')}
                  >
                    <IconChevronsLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={txt('Page précédente', 'Previous page', 'Página anterior')}
                  >
                    <IconChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 mx-1">
                    {paginationRange.map((num, idx) => {
                      if (num === '...') {
                        return (
                          <span key={`dots-${idx}`} className="px-1 text-xs text-[#94A3B8] font-bold">
                            …
                          </span>
                        );
                      }
                      const isCurrent = num === safeCurrentPage;
                      return (
                        <button
                          key={`page-${num}`}
                          type="button"
                          onClick={() => setCurrentPage(Number(num))}
                          className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${
                            isCurrent
                              ? 'bg-[#0F172A] text-white shadow-2xs ring-1 ring-[#0F172A]'
                              : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={txt('Page suivante', 'Next page', 'Página seguinte')}
                  >
                    <IconChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title={txt('Dernière page', 'Last page', 'Última página')}
                  >
                    <IconChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Create Invoice Modal ──────────────────────────────────────── */}
      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={onCreated}
        lang={lang}
        patients={patients}
        appointments={appointments}
        prefilledData={prefilledData}
      />

      {/* ── Invoice Detail & PDF Receipt Modal ────────────────────────── */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedInvoice(null);
        }}
        onUpdateStatus={onUpdateStatus}
        onDelete={onDelete}
        lang={lang}
      />
    </div>
  );
});
