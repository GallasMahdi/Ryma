import { localizeApiError } from '@/lib/api-i18n';
import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbToggleBlockSlot, dbGetAppointmentById } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';
import { loadScheduleState, evaluateSlot } from '@/lib/scheduling';
import { clockMinutes } from '@/lib/booking-schedule';
export const dynamic='force-dynamic';
export const revalidate=0;
export async function GET(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  const date=request.nextUrl.searchParams.get('date');
  const practitionerId=request.nextUrl.searchParams.get('practitionerId')||undefined;
  const service=request.nextUrl.searchParams.get('service')||undefined;
  if(!isCalendarDate(date)||(service&&!(await isKnownTreatment(service))))return NextResponse.json({error:localizeApiError('Invalid date or service', request)},{status:400});
  const state=await loadScheduleState([date]);
  if(practitionerId&&!state.practitioners.some(p=>p.id===practitionerId))return NextResponse.json({error:localizeApiError('Practitioner not found', request)},{status:404});
  const excludeId=request.nextUrl.searchParams.get('excludeId')||undefined;
  const existing=excludeId?await dbGetAppointmentById(excludeId):null;
  if(excludeId&&!existing)return NextResponse.json({error:localizeApiError('Appointment not found. Refresh the agenda.', request)},{status:404});
  const slots=VALID_TIME_SLOTS.map(time=>{
    const slot=evaluateSlot(state,date,time,existing?.service??service,{practitionerId,excludeId,snapshot:existing??undefined,patientId:existing?.patientId,patientPhone:existing?.phone});
    const appointment=state.appointments.find(a=>(!practitionerId||a.practitionerId===practitionerId)&&clockMinutes(a.startTime)-a.bufferBefore<clockMinutes(time)+30&&clockMinutes(time)<clockMinutes(a.startTime)+a.durationMinutes+a.bufferAfter);
    const scope=practitionerId||'*';
    const explicitlyBlocked=state.blocks.some(b=>b.time===time&&b.practitionerId===scope);
    return {time,inheritedBlock:!!practitionerId&&state.blocks.some(b=>b.time===time&&b.practitionerId==='*'),available:slot.available,reason:explicitlyBlocked?'blocked':slot.reason??null,appointmentId:!slot.available&&slot.reason==='booked'?appointment?.id??null:null};
  });
  return NextResponse.json({slots,blocks:state.blocks,revision:state.revision},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  let body:Record<string,unknown>;try{body=await request.json();}catch{return NextResponse.json({error:localizeApiError('Invalid JSON', request)},{status:400});}
  if(!isJsonObject(body))return NextResponse.json({error:localizeApiError('JSON object required', request)},{status:400});
  if(!isCalendarDate(body.date)||typeof body.time!=='string'||!VALID_TIME_SLOTS.includes(body.time)||(body.practitionerId!==undefined&&typeof body.practitionerId!=='string'))return NextResponse.json({error:localizeApiError('Invalid date, time, or practitioner', request)},{status:422});
  try{return NextResponse.json({blocked:await dbToggleBlockSlot(body.date,body.time,String(body.practitionerId||'*')),date:body.date,time:body.time});}
  catch(error){if(/slot_taken|UNIQUE|invalid_practitioner/.test(String(error)))return NextResponse.json({error:localizeApiError('An appointment overlaps this interval, or the practitioner is invalid. Refresh availability.', request)},{status:409});throw error;}
}
