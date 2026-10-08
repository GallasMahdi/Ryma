'use client';
import { useTeamServices } from '@/components/ServiceCatalogProvider';

import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { getLocalizedText } from '@/data/services';
import type { Lang } from '@/lib/i18n';
import type { PractitionerService } from '@/types/scheduling';
import { copyFor, Field, inputClass } from './team-ui';

export function ServicePicker({value, onChange, lang, timings = false}: {value: PractitionerService[]; onChange: (value: PractitionerService[]) => void; lang: Lang; timings?: boolean}) {
  const catalogue = useTeamServices();
  const TEAM_SERVICES = [...catalogue,...value.filter(v=>!catalogue.some(s=>s.slug===v.service)).map(v=>({slug:v.service,name:{fr:v.service},duration:v.durationMinutes??30,status:'HISTORICAL',pole:'kinesitherapie' as const}))];
  const txt = copyFor(lang), [search, setSearch] = useState('');
  const filtered = TEAM_SERVICES.filter(s => getLocalizedText(s.name, lang).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="space-y-4">
    <div className="relative"><IconSearch size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/><input className={inputClass+' pl-10!'} aria-label={txt('Pesquisar tratamentos','Search treatments','Rechercher des soins')} placeholder={txt('Pesquisar tratamentos…','Search treatments…','Rechercher des soins…')} value={search} onChange={e => setSearch(e.target.value)}/></div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-slate-500">{value.length} {value.length === 1 ? txt('selecionado','selected','sélectionné') : txt('selecionados','selected','sélectionnés')}</span><div className="flex gap-4"><button type="button" className="min-h-8 font-semibold text-blue-600 hover:underline" onClick={() => onChange([...value, ...filtered.filter(s => !value.some(v => v.service === s.slug)).map(s => ({practitionerId:'',service:s.slug,durationMinutes:null,bufferBefore:0,bufferAfter:0}))])}>{txt('Selecionar visíveis','Select visible','Sélectionner les résultats')}</button><button type="button" className="min-h-8 text-slate-500 hover:underline" onClick={() => onChange(value.filter(v => !filtered.some(s => s.slug === v.service)))}>{txt('Limpar visíveis','Clear visible','Effacer les résultats')}</button></div></div>
    <div className="space-y-2">{filtered.map(service => {
      const mapping = value.find(s => s.service === service.slug), name = getLocalizedText(service.name, lang);
      return <div key={service.slug} className={'overflow-hidden rounded-xl border transition-colors '+(mapping ? 'border-blue-200 bg-blue-50/35' : 'border-slate-200 bg-white')}>
        <label className="flex cursor-pointer items-center gap-3 p-3.5"><input type="checkbox" className="size-4 shrink-0 accent-blue-600" checked={!!mapping} onChange={e => onChange(e.target.checked ? [...value,{practitionerId:'',service:service.slug,durationMinutes:null,bufferBefore:0,bufferAfter:0}] : value.filter(s => s.service !== service.slug))}/><span className="min-w-0 flex-1 text-sm font-medium text-slate-800">{name}{service.status!=='PUBLISHED'&&<small className="mt-1 block text-xs font-normal text-slate-500">{service.status==='DRAFT'?txt('Rascunho · oculto online','Draft · hidden online','Brouillon · masqué en ligne'):service.status==='ARCHIVED'?txt('Arquivado · sem novas marcações','Archived · no new bookings','Archivé · aucune nouvelle réservation'):txt('Histórico · sem novas marcações','Historical · no new bookings','Historique · aucune nouvelle réservation')}</small>}</span><span className="shrink-0 text-xs tabular-nums text-slate-400">{service.duration} min</span></label>
        {mapping && timings && <div className="grid grid-cols-3 gap-2 border-t border-blue-100 p-3.5 sm:gap-4">{(['durationMinutes', 'bufferBefore', 'bufferAfter'] as const).map((key, index) => <Field key={key} label={index === 0 ? txt('Duração','Duration','Durée') : index === 1 ? txt('Antes','Before','Avant') : txt('Depois','After','Après')}><input aria-label={`${name} · ${index === 0 ? txt('Duração','Duration','Durée') : index === 1 ? txt('Antes','Before','Avant') : txt('Depois','After','Après')}`} type="number" step={1} min={index === 0 ? 5 : 0} max={index === 0 ? 720 : 120} className={inputClass+' px-2! tabular-nums'} placeholder={index === 0 ? String(service.duration) : '0'} value={mapping[key] === null || !Number.isFinite(mapping[key]) ? '' : mapping[key]!} onChange={e => onChange(value.map(s => s.service === service.slug ? {...s, [key]: e.target.value === '' ? key === 'durationMinutes' ? null : NaN : Number(e.target.value)} : s))}/></Field>)}</div>}
      </div>;
    })}{!filtered.length && <p className="py-8 text-center text-sm text-slate-500">{txt('Nenhum tratamento encontrado.','No treatments found.','Aucun soin trouvé.')}</p>}</div>
    {timings && <p className="text-xs leading-relaxed text-slate-400">{txt('Valores em minutos. Deixe a duração vazia para usar o valor do tratamento. Os intervalos antes e depois reservam tempo de preparação e limpeza.', 'Values are in minutes. Leave duration blank to use the treatment default. Before and after buffers reserve preparation and cleanup time.', 'Valeurs en minutes. Laissez la durée vide pour utiliser celle du soin. Les marges avant et après réservent le temps de préparation et de nettoyage.')}</p>}
  </div>;
}
