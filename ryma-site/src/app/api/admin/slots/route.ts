import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetAppointments, dbGetBlockedSlots, dbToggleBlockSlot } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/slots?date=YYYY-MM-DD
 * Admin — returns full slot status including booked appointment IDs
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Paramètre date invalide' }, { status: 400 });
  }

  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  if (dayOfWeek === 0) {
    const slots = VALID_TIME_SLOTS.map(time => ({
      time,
      available: false,
      reason: 'sunday' as const,
      appointmentId: null,
    }));
    return NextResponse.json({ slots });
  }

  const appts = await dbGetAppointments({ date });
  const bookedMap = new Map(
    appts.filter(a => a.status !== 'CANCELLED').map(a => [a.startTime, a.id])
  );

  const blockedList = await dbGetBlockedSlots();
  const blocked = new Set(
    blockedList.filter(b => b.date === date).map(b => b.time)
  );

  const slots = VALID_TIME_SLOTS.map(time => {
    if (bookedMap.has(time)) return { time, available: false, reason: 'booked' as const, appointmentId: bookedMap.get(time) };
    if (blocked.has(time))   return { time, available: false, reason: 'blocked' as const, appointmentId: null };
    return { time, available: true, reason: null, appointmentId: null };
  });

  return NextResponse.json({ slots });
}

/**
 * POST /api/admin/slots
 * Admin — toggle block/unblock a time slot
 * Body: { date: string, time: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: { date?: string; time?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { date, time } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 422 });
  }

  if (!time || !VALID_TIME_SLOTS.includes(time as typeof VALID_TIME_SLOTS[number])) {
    return NextResponse.json({ error: 'Créneau horaire invalide' }, { status: 422 });
  }

  // Cannot block a slot that is already booked
  const appts = await dbGetAppointments({ date });
  const booked = appts.some(a => a.startTime === time && a.status !== 'CANCELLED');

  if (booked) {
    return NextResponse.json(
      { error: 'Ce créneau est déjà réservé par un patient' },
      { status: 409 }
    );
  }

  const isNowBlocked = await dbToggleBlockSlot(date, time);
  return NextResponse.json({ blocked: isNowBlocked, date, time });
}
