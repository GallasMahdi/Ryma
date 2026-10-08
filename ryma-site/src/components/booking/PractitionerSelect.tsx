'use client';
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import type { Practitioner, PractitionerService } from '@/types/scheduling';
import { readAdminJson } from '@/lib/admin-read';

export function PractitionerSelect({value,onChange,service,lang,admin=false,allowAny='earliest',onReady,onName}:{
  value:string; onChange:(value:string)=>void; service?:string; lang:Lang; admin?:boolean;
  allowAny?:'earliest'|'all'|false; onReady?:(ready:boolean)=>void; onName?:(name:string)=>void;
}) {
  const [items,setItems]=useState<Practitioner[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false),[reload,setReload]=useState(0);
  const callbacks=useRef({onChange,onReady,value});callbacks.current={onChange,onReady,value};
  const txt=(pt:string,en:string,fr:string)=>lang==='pt'?pt:lang==='fr'?fr:en;
  useEffect(()=>{const refresh=()=>setReload(n=>n+1);window.addEventListener('ryma_schedule_changed',refresh);return()=>window.removeEventListener('ryma_schedule_changed',refresh);},[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError(false);callbacks.current.onReady?.(false);
    (admin ? readAdminJson<{practitioners:Practitioner[];services:PractitionerService[]}>('/api/admin/practitioners',30000) : fetch(`/api/practitioners${service?'?service='+encodeURIComponent(service):''}`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}))
      .then(data=>{
        if(controller.signal.aborted)return;
        const list:Practitioner[]=admin?data.practitioners.filter((p:Practitioner)=>(allowAny==='all'||p.active)&&(!service||data.services.some((s:PractitionerService)=>s.practitionerId===p.id&&s.service===service))):data.practitioners;
        setItems(list);
        const current=callbacks.current.value;
        if(allowAny!=='all'&&list.length===1)callbacks.current.onChange(list[0].id);
        else if(current&&!list.some(p=>p.id===current))callbacks.current.onChange('');
        callbacks.current.onReady?.(list.length>0);setLoading(false);
      }).catch(()=>{if(!controller.signal.aborted){setError(true);setLoading(false);callbacks.current.onReady?.(false);}});
    return()=>controller.abort();
  },[service,admin,allowAny,reload]);
  useEffect(()=>{onName?.(items.find(p=>p.id===value)?.name||'');},[items,value,onName]);
  return <div className="space-y-1.5 text-sm">
    <label className="block font-semibold text-slate-700">
      {txt('Profissional','Practitioner','Praticien')}
      <select aria-label={txt('Profissional','Practitioner','Praticien')} value={value} onChange={e=>onChange(e.target.value)} disabled={loading||error||items.length===0} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900 disabled:opacity-60">
        {loading?<option value="">{txt('A carregar…','Loading…','Chargement…')}</option>:allowAny?<option value="">{allowAny==='all'?txt('Todos os profissionais','All practitioners','Tous les praticiens'):txt('Primeira disponibilidade','Earliest available','Premier créneau disponible')}</option>:<option value="">{txt('Escolha um profissional','Choose a practitioner','Choisissez un praticien')}</option>}
        {items.map(p=><option key={p.id} value={p.id}>{p.name}{p.active===0?' · '+txt('Arquivado','Archived','Archivé'):''}</option>)}
      </select>
    </label>
    {error?<button type="button" onClick={()=>setReload(n=>n+1)} className="text-red-700 underline">{txt('Falha ao carregar. Tentar novamente.','Could not load practitioners. Retry.','Chargement impossible. Réessayer.')}</button>:!loading&&!items.length?<p role="status" className="text-amber-800">{txt('Sem profissionais disponíveis para este tratamento.','No practitioners available for this treatment.','Aucun praticien disponible pour ce soin.')}</p>:null}
  </div>;
}
