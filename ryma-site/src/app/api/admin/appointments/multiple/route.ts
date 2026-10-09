import { localizeApiError } from '@/lib/api-i18n';
import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { isJsonObject, isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbCreateMultipleAppointments } from '@/lib/db';
import { VALID_TIME_SLOTS, validateAppointmentInput } from '@/lib/validation';
import { validateAndNormalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/admin/appointments/multiple
 * Atomic creation of multiple recurring sessions.
 * Every session is validated server-side against authoritative slot availability
 * before anything is committed to prevent double bookings and race conditions.
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

  const patientName = String(body.patientName || '').trim();
  if (patientName.length < 2) {
    return NextResponse.json({ error: localizeApiError('Nome do utente inválido (mínimo 2 caracteres).', request) }, { status: 422 });
  }

  const phoneValidation = validateAndNormalizePhone(body.phone);
  if (!phoneValidation.isValid) {
    return NextResponse.json({ error: localizeApiError(phoneValidation.error, request), errorCode: phoneValidation.errorCode }, { status: 422 });
  }

  const service = String(body.service || '').trim();
  if (!service || !(await isKnownTreatment(service))) {
    return NextResponse.json({ error: localizeApiError('Tratamento / serviço inválido.', request) }, { status: 422 });
  }

  const rawSessions = Array.isArray(body.sessions) ? body.sessions : [];
  if (rawSessions.length === 0 || rawSessions.length > 50) {
    return NextResponse.json({ error: localizeApiError('Nenhuma sessão fornecida para marcação.', request) }, { status: 422 });
  }

  const validatedSessions: {
    date: string;
    startTime: string;
    notes?: string;
    evaPainScore?: number;
  }[] = [];

  for (let i = 0; i < rawSessions.length; i++) {
    const s = rawSessions[i];
    const validation=validateAppointmentInput({...body,date:s?.date,startTime:s?.startTime});
    if(!validation.ok)return NextResponse.json({error:localizeApiError(validation.error, request),errorCode:validation.errorCode},{status:422});
    if(s.evaPainScore!==undefined&&(typeof s.evaPainScore!=='number'||!Number.isInteger(s.evaPainScore)||s.evaPainScore<0||s.evaPainScore>10))return NextResponse.json({error:localizeApiError('Invalid pain score', request)},{status:422});
    const sDate = String(s?.date || '').trim();
    const sTime = String(s?.startTime || '').trim();

    if (!isCalendarDate(sDate)) {
      return NextResponse.json({ error: localizeApiError(`Sessão #${i + 1}: Data inválida (${sDate}).`, request) }, { status: 422 });
    }

    if (!VALID_TIME_SLOTS.includes(sTime as any)) {
      return NextResponse.json({ error: localizeApiError(`Sessão #${i + 1}: Horário inválido (${sTime}).`, request) }, { status: 422 });
    }

    validatedSessions.push({
      date: sDate,
      startTime: sTime,
      notes: s.notes ? String(s.notes).trim().slice(0, 1000) : undefined,
      evaPainScore: typeof s.evaPainScore === 'number' ? Math.min(10, Math.max(0, s.evaPainScore)) : undefined,
    });
  }

  const result = await dbCreateMultipleAppointments({
    bookingRequestId: typeof body.clientRequestId === 'string' ? body.clientRequestId : undefined,
    practitionerId: typeof body.practitionerId === "string" ? body.practitionerId : undefined,
    patientName: patientName.slice(0,100),
    phone: phoneValidation.normalized,
    email: body.email ? String(body.email).trim().slice(0, 254) : undefined,
    service,
    patientId: body.patientId ? String(body.patientId).trim() : undefined,
    coverageType: body.coverageType ? String(body.coverageType).trim() : undefined,
    coverageProvider: body.coverageProvider ? String(body.coverageProvider).trim() : undefined,
    coverageNumber: body.coverageNumber ? String(body.coverageNumber).trim() : undefined,
    practitioner: body.practitioner ? String(body.practitioner).trim() : undefined,
    sessions: validatedSessions,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: localizeApiError(result.error, request),
        message: result.message,
        conflicts: result.conflicts,
      },
      { status: result.error==='schedule_changed'?503:result.error==='invalid_input'?422:409 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      appointments: result.appointments,
      patientSessions: result.patientSessions,
      patientId: result.patientId,
      count: result.appointments.length,
    },
    { status: 201 }
  );
}
