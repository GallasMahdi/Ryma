'use client';
import { useServiceLabels } from '@/components/ServiceCatalogProvider';
import { useEffect,useState } from 'react';
import type { Lang } from '@/lib/i18n';
import type { SchedulingConfiguration } from '@/types/scheduling';
import { formatMinute } from '@/types/scheduling';
import { practitionerIntervals } from '@/lib/schedule-math';
import { clockMinutes } from '@/lib/booking-schedule';
import { type Appointment, STATUS_CONFIG } from '@/types/admin';
import { readAdminJson } from '@/lib/admin-read';

export function TeamDayAgenda({date,appointments,practitionerId,onSelect,lang}:{date:string;appointments:Appointment[];practitionerId?:string;onSelect:(a:Appointment)=>void;lang:Lang}) {
  const { getServiceName } = useServiceLabels();
  const [blocks,setBlocks]=useState<{id:string;time:string;practitionerId:string}[]>([]);
  const [blocksError,setBlocksError]=useState(false),[blocksDate,setBlocksDate]=useState('');
  const [configuration,setConfiguration]=useState<SchedulingConfiguration|null>(null),[error,setError]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setBlocksError(false);
    readAdminJson<{blocks:typeof blocks}>('/api/admin/slots?date='+date,15000).then(d=>{if(controller.signal.aborted)return;if(!Array.isArray(d.blocks))throw Error();setBlocks(d.blocks);setBlocksDate(date);}).catch(()=>{if(!controller.signal.aborted)setBlocksError(true);});
    return()=>controller.abort();
  },[date,reload]);
  useEffect(()=>{const update=()=>setReload(n=>n+1);window.addEventListener('ryma_schedule_changed',update);return()=>window.removeEventListener('ryma_schedule_changed',update);},[]);
  useEffect(()=>{const controller=new AbortController();setError(false);readAdminJson<SchedulingConfiguration>('/api/admin/practitioners',30000).then(data=>{if(!controller.signal.aborted)setConfiguration(data);}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[reload]);
  const txt=(pt:string,en:string,fr:string, es: string)=>lang === 'es' ? es : lang==='pt'?pt:lang==='fr'?fr:en;
  if(error||blocksError)return <button type="button" onClick={()=>setReload(n=>n+1)} className="rounded-xl border p-4 text-sm text-red-700">{txt('Falha ao carregar. Tentar novamente.','Could not load the agenda. Retry.','Chargement impossible. Réessayer.', "No se ha podido cargar la agenda. Vuelva a intentarlo.")}</button>;
  if(!configuration||blocksDate!==date)return <p role="status" className="p-4 text-sm">{txt('A carregar agenda…','Loading agenda…','Chargement de l’agenda…', "Cargando agenda…")}</p>;
  const rows=appointments.filter(a=>a.date===date&&a.status!=='CANCELLED');
  const practitioners=configuration.practitioners.filter(p=>(!practitionerId||p.id===practitionerId)&&(p.active||rows.some(a=>a.practitionerId===p.id)));
  const boundaries=practitioners.flatMap(p=>practitionerIntervals(configuration,p.id,date).flat());
  const min=Math.floor(Math.min(...boundaries,...rows.map(a=>clockMinutes(a.startTime)),510)/60)*60;
  const max=Math.ceil(Math.max(...boundaries,...rows.map(a=>clockMinutes(a.startTime)+a.durationMinutes),1050)/60)*60;
  const scale=1.2,height=(max-min)*scale;
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" aria-label={txt('Agenda da equipa','Team agenda','Agenda de l’équipe', "Agenda del equipo")}>
    <div style={{minWidth:Math.max(350,practitioners.length*210+64)}}>
      <div className="grid border-b" style={{gridTemplateColumns:`64px repeat(${practitioners.length},minmax(0,1fr))`}}><div className="p-3 text-xs text-slate-500">Lisboa</div>{practitioners.map(p=><div key={p.id} className="border-l p-3"><p className="truncate text-sm font-semibold"><span style={{color:p.color}}>●</span> {p.name}</p><p className="truncate text-xs text-slate-500">{p.profession}</p></div>)}</div>
      <div className="grid" style={{gridTemplateColumns:`64px repeat(${practitioners.length},minmax(0,1fr))`}}>
        <div className="relative bg-white" style={{height}}>{Array.from({length:(max-min)/30},(_,i)=>min+i*30).map(minute=><span key={minute} className="absolute left-2 text-[11px] text-slate-500" style={{top:(minute-min)*scale+3}}>{formatMinute(minute)}</span>)}</div>
        {practitioners.map(p=><div key={p.id} className="relative overflow-hidden border-l bg-slate-100" style={{height}}>
          {practitionerIntervals(configuration,p.id,date).map(([s,e],i)=><div key={i} className="absolute inset-x-0 bg-white" style={{top:(s-min)*scale,height:(e-s)*scale}}/>)}
          {Array.from({length:(max-min)/30},(_,i)=><div key={i} className="pointer-events-none absolute inset-x-0 border-t border-slate-200/70" style={{top:i*30*scale}}/>)}
          {configuration.exceptions.filter(e=>e.date===date&&e.kind==='closed'&&(e.practitionerId==='*'||e.practitionerId===p.id)).map(e=><div key={e.id} className="absolute inset-x-1 overflow-hidden rounded bg-slate-200/80 p-1 text-[10px] text-slate-600" style={{top:Math.max(0,e.startMinute-min)*scale,height:Math.max(0,Math.min(max,e.endMinute)-Math.max(min,e.startMinute))*scale}}>{e.label||txt('Indisponível','Unavailable','Indisponible', "No disponible")}</div>)}
          {blocks.filter(b=>b.practitionerId==='*'||b.practitionerId===p.id).map(b=><div key={b.id} className="absolute inset-x-1 overflow-hidden rounded bg-slate-300 p-1 text-[10px] text-slate-700" style={{top:(clockMinutes(b.time)-min)*scale,height:30*scale}}>{txt('Bloqueado','Blocked','Bloqué', "Bloqueado")}</div>)}
          {rows.filter(a=>a.practitionerId===p.id&&(a.bufferBefore||a.bufferAfter)).map(a=><div key={'buffer'+a.id} className="absolute inset-x-1 rounded-lg bg-slate-200" title={txt('Tempo de preparação','Preparation time','Temps de préparation', "Tiempo de preparación")} style={{top:(clockMinutes(a.startTime)-a.bufferBefore-min)*scale,height:(a.durationMinutes+a.bufferBefore+a.bufferAfter)*scale}}/>)}
          {rows.filter(a=>a.practitionerId===p.id).map(a=><button key={a.id} type="button" onClick={()=>onSelect(a)} className={'absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-left shadow-sm '+STATUS_CONFIG[a.status].bg} style={{top:(clockMinutes(a.startTime)-min)*scale,height:Math.max(22,a.durationMinutes*scale-2),borderLeftColor:p.color}} title={`${a.patientName} · ${p.name} · ${getServiceName(a.service,lang, a)}`}><span className="block truncate text-[11px] font-semibold text-slate-800">{a.startTime} · {a.patientName}</span><span className="block truncate text-[10px] text-slate-600">{getServiceName(a.service,lang, a)}</span><span className="block truncate text-[10px] text-slate-600">{STATUS_CONFIG[a.status][lang]} · {a.durationMinutes} min</span></button>)}
        </div>)}
      </div>
    </div>
  </div>;
}
