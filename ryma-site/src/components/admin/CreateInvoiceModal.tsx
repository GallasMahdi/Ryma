'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconReceiptTax,
  IconUser,
  IconPhone,
  IconCreditCard,
  IconNotes,
  IconBuildingHospital,
} from '@tabler/icons-react';
import { SERVICES } from '@/data/services';
import { Lang } from '@/lib/i18n';
import {
  Invoice,
  CreateInvoiceInput,
  PaymentMethod,
  InvoicePaymentStatus,
  CoverageType,
  PatientRecord,
  Appointment,
} from '@/types/admin';
import { SITE } from '@/lib/site';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
  lang: Lang;
  patients: PatientRecord[];
  appointments: Appointment[];
  prefilledData?: Partial<CreateInvoiceInput> | null;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onCreated,
  lang,
  patients,
  appointments,
  prefilledData,
}: CreateInvoiceModalProps) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientNif, setPatientNif] = useState('999999990');
  const [patientAddress, setPatientAddress] = useState('Lisboa, Portugal');
  const [coverageType, setCoverageType] = useState<CoverageType>('PARTICULAR');
  const [coverageProvider, setCoverageProvider] = useState('');
  const [coverageNumber, setCoverageNumber] = useState('');
  const [serviceSlug, setServiceSlug] = useState(SERVICES[0]?.slug || 'reeducacao-postural');
  const [serviceName, setServiceName] = useState(SERVICES[0]?.name.pt || '');
  const [amount, setAmount] = useState<number>(SERVICES[0]?.price || 50);
  const [vatRate, setVatRate] = useState<number>(0);
  const [vatExemptionReason, setVatExemptionReason] = useState('Isento de IVA - Artigo 9.º do CIVA');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MULTIBANCO');
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>('PAID');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync prefilled data whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        setPatientName(prefilledData.patientName || '');
        setPatientPhone(prefilledData.patientPhone || '');
        setPatientEmail(prefilledData.patientEmail || '');
        setPatientNif(prefilledData.patientNif || '999999990');
        setPatientAddress(prefilledData.patientAddress || 'Lisboa, Portugal');
        setCoverageType(prefilledData.coverageType || 'PARTICULAR');
        setCoverageProvider(prefilledData.coverageProvider || '');
        setCoverageNumber(prefilledData.coverageNumber || '');
        
        const slug = prefilledData.serviceSlug || SERVICES[0]?.slug || 'reeducacao-postural';
        setServiceSlug(slug);
        const srv = SERVICES.find(s => s.slug === slug);
        setServiceName(prefilledData.serviceName || srv?.name.pt || slug);
        setAmount(prefilledData.amount ?? srv?.price ?? 50);
        
        const isKine = !slug.includes('minceur') && !slug.includes('cryolipolyse') && !slug.includes('cavitation') && !slug.includes('radiofrequence');
        setVatRate(isKine ? 0 : 23);
        setVatExemptionReason(isKine ? 'Isento de IVA - Artigo 9.º do CIVA' : '');
        setPaymentMethod(prefilledData.paymentMethod || 'MULTIBANCO');
        setPaymentStatus(prefilledData.paymentStatus || 'PAID');
        setNotes(prefilledData.notes || '');
      } else {
        setPatientName('');
        setPatientPhone('');
        setPatientEmail('');
        setPatientNif('999999990');
        setPatientAddress('Lisboa, Portugal');
        setCoverageType('PARTICULAR');
        setCoverageProvider('');
        setCoverageNumber('');
        setServiceSlug(SERVICES[0]?.slug || 'reeducacao-postural');
        setServiceName(SERVICES[0]?.name.pt || '');
        setAmount(SERVICES[0]?.price || 50);
        setVatRate(0);
        setVatExemptionReason('Isento de IVA - Artigo 9.º do CIVA');
        setPaymentMethod('MULTIBANCO');
        setPaymentStatus('PAID');
        setNotes('');
      }
      setError(null);
    }
  }, [isOpen, prefilledData]);

  // Handle service change to update price and VAT rate
  const handleServiceChange = (slug: string) => {
    setServiceSlug(slug);
    const srv = SERVICES.find(s => s.slug === slug);
    if (srv) {
      setServiceName(srv.name.pt || srv.name.fr || slug);
      setAmount(srv.price);
      const isKine = srv.pole === 'kinesitherapie';
      if (isKine) {
        setVatRate(0);
        setVatExemptionReason('Isento de IVA - Artigo 9.º do CIVA');
      } else {
        setVatRate(23);
        setVatExemptionReason('');
      }
    }
  };

  // Autocomplete patient
  const handlePatientSelect = (patId: string) => {
    const pat = patients.find(p => p.id === patId);
    if (pat) {
      setPatientName(pat.patientName);
      setPatientPhone(pat.phone);
      setPatientEmail(pat.email || '');
      setCoverageType(pat.coverageType || 'PARTICULAR');
      setCoverageProvider(pat.coverageProvider || '');
      setCoverageNumber(pat.coverageNumber || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      setError(lang === 'fr' ? 'Nom et téléphone requis' : 'Nome e telefone são obrigatórios');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: prefilledData?.appointmentId,
          patientId: prefilledData?.patientId,
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          patientNif: patientNif || '999999990',
          patientAddress,
          coverageType,
          coverageProvider: coverageProvider || undefined,
          coverageNumber: coverageNumber || undefined,
          serviceSlug,
          serviceName,
          practitioner: SITE.professionalName,
          amount,
          vatRate,
          vatExemptionReason: vatRate === 0 ? vatExemptionReason : undefined,
          paymentMethod,
          paymentStatus,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar fatura/recibo');
      }

      onCreated(data.invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-6 max-h-[92vh] flex flex-col font-sans"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#C49A3C]/20 border border-[#C49A3C]/40 text-[#E8C97A]">
                  <IconReceiptTax size={22} />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white">
                    {lang === 'fr' ? 'Émettre une Fatura-Recibo' : 'Emitir Fatura-Recibo / Recibo de Quitação'}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {SITE.name} • ERS: {SITE.ersRegistration || 'E164321'} • NIF: {SITE.clinicNif || '518923456'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-[#1E293B] flex-1">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Quick Patient Select */}
              {patients.length > 0 && !prefilledData?.patientName && (
                <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
                  <label className="block font-semibold text-[#475569] mb-1">
                    {lang === 'fr' ? 'Sélectionner un patient existant' : 'Preencher a partir de Utente registado'}
                  </label>
                  <select
                    onChange={(e) => handlePatientSelect(e.target.value)}
                    defaultValue=""
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                  >
                    <option value="" disabled>-- Selecionar utente --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.patientName} ({p.phone}) {p.coverageProvider ? `• ${p.coverageProvider}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Patient Information Grid */}
              <div>
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <IconUser size={15} className="text-[#C49A3C]" />
                  <span>{lang === 'fr' ? 'Données du Patient / Destinataire' : 'Identificação do Utente'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Ex: Maria Santos Silva"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">NIF Utente (Contribuinte)</label>
                    <input
                      type="text"
                      value={patientNif}
                      onChange={(e) => setPatientNif(e.target.value)}
                      placeholder="Ex: 234567890 ou 999999990"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Telefone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+351 912 345 678"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">E-mail (Envio PDF)</label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="paciente@email.pt"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Morada Fiscal (Opcional)</label>
                    <input
                      type="text"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                      placeholder="Lisboa, Portugal"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Insurance / Subsistema Block */}
              <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                  <IconBuildingHospital size={15} className="text-[#C49A3C]" />
                  <span>Seguro de Saúde / Subsistema (p/ Reembolso)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Regime</label>
                    <select
                      value={coverageType}
                      onChange={(e) => setCoverageType(e.target.value as CoverageType)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value="PARTICULAR">Particular</option>
                      <option value="INSURANCE">Seguro Privado</option>
                      <option value="ADSE">ADSE</option>
                      <option value="OTHER">Outro Subsistema</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Seguradora / Entidade</label>
                    <input
                      type="text"
                      value={coverageProvider}
                      onChange={(e) => setCoverageProvider(e.target.value)}
                      placeholder="Ex: Médis, Multicare, ADSE"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Nº Beneficiário / Cartão</label>
                    <input
                      type="text"
                      value={coverageNumber}
                      onChange={(e) => setCoverageNumber(e.target.value)}
                      placeholder="Ex: 892345671"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Service & Financial Block */}
              <div>
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <IconReceiptTax size={15} className="text-[#C49A3C]" />
                  <span>Serviço Clínico & Valores</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Tratamento / Ato Médico *</label>
                    <select
                      value={serviceSlug}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-medium"
                    >
                      {SERVICES.map(s => (
                        <option key={s.slug} value={s.slug}>
                          {s.name.pt} ({s.price} € - {s.pole === 'kinesitherapie' ? 'Fisioterapia' : 'Estética'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Valor Total (€) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>

                {/* Tax / IVA Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Taxa de IVA</label>
                    <select
                      value={vatRate}
                      onChange={(e) => {
                        const rate = parseFloat(e.target.value);
                        setVatRate(rate);
                        if (rate === 0) setVatExemptionReason('Isento de IVA - Artigo 9.º do CIVA');
                        else setVatExemptionReason('');
                      }}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                    >
                      <option value={0}>0% — Isento de IVA (Artigo 9.º do CIVA)</option>
                      <option value={23}>23% — Taxa Normal (Estética Não-Médica)</option>
                      <option value={6}>6% — Taxa Reduzida</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">Motivo de Isenção</label>
                    <input
                      type="text"
                      value={vatExemptionReason}
                      disabled={vatRate > 0}
                      onChange={(e) => setVatExemptionReason(e.target.value)}
                      placeholder="Artigo 9.º do CIVA"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E2D8]">
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                  <IconCreditCard size={15} className="text-[#C49A3C]" />
                  <span>Método de Pagamento & Estado</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Método de Liquidação</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                    >
                      <option value="MULTIBANCO">Multibanco (TPA)</option>
                      <option value="MBWAY">MB Way</option>
                      <option value="CASH">Numerário / Dinheiro</option>
                      <option value="CARD">Cartão de Crédito/Débito</option>
                      <option value="TRANSFER">Transferência Bancária</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">Estado da Fatura</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                    >
                      <option value="PAID">PAGO / Quitado (Fatura-Recibo)</option>
                      <option value="PENDING">PENDENTE (Aguardar Liquidação)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">Observações Internas / Descrição Adicional</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Sessão 1/10 prescrição ortopédica Dr. Silva..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] transition-colors font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] hover:brightness-105 shadow-md transition-all font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  <IconReceiptTax size={16} />
                  <span>{submitting ? 'A emitir recibo...' : 'Emitir Fatura-Recibo'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
