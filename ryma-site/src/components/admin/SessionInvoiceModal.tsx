'use client';
import { exportLabel } from '@/lib/export-i18n';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveModal } from './ResponsiveModal';
import type { Lang } from '@/lib/i18n';
import type { BillableSession, CreateInvoiceInput, Invoice, PatientRecord, PaymentMethod } from '@/types/admin';

type Line = { visit: BillableSession; price: string; vatRate: number; reason: string };
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-600 focus:outline-none';
const euro = (cents: number) => (cents / 100).toFixed(2) + ' €';
const cents = (value: string) => /^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) ? Math.round(Number(value.replace(',','.')) * 100) : NaN;

export function SessionInvoiceModal({ isOpen, onClose, onCreated, onSingle, lang, patients, prefilledData }: {
  isOpen: boolean; onClose: () => void; onCreated: (invoice: Invoice) => void; onSingle: () => void;
  lang: Lang; patients: PatientRecord[]; prefilledData?: Partial<CreateInvoiceInput> | null;
}) {
  const txt = (fr:string,en:string,pt:string, es: string) => lang === 'es' ? es : lang==='fr'?fr:lang==='en'?en:pt;
  const [patientId,setPatientId] = useState(''), [patientName,setPatientName] = useState('');
  const [search,setSearch] = useState(''), [matches,setMatches] = useState<PatientRecord[]>([]);
  const [sessions,setSessions] = useState<BillableSession[]>([]), [selected,setSelected] = useState<Record<string,Line>>({});
  const [page,setPage] = useState(1), [hasMore,setHasMore] = useState(false), [dateFrom,setDateFrom] = useState(''), [dateTo,setDateTo] = useState('');
  const [loading,setLoading] = useState(false), [error,setError] = useState(''), [reload,setReload] = useState(0);
  const [nif,setNif] = useState(''), [address,setAddress] = useState(''), [reference,setReference] = useState(''), [notes,setNotes] = useState('');
  const [exemption,setExemption] = useState(''), [method,setMethod] = useState<PaymentMethod>('MULTIBANCO'), [paid,setPaid] = useState(false);
  const [reviewing,setReviewing] = useState(false), [saving,setSaving] = useState(false);
  const inFlight = useRef(false), intent = useRef({body:'',key:''});
  const initialPatientId = prefilledData?.patientId || '';
  useEffect(() => {
    if (!isOpen) return;
    setPatientId(initialPatientId); setPatientName(prefilledData?.patientName||''); setSearch(''); setMatches([]);
    setSelected({}); setSessions([]); setPage(1); setHasMore(false); setDateFrom(''); setDateTo(''); setError('');
    setNif(prefilledData?.patientNif||''); setAddress(prefilledData?.patientAddress||''); setReference(''); setNotes('');
    setExemption(''); setMethod('MULTIBANCO'); setPaid(false); setReviewing(false); intent.current={body:'',key:''};
  // Reopening starts a new draft; background patient-list refreshes must preserve it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isOpen,initialPatientId]);

  useEffect(() => {
    if (!isOpen || patientId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/patients?directory=1&limit=20&search='+encodeURIComponent(search),{signal:controller.signal,cache:'no-store'});
        if (!res.ok) throw Error();
        const data = await res.json(); if (!controller.signal.aborted) setMatches(data.patients||[]);
      } catch { if (!controller.signal.aborted) setMatches(patients.filter(p=>p.patientName.toLowerCase().includes(search.toLowerCase())).slice(0,20)); }
    },200);
    return () => {clearTimeout(timer);controller.abort();};
  },[isOpen,patientId,search,patients]);

  useEffect(() => {
    if (!isOpen || !patientId) return;
    const controller = new AbortController(); setLoading(true); setError('');
    const query = new URLSearchParams({page:String(page),limit:'50'});
    if(dateFrom)query.set('dateFrom',dateFrom); if(dateTo)query.set('dateTo',dateTo);
    fetch(`/api/admin/patients/${encodeURIComponent(patientId)}/billing-sessions?${query}`,{signal:controller.signal,cache:'no-store'})
      .then(async res=>{const data=await res.json();if(!res.ok)throw Error(data.error);return data;})
      .then(data=>{if(controller.signal.aborted)return;setPatientName(data.patient.patientName);setSessions(previous=>page===1?data.sessions:[...previous,...data.sessions.filter((s:BillableSession)=>!previous.some(p=>p.key===s.key))]);setHasMore(data.hasMore);})
      .catch(()=>{if(!controller.signal.aborted)setError(txt('Impossible de charger les séances. Réessayez.','Unable to load sessions. Please retry.','Não foi possível carregar as sessões. Tente novamente.', "No se han podido cargar las sesiones. Vuelva a intentarlo."));})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  // Language changes do not invalidate a selected billing draft.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isOpen,patientId,dateFrom,dateTo,page,reload]);

  const lines = Object.values(selected), count = lines.length;
  const total = lines.reduce((sum,line)=>sum+(cents(line.price)||0),0);
  const tax = useMemo(()=>lines.reduce((sum,line)=>{const gross=cents(line.price)||0;return sum+gross-Math.round(gross*100/(100+line.vatRate));},0),[lines]);
  const allVisibleSelected = sessions.filter(s=>!s.invoiceId).every(s=>selected[s.key]);
  function toggle(visit:BillableSession) {
    setReviewing(false);
    setSelected(previous=>{
      const next={...previous};
      if(next[visit.key])delete next[visit.key];
      else if(Object.keys(next).length<100)next[visit.key]={visit,price:visit.unitPriceCents===null?'':(visit.unitPriceCents/100).toFixed(2),vatRate:0,reason:''};
      return next;
    });
  }
  function changeLine(key:string,patch:Partial<Line>) {setReviewing(false);setSelected(previous=>({...previous,[key]:{...previous[key],...patch}}));}
  function changeDates(from:string,to:string) {setDateFrom(from);setDateTo(to);setPage(1);setSessions([]);setSelected({});setReviewing(false);}
  function friendly(code:string,fallback:string) {
    if(['ALREADY_INVOICED','SESSION_CHANGED','SESSION_UNAVAILABLE'].includes(code))return txt('Une séance a changé ou a déjà été facturée. Actualisez la liste avant de continuer.','A session changed or was already invoiced. Refresh the list before continuing.','Uma sessão mudou ou já foi faturada. Atualize a lista antes de continuar.', "Una sesión ha cambiado o ya se ha facturado. Actualice la lista antes de continuar.");
    return fallback || txt('Impossible d’enregistrer le document. Réessayez.','Unable to save the document. Please retry.','Não foi possível guardar o documento. Tente novamente.', "No se ha podido guardar el documento. Vuelva a intentarlo.");
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault(); if(inFlight.current)return;
    if(!count||count>100||lines.some(line=>!Number.isSafeInteger(cents(line.price))||cents(line.price)<=0)||total>5000000){setError(txt('Sélectionnez 1 à 100 séances et vérifiez les prix (maximum 50 000 €).','Select 1–100 sessions and check the prices (maximum €50,000).','Selecione 1–100 sessões e verifique os preços (máximo 50 000 €).', "Seleccione entre 1 y 100 sesiones y revise los precios (máximo 50.000 €)."));return;}
    if(!reviewing){setError('');setReviewing(true);return;}
    const body=JSON.stringify({patientId,patientNif:nif.trim()||undefined,patientAddress:address.trim(),externalReference:reference.trim(),notes:notes.trim(),paymentMethod:method,paymentStatus:paid?'PAID':'PENDING',sessions:lines.map(line=>({key:line.visit.key,version:line.visit.version,unitPriceCents:cents(line.price),vatRate:line.vatRate,vatExemptionReason:line.vatRate===0?exemption.trim():undefined,priceAdjustmentReason:line.reason.trim()||undefined}))});
    if(intent.current.body!==body)intent.current={body,key:crypto.randomUUID()};
    inFlight.current=true;setSaving(true);setError('');
    try {
      const res=await fetch('/api/admin/invoices/sessions',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':intent.current.key},body});
      const data=await res.json();if(!res.ok)throw Error(friendly(data.code,data.error));
      onCreated(data.invoice);onClose();
    } catch(err){setError((err as Error).message);}
    finally{inFlight.current=false;setSaving(false);}
  }

  return <ResponsiveModal isOpen={isOpen} onClose={()=>{if(!inFlight.current)onClose();}} lang={lang} maxWidth="2xl"
    title={txt('Facturer les séances','Bill completed sessions','Faturar sessões', "Facturar sesiones completadas")}
    subtitle={txt('Un patient, plusieurs séances, un seul document.','One patient, several sessions, one document.','Um utente, várias sessões, um documento.', "Un paciente, varias sesiones, un documento.")}>
    <form onSubmit={submit} className="space-y-5 text-sm text-slate-700">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed">{txt('Document de facturation interne. La facture fiscale officielle reste émise dans le système choisi par la clinique.','Internal billing document. The official fiscal invoice is issued through the clinic’s chosen system.','Documento de faturação interno. A fatura fiscal é emitida no sistema escolhido pela clínica.', "Documento interno de facturación. La factura fiscal oficial se emite a través del sistema elegido por la clínica.")}</p>
      <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
        {!patientId ? <section className="space-y-2">
          <label className="block font-semibold">{txt('Patient','Patient','Utente', "Paciente")}<input className={field+' mt-2'} value={search} onChange={e=>setSearch(e.target.value)} placeholder={txt('Rechercher par nom ou téléphone','Search by name or phone','Pesquisar nome ou telefone', "Buscar por nombre o teléfono")} /></label>
          <div className="max-h-64 overflow-y-auto divide-y rounded-xl border border-slate-200">{matches.map(patient=><button key={patient.id} type="button" onClick={()=>{setPatientId(patient.id);setPatientName(patient.patientName);setSelected({});setPage(1);}} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"><span className="font-medium">{patient.patientName}</span><span className="text-xs text-slate-500">{patient.phone}</span></button>)}</div>
          <button type="button" onClick={onSingle} className="text-xs underline underline-offset-4">{txt('Créer un document pour une prestation unique','Create a single-service document','Criar documento de um serviço', "Crear un documento de un solo servicio")}</button>
        </section> : <>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-4"><div><p className="text-xs text-slate-500">{txt('Patient','Patient','Utente', "Paciente")}</p><p className="font-semibold text-slate-950">{patientName}</p></div>{!initialPatientId&&!reviewing&&<button type="button" onClick={()=>{setPatientId('');setSelected({});setSessions([]);setPage(1);}} className="text-xs underline">{txt('Changer','Change','Alterar', "Cambiar")}</button>}</div>
          {!reviewing&&<section className="space-y-3">
            <div className="grid grid-cols-2 gap-3"><label>{txt('Du','From','De', "Desde")}<input type="date" className={field+' mt-1'} value={dateFrom} onChange={e=>changeDates(e.target.value,dateTo)} /></label><label>{txt('Au','To','Até', "Hasta")}<input type="date" className={field+' mt-1'} value={dateTo} onChange={e=>changeDates(dateFrom,e.target.value)} /></label></div>
            <div className="flex items-center justify-between gap-2"><p className="font-semibold">{txt('Séances réalisées','Completed sessions','Sessões realizadas', "Sesiones completadas")}</p><button type="button" disabled={loading||!sessions.some(s=>!s.invoiceId)} onClick={()=>{setSelected(previous=>{const next={...previous};for(const visit of sessions.filter(s=>!s.invoiceId)){if(allVisibleSelected)delete next[visit.key];else if(Object.keys(next).length<100&&!next[visit.key])next[visit.key]={visit,price:visit.unitPriceCents===null?'':(visit.unitPriceCents/100).toFixed(2),vatRate:0,reason:''};}return next;});}} className="text-xs font-semibold underline disabled:opacity-40">{allVisibleSelected?txt('Désélectionner la page','Deselect page','Desmarcar página', "Deseleccionar página"):txt('Sélectionner les non facturées','Select unbilled sessions','Selecionar não faturadas', "Seleccionar sesiones sin facturar")}</button></div>
            {loading&&<p role="status">{txt('Chargement…','Loading…','A carregar…', "Cargando…")}</p>}
            {!loading&&!sessions.length&&<p className="rounded-xl border border-dashed p-5 text-center text-slate-500">{txt('Aucune séance réalisée dans cette période. Les séances prévues ne sont pas facturables ici.','No completed sessions in this period. Planned sessions are not billable here.','Sem sessões realizadas neste período. As sessões planeadas não são faturáveis aqui.', "No hay sesiones completadas en este periodo. Las sesiones previstas no se pueden facturar aquí.")}</p>}
            <div className="max-h-64 space-y-2 overflow-y-auto">{sessions.map(visit=><label key={visit.key} className={'flex items-start gap-3 rounded-xl border p-3 '+(visit.invoiceId?'border-slate-100 bg-slate-50 text-slate-400':selected[visit.key]?'border-slate-500 bg-slate-50':'border-slate-200')}>
              <input type="checkbox" className="mt-1 accent-slate-800" aria-label={`${visit.date} ${visit.startTime||''} ${visit.serviceName}`} disabled={!!visit.invoiceId||(!selected[visit.key]&&count>=100)} checked={!!selected[visit.key]} onChange={()=>toggle(visit)} />
              <span className="min-w-0 flex-1"><span className="block font-medium">{visit.serviceName}</span><span className="block text-xs">{visit.date} {visit.startTime} · {visit.practitioner}</span>{visit.invoiceId&&<span className="block text-xs">{txt('Déjà facturée','Already invoiced','Já faturada', "Ya facturada")} · {visit.invoiceNumber}</span>}</span><span className="shrink-0 text-xs font-semibold">{visit.unitPriceCents!==null?euro(visit.unitPriceCents):txt('Prix à renseigner','Enter price','Indicar preço', "Introducir precio")}</span>
            </label>)}</div>
            {hasMore&&<button type="button" disabled={loading} onClick={()=>setPage(p=>p+1)} className="w-full rounded-lg border px-3 py-2">{txt('Charger plus de séances','Load more sessions','Carregar mais sessões', "Cargar más sesiones")}</button>}
            <p className="text-xs text-slate-500">{txt('100 séances maximum par document. Chaque séance est comptée une seule fois.','Up to 100 sessions per document. Each visit is counted once.','Até 100 sessões por documento. Cada visita é contada uma vez.', "Hasta 100 sesiones por documento. Cada visita se cuenta una sola vez.")}</p>
          </section>}
          {count>0&&<section className="space-y-3">
            <h3 className="font-semibold text-slate-950">{txt('Séances sélectionnées','Selected sessions','Sessões selecionadas', "Sesiones seleccionadas")} ({count})</h3>
            {lines.map(line=><div key={line.visit.key} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex justify-between gap-2"><p className="text-xs"><strong>{line.visit.serviceName}</strong><br/>{line.visit.date} · {line.visit.practitioner}</p>{!reviewing&&<button type="button" onClick={()=>toggle(line.visit)} className="self-start text-xs underline">{txt('Retirer','Remove','Remover', "Quitar")}</button>}</div>
              <div className="grid grid-cols-2 gap-3"><label className="text-xs">{txt('Prix TTC (€)','Price incl. VAT (€)','Preço c/ IVA (€)', "Precio con IVA (€)")}<input aria-label={`${txt('Prix','Price','Preço', "Precio")} ${line.visit.key}`} required inputMode="decimal" readOnly={reviewing} value={line.price} onChange={e=>changeLine(line.visit.key,{price:e.target.value})} className={field+' mt-1'}/></label><label className="text-xs">{txt('TVA','VAT','IVA', "IVA")}<select disabled={reviewing} value={line.vatRate} onChange={e=>changeLine(line.visit.key,{vatRate:Number(e.target.value)})} className={field+' mt-1'}>{[0,6,13,23].map(rate=><option key={rate} value={rate}>{rate}%</option>)}</select></label></div>
              {line.visit.unitPriceCents===null&&<p className="text-xs text-amber-700">{txt('Aucun prix historique enregistré. Saisissez le montant convenu.','No historical price recorded. Enter the agreed amount.','Sem preço histórico registado. Indique o valor acordado.', "No hay precio histórico registrado. Introduzca el importe acordado.")}{line.visit.suggestedPriceCents!==null?` (${txt('Tarif actuel','Current price','Preço atual', "Precio actual")}: ${euro(line.visit.suggestedPriceCents)})`:''}</p>}
              {line.visit.unitPriceCents!==null&&cents(line.price)!==line.visit.unitPriceCents&&<label className="block text-xs">{txt('Motif de modification du prix','Reason for price adjustment','Motivo do ajuste de preço', "Motivo del ajuste de precio")}<input required maxLength={250} readOnly={reviewing} value={line.reason} onChange={e=>changeLine(line.visit.key,{reason:e.target.value})} className={field+' mt-1'}/></label>}
            </div>)}
            {lines.some(line=>line.vatRate===0)&&<label className="block text-xs font-medium">{txt('Motif du taux de TVA à 0 %','Reason for 0% VAT','Motivo da taxa de IVA a 0%', "Motivo del IVA del 0 %")}<input required maxLength={250} readOnly={reviewing} value={exemption} onChange={e=>setExemption(e.target.value)} className={field+' mt-1'}/></label>}
            <div className="grid grid-cols-2 gap-3"><label className="text-xs">NIF ({txt('facultatif','optional','opcional', "opcional")})<input inputMode="numeric" pattern="[0-9]{9}" maxLength={9} readOnly={reviewing} value={nif} onChange={e=>setNif(e.target.value)} className={field+' mt-1'}/></label><label className="text-xs">{txt('Mode de paiement','Payment method','Meio de pagamento', "Método de pago")}<select disabled={reviewing} value={method} onChange={e=>setMethod(e.target.value as PaymentMethod)} className={field+' mt-1'}>{['MULTIBANCO','MBWAY','CASH','CARD','TRANSFER'].map(m=><option key={m} value={m}>{exportLabel(m, lang)}</option>)}</select></label></div>
            <label className="block text-xs">{txt('Adresse de facturation (facultatif)','Billing address (optional)','Morada de faturação (opcional)', "Dirección de facturación (opcional)")}<input maxLength={250} readOnly={reviewing} value={address} onChange={e=>setAddress(e.target.value)} className={field+' mt-1'}/></label>
            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3"><input type="checkbox" disabled={reviewing} checked={paid} onChange={e=>setPaid(e.target.checked)} className="accent-slate-800"/>{txt('Le paiement intégral a déjà été reçu','Full payment has already been received','O pagamento integral já foi recebido', "Ya se ha recibido el pago completo")}</label>
            <label className="block text-xs">{txt('Référence de facture officielle (facultatif)','Official invoice reference (optional)','Referência da fatura fiscal (opcional)', "Referencia de la factura oficial (opcional)")}<input maxLength={200} readOnly={reviewing} value={reference} onChange={e=>setReference(e.target.value)} className={field+' mt-1'}/></label>
            <label className="block text-xs">{txt('Note de facturation (facultatif)','Billing note (optional)','Nota de faturação (opcional)', "Nota de facturación (opcional)")}<textarea maxLength={1000} readOnly={reviewing} value={notes} onChange={e=>setNotes(e.target.value)} className={field+' mt-1'}/></label>
          </section>}
        </>}
      </fieldset>
      {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">{error}{patientId&&!saving&&<button type="button" onClick={()=>{setPage(1);setSelected({});setReviewing(false);setReload(n=>n+1);}} className="ml-2 underline">{txt('Actualiser','Refresh','Atualizar', "Actualizar")}</button>}</div>}
      {patientId&&<footer className="space-y-3 border-t border-slate-200 pt-4">
        <div className="flex justify-between gap-4"><span>{count} {txt('séance(s)','session(s)','sessão(ões)', "sesión(es)")} · {paid?txt('Payé','Paid','Pago', "Pagada"):txt('À payer','Unpaid','Por pagar', "Sin pagar")}</span><strong className="text-xl text-slate-950">{euro(total)}</strong></div>
        {count>0&&<p className="text-right text-xs text-slate-500">{txt('Base','Net','Base', "Neto")}: {euro(total-tax)} · {txt('TVA','VAT','IVA', "IVA")}: {euro(tax)}</p>}
        <div className="flex gap-2">{reviewing&&<button type="button" disabled={saving} onClick={()=>setReviewing(false)} className="rounded-xl border px-4 py-3">{txt('Modifier','Edit','Editar', "Editar")}</button>}<button type="submit" disabled={saving||loading||!count} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-40">{saving?txt('Enregistrement…','Saving…','A guardar…', "Guardando…"):reviewing?txt('Créer le document','Create document','Criar documento', "Crear documento"):txt('Vérifier le document','Review document','Rever documento', "Revisar documento")}</button></div>
      </footer>}
    </form>
  </ResponsiveModal>;
}
