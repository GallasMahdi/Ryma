'use client';

import React from 'react';
import { Lang } from '@/lib/i18n';

interface EvaScorePickerProps {
  value: number;
  onChange: (score: number) => void;
  lang?: Lang;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showSeverityText?: boolean;
  disabled?: boolean;
}

export function getEvaColor(score: number): {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  label: { pt: string; en: string; fr: string };
} {
  if (score === 0) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: { pt: '0 · Sem dor', en: '0 · No pain', fr: '0 · Aucune douleur' },
    };
  }
  if (score <= 3) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-700',
      border: 'border-emerald-300',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: { pt: '1-3 · Dor ligeira', en: '1-3 · Mild pain', fr: '1-3 · Douleur légère' },
    };
  }
  if (score <= 6) {
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-700',
      border: 'border-amber-300',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: { pt: '4-6 · Dor moderada', en: '4-6 · Moderate pain', fr: '4-6 · Douleur modérée' },
    };
  }
  if (score <= 8) {
    return {
      bg: 'bg-orange-500',
      text: 'text-orange-700',
      border: 'border-orange-300',
      badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
      label: { pt: '7-8 · Dor intensa', en: '7-8 · Severe pain', fr: '7-8 · Douleur intense' },
    };
  }
  return {
    bg: 'bg-rose-600',
    text: 'text-rose-700',
    border: 'border-rose-300',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    label: { pt: '9-10 · Insuportável', en: '9-10 · Worst possible', fr: '9-10 · Insupportable' },
  };
}

export function EvaScorePicker({
  value,
  onChange,
  lang = 'pt',
  size = 'md',
  showLabel = true,
  showSeverityText = true,
  disabled = false,
}: EvaScorePickerProps) {
  const currentConfig = getEvaColor(value);

  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  return (
    <div className="space-y-2.5 font-sans">
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="font-bold text-[#0F172A] text-xs flex items-center gap-1.5">
            <span>{txt('Échelle de douleur EVA (0 – 10)', 'EVA Pain Score (0 – 10)', 'Escala de Dor EVA (0 – 10)')}</span>
          </label>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs px-2.5 py-1 rounded-lg border shadow-2xs transition-all ${currentConfig.badgeBg}`}>
              EVA {value} / 10
            </span>
          </div>
        </div>
      )}

      {/* 1-Tap Quick Number Buttons (0 - 10) */}
      <div className="grid grid-cols-11 gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = value === num;
          const conf = getEvaColor(num);

          return (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => onChange(num)}
              className={`py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm text-center transition-all touch-target flex flex-col items-center justify-center ${
                isSelected
                  ? `${conf.bg} text-white shadow-md scale-105 ring-2 ring-offset-1 ring-[#0F172A]`
                  : 'bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155]'
              }`}
              title={`EVA ${num}`}
            >
              <span>{num}</span>
            </button>
          );
        })}
      </div>

      {/* Severity Reference Labels */}
      {showSeverityText && (
        <div className="flex items-center justify-between text-[10px] font-bold text-[#64748B] px-0.5 pt-0.5">
          <span className="text-emerald-700">0 · {txt('Sem dor', 'No pain', 'Sans douleur')}</span>
          <span className="text-emerald-600 hidden xs:inline">1-3 · {txt('Ligeira', 'Mild', 'Légère')}</span>
          <span className="text-amber-700">4-6 · {txt('Moderada', 'Moderate', 'Modérée')}</span>
          <span className="text-orange-700 hidden xs:inline">7-8 · {txt('Forte', 'Severe', 'Intense')}</span>
          <span className="text-rose-700">9-10 · {txt('Máxima', 'Worst', 'Maximale')}</span>
        </div>
      )}
    </div>
  );
}
