import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { NextRequest, NextResponse } from 'next/server';
import { dbCheckSlotAvailability, dbCheckMultipleDatesAvailability } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';
import { isCalendarDate } from '@/lib/admin-validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/slots?date=YYYY-MM-DD
 * GET /api/slots?dates=YYYY-MM-DD,YYYY-MM-DD,...  (up to 35 dates, for calendar month prefetch)
 *
 * Public endpoint — returns slot availability. Never returns patient data.
 * Uses dbCheckMultipleDatesAvailability which is the single authoritative,
 * index-assisted, batched availability checker across the entire system.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const service = searchParams.get('service') || undefined;
  const practitionerId = searchParams.get('practitionerId') || undefined;
  try { if (service && !(await isKnownTreatment(service, true))) return NextResponse.json({error: 'Invalid service'}, {status: 400}); } catch { return NextResponse.json({error:'Catalogue temporarily unavailable'}, {status:503,headers:{'Retry-After':'5','Cache-Control':'no-store'}}); }

  // ── Multi-date mode: calendar month prefetch ─────────────────────────────
  const datesParam = searchParams.get('dates');
  if (datesParam) {
    const rawDates = datesParam.split(',').slice(0, 35); // cap at 35 to prevent abuse
    const validDates = rawDates.map(d => d.trim()).filter(isCalendarDate);

    if (validDates.length === 0) {
      return NextResponse.json({ error: 'Paramètre dates invalide' }, { status: 400 });
    }

    try {
      const availabilityMap = await dbCheckMultipleDatesAvailability(validDates, VALID_TIME_SLOTS, service, {practitionerId, publicOnly: true});
      const result: Record<string, boolean> = {};
      for (const [date, slots] of availabilityMap.entries()) {
        // A date is "available" if it has at least one open slot
        result[date] = slots.some(s => s.available);
      }
      return NextResponse.json(
        { availability: result },
        { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    } catch (err) {
      console.error('[API /api/slots multi-date Error]:');
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
  }

  // ── Single-date mode: slot grid for selected date ──────────────────────────
  const date = searchParams.get('date');

  if (!isCalendarDate(date)) {
    return NextResponse.json({ error: 'Paramètre date invalide' }, { status: 400 });
  }

  try {
    // Use the same batched, authoritative availability engine used everywhere else in the system
    const availabilityMap = await dbCheckMultipleDatesAvailability([date], VALID_TIME_SLOTS, service, {practitionerId, publicOnly: true});
    const daySlots = availabilityMap.get(date) ?? [];

    const slots = daySlots.map(s => ({
      time: s.time,
      available: s.available,
      reason: s.reason ?? null,
      appointmentId: null, // public endpoint never exposes appointment IDs
    }));

    return NextResponse.json(
      { slots },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err) {
    console.error('[API /api/slots Error]:');
    return NextResponse.json(
      { error: 'Erreur lors du chargement des créneaux. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}


