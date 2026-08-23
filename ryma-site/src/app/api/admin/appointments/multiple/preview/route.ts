import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbCheckMultipleDatesAvailability } from '@/lib/db';
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
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const totalSessions = Math.min(50, Math.max(1, Number(body.totalSessions) || 10));
  const startDateStr = typeof body.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate)
    ? body.startDate
    : new Date().toISOString().split('T')[0];

  const scheduleSlots: ScheduleSlotConfig[] = Array.isArray(body.scheduleSlots)
    ? body.scheduleSlots.filter(
        (s: any) =>
          typeof s.dayOfWeek === 'number' &&
          s.dayOfWeek >= 0 &&
          s.dayOfWeek <= 6 &&
          typeof s.startTime === 'string' &&
          VALID_TIME_SLOTS.includes(s.startTime as any)
      )
    : [];

  const explicitSessions: { date: string; startTime: string }[] = Array.isArray(body.explicitSessions)
    ? body.explicitSessions.filter(
        (s: any) =>
          typeof s.date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
          typeof s.startTime === 'string'
      )
    : [];

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
      { error: 'Especifique os dias e horários de recorrência para calcular o plano de sessões.' },
      { status: 422 }
    );
  }

  // High-performance single-pass batched availability across all candidate dates
  const uniqueCandidateDates = Array.from(new Set(candidateSlots.map(s => s.date)));
  const dayAvailabilityMap = await dbCheckMultipleDatesAvailability(uniqueCandidateDates);

  const previewItems = [];
  let validCount = 0;
  let conflictCount = 0;

  for (let i = 0; i < candidateSlots.length; i++) {
    const slot = candidateSlots[i];
    const daySlots = dayAvailabilityMap.get(slot.date) || [];
    const targetSlot = daySlots.find(s => s.time === slot.startTime);
    const isAvailable = targetSlot ? targetSlot.available : false;
    const reason = targetSlot && !targetSlot.available ? targetSlot.reason : null;

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
      available: isAvailable,
      conflictReason: isAvailable ? null : (reason || 'booked'),
      availableFreeSlots,
      allDaySlots: daySlots,
    });
  }

  return NextResponse.json({
    preview: previewItems,
    summary: {
      totalRequested: previewItems.length,
      validCount,
      conflictCount,
      allAvailable: conflictCount === 0,
    },
  });
}
