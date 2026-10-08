'use client';
import { useEffect,useRef,useState } from 'react';
import { PractitionerSelect } from '@/components/booking/PractitionerSelect';
import type { Appointment,SlotInfo } from '@/types/admin';
import type { Lang } from '@/lib/i18n';
export function RescheduleAppointment({appointment,lang,onSaved}:{appointment:Appointment;lang:Lang;onSaved:()=>void}) {
  const [practitionerId,setPractitionerId]=useState(appointment.practitionerId),[date,setDate]=useState(appointment.date),[time,setTime]=useState(appointment.startTime),[slots,setSlots]=useState<SlotInfo[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const [ready,setReady]=useState(false),[reload,setReload]=useState(0),[loadedQuery,setLoadedQuery]=useState('');
  const saveLock=useRef(false);
  const query=JSON.stringify([date,practitionerId,appointment.id,appointment.service,appointment.version,reload]);
  const txt=(pt:string,en:string,fr:string)=>lang==='pt'?pt:lang==='fr'?fr:en;
  useEffect(()=>{const refresh=()=>setReload(n=>n+1);window.addEventListener('ryma_schedule_changed',refresh);return()=>window.removeEventListener('ryma_schedule_changed',refresh);},[]);
  useEffect(()=>{
    setSlots([]);setLoadedQuery('');
    if(!date||!practitionerId){setLoading(false);return;}
    const controller=new AbortController();setLoading(true);setError('');
    fetch(`/api/admin/slots?${new URLSearchParams({date,practitionerId,service:appointment.service,excludeId:appointment.id})}`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(controller.signal.aborted)return;if(!Array.isArray(data.slots))throw Error();setSlots(data.slots);setLoadedQuery(query);setLoading(false);}).catch(()=>{if(!controller.signal.aborted){setError(txt('Não foi possível carregar os horários.','Could not load availability.','Impossible de charger les horaires.'));setLoading(false);}});
    return()=>controller.abort();
  },[date,practitionerId,appointment.id,appointment.service,query,lang]);
  const canSave=ready&&!loading&&loadedQuery===query&&!!practitionerId&&slots.some(s=>s.time===time&&s.available);
  const save=async()=>{
    if(saveLock.current||!canSave)return;
    saveLock.current=true;
    setBusy(true);setError('');
    try{const response=await fetch('/api/admin/appointments/'+appointment.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({practitionerId,date,startTime:time,expectedVersion:appointment.version})});const result=await response.json();if(!response.ok)throw Error(result.error);window.dispatchEvent(new Event('ryma_schedule_changed'));onSaved();}
    catch(e){setError((e as Error).message);}finally{saveLock.current=false;setBusy(false);}
  };
  return <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold">{txt('Alterar profissional ou horário','Change practitioner or time','Changer de praticien ou d’horaire')}</summary><div className="mt-3 space-y-3">
    <PractitionerSelect admin allowAny={false} value={practitionerId} onChange={setPractitionerId} onReady={setReady} service={appointment.service} lang={lang}/>
    <label className="block text-sm">{txt('Data','Date','Date')}<input aria-label="Appointment date" type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 block w-full rounded-lg border p-2"/></label>
    <label className="block text-sm">{txt('Hora','Time','Heure')}<select aria-label="Appointment time" value={time} disabled={loading} onChange={e=>setTime(e.target.value)} className="mt-1 block w-full rounded-lg border p-2"><option value="">{loading?txt('A carregar…','Loading…','Chargement…'):txt('Escolha uma hora','Choose a time','Choisissez une heure')}</option>{slots.filter(s=>s.available||s.time===time).map(s=><option key={s.time} value={s.time} disabled={!s.available}>{s.time}{!s.available?' · '+txt('Indisponível','Unavailable','Indisponible'):''}</option>)}</select></label>
    {error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" disabled={busy||loading} onClick={()=>setReload(n=>n+1)} className="mt-1 underline">{txt('Recarregar disponibilidade','Reload availability','Recharger les disponibilités')}</button></div>}
    <button type="button" onClick={save} disabled={busy||!canSave} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{txt('Guardar alteração','Save change','Enregistrer')}</button>
  </div></details>;
}
