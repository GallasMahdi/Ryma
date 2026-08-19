import { NextRequest, NextResponse } from 'next/server';
import { dbGetAppointments, dbGetBlockedSlots } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/slots?date=YYYY-MM-DD
 * Public endpoint — returns slot availability for a given date.
 *
 * IMPORTANT: Returns only availability (true/false), never patient data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Paramètre date invalide' }, { status: 400 });
  }

  // Sunday check — no DB call needed
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  if (dayOfWeek === 0) {
    const slots = VALID_TIME_SLOTS.map(time => ({ time, available: false, reason: 'sunday' as const }));
    return NextResponse.json({ slots }, { status: 200 });
  }

  try {
    // Get booked times for this date (active appointments only)
    const activeAppts = await dbGetAppointments({ date });
    const booked = new Set(
      activeAppts
        .filter(a => a.status !== 'CANCELLED')
        .map(a => a.startTime)
    );

    // Get blocked slots for this date
    const blockedSlotsList = await dbGetBlockedSlots();
    const blocked = new Set(
      blockedSlotsList
        .filter(b => b.date === date)
        .map(b => b.time)
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const slots = VALID_TIME_SLOTS.map(time => {
      if (date === todayStr && time <= currentHHMM) {
        return { time, available: false, reason: 'past' as const };
      }
      if (booked.has(time))   return { time, available: false, reason: 'booked' as const };
      if (blocked.has(time))  return { time, available: false, reason: 'blocked' as const };
      return { time, available: true };
    });

    // No caching to ensure real-time slot state
    return NextResponse.json(
      { slots },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (err) {
    console.error('[API /api/slots Error]:', err);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des créneaux. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}

