import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetAppointmentById,
  dbUpdateAppointment,
  AppointmentStatus,
} from '@/lib/db';
import { VALID_TIME_SLOTS, VALID_SERVICES } from '@/lib/validation';

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
  const appointment = dbGetAppointmentById(id);
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

  const existing = dbGetAppointmentById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Partial<{
    status: AppointmentStatus;
    notes: string;
    date: string;
    startTime: string;
  }> = {};

  // Validate status if provided
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as AppointmentStatus)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 422 });
    }
    updates.status = body.status as AppointmentStatus;
  }

  // Validate notes if provided
  if (body.notes !== undefined) {
    updates.notes = String(body.notes).trim().slice(0, 1000);
  }

  // Validate reschedule if provided (date + startTime must come together)
  if (body.date !== undefined || body.startTime !== undefined) {
    const newDate = body.date ? String(body.date).trim() : existing.date;
    const newTime = body.startTime ? String(body.startTime).trim() : existing.startTime;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 422 });
    }

    // Validate time is in allowed slots
    if (!VALID_TIME_SLOTS.includes(newTime as typeof VALID_TIME_SLOTS[number])) {
      return NextResponse.json({ error: 'Créneau horaire invalide' }, { status: 422 });
    }

    // Check the new slot is available (but ignore the current appointment's own slot)
    const { getDb } = await import('@/lib/db');
    const db = getDb();

    const conflict = db.prepare(
      "SELECT 1 FROM appointments WHERE date = ? AND startTime = ? AND status != 'CANCELLED' AND id != ?"
    ).get(newDate, newTime, id);

    const blocked = db.prepare(
      'SELECT 1 FROM blocked_slots WHERE date = ? AND time = ?'
    ).get(newDate, newTime);

    if (conflict || blocked) {
      return NextResponse.json({ error: 'Ce créneau n\'est plus disponible' }, { status: 409 });
    }

    updates.date = newDate;
    updates.startTime = newTime;
  }

  const updated = dbUpdateAppointment(id, updates);
  return NextResponse.json({ appointment: updated });
}

// ─── DELETE /api/admin/appointments/:id — Soft delete (sets CANCELLED) ───────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;

  const existing = dbGetAppointmentById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
  }

  // Soft delete — keeps the record, marks as CANCELLED
  const updated = dbUpdateAppointment(id, { status: 'CANCELLED' });
  return NextResponse.json({ appointment: updated });
}
