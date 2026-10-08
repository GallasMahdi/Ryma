'use client';

import { useRef, useState } from 'react';
import { IconCalendarOff, IconClock, IconDoor, IconInfoCircle, IconStethoscope, IconTrash, IconUser } from '@tabler/icons-react';
import type { Lang } from '@/lib/i18n';
import type { Practitioner, PractitionerService, SchedulingConfiguration } from '@/types/scheduling';
import { copyFor, EditorDialog, Field, initials, inputClass, Tabs, TeamSaveError, Toggle, type Hours, type SaveFailure, type SaveTeam } from './team-ui';
import { HoursEditor, hoursAreValid, timeMinutes, timeValue } from './HoursEditor';
import { ServicePicker } from './ServicePicker';

export type EditorKind = 'practitioner' | 'clinic' | 'exception' | 'resource' | 'delete-exception';
export interface EditorState { kind: EditorKind; id: string; config: SchedulingConfiguration; version: number }
interface EditorProps { editor: EditorState; lang: Lang; onSave: SaveTeam; onClose: () => void; onReload: () => Promise<void> }

function useSubmission(props: EditorProps) {
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState<SaveFailure | null>(null), lock = useRef(false), txt = copyFor(props.lang);
  const submit = async (body: Record<string, unknown>, validation?: string) => {
    if (lock.current) return;
    if (validation) { setFailure({message: validation}); return; }
    lock.current = true; setBusy(true); setFailure(null);
    try { await props.onSave(body, props.editor.config.revision); }
    catch (error) { setFailure(error instanceof TeamSaveError ? error.details : {message: txt('Não foi possível guardar. Verifique a ligação e tente novamente.', 'Unable to save. Check your connection and try again.', 'Enregistrement impossible. Vérifiez votre connexion et réessayez.')}); }
    finally { lock.current = false; setBusy(false); }
  };
  return {busy, failure, submit};
}

function Advice({children}: {children: React.ReactNode}) {
  return <div className="flex gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs leading-relaxed text-blue-800"><IconInfoCircle size={17} className="mt-0.5 shrink-0"/><div>{children}</div></div>;
}

const colors = ['#2563eb','#0d9488','#7c3aed','#db2777','#d97706','#475569'];
export function PractitionerEditor(props: EditorProps) {
  const {editor, lang, onClose, onReload} = props, {config, id} = editor, txt = copyFor(lang), status = useSubmission(props);
  const [initial] = useState(() => ({
    practitioner: config.practitioners.find(p => p.id === id) || {id:'',name:'',profession:txt('Fisioterapeuta','Physiotherapist','Kinésithérapeute'),color:'#2563eb',active:1,bookable:1,priority:0},
    hours: config.hours.filter(h => h.practitionerId === (id || '*')).map(({dayOfWeek,startMinute,endMinute}) => ({dayOfWeek,startMinute,endMinute})),
    services: config.services.filter(s => s.practitionerId === id),
  }));
  const [practitioner, setPractitioner] = useState<Practitioner>({...initial.practitioner});
  const [hours, setHours] = useState<Hours>(initial.hours), [services, setServices] = useState<PractitionerService[]>(initial.services);
  const [tab, setTab] = useState<'profile'|'services'|'hours'>('profile');
  const dirty = JSON.stringify({practitioner,hours,services}) !== JSON.stringify(initial);
  const submit = () => {
    let validation: string | undefined;
    if (practitioner.name.trim().length < 2 || !practitioner.profession.trim() || !Number.isInteger(practitioner.priority) || practitioner.priority < 0 || practitioner.priority > 1000) {
      setTab('profile'); validation = txt('Preencha o nome (pelo menos 2 caracteres), a profissão e uma prioridade entre 0 e 1000.', 'Enter a name (at least 2 characters), profession and a whole-number priority between 0 and 1000.', 'Saisissez un nom (au moins 2 caractères), une profession et une priorité entière entre 0 et 1000.');
    } else if (services.some(s => (s.durationMinutes !== null && (!Number.isInteger(s.durationMinutes) || s.durationMinutes < 5 || s.durationMinutes > 720)) || [s.bufferBefore,s.bufferAfter].some(v => !Number.isInteger(v) || v < 0 || v > 120))) {
      setTab('services'); validation = txt('Use minutos inteiros: duração de 5 a 720 e intervalos de 0 a 120.', 'Use whole minutes: duration from 5 to 720 and buffers from 0 to 120.', 'Utilisez des minutes entières : durée de 5 à 720 et marges de 0 à 120.');
    } else if (!hoursAreValid(hours)) {
      setTab('hours'); validation = txt('Verifique os intervalos: preencha as horas, coloque o fim após o início e evite sobreposições. Máximo de 28 intervalos.', 'Check the intervals: complete both times, place the end after the start and avoid overlaps. Maximum 28 intervals.', 'Vérifiez les plages : renseignez les heures, placez la fin après le début et évitez les chevauchements. Maximum 28 plages.');
    }
    void status.submit({action:'practitioner',practitioner:{...practitioner,name:practitioner.name.trim(),profession:practitioner.profession.trim()},hours,services}, validation);
  };
  return <EditorDialog {...status} lang={lang} onClose={onClose} onReload={onReload} dirty={dirty} onSubmit={submit} title={id ? txt('Editar profissional','Edit practitioner','Modifier le praticien') : txt('Novo profissional','New practitioner','Nouveau praticien')} subtitle={txt('Perfil, tratamentos e disponibilidade num só lugar.','Profile, treatments and working hours in one place.','Profil, soins et horaires au même endroit.')} icon={<IconUser size={23}/>} submitLabel={txt('Guardar profissional','Save practitioner','Enregistrer')}>
    <Tabs label={txt('Configuração do profissional','Practitioner settings','Paramètres du praticien')} value={tab} onChange={setTab} items={[
      {id:'profile',label:txt('Perfil','Profile','Profil'),icon:<IconUser size={16}/>},
      {id:'services',label:txt('Tratamentos','Treatments','Soins'),count:services.length,icon:<IconStethoscope size={16}/>},
      {id:'hours',label:txt('Horário','Hours','Horaires'),icon:<IconClock size={16}/>},
    ]}>
      {tab === 'profile' && <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold" style={{background:practitioner.color+'15',color:practitioner.color}}>{initials(practitioner.name)}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-800">{practitioner.name || txt('O seu novo profissional','Your new practitioner','Votre nouveau praticien')}</p><p className="mt-1 truncate text-sm text-slate-500">{practitioner.profession}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label={txt('Nome completo','Full name','Nom complet')}><input autoComplete="off" maxLength={100} className={inputClass} value={practitioner.name} placeholder={txt('Ex.: Dra. Sofia Martins','e.g. Dr Sofia Martins','Ex. : Dr Sofia Martins')} onChange={e => setPractitioner({...practitioner,name:e.target.value})}/></Field><Field label={txt('Profissão','Profession','Profession')}><input maxLength={100} className={inputClass} value={practitioner.profession} onChange={e => setPractitioner({...practitioner,profession:e.target.value})}/></Field></div>
        <div><p className="mb-3 text-xs font-semibold text-slate-600">{txt('Cor na agenda','Calendar colour','Couleur dans l’agenda')}</p><div className="flex flex-wrap items-center gap-2">{colors.map(color => <button type="button" key={color} aria-label={`${txt('Cor','Colour','Couleur')} ${color}`} aria-pressed={practitioner.color === color} className={'flex size-10 items-center justify-center rounded-full border-2 '+(practitioner.color === color ? 'border-slate-700' : 'border-transparent')} onClick={() => setPractitioner({...practitioner,color})}><span className="size-7 rounded-full" style={{background:color}}/></button>)}<label className="ml-1 flex size-10 cursor-pointer items-center overflow-hidden rounded-xl border border-slate-200"><input type="color" aria-label={txt('Cor personalizada','Custom colour','Couleur personnalisée')} className="h-12 w-12 shrink-0 cursor-pointer border-0 bg-transparent p-1" value={practitioner.color} onChange={e => setPractitioner({...practitioner,color:e.target.value})}/></label></div></div>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 py-1"><Toggle checked={!!practitioner.active} onChange={v => setPractitioner({...practitioner,active:Number(v)})} label={txt('Profissional ativo','Active practitioner','Praticien actif')} description={txt('Desativar arquiva o perfil e mantém o histórico.','Deactivating archives the profile and keeps its history.','La désactivation archive le profil et conserve son historique.')}/><Toggle checked={!!practitioner.bookable} onChange={v => setPractitioner({...practitioner,bookable:Number(v)})} label={txt('Marcações online','Online booking','Réservation en ligne')} description={txt('Permite a escolha deste profissional no site. Requer perfil ativo, tratamentos e horário.','Lets patients choose this practitioner online. Requires an active profile, treatments and hours.','Permet aux patients de choisir ce praticien en ligne. Nécessite un profil actif, des soins et des horaires.')}/></div>
        <Field label={txt('Prioridade de atribuição','Assignment priority','Priorité d’attribution')} hint={txt('Em horários iguais, o número mais baixo tem preferência na opção «primeiro disponível».','For matching slots, the lower number takes priority for “earliest available”.','À créneau égal, le plus petit nombre est prioritaire pour « premier disponible ».')}><input className={inputClass+' max-w-32'} type="number" min={0} max={1000} step={1} value={Number.isFinite(practitioner.priority) ? practitioner.priority : ''} onChange={e => setPractitioner({...practitioner,priority:e.target.value === '' ? NaN : Number(e.target.value)})}/></Field>
      </div>}
      {tab === 'services' && <ServicePicker value={services} onChange={setServices} lang={lang} timings/>}
      {tab === 'hours' && <div className="space-y-4"><Advice>{txt('O horário do profissional é cruzado com o da clínica. As ausências e as marcações existentes são consideradas na disponibilidade dos pacientes.','Practitioner hours are combined with clinic hours. Leave and existing bookings are taken into account for patient availability.','Les horaires du praticien sont croisés avec ceux de la clinique. Les absences et les rendez-vous sont pris en compte pour les disponibilités des patients.')}</Advice><HoursEditor value={hours} onChange={setHours} lang={lang}/></div>}
    </Tabs>
  </EditorDialog>;
}

export function ClinicEditor(props: EditorProps) {
  const {editor,lang,onClose,onReload} = props, txt = copyFor(lang), status = useSubmission(props);
  const [initial] = useState<Hours>(() => editor.config.hours.filter(h => h.practitionerId === '*').map(({dayOfWeek,startMinute,endMinute}) => ({dayOfWeek,startMinute,endMinute})));
  const [hours,setHours] = useState(initial);
  return <EditorDialog {...status} lang={lang} onClose={onClose} onReload={onReload} dirty={JSON.stringify(hours) !== JSON.stringify(initial)} onSubmit={() => void status.submit({action:'clinic-hours',hours}, hoursAreValid(hours) ? undefined : txt('Preencha as horas e evite intervalos invertidos ou sobrepostos. Máximo de 28 intervalos.','Complete both times and avoid reversed or overlapping intervals. Maximum 28 intervals.','Renseignez les heures et évitez les plages inversées ou qui se chevauchent. Maximum 28 plages.'))} title={txt('Horário da clínica','Clinic opening hours','Horaires de la clinique')} subtitle={txt('Define os limites de funcionamento de toda a equipa.','Sets the opening hours for the whole team.','Définit les heures d’ouverture pour toute l’équipe.')} icon={<IconClock size={23}/>} submitLabel={txt('Guardar horário','Save hours','Enregistrer')}><HoursEditor value={hours} onChange={setHours} lang={lang}/></EditorDialog>;
}

export function ExceptionEditor(props: EditorProps) {
  const {editor,lang,onClose,onReload} = props, txt = copyFor(lang), status = useSubmission(props);
  const existing = editor.config.exceptions.find(e => e.id === editor.id);
  const wholeDay = !existing || (existing.startMinute === 0 && existing.endMinute === 1440);
  const [initial] = useState(() => ({practitionerId:existing?.practitionerId || '*',date:existing?.date || '',kind:existing?.kind || 'closed',label:existing?.label || '',allDay:wholeDay,from:existing && !wholeDay ? timeValue(existing.startMinute) : '09:00',to:existing && !wholeDay ? timeValue(existing.endMinute) : '17:00'}));
  const [form,setForm] = useState(initial);
  const removing = editor.kind === 'delete-exception';
  const submit = () => {
    const startMinute = form.allDay ? 0 : timeMinutes(form.from), endMinute = form.allDay ? 1440 : timeMinutes(form.to, true);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date) && Number.isFinite(Date.parse(form.date+'T12:00:00Z')) && new Date(form.date+'T12:00:00Z').toISOString().slice(0,10) === form.date;
    void status.submit(removing ? {action:'delete-exception',id:editor.id} : {action:'exception',exception:{id:editor.id,practitionerId:form.practitionerId,date:form.date,kind:form.kind,label:form.label.trim(),startMinute,endMinute}}, !removing && (!validDate || !Number.isFinite(startMinute) || !Number.isFinite(endMinute) || startMinute >= endMinute) ? txt('Escolha uma data válida e um intervalo cujo fim seja posterior ao início.','Choose a valid date and an interval whose end is after its start.','Choisissez une date valide et une plage dont la fin est après le début.') : undefined);
  };
  return <EditorDialog {...status} lang={lang} onClose={onClose} onReload={onReload} dirty={!removing && JSON.stringify(form) !== JSON.stringify(initial)} allowUnchanged={removing} onSubmit={submit} title={removing ? txt('Remover exceção','Remove exception','Supprimer l’exception') : existing ? txt('Editar exceção','Edit exception','Modifier l’exception') : txt('Nova ausência ou exceção','New leave or exception','Nouvelle absence ou exception')} subtitle={txt('Uma alteração pontual, sem mudar o horário semanal.','A one-off change to the regular weekly schedule.','Une modification ponctuelle des horaires habituels.')} icon={removing ? <IconTrash size={23}/> : <IconCalendarOff size={23}/>} submitLabel={removing ? txt('Remover exceção','Remove exception','Supprimer') : txt('Guardar exceção','Save exception','Enregistrer')}>
    {removing ? <div className="space-y-5"><div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold">{existing?.label || txt('Exceção de horário','Schedule exception','Exception d’horaire')}</p><p className="mt-2 text-sm text-slate-500">{existing?.date} · {editor.config.practitioners.find(p => p.id === existing?.practitionerId)?.name || txt('Toda a clínica','Whole clinic','Toute la clinique')}</p></div><p className="text-sm leading-relaxed text-slate-600">{txt('Ao remover esta exceção, o horário será recalculado com as regras semanais e as restantes exceções.','Removing this exception recalculates hours using the weekly schedule and any remaining exceptions.','Supprimer cette exception recalcule les horaires selon le planning hebdomadaire et les exceptions restantes.')}</p></div> : <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2"><Field label={txt('Aplica-se a','Applies to','S’applique à')}><select className={inputClass} value={form.practitionerId} onChange={e => setForm({...form,practitionerId:e.target.value})}><option value="*">{txt('Toda a clínica','Whole clinic','Toute la clinique')}</option>{editor.config.practitioners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label={txt('Data','Date','Date')}><input type="date" className={inputClass} value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></Field></div>
      <fieldset><legend className="mb-2 text-xs font-semibold text-slate-600">{txt('Tipo de exceção','Exception type','Type d’exception')}</legend><div className="grid gap-2 sm:grid-cols-2">{(['closed','open'] as const).map(kind => <label key={kind} className={'flex cursor-pointer items-start gap-3 rounded-xl border p-4 '+(form.kind === kind ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200')}><input type="radio" name="exception-kind" value={kind} checked={form.kind === kind} onChange={() => setForm({...form,kind})} className="mt-0.5 accent-blue-600"/><span><span className="block text-sm font-semibold">{kind === 'closed' ? txt('Indisponível','Unavailable','Indisponible') : txt('Horário especial','Replacement hours','Horaires exceptionnels')}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{kind === 'closed' ? txt('Férias, feriados ou pausas.','Leave, holidays or breaks.','Congés, jours fériés ou pauses.') : txt('Substitui o horário habitual neste dia.','Replaces regular hours on this date.','Remplace les horaires habituels ce jour-là.')}</span></span></label>)}</div></fieldset>
      <div className="rounded-xl border border-slate-200 px-4 py-1"><Toggle label={txt('Dia inteiro','All day','Toute la journée')} description={txt('00:00 até à meia-noite seguinte.','00:00 through midnight at the end of the day.','De 00:00 à minuit en fin de journée.')} checked={form.allDay} onChange={allDay => setForm({...form,allDay})}/></div>
      {!form.allDay && <div className="grid grid-cols-2 gap-4"><Field label={txt('Início','Start','Début')}><input type="time" className={inputClass} value={form.from} onChange={e => setForm({...form,from:e.target.value})}/></Field><Field label={txt('Fim','End','Fin')} hint={txt('00:00 = fim do dia','00:00 = end of day','00:00 = fin de journée')}><input type="time" className={inputClass} value={form.to} onChange={e => setForm({...form,to:e.target.value})}/></Field></div>}
      <Field label={txt('Descrição (opcional)','Description (optional)','Description (facultative)')}><input className={inputClass} maxLength={150} value={form.label} placeholder={txt('Ex.: Férias de verão','e.g. Summer leave','Ex. : Congés d’été')} onChange={e => setForm({...form,label:e.target.value})}/></Field>
      <Advice>{txt('As marcações existentes ficam protegidas. Se uma alteração criar um conflito, terá de reagendar primeiro essas marcações.','Existing appointments are protected. If a change creates a conflict, reschedule those appointments first.','Les rendez-vous existants sont protégés. En cas de conflit, reprogrammez d’abord les rendez-vous concernés.')}</Advice>
    </div>}
  </EditorDialog>;
}

export function ResourceEditor(props: EditorProps) {
  const {editor,lang,onClose,onReload} = props, txt = copyFor(lang), status = useSubmission(props);
  const [initial] = useState(() => ({resource:editor.config.resources.find(r => r.id === editor.id) || {id:'',name:'',active:1},services:editor.config.serviceResources.filter(r => r.resourceId === editor.id).map(r => r.service)}));
  const [resource,setResource] = useState(initial.resource), [services,setServices] = useState(initial.services);
  return <EditorDialog {...status} lang={lang} onClose={onClose} onReload={onReload} dirty={JSON.stringify({resource,services}) !== JSON.stringify(initial)} onSubmit={() => void status.submit({action:'resource',resource:{...resource,name:resource.name.trim()},services}, resource.name.trim().length < 2 ? txt('O nome do recurso deve ter pelo menos 2 caracteres.','The resource name needs at least 2 characters.','Le nom de la ressource doit contenir au moins 2 caractères.') : undefined)} title={editor.id ? txt('Editar recurso','Edit resource','Modifier la ressource') : txt('Nova sala ou equipamento','New room or equipment','Nouvelle salle ou équipement')} subtitle={txt('Evite conflitos entre tratamentos que partilham recursos.','Prevent conflicts between treatments that share resources.','Évitez les conflits entre soins partageant des ressources.')} icon={<IconDoor size={23}/>} submitLabel={txt('Guardar recurso','Save resource','Enregistrer')}><div className="space-y-5">
      <Field label={txt('Nome do recurso','Resource name','Nom de la ressource')}><input className={inputClass} maxLength={100} placeholder={txt('Ex.: Sala de fisioterapia 1','e.g. Physiotherapy room 1','Ex. : Salle de kinésithérapie 1')} value={resource.name} onChange={e => setResource({...resource,name:e.target.value})}/></Field>
      <Toggle label={txt('Recurso ativo','Active resource','Ressource active')} description={txt('Um recurso inativo bloqueia novas marcações dos tratamentos associados.','An inactive resource blocks new bookings for its linked treatments.','Une ressource inactive bloque les nouvelles réservations des soins associés.')} checked={!!resource.active} onChange={active => setResource({...resource,active:Number(active)})}/>
      <Advice>{txt('Cada recurso representa uma unidade, reservada durante todo o tratamento. Se um tratamento tiver vários recursos associados, precisa de todos eles disponíveis.','Each resource represents one unit, reserved throughout the treatment. A treatment with several linked resources needs all of them to be available.','Chaque ressource représente une unité réservée pendant tout le soin. Un soin associé à plusieurs ressources nécessite leur disponibilité simultanée.')}</Advice>
      <div><h3 className="mb-3 text-sm font-semibold">{txt('Tratamentos associados','Linked treatments','Soins associés')}</h3><ServicePicker lang={lang} value={services.map(service => ({practitionerId:'',service,durationMinutes:null,bufferBefore:0,bufferAfter:0}))} onChange={value => setServices(value.map(s => s.service))}/></div>
    </div></EditorDialog>;
}
