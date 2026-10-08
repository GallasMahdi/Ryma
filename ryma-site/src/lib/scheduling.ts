import { practitionerIntervals } from '@/lib/schedule-math';
import { phonesMatch } from '@/lib/phone';
import { executeQuery, executeConditionalBatch } from '@/lib/db';
import { getTreatments } from '@/lib/treatments';
import { isCalendarDate } from '@/lib/admin-validation';
import { getLisbonDateTime } from '@/lib/validation';
import { clockMinutes } from '@/lib/booking-schedule';
import { TIME_GRID, type BookingAssignment, type SchedulingConfiguration, type Practitioner, type PractitionerService, type WorkingInterval, type ScheduleException, type SharedResource, type ServiceResource } from '@/types/scheduling';

export class SchedulingError extends Error {
  constructor(public code: string, message: string, public conflicts: {id: string; date: string; startTime: string; practitionerId: string}[] = []) { super(message); }
}

export interface ScheduledAppointment extends BookingAssignment {
  id: string; date: string; startTime: string; service: string; status: string; patientId?: string | null; phone?: string;
}
export interface ScheduleState extends SchedulingConfiguration {
  appointments: ScheduledAppointment[];
  blocks: {id:string;date: string; time: string; practitionerId: string}[];
}
export interface AvailabilityOptions {
  practitionerId?: string;
  publicOnly?: boolean;
  excludeId?: string;
  patientId?: string | null;
  patientPhone?: string;
  snapshot?: BookingAssignment;
  includePast?: boolean;
}
export interface SchedulingSlot {
  time: string; available: boolean;
  reason?: 'past' | 'booked' | 'blocked' | 'closed' | 'ineligible';
  candidates: BookingAssignment[];
}
type Statement = {sql: string; args: any[]};

export async function getSchedulingConfiguration(): Promise<SchedulingConfiguration> {
  const revision = Number((await executeQuery<{revision: number}>('SELECT revision FROM booking_sync WHERE id=1'))[0].revision);
  const [practitioners, services, hours, exceptions, resources, serviceResources, treatments] = await Promise.all([
    executeQuery<Practitioner>('SELECT * FROM practitioners ORDER BY priority,id'),
    executeQuery<PractitionerService>('SELECT * FROM practitioner_services'),
    executeQuery<WorkingInterval>('SELECT * FROM working_hours ORDER BY practitionerId,dayOfWeek,startMinute'),
    executeQuery<ScheduleException>('SELECT * FROM schedule_exceptions ORDER BY date,startMinute'),
    executeQuery<SharedResource>('SELECT * FROM resources ORDER BY name,id'),
    executeQuery<ServiceResource>('SELECT * FROM service_resources'),
    getTreatments(),
  ]);
  return {revision, practitioners, services, hours, exceptions, resources, serviceResources, treatments};
}

export async function loadScheduleState(dates?: string[]): Promise<ScheduleState> {
  const configuration = await getSchedulingConfiguration();
  const values = dates ? [...new Set(dates)] : [getLisbonDateTime().todayStr];
  if (dates && values.length === 0) return {...configuration, appointments: [], blocks: []};
  const where = dates ? `date IN (${values.map(() => '?').join(',')})` : 'date >= ?';
  const [appointments, blocks] = await Promise.all([
    executeQuery<ScheduledAppointment>(`SELECT id,date,startTime,service,status,practitionerId,practitionerName,durationMinutes,bufferBefore,bufferAfter,resourceIds,patientId,phone FROM appointments WHERE status!='CANCELLED' AND ${where}`, values),
    executeQuery<ScheduleState['blocks'][number]>(`SELECT id,date,time,practitionerId FROM blocked_slots WHERE ${where}`, values),
  ]);
  return {...configuration, appointments, blocks};
}

export function evaluateSlot(state: ScheduleState, date: string, time: string, service?: string, options: AvailabilityOptions = {}): SchedulingSlot {
  const slot: SchedulingSlot = {time,available:false,reason:'closed',candidates:[]};
  const {todayStr,currentHHMM} = getLisbonDateTime();
  if (!isCalendarDate(date) || !TIME_GRID.includes(time)) return slot;
  if (!options.includePast && (date < todayStr || (date === todayStr && time <= currentHHMM))) return {...slot,reason:'past'};
  const treatment=state.treatments?.find(t=>t.slug===service);
  if(service && state.treatments && !options.snapshot && (!treatment || treatment.status!=='PUBLISHED')) return {...slot,reason:'ineligible'};
  const eligible = state.practitioners.filter(p => p.active && (!options.publicOnly || p.bookable) && (!options.practitionerId || p.id === options.practitionerId));
  if (!eligible.length) return {...slot,reason:'ineligible'};
  for (const practitioner of eligible) {
    const mapping = state.services.find(s => s.practitionerId === practitioner.id && s.service === service);
    if (service && !mapping) { slot.reason = 'ineligible'; continue; }
    const assignment: BookingAssignment = options.snapshot ? {...options.snapshot, practitionerId:practitioner.id, practitionerName:practitioner.name} : {
      practitionerId:practitioner.id, practitionerName:practitioner.name,
      serviceNameJson:treatment?JSON.stringify(treatment.name):null, servicePriceCents:treatment?.priceCents??null, servicePole:treatment?.pole??null,
      durationMinutes:mapping?.durationMinutes ?? treatment?.durationMinutes ?? 30, bufferBefore:mapping?.bufferBefore ?? 0, bufferAfter:mapping?.bufferAfter ?? 0,
      resourceIds:JSON.stringify(state.serviceResources.filter(r => r.service === service).map(r => r.resourceId).sort()),
    };
    const resources = JSON.parse(assignment.resourceIds) as string[];
    if (resources.some(id => !state.resources.some(r => r.id === id && r.active))) { slot.reason='blocked'; continue; }
    const begin = clockMinutes(time)-assignment.bufferBefore;
    const end = clockMinutes(time)+assignment.durationMinutes+assignment.bufferAfter;
    if (!practitionerIntervals(state,practitioner.id,date).some(([s,e]) => s <= begin && end <= e)) continue;
    if (state.blocks.some(b => b.date===date && (b.practitionerId==='*'||b.practitionerId===practitioner.id) && clockMinutes(b.time)<end && begin<clockMinutes(b.time)+30)) { slot.reason='blocked'; continue; }
    if (state.appointments.some(a => a.id!==options.excludeId && a.date===date && a.status!=='CANCELLED' &&
      (a.practitionerId===practitioner.id || (options.patientId && a.patientId===options.patientId) || (options.patientPhone && a.phone && phonesMatch(a.phone,options.patientPhone)) || (JSON.parse(a.resourceIds) as string[]).some(id => resources.includes(id))) &&
      clockMinutes(a.startTime)-a.bufferBefore<end && begin<clockMinutes(a.startTime)+a.durationMinutes+a.bufferAfter)) { slot.reason='booked'; continue; }
    slot.candidates.push(assignment);
  }
  slot.available=slot.candidates.length>0;
  if (slot.available) delete slot.reason;
  return slot;
}

export async function schedulingAvailability(dates: string[], times: readonly string[] = TIME_GRID, service?: string, options: AvailabilityOptions = {}) {
  const validDates = [...new Set(dates.filter(isCalendarDate))];
  const state = await loadScheduleState(validDates);
  const result = new Map<string,SchedulingSlot[]>();
  for (const date of validDates) result.set(date,times.map(time => evaluateSlot(state,date,time,service,options)));
  return result;
}

export async function commitScheduling(state: Pick<ScheduleState,'revision'>, statements: Statement[], appointment?: {id:string;version:number}): Promise<boolean> {
  return executeConditionalBatch({sql:'SELECT revision FROM booking_sync WHERE id=1 AND revision=?' + (appointment ? ' AND EXISTS(SELECT 1 FROM appointments WHERE id=? AND version=?)' : ''),args:appointment?[state.revision,appointment.id,appointment.version]:[state.revision]},statements);
}

export function assignmentColumns(assignment: BookingAssignment): {columns: string; values: any[]} {
  return {columns:'practitionerId,practitionerName,durationMinutes,bufferBefore,bufferAfter,resourceIds,serviceNameJson,servicePriceCents,servicePole',values:[assignment.practitionerId,assignment.practitionerName,assignment.durationMinutes,assignment.bufferBefore,assignment.bufferAfter,assignment.resourceIds,assignment.serviceNameJson??null,assignment.servicePriceCents??null,assignment.servicePole??null]};
}

export function schedulingFailure(error: unknown): boolean {
  return /slot_taken|slot_blocked|invalid_practitioner|UNIQUE constraint failed: appointments/.test(String(error));
}

const integer = (value: unknown, min: number, max: number): value is number => typeof value==='number' && Number.isInteger(value) && value>=min && value<=max;
const validOptionalId = (value: unknown) => value === undefined || (typeof value === 'string' && value.length <= 100);
function validInterval(value: any) { return value && integer(value.startMinute,0,1439) && integer(value.endMinute,1,1440) && value.endMinute>value.startMinute; }
function assertValid(value: unknown, message: string): asserts value { if (!value) throw new SchedulingError('INVALID_INPUT',message); }

/** Configuration edits and reservations share one revision, checked inside a write transaction. */
export async function saveSchedulingConfiguration(body: Record<string, any>): Promise<SchedulingConfiguration> {
  const state = await loadScheduleState();
  assertValid(integer(body.revision,0,Number.MAX_SAFE_INTEGER),'A current schedule revision is required.');
  if (body.revision!==state.revision) throw new SchedulingError('SCHEDULE_CHANGED','The schedule changed. Refresh and try again.');
  const knownServices=new Set((state.treatments??[]).map(t=>t.slug));
  const next: ScheduleState = structuredClone(state);
  const statements: Statement[] = [];
  const add = (sql: string,args: any[] = []) => statements.push({sql,args});
  if (body.action==='practitioner') {
    const p=body.practitioner;
    assertValid(p && typeof p.name==='string' && p.name.trim().length>=2 && p.name.trim().length<=100,'Enter a practitioner name (2–100 characters).');
    assertValid(typeof p.profession==='string' && p.profession.trim().length>0 && p.profession.length<=100 && typeof p.color==='string' && /^#[0-9a-fA-F]{6}$/.test(p.color),'Invalid profession or color.');
    assertValid([0,1].includes(p.active) && [0,1].includes(p.bookable) && integer(p.priority,0,1000),'Invalid practitioner settings.');
    assertValid(validOptionalId(p.id),'Invalid practitioner identifier.');
    const id=p.id || 'pr_'+crypto.randomUUID();
    assertValid(!p.id || state.practitioners.some(x=>x.id===p.id),'Practitioner not found.');
    assertValid(Array.isArray(body.services) && body.services.length<=100 && body.services.every((s:any)=>s && (knownServices.has(s.service)||state.services.some(old=>old.practitionerId===id&&old.service===s.service)) && (s.durationMinutes===null||integer(s.durationMinutes,5,720)) && integer(s.bufferBefore,0,120) && integer(s.bufferAfter,0,120)),'Invalid services, duration, or buffers.');
    assertValid(new Set(body.services.map((s:any)=>s.service)).size===body.services.length,'Duplicate services.');
    assertValid(Array.isArray(body.hours) && body.hours.length<=28 && body.hours.every((h:any)=>validInterval(h)&&integer(h.dayOfWeek,0,6)),'Invalid working hours.');
    const practitioner: Practitioner={id,name:p.name.trim(),profession:p.profession.trim(),color:p.color,active:p.active,bookable:p.bookable,priority:p.priority};
    next.practitioners=[...next.practitioners.filter(x=>x.id!==id),practitioner];
    next.services=[...next.services.filter(s=>s.practitionerId!==id),...body.services.map((s:any)=>({...s,practitionerId:id}))];
    next.hours=[...next.hours.filter(h=>h.practitionerId!==id),...body.hours.map((h:any)=>({...h,practitionerId:id}))];
    add('INSERT INTO practitioners(id,name,profession,color,active,bookable,priority) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,profession=excluded.profession,color=excluded.color,active=excluded.active,bookable=excluded.bookable,priority=excluded.priority',Object.values(practitioner));
    add('DELETE FROM practitioner_services WHERE practitionerId=?',[id]);
    for(const s of body.services) add('INSERT INTO practitioner_services(practitionerId,service,durationMinutes,bufferBefore,bufferAfter) VALUES(?,?,?,?,?)',[id,s.service,s.durationMinutes,s.bufferBefore,s.bufferAfter]);
    add('DELETE FROM working_hours WHERE practitionerId=?',[id]);
    for(const h of body.hours) add('INSERT INTO working_hours(practitionerId,dayOfWeek,startMinute,endMinute) VALUES(?,?,?,?)',[id,h.dayOfWeek,h.startMinute,h.endMinute]);
  } else if(body.action==='clinic-hours') {
    assertValid(Array.isArray(body.hours)&&body.hours.length<=28&&body.hours.every((h:any)=>validInterval(h)&&integer(h.dayOfWeek,0,6)),'Invalid clinic working hours.');
    next.hours=[...next.hours.filter(h=>h.practitionerId!=='*'),...body.hours.map((h:any)=>({...h,practitionerId:'*'}))];
    add("DELETE FROM working_hours WHERE practitionerId='*'");
    for(const h of body.hours) add('INSERT INTO working_hours(practitionerId,dayOfWeek,startMinute,endMinute) VALUES(?,?,?,?)',['*',h.dayOfWeek,h.startMinute,h.endMinute]);
  } else if(body.action==='exception') {
    const e=body.exception;
    assertValid(e && (e.practitionerId==='*'||state.practitioners.some(p=>p.id===e.practitionerId)) && isCalendarDate(e.date) && validInterval(e) && ['closed','open'].includes(e.kind) && typeof e.label==='string' && e.label.length<=150,'Invalid absence or opening exception.');
    assertValid(validOptionalId(e.id),'Invalid exception identifier.');
    const id=e.id||'exc_'+crypto.randomUUID();
    assertValid(!e.id || state.exceptions.some(x=>x.id===id),'Exception not found.');
    next.exceptions=[...next.exceptions.filter(x=>x.id!==id),{...e,id}];
    add('INSERT INTO schedule_exceptions(id,practitionerId,date,startMinute,endMinute,kind,label) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET practitionerId=excluded.practitionerId,date=excluded.date,startMinute=excluded.startMinute,endMinute=excluded.endMinute,kind=excluded.kind,label=excluded.label',[id,e.practitionerId,e.date,e.startMinute,e.endMinute,e.kind,e.label.trim()]);
  } else if(body.action==='delete-exception') {
    assertValid(typeof body.id==='string' && state.exceptions.some(e=>e.id===body.id),'Exception not found.');
    next.exceptions=next.exceptions.filter(e=>e.id!==body.id);
    add('DELETE FROM schedule_exceptions WHERE id=?',[body.id]);
  } else if(body.action==='resource') {
    const r=body.resource;
    assertValid(r && typeof r.name==='string' && r.name.trim().length>=2 && r.name.length<=100 && [0,1].includes(r.active),'Invalid resource.');
    assertValid(Array.isArray(body.services)&&body.services.every((s:any)=>typeof s==='string'&&(knownServices.has(s)||state.serviceResources.some(old=>old.resourceId===r.id&&old.service===s)))&&new Set(body.services).size===body.services.length,'Invalid resource services.');
    assertValid(validOptionalId(r.id),'Invalid resource identifier.');
    const id=r.id||'res_'+crypto.randomUUID();
    assertValid(!r.id||state.resources.some(x=>x.id===id),'Resource not found.');
    next.resources=[...next.resources.filter(x=>x.id!==id),{id,name:r.name.trim(),active:r.active}];
    next.serviceResources=[...next.serviceResources.filter(x=>x.resourceId!==id),...body.services.map((service:string)=>({service,resourceId:id}))];
    // Resource requirements are explicit allocations. Do not silently change existing bookings.
    const changedServices=new Set([...state.serviceResources.filter(x=>x.resourceId===id).map(x=>x.service),...body.services].filter(s=>state.serviceResources.some(x=>x.resourceId===id&&x.service===s)!==body.services.includes(s)));
    const affected=state.appointments.filter(a=>changedServices.has(a.service));
    if(affected.length) throw new SchedulingError('EXISTING_BOOKINGS','These resource requirements affect future appointments. Resolve those bookings first.',affected.slice(0,50));
    add('INSERT INTO resources(id,name,active) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active',[id,r.name.trim(),r.active]);
    add('DELETE FROM service_resources WHERE resourceId=?',[id]);
    for(const service of body.services) add('INSERT INTO service_resources(service,resourceId) VALUES(?,?)',[service,id]);
  } else throw new SchedulingError('INVALID_INPUT','Unknown schedule operation.');

  // Duplicate/overlapping weekly intervals are mistakes, not extra capacity.
  for(const h of next.hours) assertValid(!next.hours.some(o=>o!==h&&o.practitionerId===h.practitionerId&&o.dayOfWeek===h.dayOfWeek&&o.startMinute<h.endMinute&&h.startMinute<o.endMinute),'Working intervals overlap.');
  const conflicts=next.appointments.filter(a=>!evaluateSlot(next,a.date,a.startTime,a.service,{practitionerId:a.practitionerId,excludeId:a.id,snapshot:a,patientId:a.patientId,patientPhone:a.phone,includePast:true}).available);
  if(conflicts.length) throw new SchedulingError('EXISTING_BOOKINGS','This change conflicts with future appointments. Reassign or reschedule them first.',conflicts.slice(0,50));
  if(!await commitScheduling(state,statements)) throw new SchedulingError('SCHEDULE_CHANGED','The schedule changed. Refresh and try again.');
  return getSchedulingConfiguration();
}
