import { createHash, randomUUID } from 'node:crypto';
import { dbGetPatientByPhone, dbGetPatientById, dbGetAppointmentById, dbAssertLegacyIdentity, dbCheckRateLimit, executeQuery, type Appointment, type CreateAppointmentInput, type AddAppointmentResult, type CreateMultipleAppointmentsInput, type CreateMultipleAppointmentsResult } from '@/lib/db';
import { assignmentColumns, commitScheduling, evaluateSlot, loadScheduleState, SchedulingError, schedulingFailure } from '@/lib/scheduling';
import { validateAndNormalizePhone, phonesMatch } from '@/lib/phone';
import { type BookingAssignment } from '@/types/scheduling';
import { type PatientSession } from '@/types/admin';

type Statement = {sql:string;args:any[]};
async function pauseBeforeRetry(attempt:number):Promise<void> {
  if(attempt>0)await new Promise(resolve=>setTimeout(resolve,Math.min(250,10*2**attempt)*(0.5+Math.random())));
}
async function prepareBookingPatient(input: Pick<CreateAppointmentInput,'patientName'|'phone'|'email'|'coverageType'|'coverageProvider'|'coverageNumber'>): Promise<{id:string;statements:Statement[]}> {
  const existing=await dbGetPatientByPhone(input.phone);
  if(existing){ if(existing.patientName.trim().replace(/\s+/g,' ').toLocaleLowerCase()!==input.patientName.trim().replace(/\s+/g,' ').toLocaleLowerCase()) throw new Error('patient_identity_conflict'); return {id:existing.id,statements:[]}; }
  const id='pat_'+randomUUID(),now=new Date().toISOString();
  try {await dbAssertLegacyIdentity(input.phone,input.patientName);}catch(error){if((error as {code?:string}).code!=='PATIENT_PHONE_CONFLICT')throw error;throw new Error('patient_identity_conflict');}
  // These statements commit with the appointment. Failed capacity checks and
  // transaction retries must not create empty clinical profiles or erase old notes.
  return {id,statements:[
    {sql:'INSERT INTO patients(id,patientName,phone,email,coverageType,coverageProvider,coverageNumber,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?)',args:[id,input.patientName,input.phone,input.email??null,input.coverageType??'PARTICULAR',input.coverageProvider??null,input.coverageNumber??null,now,now]},
    {sql:'INSERT INTO patient_notes(phone,patientName,content,tags,updatedAt) VALUES(?,?,?,?,?) ON CONFLICT(phone) DO NOTHING',args:[input.phone,input.patientName,'','',now]},
  ]};
}
const retryableBookingFailure=(error:unknown)=>schedulingFailure(error)||/UNIQUE.*patients.phone/i.test(String(error));
function insertAppointment(input: CreateAppointmentInput, assignment: BookingAssignment, patientId: string, id: string, now: string, hash?: string): Statement {
  const assigned=assignmentColumns(assignment);
  const values=[id,input.patientName,input.email??null,input.phone,input.service,input.date,input.startTime,input.status??'PENDING',input.notes??null,input.coverageType??'PARTICULAR',input.coverageProvider??null,input.coverageNumber??null,now,now,input.source??'dashboard',input.bookingRequestId??null,hash??null,patientId,...assigned.values];
  return {sql:`INSERT INTO appointments(id,patientName,email,phone,service,date,startTime,status,notes,coverageType,coverageProvider,coverageNumber,createdAt,updatedAt,source,bookingRequestId,bookingRequestHash,patientId,${assigned.columns}) VALUES(${values.map(()=>'?').join(',')})`,args:values};
}

function bookingHash(input: CreateAppointmentInput): string {
  return createHash('sha256').update(JSON.stringify([
    input.patientName,input.phone,input.email??'',input.service,input.date,input.startTime,
    input.practitionerId??'',input.source??'dashboard',input.status??'PENDING',input.notes??'',
    input.coverageType??'PARTICULAR',input.coverageProvider??'',input.coverageNumber??'',
  ])).digest('hex');
}

export async function findBookingReplay(input: CreateAppointmentInput): Promise<AddAppointmentResult|null> {
  if(!input.bookingRequestId)return null;
  const phone=validateAndNormalizePhone(input.phone);
  if(!phone.isValid)return {success:false,error:'invalid_data'};
  const rows=await executeQuery<Appointment>('SELECT * FROM appointments WHERE bookingRequestId=?',[input.bookingRequestId]);
  if(!rows[0])return null;
  if(rows[0].archivedAt)return {success:false,error:'invalid_data'};
  return rows[0].bookingRequestHash===bookingHash({...input,phone:phone.normalized})
    ? {success:true,appointment:rows[0],replayed:true}
    : {success:false,error:'invalid_data'};
}

export async function createScheduledAppointment(input: CreateAppointmentInput): Promise<AddAppointmentResult> {
  const phone=validateAndNormalizePhone(input.phone);
  if(!phone.isValid) return {success:false,error:'invalid_data'};
  input={...input,phone:phone.normalized};
  const hash=bookingHash(input);
  const replay=()=>findBookingReplay(input);
  const existing=await replay(); if(existing)return existing;
  for(let attempt=0;attempt<8;attempt++) {
    await pauseBeforeRetry(attempt);
    const state=await loadScheduleState([input.date]);
    let patient;try{patient=await prepareBookingPatient(input);}catch(error){if(String(error).includes('patient_identity_conflict'))return {success:false,error:'invalid_data'};throw error;}
    // Read after the revision, and charge inside the reservation transaction. Any
    // competing successful booking changes the revision and forces a fresh check.
    if(input.source==='website'&&!await dbCheckRateLimit('phone:'+input.phone,'booking_phone',3,3600)) {
      return (await replay())??{success:false,error:'rate_limited'};
    }
    const slot=evaluateSlot(state,input.date,input.startTime,input.service,{practitionerId:input.practitionerId,publicOnly:input.source==='website'||input.source==='whatsapp',patientId:patient.id,patientPhone:input.phone});
    if(!slot.available) {const replayed=await replay();return replayed??{success:false,error:slot.reason==='blocked'||slot.reason==='closed'?'slot_blocked':'slot_taken'};}
    const id='apt_'+randomUUID();
    try {
      const statements=[...patient.statements,insertAppointment(input,slot.candidates[0],patient.id,id,new Date().toISOString(),hash)];
      if(input.source==='website')statements.push({sql:'INSERT INTO rate_limit_log(ip,action,timestamp) VALUES(?,?,?)',args:['phone:'+input.phone,'booking_phone',Date.now()]});
      if(!await commitScheduling(state,statements))continue;
      return {success:true,appointment:(await dbGetAppointmentById(id))!};
    } catch(error) {const replayed=await replay();if(replayed)return replayed;if(!retryableBookingFailure(error))throw error;}
  }
  return {success:false,error:'schedule_changed'};
}

export async function createScheduledSeries(input: CreateMultipleAppointmentsInput): Promise<CreateMultipleAppointmentsResult> {
  const invalid=(message:string):CreateMultipleAppointmentsResult=>({success:false,error:'invalid_input',message});
  const phone=validateAndNormalizePhone(input.phone);
  if(!phone.isValid||!input.sessions?.length||input.sessions.length>50)return invalid('Invalid patient or session count.');
  input={...input,phone:phone.normalized};
  if(input.sessions.some(s=>s.evaPainScore!=null))return invalid('Planned visits cannot contain measured EVA scores. Record the measurement when completing the session.');
  const requestKey=input.bookingRequestId?'series:'+input.bookingRequestId:undefined;
  const requestHash=createHash('sha256').update(JSON.stringify([
    input.patientName,input.phone,input.email??'',input.service,input.practitionerId??'',input.patientId??'',
    input.coverageType??'PARTICULAR',input.coverageProvider??'',input.coverageNumber??'',input.sessionType??'MANUAL',
    input.sessions.map(s=>[s.date,s.startTime,s.notes??'',s.evaPainScore??null]),
  ])).digest('hex');
  const replay=async():Promise<CreateMultipleAppointmentsResult|null>=>{
    if(!requestKey)return null;
    const row=(await executeQuery<{responseBody:string}>('SELECT responseBody FROM idempotency_keys WHERE key=? AND scope=?',[requestKey,'booking_series']))[0];
    if(!row)return null;
    const saved=JSON.parse(row.responseBody) as {requestHash:string;ids:string[];patientId:string};
    if(saved.requestHash!==requestHash)return invalid('This request key belongs to a different treatment plan.');
    const marks=saved.ids.map(()=>'?').join(',');
    const appointments=await executeQuery<Appointment>(`SELECT * FROM appointments WHERE archivedAt IS NULL AND id IN(${marks}) ORDER BY date,startTime`,saved.ids);
    const patientSessions=await executeQuery<PatientSession>(`SELECT * FROM patient_sessions WHERE appointmentId IN(${marks}) ORDER BY date,time`,saved.ids);
    if(appointments.length!==saved.ids.length||patientSessions.length!==saved.ids.length)return invalid('This plan was already created and later modified or removed. Refresh the agenda.');
    return {success:true,appointments,patientSessions,patientId:saved.patientId,replayed:true};
  };
  const existing=await replay();if(existing)return existing;
    if(input.patientId){const p=await dbGetPatientById(input.patientId);if(!p||!phonesMatch(p.phone,phone.normalized))return invalid('Patient does not match the supplied phone number.');}
  for(let attempt=0;attempt<8;attempt++) {
    await pauseBeforeRetry(attempt);
    const state=await loadScheduleState(input.sessions.map(s=>s.date));
    let patient;try{patient=await prepareBookingPatient(input);}catch(error){if(String(error).includes('patient_identity_conflict'))return invalid('This contact is already associated with another patient.');throw error;}
    if(input.patientId&&patient.id!==input.patientId)return invalid('Patient record changed. Refresh before booking.');
    const candidates=state.practitioners.filter(p=>p.active&&(!input.practitionerId||p.id===input.practitionerId));
    let chosen: {id:string;assignment:BookingAssignment;session:typeof input.sessions[number]}[]|null=null;
    for(const practitioner of candidates) {
      const scratch={...state,appointments:[...state.appointments]};
      const rows=[];
      for(const session of input.sessions) {
        const slot=evaluateSlot(scratch,session.date,session.startTime,input.service,{practitionerId:practitioner.id,patientId:patient.id,patientPhone:phone.normalized});
        if(!slot.available)break;
        const id='apt_sess_'+randomUUID();
        rows.push({id,assignment:slot.candidates[0],session});
        scratch.appointments.push({id,...session,...slot.candidates[0],service:input.service,status:'CONFIRMED',patientId:patient.id,phone:phone.normalized});
      }
      if(rows.length===input.sessions.length){chosen=rows;break;}
    }
    if(!chosen)return (await replay())??{success:false,error:'slot_conflict',message:'Choose a practitioner available for the complete treatment plan.',conflicts:input.sessions.map((s,i)=>({...s,reason:'practitioner_unavailable',sessionIndex:i+1}))};
    const now=new Date().toISOString();
    const statements:Statement[]=[...patient.statements];
    const sessions:PatientSession[]=[];
    for(const [index,row] of chosen.entries()) {
      const notes=row.session.notes||`Session ${index+1} · Treatment plan`;
      statements.push(insertAppointment({...input,bookingRequestId:undefined,phone:phone.normalized,date:row.session.date,startTime:row.session.startTime,notes,status:'CONFIRMED'},row.assignment,patient.id,row.id,now));
      const session:PatientSession={id:row.id.slice(4),patientId:patient.id,date:row.session.date,time:row.session.startTime,serviceSlug:input.service,evaPainScore:null,legacyEvaPainScore:null,archivedAt:null,clinicalStatus:'PLANNED',completedAt:null,version:1,sessionType:input.sessionType??'MANUAL',notes,practitioner:row.assignment.practitionerName,practitionerId:row.assignment.practitionerId,appointmentId:row.id,createdAt:now};
      statements.push({sql:'INSERT INTO patient_sessions(id,patientId,date,time,serviceSlug,evaPainScore,sessionType,notes,practitioner,practitionerId,appointmentId,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',args:[session.id,patient.id,session.date,session.time,session.serviceSlug,session.evaPainScore,session.sessionType,notes,session.practitioner,session.practitionerId,session.appointmentId,now]});
      sessions.push(session);
    }
    statements.push({sql:'UPDATE patients SET totalPrescribedSessions=MAX(totalPrescribedSessions,?),updatedAt=? WHERE id=?',args:[input.sessions.length,now,patient.id]});
    if(requestKey)statements.push({sql:'INSERT INTO idempotency_keys(key,scope,statusCode,responseBody,createdAt,expiresAt) VALUES(?,?,?,?,?,?)',args:[requestKey,'booking_series',201,JSON.stringify({requestHash,ids:chosen.map(r=>r.id),patientId:patient.id}),Date.now(),Number.MAX_SAFE_INTEGER]});
    try {
      if(!await commitScheduling(state,statements))continue;
      const appointments=await executeQuery<Appointment>(`SELECT * FROM appointments WHERE id IN(${chosen.map(()=>'?').join(',')}) ORDER BY date,startTime`,chosen.map(r=>r.id));
      return {success:true,appointments,patientSessions:sessions,patientId:patient.id};
    }catch(error){const recovered=await replay();if(recovered)return recovered;if(!retryableBookingFailure(error))throw error;}
  }
  return {success:false,error:'schedule_changed',message:'The schedule is busy. Please retry this request.'};
}

export type AppointmentChanges=Partial<Pick<Appointment,'status'|'notes'|'date'|'startTime'|'coverageType'|'coverageProvider'|'coverageNumber'|'practitionerId'>> & {expectedVersion?:number};
export async function updateScheduledAppointment(id:string,fields:AppointmentChanges):Promise<Appointment|null> {
  for(let attempt=0;attempt<5;attempt++) {
    await pauseBeforeRetry(attempt);
    const existing=await dbGetAppointmentById(id);if(!existing)return null;
    if(fields.expectedVersion!==undefined&&fields.expectedVersion!==existing.version)throw new SchedulingError('APPOINTMENT_CHANGED','This appointment was changed by another user. Refresh before editing.');
    const date=fields.date??existing.date,time=fields.startTime??existing.startTime;
    const state=await loadScheduleState([date]);
    if(fields.practitionerId&&!state.practitioners.some(p=>p.id===fields.practitionerId&&p.active))throw new SchedulingError('INVALID_INPUT','Choose an active practitioner.');
    const moving=date!==existing.date||time!==existing.startTime||(fields.practitionerId!==undefined&&fields.practitionerId!==existing.practitionerId)||existing.status==='CANCELLED';
    if (moving && (await executeQuery("SELECT id FROM patient_sessions WHERE appointmentId=? AND clinicalStatus='COMPLETED'",[id])).length) throw new SchedulingError('INVALID_INPUT','A documented consultation cannot be rescheduled. Create a separate appointment.');
    let assignment:BookingAssignment|undefined;
    if((fields.status??existing.status)!=='CANCELLED'&&moving) {
      const slot=evaluateSlot(state,date,time,existing.service,{practitionerId:fields.practitionerId??existing.practitionerId,excludeId:id,patientId:existing.patientId,patientPhone:existing.phone,snapshot:existing});
      if(!slot.available)throw new SchedulingError('SLOT_CONFLICT','The practitioner, patient, or required resource is unavailable.');
      assignment=slot.candidates[0];
    }
    const updates:string[]=[],args:any[]=[];
    for(const key of ['status','notes','date','startTime','coverageType','coverageProvider','coverageNumber','practitionerId'] as const) if(fields[key]!==undefined){updates.push(`${key}=?`);args.push(fields[key]);}
    const practitionerName=assignment?.practitionerName ?? (fields.practitionerId!==undefined ? state.practitioners.find(p=>p.id===fields.practitionerId)?.name : undefined);
    if(practitionerName!==undefined){updates.push('practitionerName=?');args.push(practitionerName);}
    updates.push('version=version+1','updatedAt=?');args.push(new Date().toISOString(),id,existing.version);
    const statements:Statement[]=[{sql:`UPDATE appointments SET ${updates.join(',')} WHERE id=? AND version=?`,args}];
    statements.push({sql:`UPDATE patient_sessions SET date=(SELECT date FROM appointments WHERE id=?),time=(SELECT startTime FROM appointments WHERE id=?),practitionerId=(SELECT practitionerId FROM appointments WHERE id=?),practitioner=(SELECT practitionerName FROM appointments WHERE id=?),version=version+1 WHERE appointmentId=? AND clinicalStatus!='COMPLETED'`,args:[id,id,id,id,id]});
    try{if(await commitScheduling(state,statements,{id,version:existing.version}))return dbGetAppointmentById(id);}catch(error){if(!schedulingFailure(error))throw error;throw new SchedulingError('SLOT_CONFLICT','This time is no longer available.');}
  }
  throw new SchedulingError('SCHEDULE_CHANGED','The schedule changed. Refresh and try again.');
}
