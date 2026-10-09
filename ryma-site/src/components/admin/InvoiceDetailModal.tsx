'use client';
import { legacyText } from '@/data/translations/legacy-es';
import { spanishInvoiceMessage } from '@/lib/invoice-message';


import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconPrinter,
  IconBrandWhatsapp,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconTrash,
  IconBuildingHospital,
  IconReceipt,
  IconDownload,
  IconLoader2,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { Invoice, InvoicePaymentStatus, PaymentMethod } from '@/types/admin';
import { SITE } from '@/lib/site';
import { printInvoicePdf } from '@/lib/invoicePdf';
import { invoiceDisplayTotals } from '@/lib/invoice-display';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, newStatus: InvoicePaymentStatus, newMethod?: PaymentMethod) => void;
  onDelete?: (id: string) => void;
  lang: Lang;
  setConfirmDialog?: (dlg: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null) => void;
}

export const InvoiceDetailModal = React.memo(function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
  lang,
  setConfirmDialog,
}: InvoiceDetailModalProps) {
  const txt = (frStr: string, enStr: string, ptStr: string, es: string) => {
    if (lang === 'es') return es;
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const [updating, setUpdating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!invoice) return null;

  if (invoice.moneyReview) return isOpen ? <div role="dialog" aria-modal="true" aria-label={txt('Facture à vérifier','Invoice needs review','Fatura a verificar', "La factura necesita revisión")} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-xl p-6 max-w-lg space-y-3">
    <h2 className="font-bold">{invoice.invoiceNumber}</h2>
    <p>{txt('Ce montant historique nécessite un rapprochement. Impression et totaux suspendus.','This historical amount needs reconciliation. Printing and totals are suspended.','Este valor histórico requer reconciliação. Impressão e totais suspensos.', "Este importe histórico necesita conciliación. La impresión y los totales están suspendidos.")}</p>
    <p>{invoice.patientName} · {String(invoice.amount)} EUR</p>
    <button type="button" onClick={onClose} className="border rounded-lg px-3 py-2">{txt('Fermer','Close','Fechar', "Cerrar")}</button>
  </div></div> : null;

  const { lines, quantity, vatAmount, incidence, vatRates } = invoiceDisplayTotals(invoice);
  const closed = invoice.paymentStatus === 'CANCELLED' || invoice.paymentStatus === 'REFUNDED';

  const handlePrint = () => {
    printInvoicePdf(invoice, lang);
  };

  const handleWhatsAppSend = () => {
    const isPaid = invoice.paymentStatus === 'PAID';
    const cleanPhone = invoice.patientPhone.replace(/[^0-9]/g, '');

    const message = encodeURIComponent(
      lang === 'es' ? spanishInvoiceMessage(invoice) :
      `Olá ${invoice.patientName}! 👋\n\n` +
      `Documento de faturação interno da *Digital Clínica*:\n\n` +
      `🧾 *Documento:* ${invoice.invoiceNumber}\n` +
      `🩺 *Tratamento:* ${invoice.serviceName}\n` +
      `💰 *Valor:* ${invoice.amount.toFixed(2)} €\n` +
      `📌 *NIF:* ${invoice.patientNif}\n` +
      (invoice.coverageProvider ? `🏥 *Seguro / Subsistema:* ${invoice.coverageProvider} (${invoice.coverageNumber || 'N/A'})\n` : '') +
      `✅ *Estado:* ${isPaid ? 'PAGO / Quitado' : 'Pendente'}\n` +
      `*Sessões:* ${quantity}\n\n` +
      `Documento interno, sem valor fiscal. A fatura fiscal é emitida separadamente.\n\n` +
      `Obrigado pela sua confiança!\n` +
      `*Digital Clínica — Lisboa* 🇵🇹`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const isPaid = invoice.paymentStatus === 'PAID';
  const issueDate = invoice.createdAt.split('T')[0];
  const paidDate = invoice.paidAt ? invoice.paidAt.split('T')[0] : '—';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static font-sans"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-4 max-h-[96vh] flex flex-col font-sans print:shadow-none print:border-none print:max-h-none print:m-0 print:rounded-none overscroll-contain"
          >
            {/* Top Interactive Action Bar (Hidden on Print) */}
            <div className="px-3.5 sm:px-6 py-3 bg-[#0F172A] text-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0 border-b border-white/10 print:hidden">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs font-bold text-[#E8C97A] tracking-wider uppercase">
                  {invoice.invoiceNumber}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {closed ? txt('Document clôturé','Closed document','Documento encerrado', "Documento cerrado") : isPaid ? txt('● Payé / Quittancé', '● Paid / Settled', '● Pago / Quitado', "● Pagada / liquidada") : txt('○ En Attente', '○ Pending', '○ Pendente', "○ Pendiente")}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm touch-target"
                  title={txt('Envoyer par WhatsApp', 'Send via WhatsApp', 'Enviar por WhatsApp', "Enviar por WhatsApp")}
                >
                  <IconBrandWhatsapp size={15} />
                  <span className="inline sm:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#C49A3C] hover:bg-[#D4AA4C] text-[#1A1412] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm touch-target"
                  title={txt('Imprimer ou Enregistrer en PDF', 'Print or Save as PDF', 'Imprimir ou Salvar em PDF', "Imprimir o guardar como PDF")}
                >
                  <IconPrinter size={15} />
                  <span className="hidden sm:inline">{txt('Imprimer / PDF', 'Print / PDF', 'Imprimir / PDF', "Imprimir / PDF")}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors ms-1 touch-target"
                  title={txt('Fermer', 'Close', 'Fechar', "Cerrar")}
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* ── ADVANCED INTERACTIVE STATUS & PAYMENT CONTROL PANEL ── */}
            {onUpdateStatus && !closed && (
              <div className="px-4 sm:px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#475569] text-[11px] uppercase tracking-wider">
                      {txt('État :', 'Status:', 'Estado:', "Estado:")}
                    </span>
                    {/* Segmented Switch */}
                    <div className="inline-flex rounded-xl p-0.5 bg-[#E2E8F0] border border-[#CBD5E1] shadow-2xs">
                      <button
                        type="button"
                        disabled={updating}
                        onClick={async () => {
                          if (!isPaid) {
                            setUpdating(true);
                            try {
                              await onUpdateStatus(invoice.id, 'PAID', invoice.paymentMethod);
                            } finally {
                              setTimeout(() => setUpdating(false), 350);
                            }
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                          isPaid
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50'
                        }`}
                      >
                        {updating && !isPaid ? (
                          <IconLoader2 size={13} className="animate-spin" />
                        ) : (
                          <IconCheck size={13} />
                        )}
                        <span>{txt('Payé / Réglé', 'Paid / Settled', 'Pago / Quitado', "Pagada / liquidada")}</span>
                      </button>

                      <button
                        type="button"
                        disabled={updating}
                        onClick={async () => {
                          if (isPaid) {
                            setUpdating(true);
                            try {
                              await onUpdateStatus(invoice.id, 'PENDING');
                            } finally {
                              setTimeout(() => setUpdating(false), 350);
                            }
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                          !isPaid
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/50'
                        }`}
                      >
                        {updating && isPaid ? (
                          <IconLoader2 size={13} className="animate-spin" />
                        ) : (
                          <IconClock size={13} />
                        )}
                        <span>{txt('En Attente', 'Pending', 'Pendente', "Pendientes")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment settled timestamp pill */}
                  {isPaid && invoice.paidAt && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <IconCheck size={11} className="text-emerald-600" />
                      <span>
                        {txt('Liquidado em', 'Settled on', 'Liquidado em', "Liquidada el")}{' '}
                        {new Date(invoice.paidAt).toLocaleDateString(lang === 'es' ? "es-ES" : lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'pt-PT')}{' '}
                        {new Date(invoice.paidAt).toLocaleTimeString(lang === 'es' ? "es-ES" : lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'pt-PT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  )}
                </div>

                {/* Quick Payment Method Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#64748B] font-medium">
                    {txt('Mode de règlement :', 'Payment method:', 'Meio de pagamento:', "Método de pago:")}
                  </span>
                  <select
                    value={invoice.paymentMethod}
                    disabled={updating}
                    onChange={async (e) => {
                      setUpdating(true);
                      try {
                        await onUpdateStatus(invoice.id, invoice.paymentStatus, e.target.value as PaymentMethod);
                      } finally {
                        setTimeout(() => setUpdating(false), 350);
                      }
                    }}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-xs font-bold text-[#0F172A] outline-none cursor-pointer hover:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 transition-all shadow-2xs"
                  >
                    <option value="MULTIBANCO">Multibanco (TPA)</option>
                    <option value="MBWAY">MB Way</option>
                    <option value="CASH">{txt('Espèces', 'Cash', 'Numerário', "Efectivo")}</option>
                    <option value="CARD">{txt('Carte', 'Card', 'Cartão', "Tarjeta")}</option>
                    <option value="TRANSFER">{txt('Virement', 'Transfer', 'Transferência', "Transferencia")}</option>
                  </select>
                </div>
              </div>
            )}

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
                  <p className="text-[11px] text-[#475569] font-medium">{legacyText("Clínica de Fisioterapia & Estética Médica Avançada", lang)}</p>
                  <p className="text-[11px] text-[#64748B]">
                    {SITE.address.pt}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-[#475569] font-mono">
                    {SITE.clinicNif && <span><strong>NIF:</strong> {SITE.clinicNif}</span>}
                    {SITE.ersRegistration && <span><strong>{legacyText("Registo ERS:", lang)}</strong> {SITE.ersRegistration}</span>}
                    {SITE.professionalLicense && <span><strong>{legacyText("Ordem Fisioterapeutas:", lang)}</strong> {SITE.professionalLicense}</span>}
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <div className="inline-block px-3 py-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg font-mono font-extrabold text-sm text-[#0F172A] mb-1">
                    {invoice.invoiceNumber}
                  </div>
                  <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-[#0F172A]">
                    {txt('Document de facturation interne','Internal billing document','Documento de faturação interno', "Documento interno de facturación")}
                  </h2>
                  <div className="space-y-0.5 mt-1.5 text-[11px] text-[#64748B]">
                    <p><strong>{legacyText("Data de Emissão:", lang)}</strong> {issueDate}</p>
                    <p><strong>{legacyText("Data de Liquidação:", lang)}</strong> {paidDate}</p>
                    <p><strong>{legacyText("Forma de Pagamento:", lang)}</strong> {invoice.paymentMethod}</p>
                  </div>
                </div>
              </div>

              {/* Patient & Fiscal Recipient Box */}
              <div className="my-6 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block mb-1">{legacyText("Exmo.(a) Senhor(a) (Destinatário):", lang)}</span>
                  <p className="font-bold text-sm text-[#0F172A]">{invoice.patientName}</p>
                  {invoice.patientAddress && <p className="text-xs text-[#475569] mt-0.5">{invoice.patientAddress}</p>}
                  <p className="text-xs text-[#64748B] font-mono mt-0.5">Tel: {invoice.patientPhone}</p>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block sm:ms-auto text-left">
                    <p className="text-xs font-mono font-bold text-[#0F172A]">{legacyText("NIF Utente:", lang)}{" "}<span className="bg-white border border-[#CBD5E1] px-2 py-0.5 rounded">{invoice.patientNif}</span>
                    </p>
                    {invoice.coverageProvider && (
                      <div className="mt-2 text-[11px] text-[#475569]">
                        <p><strong>{legacyText("Seguro / Subsistema:", lang)}</strong> {invoice.coverageProvider}</p>
                        {invoice.coverageNumber && <p className="font-mono"><strong>{legacyText("Nº Beneficiário:", lang)}</strong> {invoice.coverageNumber}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Services & Line Items Table */}
              <div className="my-6 overflow-x-auto rounded-2xl border border-[#E2E8F0]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F172A] text-white text-[10px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4">{legacyText("Descrição do Ato Clínico / Tratamento", lang)}</th>
                      <th className="py-2.5 px-3 text-center">{legacyText("Qtd", lang)}</th>
                      <th className="py-2.5 px-3 text-right">{txt('Prix HT', 'Net Price', 'Preço s/ IVA', "Precio neto")}</th>
                      <th className="py-2.5 px-3 text-center">IVA</th>
                      <th className="py-2.5 px-4 text-right">{txt('Total c/ IVA', 'Total (inc. VAT)', 'Total c/ IVA', "Total (IVA incluido)")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-xs">
                    {lines.map((line,index)=><tr key={index}>
                      <td className="py-3 px-4"><p className="font-bold">{line.serviceName}</p><p className="text-xs text-slate-500">{line.practitioner}</p>
                        {line.dates.length>0&&<p className="mt-1 text-xs text-slate-500">{line.dates.join('; ')}</p>}
                        {line.vatExemptionReason&&<p className="mt-1 text-xs text-slate-500">{line.vatExemptionReason}</p>}
                        {line.priceAdjustmentReason&&<p className="mt-1 text-xs text-slate-500">{line.priceAdjustmentReason}</p>}
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{line.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">{(line.netUnitCents/100).toFixed(2)} €</td>
                      <td className="py-3 px-3 text-center font-mono">{line.vatRate}%</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">{(line.totalCents/100).toFixed(2)} €</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation & Tax Breakdown */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 my-6 pt-4 border-t border-[#E2E8F0]">
                <div className="max-w-md space-y-2 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">{txt('Document interne — sans valeur fiscale','Internal document — not a fiscal invoice','Documento interno — sem valor fiscal', "Documento interno — sin validez fiscal")}</p>
                  <p>{txt('La facture fiscale officielle est émise dans le système choisi par la clinique.','The official fiscal invoice is issued through the clinic’s chosen system.','A fatura fiscal é emitida no sistema escolhido pela clínica.', "La factura fiscal oficial se emite a través del sistema elegido por la clínica.")}</p>
                  <p>{quantity} {txt('séance(s)','session(s)','sessão(ões)', "sesión(es)")}</p>
                  {invoice.externalReference&&<p>{txt('Référence officielle','Official reference','Referência fiscal', "Referencia oficial")}: {invoice.externalReference}</p>}
                  {invoice.notes&&<p>{invoice.notes}</p>}
                </div>

                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>{txt('Incidence (Base Imposable) :', 'Incidence (Tax Base) :', 'Incidência (Base Tributável) :', "Base imponible:")}</span>
                    <span className="font-mono font-medium">{incidence.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>{txt(`Total TVA (${vatRates}%) :`, `Total VAT (${vatRates}%) :`, `Total IVA (${vatRates}%) :`, `IVA total (${vatRates} %):`)}</span>
                    <span className={`font-mono font-medium ${vatAmount > 0 ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                      {vatAmount.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t-2 border-[#0F172A] text-sm sm:text-base font-bold text-[#0F172A]">
                    <span>{txt('TOTAL :', 'TOTAL:', 'TOTAL:', "TOTAL:")}</span>
                    <span className="font-mono text-[#0F172A]">{invoice.amount.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Stamp and Signatures */}
              <div className="mt-10 pt-6 border-t border-dashed border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                {/* Official Paid Stamp */}
                <div>
                  {isPaid ? (
                    <button
                      type="button"
                      disabled={updating || !onUpdateStatus || closed}
                      onClick={() => onUpdateStatus && onUpdateStatus(invoice.id, 'PENDING')}
                      className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-bold uppercase tracking-wider text-xs hover:bg-emerald-100 hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-xs text-left"
                      title={txt('Clique para alterar para Pendente', 'Click to switch to Pending', 'Clique para alterar para Pendente', "Pulse para cambiar a pendiente")}
                    >
                      <IconCheck size={18} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="leading-none text-[11px]">{legacyText("QUITADO / PAGO", lang)}</p>
                        <p className="text-[9px] font-mono text-emerald-700 mt-0.5">{paidDate} • {invoice.paymentMethod}</p>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updating || !onUpdateStatus || closed}
                      onClick={() => onUpdateStatus && onUpdateStatus(invoice.id, 'PAID', invoice.paymentMethod)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-amber-500 bg-amber-50 text-amber-800 font-bold uppercase tracking-wider text-xs hover:bg-amber-100 hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-xs"
                      title={txt('Clique para liquidar / marcar como Pago', 'Click to settle / mark as Paid', 'Clique para liquidar / marcar como Pago', "Pulse para liquidar / marcar como pagada")}
                    >
                      <IconAlertCircle size={18} className="text-amber-600 shrink-0" />
                      <span>{closed ? invoice.paymentStatus==='CANCELLED'?'ANULADO':'REEMBOLSADO' : legacyText('AGUARDA LIQUIDAÇÃO', lang)}</span>
                    </button>
                  )}
                </div>

                {/* Signature Line */}
                <div className="text-center sm:text-right">
                  <div className="inline-block w-56 text-center border-t border-[#475569] pt-1">
                    <p className="font-serif italic text-xs text-[#0F172A]">{SITE.professionalName}</p>
                    <p className="text-[9px] text-[#64748B]">{legacyText("Fisioterapeuta Licenciado / Assinatura", lang)}</p>
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
                    const title = txt(
                      'Êtes-vous sûr de vouloir annuler ce reçu ?',
                      'Are you sure you want to void this invoice?',
                      'Tem a certeza que deseja anular esta fatura/recibo?', "¿Seguro que desea anular esta factura?"
                    );
                    const desc = txt(
                      'Cette action marquera définitivement ce reçu comme annulé.',
                      'This action will permanently mark this invoice as voided.',
                      'Esta ação irá anular permanentemente este documento.', "Esta acción marcará la factura como anulada de forma permanente."
                    );
                    const doVoid = () => {
                      onDelete(invoice.id);
                      onClose();
                    };
                    if (setConfirmDialog) {
                      setConfirmDialog({
                        title,
                        description: desc,
                        confirmText: txt('Annuler le Reçu', 'Void Invoice', 'Anular', "Anular factura"),
                        cancelText: txt('Fermer', 'Cancel', 'Cancelar', "Cancelar"),
                        onConfirm: doVoid,
                      });
                    } else {
                      doVoid();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  <IconTrash size={14} />
                  <span>{txt('Annuler le Reçu', 'Void Invoice', 'Anular Documento', "Anular factura")}</span>
                </button>
                <span className="text-[11px] text-[#94A3B8]">
                  ID: {invoice.id}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
