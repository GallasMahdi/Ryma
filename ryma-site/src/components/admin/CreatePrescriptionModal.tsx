'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconCheck,
  IconPlus,
  IconNotes,
  IconTrash,
  IconHeartbeat,
  IconSparkles,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import {
  PatientPrescription,
  PrescriptionItemCategory,
} from '@/types/admin';
import { PRESCRIPTION_LIBRARY, PrescriptionTemplateItem } from '@/data/prescriptionLibrary';
import { SITE } from '@/lib/site';

interface CreatePrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (prescription: PatientPrescription) => void;
  patientPhone: string;
  patientName: string;
  patientId?: string;
  lang: Lang;
}

interface SelectedItemDraft {
  category: PrescriptionItemCategory;
  title: string;
  instructions: string;
  productRef?: string;
}

export function CreatePrescriptionModal({
  isOpen,
  onClose,
  onCreated,
  patientPhone,
  patientName,
  patientId,
  lang,
}: CreatePrescriptionModalProps) {
  const [diagnosisOrGoal, setDiagnosisOrGoal] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItemDraft[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<PrescriptionItemCategory>('care_product');
  const [customTitle, setCustomTitle] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const txt = (pt: string, fr: string, en: string) => {
    if (lang === 'fr') return fr;
    if (lang === 'en') return en;
    return pt;
  };

  const resetForm = () => {
    setDiagnosisOrGoal('');
    setGeneralNotes('');
    setSelectedItems([]);
    setActiveCategoryTab('care_product');
    setCustomTitle('');
    setCustomInstructions('');
    setError(null);
  };

  // Reset form whenever modal opens or closes
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleToggleLibraryItem = (tmpl: PrescriptionTemplateItem) => {
    const title = tmpl.title[lang] || tmpl.title.pt;
    const defaultInst = tmpl.defaultInstructions[lang] || tmpl.defaultInstructions.pt;

    const existsIndex = selectedItems.findIndex(it => it.title === title);
    if (existsIndex >= 0) {
      setSelectedItems(prev => prev.filter((_, i) => i !== existsIndex));
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          category: tmpl.category,
          title,
          instructions: defaultInst,
          productRef: tmpl.id,
        },
      ]);
    }
  };

  const handleUpdateInstruction = (index: number, newInst: string) => {
    setSelectedItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], instructions: newInst };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = () => {
    if (!customTitle.trim() || !customInstructions.trim()) return;
    setSelectedItems(prev => [
      ...prev,
      {
        category: activeCategoryTab,
        title: customTitle.trim(),
        instructions: customInstructions.trim(),
      },
    ]);
    setCustomTitle('');
    setCustomInstructions('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setError('Selecione pelo menos uma recomendação da biblioteca ou adicione uma personalizada.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          patientPhone,
          patientName,
          practitioner: SITE.professionalName,
          diagnosisOrGoal: diagnosisOrGoal || undefined,
          items: selectedItems,
          generalNotes: generalNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar prescrição de recomendações');
      }

      onCreated(data.prescription);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro de comunicação');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLibrary = PRESCRIPTION_LIBRARY.filter(it => it.category === activeCategoryTab);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm overflow-y-auto font-sans"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden my-4 max-h-[92vh] flex flex-col overscroll-contain"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex items-center justify-between shrink-0 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#C49A3C]/20 border border-[#C49A3C]/40 text-[#E8C97A]">
                  <IconNotes size={22} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold tracking-tight text-white">
                    {txt('Nova Ficha de Recomendações & Material', 'Nouvelle Fiche Conseils & Matériel', 'New Recommendations & Equipment Pad')}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Utente: <strong>{patientName}</strong> ({patientPhone})
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

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-[#1E293B]">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
                  {error}
                </div>
              )}

              {/* Goal / Diagnosis */}
              <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                <label className="block font-bold text-[#0F172A] uppercase tracking-wider text-[11px] mb-1.5">
                  Objetivo Clínico / Enquadramento do Tratamento (Opcional)
                </label>
                <input
                  type="text"
                  value={diagnosisOrGoal}
                  onChange={(e) => setDiagnosisOrGoal(e.target.value)}
                  placeholder="Ex: Alívio de lombalgia postural, recuperação pós-sessão de RPG e drenagem..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                />
              </div>

              {/* Library Catalog Picker */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <IconSparkles size={15} className="text-[#C49A3C]" />
                    <span>Selecionar da Biblioteca Clínica</span>
                  </h4>
                  <span className="text-[11px] text-[#64748B] font-mono">
                    {selectedItems.length} itens selecionados
                  </span>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'care_product' as const, label: '🧴 Cuidados & Produtos' },
                    { id: 'ergonomic_equipment' as const, label: '🧘 Material Ergonómico' },
                    { id: 'lifestyle_habit' as const, label: '💡 Hábitos & Postura' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategoryTab(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        activeCategoryTab === cat.id
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                  {filteredLibrary.map(item => {
                    const title = item.title[lang] || item.title.pt;
                    const desc = item.description[lang] || item.description.pt;
                    const isSelected = selectedItems.some(it => it.title === title);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleLibraryItem(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-[#FAF8F5] border-[#C49A3C] shadow-xs'
                            : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected ? 'bg-[#C49A3C] text-white' : 'border border-[#CBD5E1] bg-white'
                          }`}
                        >
                          {isSelected && <IconCheck size={14} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#0F172A]">{title}</p>
                          <p className="text-[10px] text-[#64748B] mt-0.5 line-clamp-2">{desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Items & Posology Customizer */}
              {selectedItems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <IconHeartbeat size={15} className="text-[#C49A3C]" />
                    <span>Ajustar Posologia & Conselhos Personalizados ({selectedItems.length})</span>
                  </h4>

                  <div className="space-y-2.5">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0F172A]">
                            {idx + 1}. {item.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Remover item"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">
                            Posologia / Modo de Aplicação:
                          </label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:bg-white focus:ring-1 focus:ring-[#C49A3C] outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Custom Item */}
              <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#E8E2D8] space-y-2.5">
                <h5 className="font-bold text-[#0F172A] text-xs flex items-center gap-1.5">
                  <IconPlus size={14} className="text-[#C49A3C]" />
                  <span>Adicionar Recomendação ou Produto Personalizado</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Nome do produto ou conselho..."
                    className="bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Instruções de utilização / frequência..."
                    className="bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  disabled={!customTitle.trim() || !customInstructions.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-semibold disabled:opacity-40"
                >
                  + Adicionar à Prescrição
                </button>
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                  Nota / Mensagem Adicional do Fisioterapeuta
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ex: Em caso de desconforto ou dúvida, contacte-nos pelo WhatsApp..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#C49A3C] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] text-[#1A1412] font-bold text-xs flex items-center gap-2 shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  <IconNotes size={16} />
                  <span>{submitting ? 'A emitir ficha...' : 'Emitir Ficha de Recomendações'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
