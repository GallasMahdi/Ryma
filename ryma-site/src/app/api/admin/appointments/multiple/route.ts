import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbCreateMultipleAppointments } from '@/lib/db';
import { VALID_SERVICES, VALID_TIME_SLOTS } from '@/lib/validation';
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
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const patientName = String(body.patientName || '').trim();
  if (patientName.length < 2) {
    return NextResponse.json({ error: 'Nome do utente inválido (mínimo 2 caracteres).' }, { status: 422 });
  }

  const phone = String(body.phone || '').trim();
  const phoneValidation = validateAndNormalizePhone(phone);
  if (!phoneValidation.isValid) {
    return NextResponse.json({ error: phoneValidation.error || 'Número de telefone inválido.' }, { status: 422 });
  }

  const service = String(body.service || '').trim();
  if (!service || !VALID_SERVICES.includes(service)) {
    return NextResponse.json({ error: 'Tratamento / serviço inválido.' }, { status: 422 });
  }

  const rawSessions = Array.isArray(body.sessions) ? body.sessions : [];
  if (rawSessions.length === 0) {
    return NextResponse.json({ error: 'Nenhuma sessão fornecida para marcação.' }, { status: 422 });
  }

  const validatedSessions: {
    date: string;
    startTime: string;
    notes?: string;
    evaPainScore?: number;
  }[] = [];

  for (let i = 0; i < rawSessions.length; i++) {
    const s = rawSessions[i];
    const sDate = String(s?.date || '').trim();
    const sTime = String(s?.startTime || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(sDate)) {
      return NextResponse.json({ error: `Sessão #${i + 1}: Data inválida (${sDate}).` }, { status: 422 });
    }

    if (!VALID_TIME_SLOTS.includes(sTime as any)) {
      return NextResponse.json({ error: `Sessão #${i + 1}: Horário inválido (${sTime}).` }, { status: 422 });
    }

    validatedSessions.push({
      date: sDate,
      startTime: sTime,
      notes: s.notes ? String(s.notes).trim().slice(0, 1000) : undefined,
      evaPainScore: typeof s.evaPainScore === 'number' ? Math.min(10, Math.max(0, s.evaPainScore)) : undefined,
    });
  }

  const result = await dbCreateMultipleAppointments({
    patientName,
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
        error: result.error,
        message: result.message,
        conflicts: result.conflicts,
      },
      { status: 409 }
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
