import { VALID_TIME_SLOTS, VALID_SERVICES, getLisbonDateTime } from '@/lib/validation';
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
    return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const date = body.date ? String(body.date).trim() : getLisbonDateTime().todayStr;
  const time = body.time ? String(body.time).trim() : null;
  const serviceSlug = body.serviceSlug ? String(body.serviceSlug).trim() : 'kinesitherapie-generale';
  const evaPainScore = typeof body.evaPainScore === 'number' ? Math.min(10, Math.max(0, body.evaPainScore)) : 5;
  const sessionType = (body.sessionType as 'ONLINE' | 'MANUAL' | 'PAPER') ?? 'MANUAL';
  const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
  const practitioner = body.practitioner ? String(body.practitioner).trim() : null;

  if (!isCalendarDate(date) || (time && !VALID_TIME_SLOTS.includes(time as typeof VALID_TIME_SLOTS[number])) || !['ONLINE', 'MANUAL', 'PAPER'].includes(sessionType) || ![...VALID_SERVICES, 'kinesitherapie-generale'].includes(serviceSlug)) return NextResponse.json({ error: 'Invalid session date, time, type or service' }, { status: 422 });
  if (body.evaPainScore !== undefined && (typeof body.evaPainScore !== 'number' || !Number.isInteger(body.evaPainScore) || body.evaPainScore < 0 || body.evaPainScore > 10)) return NextResponse.json({ error: 'EVA must be an integer from 0 to 10' }, { status: 422 });

  // If time is specified, validate slot availability against authoritative booking engine
  if (time) {
    const check = await dbCheckSlotAvailability(date, time);
    if (!check.available) {
      return NextResponse.json(
        {
          error: 'slot_taken',
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
    patientId,
    date,
    time,
    serviceSlug,
    evaPainScore,
    sessionType,
    notes,
    practitioner,
    });
  } catch (err) {
    if (/UNIQUE|slot_taken|slot_blocked/i.test(String(err))) return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 });
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
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const sessionId = body.sessionId ? String(body.sessionId).trim() : null;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requis' }, { status: 422 });
  }

  const evaPainScore = typeof body.evaPainScore === 'number' ? Math.min(10, Math.max(0, body.evaPainScore)) : undefined;
  const notes = body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined;

  const updatedSession = await dbUpdatePatientSession(
    sessionId,
    {
      evaPainScore,
      notes,
    },
    patientId
  );

  if (!updatedSession) {
    return NextResponse.json({ error: 'Session introuvable pour ce patient' }, { status: 404 });
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
    return NextResponse.json({ error: 'sessionId requis' }, { status: 422 });
  }

  const deleted = await dbDeletePatientSession(sessionId, patientId);
  if (!deleted) {
    return NextResponse.json({ error: 'Session introuvable pour ce patient' }, { status: 404 });
  }

  broadcastAppointmentDeleted('apt_' + sessionId);

  return NextResponse.json({ ok: true });
}
