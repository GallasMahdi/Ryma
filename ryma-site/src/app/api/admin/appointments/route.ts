import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetAppointments,
  dbCreateAppointment,
} from '@/lib/db';
import { VALID_SERVICES, VALID_TIME_SLOTS, validateAppointmentInput } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/appointments ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const date   = searchParams.get('date')   ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const appointments = await dbGetAppointments({ status, date, search });
  return NextResponse.json({ appointments }, { status: 200 });
}

// ─── POST /api/admin/appointments ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateAppointmentInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const result = await dbCreateAppointment({
    patientName: String(body.patientName).trim().slice(0, 100),
    email:       body.email ? String(body.email).trim().slice(0, 254) : undefined,
    phone:       String(body.phone).trim().slice(0, 30),
    service:     String(body.service).trim(),
    date:        String(body.date).trim(),
    startTime:   String(body.startTime).trim(),
    notes:       body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
  });

  if (!result.success) {
    if (result.error === 'slot_taken' || result.error === 'slot_blocked') {
      return NextResponse.json({ error: 'Ce créneau n\'est plus disponible' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Données invalides' }, { status: 422 });
  }

  return NextResponse.json({ appointment: result.appointment }, { status: 201 });
}
