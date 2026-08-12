import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbBulkBlockSlots } from '@/lib/db';
import { VALID_TIME_SLOTS } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const date = String(body.date ?? '').trim();
  const scope = (body.scope as 'day' | 'morning' | 'afternoon' | 'custom') ?? 'day';
  const action = (body.action as 'block' | 'unblock') ?? 'block';

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 422 });
  }

  let slotsToProcess: string[] = [];

  if (scope === 'day') {
    slotsToProcess = [...VALID_TIME_SLOTS];
  } else if (scope === 'morning') {
    slotsToProcess = VALID_TIME_SLOTS.filter(t => t <= '12:00');
  } else if (scope === 'afternoon') {
    slotsToProcess = VALID_TIME_SLOTS.filter(t => t >= '14:00');
  } else if (Array.isArray(body.times)) {
    slotsToProcess = body.times.map(t => String(t));
  }

  await dbBulkBlockSlots(date, slotsToProcess, action);

  return NextResponse.json({ success: true, date, scope, action, processedSlots: slotsToProcess.length });
}
