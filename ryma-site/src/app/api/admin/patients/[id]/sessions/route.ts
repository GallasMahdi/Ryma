import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbAddPatientSession,
  dbDeletePatientSession,
  dbGetPatientById,
  dbGetAppointmentById,
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
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const date = body.date ? String(body.date).trim() : new Date().toISOString().split('T')[0];
  const time = body.time ? String(body.time).trim() : null;
  const serviceSlug = body.serviceSlug ? String(body.serviceSlug).trim() : 'kinesitherapie-generale';
  const evaPainScore = typeof body.evaPainScore === 'number' ? Math.min(10, Math.max(0, body.evaPainScore)) : 5;
  const sessionType = (body.sessionType as 'ONLINE' | 'MANUAL' | 'PAPER') ?? 'MANUAL';
  const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
  const practitioner = body.practitioner ? String(body.practitioner).trim() : null;

  const session = await dbAddPatientSession({
    patientId,
    date,
    time,
    serviceSlug,
    evaPainScore,
    sessionType,
    notes,
    practitioner,
  });

  // If time is provided, create/sync a confirmed appointment in the appointments table
  // so it immediately appears on the Admin Calendar and disables the slot for client-side booking
  if (time && session) {
    const aptId = 'apt_' + session.id;
    const now = new Date().toISOString();
    const sessionNote = notes
      ? `${notes} [EVA: ${evaPainScore}/10]`
      : `Séance clinique (${sessionType}) • EVA: ${evaPainScore}/10`;

    try {
      await executeQuery(
        `INSERT OR REPLACE INTO appointments
          (id, patientName, email, phone, service, date, startTime, status, notes, coverageType, coverageProvider, coverageNumber, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?, ?)`,
        [
          aptId,
          patient.patientName,
          patient.email ?? null,
          patient.phone,
          serviceSlug,
          date,
          time,
          sessionNote,
          patient.coverageType ?? 'PARTICULAR',
          patient.coverageProvider ?? null,
          patient.coverageNumber ?? null,
          now,
          now,
        ]
      );

      const createdAppt = await dbGetAppointmentById(aptId);
      if (createdAppt) {
        broadcastAppointmentCreated(createdAppt);
      }
    } catch (err) {
      console.error('Error syncing appointment for patient session:', err);
    }
  }

  return NextResponse.json({ session }, { status: 201 });
}

// DELETE /api/admin/patients/[id]/sessions?sessionId=xxx — delete a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const sessionId = request.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requis' }, { status: 422 });
  }

  const aptId = 'apt_' + sessionId;
  await dbDeletePatientSession(sessionId);

  try {
    await executeQuery('DELETE FROM appointments WHERE id = ?', [aptId]);
    broadcastAppointmentDeleted(aptId);
  } catch {
    /* silent */
  }

  return NextResponse.json({ ok: true });
}
