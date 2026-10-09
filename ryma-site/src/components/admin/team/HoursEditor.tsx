'use client';

import { IconCopy, IconPlus, IconX } from '@tabler/icons-react';
import type { Lang } from '@/lib/i18n';
import { formatMinute } from '@/types/scheduling';
import { DAYS, copyFor, dayName, hoursLabel, iconButton, inputClass, secondaryButton, Toggle, totalMinutes, type Hours } from './team-ui';

export function hoursAreValid(hours: Hours) {
  if (hours.length > 28) return false;
  return hours.every((h, index) => Number.isInteger(h.dayOfWeek) && h.dayOfWeek >= 0 && h.dayOfWeek <= 6 &&
    Number.isInteger(h.startMinute) && Number.isInteger(h.endMinute) && h.startMinute >= 0 && h.endMinute <= 1440 && h.startMinute < h.endMinute &&
    !hours.some((other, j) => j !== index && other.dayOfWeek === h.dayOfWeek && other.startMinute < h.endMinute && other.endMinute > h.startMinute));
}

export const timeValue = (minutes: number) => Number.isFinite(minutes) ? formatMinute(minutes === 1440 ? 0 : minutes) : '';
export function timeMinutes(value: string, end = false) {
  if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) return NaN;
  const result = hour * 60 + minute;
  return end && result === 0 ? 1440 : result;
}

export function HoursEditor({value, onChange, lang}: {value: Hours; onChange: (hours: Hours) => void; lang: Lang}) {
  const txt = copyFor(lang);
  const monday = value.filter(h => h.dayOfWeek === 1);
  const copyWeek = () => onChange([...value.filter(h => ![2, 3, 4, 5].includes(h.dayOfWeek)), ...[2, 3, 4, 5].flatMap(dayOfWeek => monday.map(h => ({...h, dayOfWeek})))]);
  const copyCount = value.filter(h => ![2, 3, 4, 5].includes(h.dayOfWeek)).length + monday.length * 4;
  const add = (dayOfWeek: number) => {
    const intervals = value.filter(h => h.dayOfWeek === dayOfWeek).sort((a, b) => a.startMinute - b.startMinute);
    const lastEnd = intervals.at(-1)?.endMinute;
    const startMinute = lastEnd === undefined ? 540 : Math.min(lastEnd + 60, 1380);
    if (lastEnd !== undefined && (!Number.isFinite(lastEnd) || lastEnd > 1380)) return;
    onChange([...value, {dayOfWeek, startMinute, endMinute: Math.min(startMinute + 180, 1440)}]);
  };
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
      <p className="text-xs text-slate-500">{txt('Horas semanais', 'Weekly hours', 'Heures hebdomadaires', "Horario semanal")} <strong className="ml-1 text-slate-800">{hoursLabel(totalMinutes(value))}</strong></p>
      <button type="button" disabled={copyCount > 28} className={secondaryButton+' min-h-9! px-2.5! py-1.5! text-xs!'} onClick={copyWeek}><IconCopy size={14}/>{txt('Copiar segunda → terça a sexta', 'Copy Monday → Tuesday–Friday', 'Copier lundi → mardi–vendredi', "Copiar lunes → martes a viernes")}</button>
    </div>
    <div className="space-y-3">{DAYS.map(day => {
      const intervals = value.map((h, index) => ({...h, index})).filter(h => h.dayOfWeek === day);
      const lastEnd = Math.max(...intervals.map(h => h.endMinute));
      const name = dayName(day, lang);
      return <div key={day} className={'rounded-xl border p-3 sm:p-4 '+(intervals.length ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/70')}>
        <div className="flex items-center justify-between gap-3"><div className="min-w-0 flex-1 capitalize"><Toggle checked={!!intervals.length} label={name} onChange={checked => checked ? add(day) : onChange(value.filter(h => h.dayOfWeek !== day))}/></div><span className="shrink-0 text-xs tabular-nums text-slate-400">{intervals.length ? hoursLabel(totalMinutes(intervals)) : txt('Fechado', 'Closed', 'Fermé', "Cerrado")}</span></div>
        {!!intervals.length && <div className="mt-3 space-y-2">{intervals.map((h, position) => <div key={h.index} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_2.5rem] items-center gap-1.5 sm:gap-3">
          <input aria-label={`${name} ${position + 1} · ${txt('Início','Start','Début', "Inicio")}`} type="time" step={60} className={inputClass+' px-2! tabular-nums'} value={timeValue(h.startMinute)} onChange={e => onChange(value.map((v, i) => i === h.index ? {...v, startMinute: timeMinutes(e.target.value)} : v))}/>
          <span className="text-xs text-slate-300">—</span>
          <input aria-label={`${name} ${position + 1} · ${txt('Fim','End','Fin', "Fin")}`} type="time" step={60} className={inputClass+' px-2! tabular-nums'} value={timeValue(h.endMinute)} onChange={e => onChange(value.map((v, i) => i === h.index ? {...v, endMinute: timeMinutes(e.target.value, true)} : v))}/>
          <button type="button" className={iconButton+' hover:text-rose-600!'} aria-label={`${txt('Remover intervalo','Remove interval','Supprimer la plage', "Eliminar intervalo")} · ${name} ${position + 1}`} onClick={() => onChange(value.filter((_, i) => i !== h.index))}><IconX size={16}/></button>
        </div>)}<button type="button" disabled={value.length >= 28 || !Number.isFinite(lastEnd) || lastEnd > 1380} onClick={() => add(day)} className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-xs font-medium text-blue-600 hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-35"><IconPlus size={14}/>{txt('Adicionar intervalo', 'Add interval', 'Ajouter une plage', "Añadir intervalo")}</button></div>}
      </div>;
    })}</div>
    <p className="text-xs leading-relaxed text-slate-400">{txt('Horário de Lisboa. Separe os intervalos para incluir pausas. Uma hora de fim 00:00 corresponde à meia-noite no final do dia.', 'Lisbon time. Use separate intervals for breaks. An end time of 00:00 means midnight at the end of the day.', 'Heure de Lisbonne. Séparez les plages pour prévoir les pauses. Une fin à 00:00 correspond à minuit en fin de journée.', "Hora de Lisboa. Use intervalos separados para los descansos. Una hora de fin de 00:00 indica la medianoche al final del día.")}</p>
  </div>;
}
