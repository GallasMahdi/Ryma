'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconCalendarOff, IconCheck, IconClock, IconDoor, IconPlus, IconRefresh, IconUsers, IconWorld, IconX } from '@tabler/icons-react';
import type { Lang } from '@/lib/i18n';
import type { SchedulingConfiguration } from '@/types/scheduling';
import { copyFor, iconButton, panelClass, primaryButton, secondaryButton, Tabs, TeamSaveError, type SaveTeam } from './team/team-ui';
import { ClinicEditor, ExceptionEditor, PractitionerEditor, ResourceEditor, type EditorKind, type EditorState } from './team/TeamEditors';
import { ClinicOverview, ExceptionsOverview, lisbonToday, ResourcesOverview, TeamRoster } from './team/TeamOverview';

type Section = 'team' | 'clinic' | 'exceptions' | 'resources';

export function PractitionersTab({lang}: {lang: Lang}) {
  const txt = copyFor(lang);
  const [config,setConfig] = useState<SchedulingConfiguration | null>(null), [error,setError] = useState(''), [notice,setNotice] = useState('');
  const [section,setSection] = useState<Section>('team'), [editor,setEditor] = useState<EditorState | null>(null), [refreshing,setRefreshing] = useState(false);
  const saveLock = useRef(false);
  const read = useCallback(async () => {
    const response = await fetch('/api/admin/practitioners',{cache:'no-store'});
    if (!response.ok) throw new Error(response.status === 401 ? 'AUTH' : 'LOAD');
    return await response.json() as SchedulingConfiguration;
  },[]);
  const loadMessage = useCallback((failure: unknown) => {
    const t = copyFor(lang);
    return failure instanceof Error && failure.message === 'AUTH' ? t('A sessão expirou. Atualize a página para iniciar sessão novamente.','Your session expired. Refresh the page to sign in again.','Votre session a expiré. Actualisez la page pour vous reconnecter.') : t('Não foi possível carregar a equipa. Verifique a ligação e tente novamente.','Unable to load your team. Check your connection and try again.','Impossible de charger l’équipe. Vérifiez votre connexion et réessayez.');
  },[lang]);
  useEffect(() => {
    let active = true;
    read().then(data => {if (active) {setConfig(data);setError('');}}).catch(failure => {if (active) setError(loadMessage(failure));});
    return () => {active = false;};
  },[read,loadMessage]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''),7000); return () => clearTimeout(timeout); },[notice]);
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);setError('');
    try {setConfig(await read());} catch (failure) {setError(loadMessage(failure));} finally {setRefreshing(false);}
  };
  const open = (kind: EditorKind, id = '') => {if (config) {setNotice('');setEditor({kind,id,config,version:0});}};
  const reloadEditor = async () => {
    try {
      const current = await read();setConfig(current);
      setEditor(previous => previous ? {...previous,config:current,version:previous.version+1} : null);
    } catch (failure) {throw new Error(loadMessage(failure));}
  };
  const save: SaveTeam = async (body, revision) => {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      const response = await fetch('/api/admin/practitioners',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,revision})});
      const data = await response.json();
      if (!response.ok) {
        const message = response.status === 401 ? txt('A sessão expirou. Volte a iniciar sessão para guardar estas alterações.','Your session expired. Sign in again to save these changes.','Votre session a expiré. Reconnectez-vous pour enregistrer ces modifications.') : data.code === 'SCHEDULE_CHANGED' ? txt('A equipa foi atualizada noutra sessão. Recarregue os dados antes de voltar a editar.','The team was updated in another session. Reload the saved settings before editing again.','L’équipe a été mise à jour dans une autre session. Rechargez les données avant de modifier à nouveau.') : data.code === 'EXISTING_BOOKINGS' ? txt('Esta alteração afeta marcações existentes. Reagende as marcações indicadas antes de alterar o horário ou o perfil.','This change affects existing appointments. Reschedule the listed appointments before changing the hours or profile.','Cette modification affecte des rendez-vous existants. Reprogrammez les rendez-vous indiqués avant de modifier les horaires ou le profil.') : data.code === 'INVALID_INPUT' ? txt('Verifique os dados introduzidos e os intervalos de horário.','Check the entered details and time intervals.','Vérifiez les informations saisies et les plages horaires.') : txt('Não foi possível guardar. Tente novamente.','Unable to save. Please try again.','Enregistrement impossible. Réessayez.');
        throw new TeamSaveError({message,code:data.code,conflicts:data.conflicts});
      }
      setConfig(data);setEditor(null);setError('');setNotice(txt('Alterações guardadas. A disponibilidade foi atualizada.','Changes saved. Availability has been updated.','Modifications enregistrées. Les disponibilités ont été mises à jour.'));
      window.dispatchEvent(new Event('ryma_schedule_changed'));
    } finally {saveLock.current = false;}
  };
  if (!config) return <section className={panelClass+' p-6'} aria-busy={!error}>{error ? <div role="alert" className="space-y-4"><div className="flex items-center gap-2 text-sm text-amber-800"><IconAlertTriangle size={18}/>{error}</div><button disabled={refreshing} className={secondaryButton} onClick={() => void refresh()}><IconRefresh size={16} className={refreshing ? 'animate-spin' : ''}/>{txt('Tentar novamente','Retry','Réessayer')}</button></div> : <div role="status" className="space-y-6"><span className="sr-only">{txt('A carregar equipa…','Loading team…','Chargement de l’équipe…')}</span><div className="h-6 w-52 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none"/><div className="grid gap-4 sm:grid-cols-3">{[0,1,2].map(i => <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-50 motion-reduce:animate-none"/>)}</div></div>}</section>;
  const active = config.practitioners.filter(p => p.active), online = active.filter(p => p.bookable && config.services.some(s => s.practitionerId === p.id && config.treatments?.some(t=>t.slug===s.service&&t.status==='PUBLISHED')) && config.hours.some(h => h.practitionerId === p.id));
  const upcoming = config.exceptions.filter(e => e.date >= lisbonToday()).length, resources = config.resources.filter(r => r.active).length;
  const stats = [
    {label:txt('Profissionais ativos','Active practitioners','Praticiens actifs'),value:active.length,detail:txt('A cuidar dos seus pacientes','Caring for your patients','Au service de vos patients'),icon:IconUsers,tone:'bg-blue-50 text-blue-600'},
    {label:txt('Marcações online','Online booking','Réservation en ligne'),value:online.length,detail:txt('Perfis com tratamentos e horário','Profiles with treatments and hours','Profils avec soins et horaires'),icon:IconWorld,tone:'bg-emerald-50 text-emerald-600'},
    {label:txt('Próximas exceções','Upcoming exceptions','Exceptions à venir'),value:upcoming,detail:txt('Ausências e horários especiais','Leave and replacement hours','Absences et horaires spéciaux'),icon:IconCalendarOff,tone:'bg-amber-50 text-amber-600'},
    {label:txt('Recursos ativos','Active resources','Ressources actives'),value:resources,detail:txt('Salas e equipamentos partilhados','Shared rooms and equipment','Salles et équipements partagés'),icon:IconDoor,tone:'bg-violet-50 text-violet-500'},
  ];
  const views = {config,lang,open};
  const editorProps = editor ? {editor,lang,onSave:save,onClose:() => setEditor(null),onReload:reloadEditor} : null;
  return <div className="@container min-w-0 space-y-5 text-slate-800 sm:space-y-6">
    <header className="flex flex-col justify-between gap-4 @min-[620px]:flex-row @min-[620px]:items-start"><div><div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"><span className="size-1.5 rounded-full bg-blue-400"/>{txt('Gestão da clínica','Clinic management','Gestion de la clinique')}</div><h2 className="text-2xl font-semibold tracking-tight text-slate-900">{txt('Equipa & disponibilidade','Team & availability','Équipe et disponibilités')}</h2><p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">{txt('Uma equipa alinhada. Uma agenda que funciona.','A coordinated team. A schedule that works.','Une équipe coordonnée. Un planning qui fonctionne.')}</p></div><div className="flex items-center gap-2 @min-[620px]:pt-3"><button className={secondaryButton+' px-3!'} disabled={refreshing} aria-label={txt('Atualizar equipa','Refresh team','Actualiser l’équipe')} title={txt('Atualizar equipa','Refresh team','Actualiser l’équipe')} onClick={() => void refresh()}><IconRefresh size={17} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''}/></button><button className={primaryButton+' flex-1 @min-[620px]:flex-none'} onClick={() => open('practitioner')}><IconPlus size={17}/>{txt('Novo profissional','New practitioner','Nouveau praticien')}</button></div></header>
    {error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><IconAlertTriangle size={18} className="shrink-0"/>{error}</div>}
    {notice && <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"><IconCheck size={18} className="shrink-0"/><span className="flex-1">{notice}</span><button className={iconButton+' size-8!'} aria-label={txt('Fechar mensagem','Dismiss message','Fermer le message')} onClick={() => setNotice('')}><IconX size={16}/></button></div>}
    <div className="grid grid-cols-2 gap-3 @min-[820px]:grid-cols-4">{stats.map(({label,value,detail,icon:Icon,tone}) => <div key={label} className={panelClass+' p-3.5 sm:p-4'}><div className="flex items-center justify-between gap-2"><span className="text-[11px] font-medium leading-relaxed text-slate-500 sm:text-xs">{label}</span><span className={'flex size-8 shrink-0 items-center justify-center rounded-xl '+tone}><Icon size={16}/></span></div><div className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{value.toString().padStart(2,'0')}</div><p className="mt-1 hidden text-[10px] text-slate-400 sm:block">{detail}</p></div>)}</div>
    <Tabs label={txt('Gestão de equipa','Team management','Gestion de l’équipe')} value={section} onChange={setSection} items={[
      {id:'team',label:txt('Profissionais','Practitioners','Praticiens'),icon:<IconUsers size={16}/>,count:config.practitioners.length},
      {id:'clinic',label:txt('Horário da clínica','Clinic hours','Horaires de la clinique'),icon:<IconClock size={16}/>},
      {id:'exceptions',label:txt('Ausências','Leave','Absences'),icon:<IconCalendarOff size={16}/>,count:upcoming},
      {id:'resources',label:txt('Salas & equipamentos','Rooms & equipment','Salles et équipements'),icon:<IconDoor size={16}/>},
    ]}>
      {section === 'team' && <TeamRoster {...views}/>}{section === 'clinic' && <ClinicOverview {...views}/>}{section === 'exceptions' && <ExceptionsOverview {...views}/>}{section === 'resources' && <ResourcesOverview {...views}/>}
    </Tabs>
    {editor && editorProps && (editor.kind === 'practitioner' ? <PractitionerEditor key={`${editor.kind}-${editor.id}-${editor.version}`} {...editorProps}/> : editor.kind === 'clinic' ? <ClinicEditor key={`${editor.kind}-${editor.version}`} {...editorProps}/> : editor.kind === 'resource' ? <ResourceEditor key={`${editor.kind}-${editor.id}-${editor.version}`} {...editorProps}/> : <ExceptionEditor key={`${editor.kind}-${editor.id}-${editor.version}`} {...editorProps}/>)}
  </div>;
}
