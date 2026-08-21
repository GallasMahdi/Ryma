'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconPrinter,
  IconBrandWhatsapp,
  IconTrash,
  IconNotes,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { PatientPrescription } from '@/types/admin';
import { SITE } from '@/lib/site';
import { printPrescriptionPdf, formatPrescriptionWhatsAppMessage } from '@/lib/prescriptionPdf';

interface PrescriptionDetailModalProps {
  prescription: PatientPrescription | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  lang: Lang;
}

export function PrescriptionDetailModal({
  prescription,
  isOpen,
  onClose,
  onDelete,
  lang,
}: PrescriptionDetailModalProps) {
  if (!prescription) return null;

  const handlePrint = () => {
    printPrescriptionPdf(prescription);
  };

  const handleWhatsAppSend = () => {
    const cleanPhone = (prescription.patientPhone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert(lang === 'pt' ? 'Número de telefone do utente não disponível.' : 'Patient phone number is not available.');
      return;
    }
    const msg = encodeURIComponent(formatPrescriptionWhatsAppMessage(prescription));
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const careProducts = prescription.items.filter(it => it.category === 'care_product');
  const equipment = prescription.items.filter(it => it.category === 'ergonomic_equipment');
  const habits = prescription.items.filter(it => it.category === 'lifestyle_habit');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-4 max-h-[96vh] flex flex-col"
          >
            {/* Top Action Bar */}
            <div className="px-6 py-3.5 bg-[#0F172A] text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-[#E8C97A] tracking-wider uppercase">
                  Recomendações Clínicas
                </span>
                <span className="text-[11px] text-white/70">
                  {prescription.date}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppSend}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  title="Enviar por WhatsApp"
                >
                  <IconBrandWhatsapp size={15} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-[#C49A3C] hover:bg-[#D4AA4C] text-[#1A1412] font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  title="Imprimir ou Salvar PDF"
                >
                  <IconPrinter size={15} />
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors ms-2"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-white text-[#1E293B] text-xs leading-relaxed flex-1 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b-2 border-[#0F172A]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#1A1412] flex items-center justify-center text-[#C49A3C] font-serif font-bold text-sm">
                      R
                    </div>
                    <span className="font-serif text-xl font-bold tracking-tight text-[#0F172A]">
                      {SITE.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] font-medium">
                    Clínica de Fisioterapia & Estética Médica Avançada
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    Avenida da Liberdade 120, 1250-146 Lisboa, Portugal
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg font-mono font-bold text-xs text-[#0F172A] mb-1">
                    FICHA DE CONSELHOS
                  </span>
                  <p className="text-[11px] text-[#64748B]">Data: <strong>{prescription.date}</strong></p>
                </div>
              </div>

              {/* Patient */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Utente:</span>
                  <span className="font-bold text-sm text-[#0F172A]">{prescription.patientName}</span>
                </div>
                <div className="text-right font-mono text-xs text-[#64748B]">
                  Tel: {prescription.patientPhone}
                </div>
              </div>

              {prescription.diagnosisOrGoal && (
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E2D8] text-xs">
                  <strong>Objetivo Clínico:</strong> {prescription.diagnosisOrGoal}
                </div>
              )}

              {/* Care Products */}
              {careProducts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider bg-[#F1F5F9] border-l-4 border-[#C49A3C] px-3 py-1.5 rounded-r-lg">
                    🧴 Produtos & Cuidados Tópicos Recomendados
                  </h4>
                  <div className="space-y-1.5">
                    {careProducts.map(it => (
                      <div key={it.id} className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl">
                        <p className="font-bold text-[#0F172A]">{it.title}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">
                          <strong>Aplicação / Posologia:</strong> {it.instructions}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {equipment.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider bg-[#F1F5F9] border-l-4 border-[#C49A3C] px-3 py-1.5 rounded-r-lg">
                    🧘 Material Ergonómico & Auto-Reabilitação
                  </h4>
                  <div className="space-y-1.5">
                    {equipment.map(it => (
                      <div key={it.id} className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl">
                        <p className="font-bold text-[#0F172A]">{it.title}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">
                          <strong>Utilização:</strong> {it.instructions}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Habits */}
              {habits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider bg-[#F1F5F9] border-l-4 border-[#C49A3C] px-3 py-1.5 rounded-r-lg">
                    💡 Hábitos & Higiene Postural
                  </h4>
                  <div className="space-y-1.5">
                    {habits.map(it => (
                      <div key={it.id} className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl">
                        <p className="font-bold text-[#0F172A]">{it.title}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">
                          <strong>Conselho:</strong> {it.instructions}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {prescription.generalNotes && (
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[11px] text-[#475569]">
                  <strong>Observações do Fisioterapeuta:</strong><br />
                  {prescription.generalNotes}
                </div>
              )}

              {/* Signature */}
              <div className="pt-6 border-t border-dashed border-[#CBD5E1] flex justify-between items-end">
                <p className="text-[10px] text-[#94A3B8] max-w-sm">
                  Documento terapêutico de apoio domiciliário.
                </p>
                <div className="text-center w-52 border-t border-[#475569] pt-1">
                  <p className="font-serif italic text-xs text-[#0F172A]">
                    {prescription.practitioner || SITE.professionalName}
                  </p>
                  <p className="text-[9px] text-[#64748B]">Fisioterapeuta Licenciado</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            {onDelete && (
              <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Eliminar esta ficha de recomendações?')) {
                      onDelete(prescription.id);
                      onClose();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  <IconTrash size={14} />
                  <span>Eliminar Ficha</span>
                </button>
                <span className="text-[11px] text-[#94A3B8]">
                  ID: {prescription.id}
                </span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
