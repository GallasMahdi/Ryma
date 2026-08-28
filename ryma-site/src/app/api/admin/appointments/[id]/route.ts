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
import { VALID_TIME_SLOTS } from '@/lib/validation';
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
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // If status is being updated to CANCELLED, soft-cancel the appointment so clinical history is preserved
  if (body.status === 'CANCELLED') {
    const updated = await dbUpdateAppointment(id, { status: 'CANCELLED' });
    if (updated) {
      broadcastAppointmentUpdated(updated);
    }
    return NextResponse.json({ appointment: updated, id, message: 'Rendez-vous annulé' });
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 422 });
    }

    if (!VALID_TIME_SLOTS.includes(newTime as typeof VALID_TIME_SLOTS[number])) {
      return NextResponse.json({ error: 'Créneau horaire invalide' }, { status: 422 });
    }

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

  const updated = await dbUpdateAppointment(id, updates);
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
