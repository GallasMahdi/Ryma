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
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';

interface InvoicesTabProps {
  invoices: Invoice[];
  stats: InvoiceStats | null;
  loading: boolean;
  onRefresh: () => void;
  onCreated: (invoice: Invoice) => void;
  onUpdateStatus: (id: string, newStatus: InvoicePaymentStatus) => void;
  onDelete: (id: string) => void;
  patients: PatientRecord[];
  appointments: Appointment[];
  lang: Lang;
}

export function InvoicesTab({
  invoices,
  stats,
  loading,
  onRefresh,
  onCreated,
  onUpdateStatus,
  onDelete,
  patients,
  appointments,
  lang,
}: InvoicesTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoicePaymentStatus>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | PaymentMethod>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [prefilledData, setPrefilledData] = useState<Partial<CreateInvoiceInput> | null>(null);

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

  const handleOpenDetail = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsDetailOpen(true);
  };

  const handleCreateNew = (prefill?: Partial<CreateInvoiceInput>) => {
    setPrefilledData(prefill || null);
    setIsCreateOpen(true);
  };

  const handleExportCsv = () => {
    window.location.href = '/api/admin/invoices/export';
  };

  return (
    <div className="space-y-6 font-sans select-none pb-12">
      {/* ── Top Financial KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Faturação Total</span>
            <div className="p-1.5 rounded-lg bg-[#0F172A] text-[#C49A3C]">
              <IconTrendingUp size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#0F172A]">
              {(stats?.totalRevenue ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
              {stats?.countTotal ?? 0} documentos emitidos
            </p>
          </div>
        </div>

        {/* Total Paid */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Liquidado</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <IconCheck size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">
              {(stats?.totalPaid ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              {stats?.countPaid ?? 0} recibos quitados
            </p>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Em Aberto</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <IconClock size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-amber-700">
              {(stats?.totalPending ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
              {stats?.countPending ?? 0} faturas pendentes
            </p>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ticket Médio</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <IconReceiptTax size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#0F172A]">
              {(stats?.avgTicket ?? 0).toFixed(2)} €
            </p>
            <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
              por ato clínico
            </p>
          </div>
        </div>

        {/* Insurance Ratio */}
        <div className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/70 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E8C97A]">Seguros & ADSE</span>
            <div className="p-1.5 rounded-lg bg-white/10 text-[#E8C97A]">
              <IconBuildingHospital size={15} />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-mono text-white">
              {stats?.insuranceShare ?? 0} %
            </p>
            <p className="text-[10px] text-white/70 mt-0.5 font-medium">
              dos tratamentos faturados
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
            placeholder="Pesquisar por Utente, NIF, Nº Recibo (ex: FR 2026/0001) ou Telefone..."
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
            <option value="all">Todos os Estados</option>
            <option value="PAID">✓ Pagos / Quitados</option>
            <option value="PENDING">⏱ Pendentes</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] outline-none"
          >
            <option value="all">Todos os Meios</option>
            <option value="MULTIBANCO">Multibanco (TPA)</option>
            <option value="MBWAY">MB Way</option>
            <option value="CASH">Numerário</option>
            <option value="CARD">Cartão</option>
            <option value="TRANSFER">Transferência</option>
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:bg-[#E2E8F0] transition-colors"
            title="Atualizar lista"
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
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* New Invoice Button */}
          <button
            type="button"
            onClick={() => handleCreateNew()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-105 transition-all"
          >
            <IconPlus size={16} />
            <span>Emitir Recibo</span>
          </button>
        </div>
      </div>

      {/* ── Invoices List Table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading && invoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#C49A3C] border-t-transparent rounded-full animate-spin" />
            <span>A carregar documentos de faturação...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-[#CBD5E1]">
              <IconReceiptTax size={26} />
            </div>
            <div>
              <p className="font-bold text-[#475569]">Nenhuma fatura ou recibo encontrado</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                {search || statusFilter !== 'all' || methodFilter !== 'all'
                  ? 'Experimente alterar os filtros de pesquisa.'
                  : 'Clique no botão "+ Emitir Recibo" para gerar o primeiro recibo clínico.'}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => handleCreateNew()}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0F172A] text-white font-bold text-xs"
              >
                + Emitir Primeiro Recibo
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
                      {lang === 'fr' ? 'Affichage' : lang === 'en' ? 'Showing' : 'A mostrar'}{' '}
                      <strong className="text-[#0F172A] font-mono">{startIndex + 1}–{endIndex}</strong>{' '}
                      {lang === 'fr' ? 'sur' : lang === 'en' ? 'of' : 'de'}{' '}
                      <strong className="text-[#0F172A] font-mono">{totalItems}</strong>{' '}
                      {lang === 'fr' ? 'documents' : lang === 'en' ? 'invoices' : 'faturas e recibos'}
                    </>
                  ) : (
                    '0 documentos encontrados'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#64748B]">Linhas por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 text-[11px] font-bold text-[#0F172A] outline-none cursor-pointer"
                  title="Itens por página"
                >
                  <option value={10}>10 / pág</option>
                  <option value={25}>25 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Utente & NIF</th>
                    <th className="py-3 px-4">Tratamento / Serviço</th>
                    <th className="py-3 px-4 text-center">Seguro / ADSE</th>
                    <th className="py-3 px-4 text-center">Pagamento</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Ações</th>
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
                            {inv.vatRate === 0 ? 'Isento Art. 9º CIVA' : `IVA ${inv.vatRate}%`}
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
                            <span className="text-[11px] text-[#94A3B8]">Particular</span>
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

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isPaid ? <IconCheck size={11} /> : <IconClock size={11} />}
                            <span>{isPaid ? 'Pago' : 'Pendente'}</span>
                          </span>
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
                              title="Ver / Imprimir Fatura-Recibo"
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
                              title="Enviar por WhatsApp"
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
                  Página <strong className="text-[#0F172A] font-mono">{safeCurrentPage}</strong> de{' '}
                  <strong className="text-[#0F172A] font-mono">{totalPages}</strong>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Primeira página"
                  >
                    <IconChevronsLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
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
                    title="Página seguinte"
                  >
                    <IconChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Última página"
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
}
