import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbBulkBlockSlots, dbGetAppointments } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const singleDate = body.date ? String(body.date).trim() : '';
  const startDate = body.startDate ? String(body.startDate).trim() : singleDate;
  const endDate = body.endDate ? String(body.endDate).trim() : startDate;
  const scope = (body.scope as 'day' | 'morning' | 'afternoon' | 'custom') ?? 'day';
  const action = (body.action as 'block' | 'unblock') ?? 'block';

  if (!isCalendarDate(startDate)) {
    return NextResponse.json({ error: 'Date de début invalide' }, { status: 422 });
  }

  if (!isCalendarDate(endDate)) {
    return NextResponse.json({ error: 'Date de fin invalide' }, { status: 422 });
  }

  const spanDays = (Date.parse(endDate + 'T12:00:00Z') - Date.parse(startDate + 'T12:00:00Z')) / 86400000;
  if (spanDays < 0 || spanDays >= 60 || !['block', 'unblock'].includes(action) || !['day', 'morning', 'afternoon', 'custom'].includes(scope)) return NextResponse.json({ error: 'Invalid action, scope or date range (maximum 60 days)' }, { status: 422 });
  if (scope === 'custom' && (!Array.isArray(body.times) || body.times.length === 0 || body.times.some(t => !VALID_TIME_SLOTS.includes(t as typeof VALID_TIME_SLOTS[number])))) return NextResponse.json({ error: 'Invalid custom time slots' }, { status: 422 });
  // Generate date list between startDate and endDate (max 60 days)
  const targetDates: string[] = [];
  let curr = new Date(startDate + 'T12:00:00Z');
  const end = new Date(endDate + 'T12:00:00Z');

  let iterations = 0;
  while (curr <= end && iterations < 60) {
    const dStr = curr.toISOString().split('T')[0];
    const dayOfWeek = curr.getUTCDay();
    // Only process non-Sundays
    if (dayOfWeek !== 0) {
      targetDates.push(dStr);
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    iterations++;
  }

  if (targetDates.length === 0) {
    return NextResponse.json({
      success: true,
      processedDates: [],
      processedSlots: 0,
      message: 'Aucun jour ouvrable à traiter',
    });
  }

  let slotsToProcess: string[] = [];
  if (scope === 'day') {
    slotsToProcess = [...VALID_TIME_SLOTS];
  } else if (scope === 'morning') {
    slotsToProcess = VALID_TIME_SLOTS.filter(t => t <= '12:30');
  } else if (scope === 'afternoon') {
    slotsToProcess = VALID_TIME_SLOTS.filter(t => t >= '14:00');
  } else if (Array.isArray(body.times)) {
    slotsToProcess = body.times.map(t => String(t));
  }

  let totalSlotsAffected = 0;

  for (const d of targetDates) {
    let daySlots = [...slotsToProcess];

    // If blocking, preserve any active appointments on that day
    if (action === 'block') {
      const appts = await dbGetAppointments({ date: d });
      const bookedSet = new Set(appts.filter(a => a.status !== 'CANCELLED').map(a => a.startTime));
      daySlots = daySlots.filter(t => !bookedSet.has(t));
    }

    if (daySlots.length > 0) {
      try { await dbBulkBlockSlots(d, [...new Set(daySlots)], action); }
      catch (err) {
        if (/slot_taken/i.test(String(err))) return NextResponse.json({ error: 'A slot was booked during this operation. Refresh availability.', processedSlots: totalSlotsAffected }, { status: 409 });
        throw err;
      }
      totalSlotsAffected += daySlots.length;
    }
  }

  return NextResponse.json({
    success: true,
    processedDates: targetDates,
    totalDays: targetDates.length,
    scope,
    action,
    processedSlots: totalSlotsAffected,
  });
}
