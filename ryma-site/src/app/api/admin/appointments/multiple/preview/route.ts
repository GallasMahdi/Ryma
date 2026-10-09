import { localizeApiError } from '@/lib/api-i18n';
import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { loadScheduleState, evaluateSlot } from '@/lib/scheduling';
import { dbGetPatientByPhone } from '@/lib/db';
import { clockMinutes } from '@/lib/booking-schedule';
import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { VALID_TIME_SLOTS } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ScheduleSlotConfig {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // HH:mm
}

const DAY_NAMES_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * POST /api/admin/appointments/multiple/preview
 * Calculates recurring candidate dates and checks EVERY slot against the
 * authoritative availability engine before any booking is committed.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
  } catch {
    return NextResponse.json({ error: localizeApiError('JSON inválido', request) }, { status: 400 });
  }

  if (body.totalSessions !== undefined && (typeof body.totalSessions !== 'number' || !Number.isInteger(body.totalSessions) || body.totalSessions < 1 || body.totalSessions > 50)) {
    return NextResponse.json({ error: localizeApiError('Session count must be an integer between 1 and 50', request) }, { status: 422 });
  }
  if(body.practitionerId!==undefined&&(typeof body.practitionerId!=='string'||body.practitionerId.length>160||body.practitionerId!==body.practitionerId.trim()))return NextResponse.json({error:localizeApiError('Invalid practitioner preference', request)},{status:422});
  const totalSessions = typeof body.totalSessions === 'number' ? body.totalSessions : 10;
  const service = typeof body.serviceSlug === 'string' ? body.serviceSlug : (await getTreatments(true))[0]?.slug;
  if (!service || !(await isKnownTreatment(service))) return NextResponse.json({error: localizeApiError('Invalid service', request)}, {status: 422});
  const startDateStr = isCalendarDate(body.startDate)
    ? body.startDate
    : new Date().toISOString().split('T')[0];

  const scheduleSlots: ScheduleSlotConfig[] = Array.isArray(body.scheduleSlots)
    ? body.scheduleSlots.filter(
        (s: any) =>
          isJsonObject(s) && Number.isInteger(s.dayOfWeek) && typeof s.dayOfWeek === 'number' &&
          s.dayOfWeek >= 0 &&
          s.dayOfWeek <= 6 &&
          typeof s.startTime === 'string' &&
          VALID_TIME_SLOTS.includes(s.startTime as any)
      )
    : [];

  const explicitSessions: { date: string; startTime: string }[] = Array.isArray(body.explicitSessions)
    ? body.explicitSessions.filter(
        (s: any) =>
          isJsonObject(s) && isCalendarDate(s.date) &&
          typeof s.startTime === 'string' && VALID_TIME_SLOTS.includes(s.startTime as any)
      )
    : [];

  if (body.scheduleSlots !== undefined && (!Array.isArray(body.scheduleSlots) || body.scheduleSlots.length > 50 || scheduleSlots.length !== body.scheduleSlots.length)) {
    return NextResponse.json({ error: localizeApiError('Invalid recurrence pattern', request) }, { status: 422 });
  }

  if ((Array.isArray(body.explicitSessions) && (body.explicitSessions.length > 50 || explicitSessions.length !== body.explicitSessions.length)) || (body.startDate !== undefined && !isCalendarDate(body.startDate))) return NextResponse.json({ error: localizeApiError('Invalid schedule dates or time slots', request) }, { status: 422 });
  const candidateSlots: { date: string; startTime: string; dayOfWeek: number }[] = [];

  if (explicitSessions.length > 0) {
    // Mode A: Explicit custom session dates
    for (const item of explicitSessions) {
      const d = new Date(item.date + 'T12:00:00');
      candidateSlots.push({
        date: item.date,
        startTime: item.startTime,
        dayOfWeek: d.getDay(),
      });
    }
  } else if (scheduleSlots.length > 0) {
    // Mode B: Recurrence pattern (e.g. Mon 09:00, Wed 14:30, Fri 10:00)
    const sortedSlots = [...scheduleSlots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    const [startY, startM, startD] = startDateStr.split('-').map(Number);
    const cursor = new Date(startY, startM - 1, startD, 12, 0, 0);

    let daysScanned = 0;
    const maxDays = 365; // Cap search at 1 year max

    while (candidateSlots.length < totalSessions && daysScanned < maxDays) {
      const currentDayOfWeek = cursor.getDay();
      const matchingPatterns = sortedSlots.filter(s => s.dayOfWeek === currentDayOfWeek);

      for (const pattern of matchingPatterns) {
        if (candidateSlots.length < totalSessions) {
          candidateSlots.push({
            date: formatDate(cursor),
            startTime: pattern.startTime,
            dayOfWeek: currentDayOfWeek,
          });
        }
      }

      cursor.setDate(cursor.getDate() + 1);
      daysScanned++;
    }
  } else {
    return NextResponse.json(
      { error: localizeApiError('Especifique os dias e horários de recorrência para calcular o plano de sessões.', request) },
      { status: 422 }
    );
  }

  if (new Set(candidateSlots.map(slot => `${slot.date}:${slot.startTime}`)).size !== candidateSlots.length) {
    return NextResponse.json({ error: localizeApiError('Duplicate session slots are not allowed.', request) }, { status: 422 });
  }

  // High-performance single-pass batched availability across all candidate dates
  const uniqueCandidateDates = Array.from(new Set(candidateSlots.map(s => s.date)));
  const state=await loadScheduleState(uniqueCandidateDates);
  const patient=typeof body.patientPhone==='string'?await dbGetPatientByPhone(body.patientPhone):null;
  const patientPhone=typeof body.patientPhone==='string'?body.patientPhone:undefined;
  const requested=typeof body.practitionerId==='string'?body.practitionerId:undefined;
  const eligible=state.practitioners.filter(p=>p.active&&(!requested||p.id===requested)&&state.services.some(s=>s.practitionerId===p.id&&s.service===service));
  // A treatment plan keeps one practitioner; preview exactly the same allocation policy as commit.
  const chosen=eligible.find(p=>{
    const trial=structuredClone(state);
    return candidateSlots.every((slot,index)=>{const result=evaluateSlot(trial,slot.date,slot.startTime,service,{practitionerId:p.id,patientId:patient?.id,patientPhone});if(!result.available)return false;trial.appointments.push({id:'preview_'+index,...result.candidates[0],date:slot.date,startTime:slot.startTime,service,status:'CONFIRMED',patientId:patient?.id,phone:patientPhone});return true;});
  })||eligible[0];
  const dayAvailabilityMap=new Map(uniqueCandidateDates.map(date=>[date,VALID_TIME_SLOTS.map(time=>evaluateSlot(state,date,time,service,{practitionerId:chosen?.id||'missing',patientId:patient?.id,patientPhone}))]));
  const mapping=state.services.find(s=>s.practitionerId===chosen?.id&&s.service===service);
  const duration=mapping?.durationMinutes??state.treatments?.find(t=>t.slug===service)?.durationMinutes??30,before=mapping?.bufferBefore??0,after=mapping?.bufferAfter??0;

  const previewItems = [];
  let validCount = 0;
  let conflictCount = 0;

  for (let i = 0; i < candidateSlots.length; i++) {
    const slot = candidateSlots[i];
    const daySlots = dayAvailabilityMap.get(slot.date) || [];
    const targetSlot = daySlots.find(s => s.time === slot.startTime);
    const batchOverlap = candidateSlots.some((other, index) => index !== i && other.date === slot.date && clockMinutes(slot.startTime)-before<clockMinutes(other.startTime)+duration+after && clockMinutes(other.startTime)-before<clockMinutes(slot.startTime)+duration+after);
    const isAvailable = Boolean(targetSlot?.available && !batchOverlap);
    const reason = batchOverlap ? 'booked' : targetSlot && !targetSlot.available ? targetSlot.reason : null;

    if (isAvailable) {
      validCount++;
    } else {
      conflictCount++;
    }

    const availableFreeSlots = daySlots.filter(s => s.available).map(s => s.time);

    previewItems.push({
      sessionIndex: i + 1,
      date: slot.date,
      startTime: slot.startTime,
      dayOfWeek: slot.dayOfWeek,
      dayNamePt: DAY_NAMES_PT[slot.dayOfWeek],
      dayNameFr: DAY_NAMES_FR[slot.dayOfWeek],
      dayNameEn: DAY_NAMES_EN[slot.dayOfWeek],
      dayNameEs: DAY_NAMES_ES[slot.dayOfWeek],
      available: isAvailable,
      conflictReason: isAvailable ? null : (reason || 'booked'),
      availableFreeSlots,
      allDaySlots: daySlots,
    });
  }

  return NextResponse.json({
    practitionerId:chosen?.id,
    preview: previewItems,
    summary: {
      totalRequested: previewItems.length,
      validCount,
      conflictCount,
      allAvailable: conflictCount === 0,
    },
  });
}
