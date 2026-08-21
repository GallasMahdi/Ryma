'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconPrinter,
  IconBrandWhatsapp,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconBuildingHospital,
  IconReceipt,
  IconDownload,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { Invoice, InvoicePaymentStatus, PaymentMethod } from '@/types/admin';
import { SITE } from '@/lib/site';
import { printInvoicePdf } from '@/lib/invoicePdf';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: InvoicePaymentStatus) => void;
  onDelete?: (id: string) => void;
  lang: Lang;
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
  lang,
}: InvoiceDetailModalProps) {
  const [updating, setUpdating] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    printInvoicePdf(invoice);
  };

  const handleWhatsAppSend = () => {
    const isPaid = invoice.paymentStatus === 'PAID';
    const cleanPhone = invoice.patientPhone.replace(/[^0-9]/g, '');

    const message = encodeURIComponent(
      `Olá ${invoice.patientName}! 👋\n\n` +
      `Enviamos o comprovativo do seu recibo clínico da *Digital Clínica*:\n\n` +
      `🧾 *Documento:* ${invoice.invoiceNumber}\n` +
      `🩺 *Tratamento:* ${invoice.serviceName}\n` +
      `💰 *Valor:* ${invoice.amount.toFixed(2)} €\n` +
      `📌 *NIF:* ${invoice.patientNif}\n` +
      (invoice.coverageProvider ? `🏥 *Seguro / Subsistema:* ${invoice.coverageProvider} (${invoice.coverageNumber || 'N/A'})\n` : '') +
      `✅ *Estado:* ${isPaid ? 'PAGO / Quitado' : 'Pendente'}\n` +
      `⚖️ *Enquadramento Fiscal:* ${invoice.vatExemptionReason || 'Isento Art. 9º CIVA'}\n\n` +
      `Este documento é válido para dedução em IRS e reembolso junto do seu seguro de saúde/ADSE.\n\n` +
      `Obrigado pela sua confiança!\n` +
      `*Digital Clínica — Lisboa* 🇵🇹`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const isPaid = invoice.paymentStatus === 'PAID';
  const issueDate = invoice.createdAt.split('T')[0];
  const paidDate = invoice.paidAt ? invoice.paidAt.split('T')[0] : issueDate;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-4 max-h-[96vh] flex flex-col font-sans print:shadow-none print:border-none print:max-h-none print:m-0 print:rounded-none"
          >
            {/* Top Interactive Action Bar (Hidden on Print) */}
            <div className="px-3.5 sm:px-6 py-3 bg-[#0F172A] text-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 border-b border-white/10 print:hidden">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs font-bold text-[#E8C97A] tracking-wider uppercase">
                  {invoice.invoiceNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isPaid ? '● Pago' : '○ Pendente'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm touch-target"
                  title="Enviar por WhatsApp"
                >
                  <IconBrandWhatsapp size={15} />
                  <span className="inline sm:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#C49A3C] hover:bg-[#D4AA4C] text-[#1A1412] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm touch-target"
                  title="Imprimir ou Salvar em PDF"
                >
                  <IconPrinter size={15} />
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                </button>

                {onUpdateStatus && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => {
                      setUpdating(true);
                      onUpdateStatus(invoice.id, isPaid ? 'PENDING' : 'PAID');
                      setTimeout(() => setUpdating(false), 300);
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition-colors"
                  >
                    {isPaid ? 'Pendente' : 'Pago'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors ms-1 touch-target"
                  title="Fechar"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* ── PRINTABLE / VIEWABLE OFFICIAL INVOICE BODY ── */}
            <div
              id="printable-receipt"
              className="p-6 sm:p-10 overflow-y-auto bg-white text-[#1E293B] text-xs leading-relaxed flex-1 print:p-8"
            >
              {/* Header: Clinic Identification */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pb-6 border-b-2 border-[#1E293B]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1A1412] flex items-center justify-center text-[#C49A3C] font-serif font-bold text-lg">
                      R
                    </div>
                    <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">
                      {SITE.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] font-medium">
                    Clínica de Fisioterapia & Estética Médica Avançada
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    Avenida da Liberdade 120, 1250-146 Lisboa, Portugal
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-[#475569] font-mono">
                    <span><strong>NIF:</strong> {SITE.clinicNif || '518 923 456'}</span>
                    <span><strong>Registo ERS:</strong> {SITE.ersRegistration || 'E164321'}</span>
                    <span><strong>Ordem Fisioterapeutas:</strong> {SITE.professionalLicense || 'C-054321'}</span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="inline-block px-3 py-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg font-mono font-extrabold text-sm text-[#0F172A] mb-1">
                    {invoice.invoiceNumber}
                  </div>
                  <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                    {isPaid ? 'Fatura-Recibo de Quitação' : 'Fatura / Aviso de Cobrança'}
                  </h2>
                  <div className="space-y-0.5 mt-1.5 text-[11px] text-[#64748B]">
                    <p><strong>Data de Emissão:</strong> {issueDate}</p>
                    <p><strong>Data de Liquidação:</strong> {paidDate}</p>
                    <p><strong>Forma de Pagamento:</strong> {invoice.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {/* Patient & Fiscal Recipient Box */}
              <div className="my-6 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block mb-1">
                    Exmo.(a) Senhor(a) (Destinatário):
                  </span>
                  <p className="font-bold text-sm text-[#0F172A]">{invoice.patientName}</p>
                  <p className="text-xs text-[#475569] mt-0.5">{invoice.patientAddress || 'Lisboa, Portugal'}</p>
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">Tel: {invoice.patientPhone}</p>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block sm:ms-auto text-left">
                    <p className="text-xs font-mono font-bold text-[#0F172A]">
                      NIF Utente: <span className="bg-white border border-[#CBD5E1] px-2 py-0.5 rounded">{invoice.patientNif}</span>
                    </p>
                    {invoice.coverageProvider && (
                      <div className="mt-2 text-[11px] text-[#475569]">
                        <p><strong>Seguro / Subsistema:</strong> {invoice.coverageProvider}</p>
                        {invoice.coverageNumber && <p className="font-mono"><strong>Nº Beneficiário:</strong> {invoice.coverageNumber}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Services & Line Items Table */}
              <div className="my-6 overflow-hidden rounded-2xl border border-[#E2E8F0]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F172A] text-white text-[10px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4">Descrição do Ato Clínico / Tratamento</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-right">Preço Unit.</th>
                      <th className="py-2.5 px-3 text-center">IVA</th>
                      <th className="py-2.5 px-4 text-right">Total Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#0F172A]">{invoice.serviceName}</p>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Praticante: {invoice.practitioner || SITE.professionalName}
                        </p>
                        {invoice.vatExemptionReason && (
                          <p className="text-[10px] text-[#C49A3C] font-semibold mt-1">
                            * {invoice.vatExemptionReason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-medium">1</td>
                      <td className="py-3.5 px-3 text-right font-mono">{invoice.amount.toFixed(2)} €</td>
                      <td className="py-3.5 px-3 text-center font-mono font-medium">{invoice.vatRate}%</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {invoice.amount.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total Calculation & Tax Breakdown */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 my-6 pt-4 border-t border-[#E2E8F0]">
                <div className="max-w-md space-y-1 text-[11px] text-[#64748B]">
                  <p className="font-bold text-[#0F172A] uppercase tracking-wider text-[10px]">
                    Enquadramento Legal & Fiscal
                  </p>
                  <p className="leading-relaxed">
                    {invoice.vatRate === 0
                      ? 'Serviço de saúde e fisioterapia isento de IVA nos termos do Artigo 9.º do Código do IVA (CIVA).'
                      : 'Taxa normal de IVA a 23% incluída.'}
                  </p>
                  <p className="text-[10px] text-[#94A3B8]">
                    Documento processado por programa certificado. Válido para efeitos de dedução em IRS e reembolso junto de seguradoras de saúde e subsistemas (ADSE, Médis, Multicare, AdvanceCare).
                  </p>
                </div>

                <div className="w-full sm:w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Incidência:</span>
                    <span className="font-mono font-medium">{invoice.amount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Total IVA ({invoice.vatRate}%):</span>
                    <span className="font-mono font-medium">0.00 €</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#0F172A] text-sm sm:text-base font-bold text-[#0F172A]">
                    <span>TOTAL LIQUIDADO:</span>
                    <span className="font-mono text-[#0F172A]">{invoice.amount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Stamp and Signatures */}
              <div className="mt-10 pt-6 border-t border-dashed border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                {/* Official Paid Stamp */}
                <div>
                  {isPaid ? (
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold uppercase tracking-wider text-xs">
                      <IconCheck size={18} className="text-emerald-600" />
                      <div>
                        <p className="leading-none text-[11px]">QUITADO / PAGO</p>
                        <p className="text-[9px] font-mono text-emerald-700 mt-0.5">{paidDate} • {invoice.paymentMethod}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-amber-500 bg-amber-50 text-amber-800 font-bold uppercase tracking-wider text-xs">
                      <IconAlertCircle size={18} className="text-amber-600" />
                      <span>AGUARDA LIQUIDAÇÃO</span>
                    </div>
                  )}
                </div>

                {/* Signature Line */}
                <div className="text-center sm:text-right">
                  <div className="inline-block w-56 text-center border-t border-[#475569] pt-1">
                    <p className="font-serif italic text-xs text-[#0F172A]">{SITE.professionalName}</p>
                    <p className="text-[9px] text-[#64748B]">Fisioterapeuta Licenciado / Assinatura</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Options (Hidden on Print) */}
            {onDelete && (
              <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Tem a certeza que deseja anular esta fatura/recibo?')) {
                      onDelete(invoice.id);
                      onClose();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  <IconTrash size={14} />
                  <span>Anular Documento</span>
                </button>
                <span className="text-[11px] text-[#94A3B8]">
                  ID: {invoice.id}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
