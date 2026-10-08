import { clockMinutes } from '@/lib/booking-schedule';
import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { commitScheduling, loadScheduleState } from '@/lib/scheduling';
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

  const practitionerId = typeof body.practitionerId === 'string' ? body.practitionerId : '*';
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
    targetDates.push(dStr);
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
  const state=await loadScheduleState(targetDates);
  if(practitionerId!=='*'&&!state.practitioners.some(p=>p.id===practitionerId))return NextResponse.json({error:'Invalid practitioner'},{status:422});
  const statements:{sql:string;args:any[]}[]=[];
  for(const date of targetDates)for(const time of new Set(slotsToProcess)){
    if(action==='block'&&state.appointments.some(a=>a.date===date&&a.status!=='CANCELLED'&&(practitionerId==='*'||a.practitionerId===practitionerId)&&clockMinutes(a.startTime)-a.bufferBefore<clockMinutes(time)+30&&clockMinutes(time)<clockMinutes(a.startTime)+a.durationMinutes+a.bufferAfter))continue;
    statements.push(action==='block'?{sql:'INSERT OR IGNORE INTO blocked_slots(id,date,time,practitionerId) VALUES(?,?,?,?)',args:['blk_'+crypto.randomUUID(),date,time,practitionerId]}:{sql:'DELETE FROM blocked_slots WHERE date=? AND time=? AND practitionerId=?',args:[date,time,practitionerId]});totalSlotsAffected++;
  }
  if(statements.length&&!await commitScheduling(state,statements))return NextResponse.json({error:'The schedule changed. Refresh and try again.'},{status:409});

  return NextResponse.json({
    success: true,
    processedDates: targetDates,
    totalDays: targetDates.length,
    scope,
    action,
    processedSlots: totalSlotsAffected,
  });
}
