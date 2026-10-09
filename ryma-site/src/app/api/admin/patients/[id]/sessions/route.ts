import { localizeApiError } from '@/lib/api-i18n';
import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { VALID_TIME_SLOTS, getLisbonDateTime } from '@/lib/validation';
import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbAddPatientSession,
  dbUpdatePatientSession,
  dbDeletePatientSession,
  dbGetPatientById,
  dbGetAppointmentById,
  dbCheckSlotAvailability,
  executeQuery,
} from '@/lib/db';
import { broadcastAppointmentCreated, broadcastAppointmentDeleted } from '@/lib/events';
import { ClinicalError, validEva } from '@/lib/clinical';

// POST /api/admin/patients/[id]/sessions — log a new clinical session with EVA score
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id: patientId } = await params;
  const patient = await dbGetPatientById(patientId);

  if (!patient) {
    return NextResponse.json({ error: localizeApiError('Patient introuvable', request) }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
  } catch {
    return NextResponse.json({ error: localizeApiError('Corps de requête invalide', request) }, { status: 400 });
  }

  const date = body.date ? String(body.date).trim() : getLisbonDateTime().todayStr;
  const time = body.time ? String(body.time).trim() : null;
  const linkedAppointment=typeof body.appointmentId==='string'?await dbGetAppointmentById(body.appointmentId):null;
  const serviceSlug = typeof body.serviceSlug==='string' ? body.serviceSlug.trim() : linkedAppointment?.service ?? '';
  const historicalService=linkedAppointment?.patientId===patientId && linkedAppointment?.service===serviceSlug;
  const evaPainScore = body.evaPainScore === undefined ? null : body.evaPainScore;
  const sessionType = (body.sessionType as 'ONLINE' | 'MANUAL' | 'PAPER') ?? 'MANUAL';
  const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
  const practitioner = body.practitioner ? String(body.practitioner).trim() : null;

  if (!isCalendarDate(date) || (time && !VALID_TIME_SLOTS.includes(time as typeof VALID_TIME_SLOTS[number])) || !['ONLINE', 'MANUAL', 'PAPER'].includes(sessionType) || (!historicalService && !(await isKnownTreatment(serviceSlug)))) return NextResponse.json({ error: localizeApiError('Invalid session date, time, type or service', request) }, { status: 422 });
  if (!validEva(evaPainScore)) return NextResponse.json({error:localizeApiError('EVA must be null or an integer from 0 to 10', request)},{status:422});
  if (body.clinicalStatus!==undefined && !['PLANNED','COMPLETED'].includes(String(body.clinicalStatus))) return NextResponse.json({error:localizeApiError('Invalid clinical status', request)},{status:422});

  // If time is specified, validate slot availability against authoritative booking engine
  if (!body.appointmentId && time && (date > getLisbonDateTime().todayStr || (date === getLisbonDateTime().todayStr && time > getLisbonDateTime().currentHHMM))) {
    const check = await dbCheckSlotAvailability(date, time, serviceSlug, {practitionerId: typeof body.practitionerId === "string" ? body.practitionerId : undefined});
    if (!check.available) {
      return NextResponse.json(
        {
          error: localizeApiError('slot_taken', request),
          message: check.reason === 'blocked'
            ? 'Este horário está bloqueado na agenda.'
            : check.reason === 'sunday'
            ? 'A clínica encontra-se encerrada aos domingos.'
            : 'Este horário já se encontra ocupado por outra consulta.',
        },
        { status: 409 }
      );
    }
  }

  let session;
  try {
    session = await dbAddPatientSession({
    practitionerId: typeof body.practitionerId === "string" ? body.practitionerId : undefined,
    patientId,
    appointmentId: typeof body.appointmentId==='string' ? body.appointmentId : undefined,
    clinicalStatus: body.clinicalStatus as 'PLANNED' | 'COMPLETED' | undefined,
    actorSessionId: auth.session.sessionId,
    date,
    time,
    serviceSlug,
    evaPainScore,
    sessionType,
    notes,
    practitioner,
    });
  } catch (err) {
    if (err instanceof ClinicalError) return NextResponse.json({error:localizeApiError(err.message, request),code:err.code},{status:err.status});
    if (/UNIQUE|slot_taken|slot_blocked/i.test(String(err))) return NextResponse.json({ error: localizeApiError('Slot no longer available', request) }, { status: 409 });
    throw err;
  }

  if (time) {
    const appointment = await dbGetAppointmentById('apt_' + session.id);
    if (appointment) broadcastAppointmentCreated(appointment);
  }

  return NextResponse.json({ session }, { status: 201 });
}

// PATCH /api/admin/patients/[id]/sessions — update a session EVA score or notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id: patientId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
  } catch {
    return NextResponse.json({ error: localizeApiError('Corps de requête invalide', request) }, { status: 400 });
  }

  const sessionId = body.sessionId ? String(body.sessionId).trim() : null;
  if (!sessionId) {
    return NextResponse.json({ error: localizeApiError('sessionId requis', request) }, { status: 422 });
  }

  if (body.evaPainScore!==undefined && !validEva(body.evaPainScore)) return NextResponse.json({error:localizeApiError('EVA must be null or an integer from 0 to 10', request)},{status:422});
  if (body.clinicalStatus!==undefined && !['PLANNED','COMPLETED'].includes(String(body.clinicalStatus))) return NextResponse.json({error:localizeApiError('Invalid clinical status', request)},{status:422});
  if (body.notes!==undefined && body.notes!==null && (typeof body.notes!=='string' || body.notes.length>2000)) return NextResponse.json({error:localizeApiError('Invalid clinical notes', request)},{status:422});
  const evaPainScore = body.evaPainScore as number | null | undefined;
  const notes = body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined;

  let updatedSession;
  try { updatedSession = await dbUpdatePatientSession(
    sessionId,
    {
      evaPainScore,
      notes,
      expectedVersion: body.expectedVersion as number | undefined,
      clinicalStatus: body.clinicalStatus as 'PLANNED' | 'COMPLETED' | undefined,
      actorSessionId: auth.session.sessionId,
    },
    patientId
  ); } catch (err) {
    if (err instanceof ClinicalError) return NextResponse.json({error:localizeApiError(err.message, request),code:err.code},{status:err.status});
    throw err;
  }

  if (!updatedSession) {
    return NextResponse.json({ error: localizeApiError('Session introuvable pour ce patient', request) }, { status: 404 });
  }

  return NextResponse.json({ session: updatedSession });
}

// DELETE /api/admin/patients/[id]/sessions?sessionId=xxx — delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id: patientId } = await params;
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: localizeApiError('sessionId requis', request) }, { status: 422 });
  }

  let deleted;
  try {
    deleted = await dbDeletePatientSession(sessionId, patientId, auth.session.sessionId);
  } catch (error) {
    if (error instanceof ClinicalError) return NextResponse.json({error:localizeApiError(error.message, request),code:error.code},{status:error.status});
    throw error;
  }
  if (!deleted) {
    return NextResponse.json({ error: localizeApiError('Session introuvable pour ce patient', request) }, { status: 404 });
  }

  broadcastAppointmentDeleted('apt_' + sessionId);

  return NextResponse.json({ ok: true });
}
