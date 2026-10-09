'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconAlertTriangle, IconCheck, IconLoader2, IconX } from '@tabler/icons-react';

import type { Lang } from '@/lib/i18n';
import type { WorkingInterval } from '@/types/scheduling';
import styles from './team.module.css';

export type Hours = Omit<WorkingInterval, 'practitionerId'>[];
export type Copy = (pt: string, en: string, fr: string, es: string) => string;
export const copyFor = (lang: Lang): Copy => (pt, en, fr, es) => lang === 'es' ? es : lang === 'pt' ? pt : lang === 'fr' ? fr : en;
export const localeFor = (lang: Lang) => lang === 'es' ? "es-ES" : lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB';
export const DAYS = [1, 2, 3, 4, 5, 6, 0];
export const dayName = (day: number, lang: Lang, short = false) => new Intl.DateTimeFormat(localeFor(lang), { weekday: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 9, 4 + day))).replace('.', '');
export const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '+';
export const hoursLabel = (minutes: number) => Number.isFinite(minutes) ? `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, '0') : ''}` : '—';
export const totalMinutes = (hours: Hours) => hours.reduce((sum, h) => sum + Math.max(0, h.endMinute - h.startMinute), 0);

export const inputClass = 'min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400';
export const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-45';
export const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-40';
export const iconButton = 'inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-35';
export const panelClass = 'min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-xs';

export interface SaveFailure { message: string; code?: string; conflicts?: {id: string; date: string; startTime: string; practitionerId: string; practitionerName?: string}[] }
export class TeamSaveError extends Error {
  constructor(public details: SaveFailure) { super(details.message); }
}
export type SaveTeam = (body: Record<string, unknown>, revision: number) => Promise<void>;

export function Field({label, hint, children}: {label: string; hint?: string; children: ReactNode}) {
  return <label className="block min-w-0 space-y-1.5"><span className="block text-xs font-semibold text-slate-600">{label}</span>{children}{hint && <span className="block text-xs leading-relaxed text-slate-400">{hint}</span>}</label>;
}

export function Toggle({checked, onChange, label, description}: {checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string}) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
    <span className="min-w-0"><span className="block text-sm font-medium text-slate-800">{label}</span>{description && <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>}</span>
    <span className="relative inline-flex shrink-0"><input className="peer sr-only" type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label}/><span className="h-6 w-10 rounded-full bg-slate-200 transition-colors peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-blue-500 peer-disabled:opacity-40"/><span className="pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"/></span>
  </label>;
}

export function EmptyState({icon, title, description, action}: {icon: ReactNode; title: string; description: string; action?: ReactNode}) {
  return <div className="flex flex-col items-center px-5 py-12 text-center"><div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">{icon}</div><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

/** Keep keyboard focus in the modal and restore its opener before unmounting. */
export function EditorDialog({title, subtitle, icon, children, dirty, busy, onClose, onSubmit, submitLabel, failure, onReload, lang, allowUnchanged = false}: {
  title: string; subtitle: string; icon: ReactNode; children: ReactNode; dirty: boolean; busy: boolean; onClose: () => void;
  onSubmit: () => void; submitLabel: string; failure: SaveFailure | null; onReload: () => Promise<void>; lang: Lang; allowUnchanged?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId(), txt = copyFor(lang);
  const [discard, setDiscard] = useState(false);
  const [reloading, setReloading] = useState(false), [reloadError, setReloadError] = useState('');
  useLayoutEffect(() => {
    const node = ref.current, opener = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => {node?.close(); if (opener?.isConnected) opener.focus({preventScroll:true});};
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (failure) ref.current?.querySelector('[role="alert"]')?.scrollIntoView({block: 'nearest'}); }, [failure]);
  const close = () => { if (!busy && !reloading) { if (dirty) setDiscard(true); else onClose(); } };
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={e => {e.preventDefault(); close();}} onClick={e => {if (e.target === ref.current) close();}} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')].filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first) {e.preventDefault(); return;}
    if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last?.focus();}
    else if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first.focus();}
  }} className={styles.dialog}>
    <form onSubmit={e => {e.preventDefault(); if (!busy && !reloading && (dirty || allowUnchanged)) onSubmit();}} className="flex h-full max-h-[inherit] min-h-0 flex-col" noValidate>
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div>
        <div className="min-w-0 flex-1"><h2 id={titleId} className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div>
        <button type="button" disabled={busy || reloading} className={iconButton} onClick={close} aria-label={txt('Fechar editor', 'Close editor', 'Fermer l’éditeur', "Cerrar editor")}><IconX size={19}/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
        {failure && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <div className="flex gap-2.5"><IconAlertTriangle size={18} className="mt-0.5 shrink-0"/><div className="min-w-0"><p className="font-medium">{failure.message}</p>
            {!!failure.conflicts?.length && <div className="mt-3 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">{failure.conflicts.map(a => <span key={a.id} className="rounded-md bg-white/70 px-2 py-1 text-xs tabular-nums">{new Intl.DateTimeFormat(localeFor(lang), {day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(a.date+'T12:00:00Z'))} · {a.startTime}{a.practitionerName && ` · ${a.practitionerName}`}</span>)}</div>}
            {failure.code === 'SCHEDULE_CHANGED' && <><p className="mt-2 text-xs">{txt('Recarregar substitui este rascunho pelos dados atuais.','Reloading replaces this draft with the current saved settings.','Recharger remplace ce brouillon par les paramètres enregistrés.', "Al recargar se sustituirá este borrador por la configuración guardada actualmente.")}</p><button type="button" disabled={busy || reloading} className="mt-3 font-semibold underline underline-offset-4 disabled:opacity-40" onClick={async () => {setReloading(true);setReloadError('');try {await onReload();} catch (error) {setReloadError((error as Error).message);} finally {setReloading(false);}}}>{reloading ? txt('A recarregar…','Reloading…','Rechargement…', "Recargando…") : txt('Recarregar dados', 'Reload settings', 'Recharger les données', "Recargar configuración")}</button>{reloadError && <p role="alert" className="mt-2 text-xs">{reloadError}</p>}</>}
          </div></div>
        </div>}
        <fieldset disabled={busy || reloading} className="min-w-0">{children}</fieldset>
      </div>
      <footer className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
        {discard ? <div role="alert" className="space-y-3"><p className="text-sm font-medium text-slate-800">{txt('Descartar as alterações não guardadas?', 'Discard unsaved changes?', 'Abandonner les modifications non enregistrées ?', "¿Descartar los cambios sin guardar?")}</p><div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondaryButton} onClick={() => setDiscard(false)}>{txt('Continuar a editar', 'Keep editing', 'Continuer à modifier', "Seguir editando")}</button><button type="button" className={primaryButton} onClick={onClose}>{txt('Descartar', 'Discard', 'Abandonner', "Descartar")}</button></div></div> :
          <div className="flex flex-wrap items-center justify-between gap-3"><span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">{dirty ? <><span className="size-1.5 rounded-full bg-amber-400"/>{txt('Alterações por guardar','Unsaved changes','Modifications non enregistrées', "Cambios sin guardar")}</> : <><IconCheck size={14}/>{txt('Tudo atualizado','Up to date','À jour', "Al día")}</>}</span><div className="flex w-full gap-2 sm:w-auto"><button type="button" disabled={busy || reloading} className={secondaryButton+' flex-1 sm:flex-none'} onClick={close}>{txt('Cancelar','Cancel','Annuler', "Cancelar")}</button><button type="submit" disabled={busy || reloading || (!dirty && !allowUnchanged)} className={primaryButton+' flex-1 sm:flex-none'}>{busy ? <IconLoader2 size={17} className="animate-spin motion-reduce:animate-none"/> : <IconCheck size={17}/>} {busy ? txt('A guardar…','Saving…','Enregistrement…', "Guardando…") : submitLabel}</button></div></div>}
      </footer>
    </form>
  </dialog>;
}

export function Tabs<T extends string>({items, value, onChange, label, children}: {items: {id: T; label: string; icon?: ReactNode; count?: number}[]; value: T; onChange: (value: T) => void; label: string; children: ReactNode}) {
  const id = useId();
  return <div className="min-w-0 space-y-5"><div role="tablist" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100/70 p-1" onKeyDown={e => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const current = items.findIndex(item => item.id === value);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (current + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
    onChange(items[next].id);
    (e.currentTarget.children[next] as HTMLElement).focus();
  }}>{items.map(item => <button key={item.id} type="button" role="tab" id={`${id}-${item.id}`} aria-controls={`${id}-panel`} aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)} className={'flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 sm:px-4 sm:text-sm '+(value === item.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800')}>{item.icon}{item.label}{item.count !== undefined && <span className={'rounded-md px-1.5 py-0.5 text-[10px] tabular-nums '+(value === item.id ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/60 text-slate-500')}>{item.count}</span>}</button>)}</div><div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${value}`} tabIndex={0} className="min-w-0 outline-none focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-blue-400">{children}</div></div>;
}
