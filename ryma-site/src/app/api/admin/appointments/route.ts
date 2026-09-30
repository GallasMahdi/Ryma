import { isJsonObject, pageNumber, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetAppointments,
  dbGetAppointmentSummary,
  dbGetAppointmentsPaginated,
  dbCreateAppointment,
} from '@/lib/db';
import { VALID_SERVICES, VALID_TIME_SLOTS, validateAppointmentInput } from '@/lib/validation';
import { broadcastAppointmentCreated } from '@/lib/events';
import { sendAppointmentConfirmationEmail } from '@/lib/email';
import { validateAndNormalizePhone } from '@/lib/phone';

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
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  const phone = searchParams.get('phone') || undefined;
  const stats = searchParams.get('summary') === '1' ? await dbGetAppointmentSummary() : undefined;
  if (searchParams.get('calendar') === '1') {
    const days = (Date.parse(dateTo || '') - Date.parse(dateFrom || '')) / 86400000;
    if (!isCalendarDate(dateFrom) || !isCalendarDate(dateTo) || !Number.isFinite(days) || days < 0 || days > 31) return NextResponse.json({error: 'Invalid calendar range'}, {status: 400});
    const appointments = await dbGetAppointments({status, search, date, dateFrom, dateTo});
    return NextResponse.json({appointments, total: appointments.length, stats}, {headers: {'Cache-Control': 'no-store'}});
  }
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  if (pageParam !== null || limitParam !== null) {
    const page = pageNumber(pageParam, 1);
    const limit = pageNumber(limitParam, 50, 100);
    const res = await dbGetAppointmentsPaginated({ status, date, search, dateFrom, dateTo, phone, page, limit });
    return NextResponse.json(
      {...res, stats},
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      }
    );
  }

  const appointments = await dbGetAppointments({ status, date, search, dateFrom, dateTo, phone });
  return NextResponse.json(
    { appointments, stats },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}

// ─── POST /api/admin/appointments ───────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateAppointmentInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, errorCode: validation.errorCode }, { status: 422 });
  }

  const result = await dbCreateAppointment({
    patientName: String(body.patientName).trim().slice(0, 100),
    email:       body.email ? String(body.email).trim().slice(0, 254) : undefined,
    phone:       validateAndNormalizePhone(body.phone).normalized,
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

  // Broadcast to all active admin tabs
  broadcastAppointmentCreated(result.appointment);

  // Dispatch confirmation email to patient if email is provided
  if (result.appointment.email) {
    sendAppointmentConfirmationEmail(result.appointment).catch(() => {});
  }

  return NextResponse.json({ appointment: result.appointment }, { status: 201 });
}
