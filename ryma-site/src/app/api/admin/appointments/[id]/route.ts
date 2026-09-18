import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetAppointmentById,
  dbUpdateAppointment,
  dbDeleteAppointment,
  dbGetAppointments,
  dbGetBlockedSlots,
  AppointmentStatus,
} from '@/lib/db';
import { VALID_TIME_SLOTS, getLisbonDateTime } from '@/lib/validation';
import { broadcastAppointmentUpdated, broadcastAppointmentDeleted } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES: AppointmentStatus[] = [
  'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW',
];

// ─── GET /api/admin/appointments/:id ─────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  const appointment = await dbGetAppointmentById(id);
  if (!appointment) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  return NextResponse.json({ appointment });
}

// ─── PATCH /api/admin/appointments/:id ───────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  const existing = await dbGetAppointmentById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Partial<{
    status: AppointmentStatus;
    notes: string;
    date: string;
    startTime: string;
  }> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as AppointmentStatus)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 422 });
    }
    updates.status = body.status as AppointmentStatus;
  }

  if (body.notes !== undefined) {
    updates.notes = String(body.notes).trim().slice(0, 1000);
  }

  const newDate = body.date ? String(body.date).trim() : existing.date;
  const newTime = body.startTime ? String(body.startTime).trim() : existing.startTime;
  const newStatus = body.status !== undefined ? (body.status as AppointmentStatus) : existing.status;

  if (body.date !== undefined || body.startTime !== undefined) {
    if (!isCalendarDate(newDate)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 422 });
    }

    if (!VALID_TIME_SLOTS.includes(newTime as typeof VALID_TIME_SLOTS[number])) {
      return NextResponse.json({ error: 'Créneau horaire invalide' }, { status: 422 });
    }

    const { todayStr, currentHHMM } = getLisbonDateTime();
    if (newDate < todayStr || (newDate === todayStr && newTime <= currentHHMM) || new Date(newDate + 'T12:00:00Z').getUTCDay() === 0) return NextResponse.json({ error: 'Choose a future clinic opening time' }, { status: 422 });
    updates.date = newDate;
    updates.startTime = newTime;
  }

  // If the appointment will be ACTIVE, verify slot is not taken by another active appointment
  if (newStatus !== 'CANCELLED' && (body.date !== undefined || body.startTime !== undefined || existing.status === 'CANCELLED')) {
    const appts = await dbGetAppointments({ date: newDate });
    const conflict = appts.some(a => a.startTime === newTime && a.status !== 'CANCELLED' && a.id !== id);

    const blockedList = await dbGetBlockedSlots();
    const blocked = blockedList.some(b => b.date === newDate && b.time === newTime);

    if (conflict || blocked) {
      return NextResponse.json({ error: 'Ce créneau est déjà occupé par un autre rendez-vous actif.' }, { status: 409 });
    }
  }

  let updated;
  try { updated = await dbUpdateAppointment(id, updates); }
  catch (err) {
    if (/UNIQUE|slot_taken|slot_blocked/i.test(String(err))) return NextResponse.json({ error: 'Slot no longer available' }, { status: 409 });
    throw err;
  }
  if (!updated) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  if (updated) {
    broadcastAppointmentUpdated(updated);
  }
  return NextResponse.json({ appointment: updated });
}

// ─── DELETE /api/admin/appointments/:id — Permanent Removal ─────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  const existing = await dbGetAppointmentById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  await dbDeleteAppointment(id);
  broadcastAppointmentDeleted(id);
  return NextResponse.json({ deleted: true, id, message: 'Rendez-vous supprimé' });
}
