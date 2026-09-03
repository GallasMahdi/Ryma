'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconReceiptTax,
  IconUser,
  IconCreditCard,
  IconBuildingHospital,
  IconSearch,
  IconCheck,
  IconChevronDown,
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
  calculateVatBreakdown,
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
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

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

  // Searchable Patient Combobox state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [selectedPatientObject, setSelectedPatientObject] = useState<PatientRecord | null>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Filter patients by query
  const filteredPatients = useMemo(() => {
    const q = patientSearchQuery.toLowerCase().trim();
    if (!q) return patients.slice(0, 30);
    return patients
      .filter((p) => {
        return (
          p.patientName.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.coverageProvider && p.coverageProvider.toLowerCase().includes(q)) ||
          (p.coverageNumber && p.coverageNumber.includes(q))
        );
      })
      .slice(0, 30);
  }, [patients, patientSearchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const srv = SERVICES.find((s) => s.slug === slug);
        setServiceName(prefilledData.serviceName || srv?.name.pt || slug);
        setAmount(prefilledData.amount ?? srv?.price ?? 50);

        const isKine =
          !slug.includes('minceur') &&
          !slug.includes('cryolipolyse') &&
          !slug.includes('cavitation') &&
          !slug.includes('radiofrequence');
        setVatRate(isKine ? 0 : 23);
        setVatExemptionReason(isKine ? 'Isento de IVA - Artigo 9.º do CIVA' : '');
        setPaymentMethod(prefilledData.paymentMethod || 'MULTIBANCO');
        setPaymentStatus(prefilledData.paymentStatus || 'PAID');
        setNotes(prefilledData.notes || '');

        // Set matching patient if present
        const matched = patients.find(
          (p) => p.phone === prefilledData.patientPhone || p.id === prefilledData.patientId
        );
        setSelectedPatientObject(matched || null);
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
        setSelectedPatientObject(null);
      }
      setPatientSearchQuery('');
      setIsPatientDropdownOpen(false);
      setError(null);
    }
  }, [isOpen, prefilledData, patients]);

  // Handle service change to update price and VAT rate
  const handleServiceChange = (slug: string) => {
    setServiceSlug(slug);
    const srv = SERVICES.find((s) => s.slug === slug);
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
  const handlePatientSelect = (pat: PatientRecord) => {
    setSelectedPatientObject(pat);
    setPatientName(pat.patientName);
    setPatientPhone(pat.phone);
    setPatientEmail(pat.email || '');
    setCoverageType(pat.coverageType || 'PARTICULAR');
    setCoverageProvider(pat.coverageProvider || '');
    setCoverageNumber(pat.coverageNumber || '');
    setIsPatientDropdownOpen(false);
    setPatientSearchQuery('');
  };

  const handleClearPatientSelection = () => {
    setSelectedPatientObject(null);
    setPatientSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      setError(
        txt('Nom et téléphone requis', 'Name and phone are required', 'Nome e telefone são obrigatórios')
      );
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
          patientId: selectedPatientObject?.id || prefilledData?.patientId,
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
        throw new Error(data.error || txt('Erreur de création du reçu', 'Error creating invoice', 'Erro ao criar fatura/recibo'));
      }

      onCreated(data.invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || txt('Erreur de communication', 'Communication error', 'Erro de comunicação'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto font-sans"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-6 max-h-[92vh] flex flex-col font-sans overscroll-contain"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#C49A3C]/20 border border-[#C49A3C]/40 text-[#E8C97A]">
                  <IconReceiptTax size={22} />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white">
                    {txt('Émettre une Facture-Reçu', 'Issue Invoice-Receipt', 'Emitir Fatura-Recibo / Recibo de Quitação')}
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
                title={txt('Fermer', 'Close', 'Fechar')}
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

              {/* ── Searchable Patient Combobox ─────────────────────────── */}
              {patients.length > 0 && !prefilledData?.patientName && (
                <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] relative" ref={patientDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-[#0F172A] text-xs">
                      {txt('Sélectionner un patient existant', 'Select registered patient', 'Preencher a partir de Utente registado')}
                    </label>
                    <span className="text-[10px] text-[#94A3B8]">
                      {patients.length} {txt('patients enregistrés', 'registered patients', 'utentes registados')}
                    </span>
                  </div>

                  {selectedPatientObject ? (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-[#CBD5E1] rounded-xl shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-[#E8C97A] font-bold font-mono text-xs flex items-center justify-center">
                          {selectedPatientObject.patientName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A] text-xs leading-tight">
                            {selectedPatientObject.patientName}
                          </p>
                          <p className="text-[11px] text-[#64748B] font-mono">
                            {selectedPatientObject.phone} {selectedPatientObject.coverageProvider ? `• ${selectedPatientObject.coverageProvider}` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearPatientSelection}
                        className="px-2 py-1 text-[11px] font-semibold text-[#64748B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        {txt('Changer', 'Change', 'Alterar')} ✕
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative flex items-center">
                        <IconSearch size={15} className="absolute left-3 text-[#94A3B8]" />
                        <input
                          type="text"
                          value={patientSearchQuery}
                          onFocus={() => setIsPatientDropdownOpen(true)}
                          onChange={(e) => {
                            setPatientSearchQuery(e.target.value);
                            setIsPatientDropdownOpen(true);
                          }}
                          placeholder={txt(
                            'Rechercher par nom, téléphone, NIF...',
                            'Search patient name, phone, NIF...',
                            'Pesquisar nome, telefone, NIF...'
                          )}
                          className="w-full pl-8.5 pr-8 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-medium placeholder:text-[#94A3B8]"
                        />
                        <IconChevronDown size={14} className="absolute right-3 text-[#94A3B8] pointer-events-none" />
                      </div>

                      {/* Dropdown Results List */}
                      {isPatientDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#CBD5E1] rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#F1F5F9]">
                          {filteredPatients.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[#94A3B8]">
                              {txt('Aucun patient correspondant', 'No matching patient found', 'Nenhum utente encontrado')}
                            </div>
                          ) : (
                            filteredPatients.map((pat) => (
                              <button
                                key={pat.id}
                                type="button"
                                onClick={() => handlePatientSelect(pat)}
                                className="w-full px-3.5 py-2.5 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition-colors group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] group-hover:bg-[#0F172A] group-hover:text-white text-[#475569] font-bold font-mono text-[10px] flex items-center justify-center transition-colors">
                                    {pat.patientName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#0F172A] text-xs">{pat.patientName}</p>
                                    <p className="text-[10px] text-[#64748B] font-mono">
                                      {pat.phone} {pat.coverageProvider ? `• ${pat.coverageProvider}` : ''}
                                    </p>
                                  </div>
                                </div>

                                {pat.coverageProvider ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {pat.coverageProvider}
                                  </span>
                                ) : pat.coverageType === 'ADSE' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    ADSE
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#94A3B8]">{txt('Privé', 'Private', 'Particular')}</span>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Patient Information Grid ────────────────────────────── */}
              <div>
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <IconUser size={15} className="text-[#C49A3C]" />
                  <span>{txt('Données du Patient / Destinataire', 'Patient & Billing Details', 'Identificação do Utente')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Nom Complet *', 'Full Name *', 'Nome Completo *')}
                    </label>
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
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('NIF Patient (Fiscal)', 'Patient Tax ID / NIF', 'NIF Utente (Contribuinte)')}
                    </label>
                    <input
                      type="text"
                      value={patientNif}
                      onChange={(e) => setPatientNif(e.target.value)}
                      placeholder="Ex: 234567890 ou 999999990"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Téléphone / WhatsApp *', 'Phone / WhatsApp *', 'Telefone / WhatsApp *')}
                    </label>
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
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('E-mail (Envoi PDF)', 'Email (PDF Receipt)', 'E-mail (Envio PDF)')}
                    </label>
                    <input
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="paciente@email.pt"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Adresse Fiscale (Optionnel)', 'Billing Address (Optional)', 'Morada Fiscal (Opcional)')}
                    </label>
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

              {/* ── Insurance / Subsistema Block ─────────────────────────── */}
              <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0]">
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                  <IconBuildingHospital size={15} className="text-[#C49A3C]" />
                  <span>{txt('Mutuelle de Santé / Subsystème (p/ Remboursement)', 'Health Insurance / Health Subsystem (for Reimbursement)', 'Seguro de Saúde / Subsistema (p/ Reembolso)')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      {txt('Régime', 'Plan Type', 'Regime')}
                    </label>
                    <select
                      value={coverageType}
                      onChange={(e) => setCoverageType(e.target.value as CoverageType)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs outline-none font-semibold"
                    >
                      <option value="PARTICULAR">{txt('Privé', 'Private', 'Particular')}</option>
                      <option value="INSURANCE">{txt('Assurance Privée', 'Private Insurance', 'Seguro Privado')}</option>
                      <option value="ADSE">ADSE</option>
                      <option value="OTHER">{txt('Autre Subsystème', 'Other Subsystem', 'Outro Subsistema')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      {txt('Assurance / Entité', 'Insurer / Provider', 'Seguradora / Entidade')}
                    </label>
                    <input
                      type="text"
                      value={coverageProvider}
                      onChange={(e) => setCoverageProvider(e.target.value)}
                      placeholder="Ex: Médis, Multicare, ADSE"
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      {txt('Nº Adhérent / Carte', 'Policy / Card #', 'Nº Beneficiário / Cartão')}
                    </label>
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

              {/* ── Service & Financial Block ───────────────────────────── */}
              <div>
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-3 flex items-center gap-1.5">
                  <IconReceiptTax size={15} className="text-[#C49A3C]" />
                  <span>{txt('Soin Clinique & Tarifs', 'Clinical Service & Pricing', 'Serviço Clínico & Valores')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Traitement / Acte Médical *', 'Treatment / Medical Service *', 'Tratamento / Ato Médico *')}
                    </label>
                    <select
                      value={serviceSlug}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none font-medium"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name[lang] || s.name.pt} ({s.price} € -{' '}
                          {s.pole === 'kinesitherapie'
                            ? txt('Kinésithérapie', 'Physiotherapy', 'Fisioterapia')
                            : txt('Esthétique', 'Aesthetics', 'Estética')}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Montant Total (€) *', 'Total Amount (€) *', 'Valor Total (€) *')}
                    </label>
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
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Taux de TVA', 'VAT Rate', 'Taxa de IVA')}
                    </label>
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
                      <option value={0}>{txt('0% — Exonéré de TVA (Art. 9 CIVA)', '0% — VAT Exempt (Art. 9 CIVA)', '0% — Isento de IVA (Artigo 9.º do CIVA)')}</option>
                      <option value={23}>{txt('23% — Taux Normal (Esthétique)', '23% — Standard Rate (Aesthetics)', '23% — Taxa Normal (Estética Não-Médica)')}</option>
                      <option value={6}>{txt('6% — Taux Réduit', '6% — Reduced Rate', '6% — Taxa Reduzida')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                      {txt('Motif d\'Exonération', 'Exemption Reason', 'Motivo de Isenção')}
                    </label>
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

                {/* Real-time VAT / Tax Breakdown Card */}
                {(() => {
                  const vatData = calculateVatBreakdown(amount, vatRate);
                  return (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#FAF8F5] to-white border border-[#E8E2D8] flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] font-medium">
                          {txt('Base HT / Incidência :', 'Net Tax Base :', 'Incidência (s/ IVA) :')}
                        </span>
                        <span className="font-mono font-bold text-[#0F172A]">{vatData.incidence.toFixed(2)} €</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] font-medium">
                          {txt(`Montant TVA (${vatRate}%) :`, `VAT Amount (${vatRate}%) :`, `Valor IVA (${vatRate}%) :`)}
                        </span>
                        <span className={`font-mono font-bold ${vatData.vatAmount > 0 ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                          {vatData.vatAmount.toFixed(2)} €
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#C49A3C]/30 shadow-xs">
                        <span className="text-[#9A7428] font-semibold">
                          {txt('Total TTC :', 'Total (Gross) :', 'Total c/ IVA :')}
                        </span>
                        <span className="font-mono font-bold text-[#1A1412]">{vatData.total.toFixed(2)} €</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Payment Details ─────────────────────────────────────── */}
              <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E2D8]">
                <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-2.5 flex items-center gap-1.5">
                  <IconCreditCard size={15} className="text-[#C49A3C]" />
                  <span>{txt('Mode de Paiement & Statut', 'Payment Method & Status', 'Método de Pagamento & Estado')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      {txt('Mode de Règlement', 'Payment Method', 'Método de Liquidação')}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                    >
                      <option value="MULTIBANCO">Multibanco (TPA)</option>
                      <option value="MBWAY">MB Way</option>
                      <option value="CASH">{txt('Espèces / Cash', 'Cash', 'Numerário / Dinheiro')}</option>
                      <option value="CARD">{txt('Carte Bancaire', 'Credit/Debit Card', 'Cartão de Crédito/Débito')}</option>
                      <option value="TRANSFER">{txt('Virement Bancaire', 'Bank Transfer', 'Transferência Bancária')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      {txt('Statut du Reçu', 'Invoice Status', 'Estado da Fatura')}
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs outline-none font-semibold"
                    >
                      <option value="PAID">{txt('PAYÉ / Réglé (Facture-Reçu)', 'PAID / Settled (Invoice-Receipt)', 'PAGO / Quitado (Fatura-Recibo)')}</option>
                      <option value="PENDING">{txt('EN ATTENTE (En attente de règlement)', 'PENDING (Awaiting Settlement)', 'PENDENTE (Aguardar Liquidação)')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Notes ────────────────────────────────────────────────── */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  {txt('Remarques Internes / Description', 'Internal Notes / Additional Info', 'Observações Internas / Descrição Adicional')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={txt(
                    'Ex: Séance 1/10 prescription orthopédique Dr. Silva...',
                    'e.g. Session 1/10 orthopedic prescription Dr. Silva...',
                    'Ex: Sessão 1/10 prescrição ortopédica Dr. Silva...'
                  )}
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                />
              </div>

              {/* ── Submit Buttons ───────────────────────────────────────── */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] transition-colors font-semibold text-xs"
                >
                  {txt('Annuler', 'Cancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] hover:brightness-105 shadow-md transition-all font-bold text-xs flex items-center gap-2 disabled:opacity-50"
                >
                  <IconReceiptTax size={16} />
                  <span>
                    {submitting
                      ? txt('Émission en cours...', 'Issuing invoice...', 'A emitir recibo...')
                      : txt('Émettre la Facture-Reçu', 'Issue Invoice-Receipt', 'Emitir Fatura-Recibo')}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
