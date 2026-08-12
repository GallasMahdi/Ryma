import { NextRequest, NextResponse } from 'next/server';
import { dbCreateAppointment, dbCheckRateLimit, dbRecordRateLimitAttempt } from '@/lib/db';
import { validateAppointmentInput, getClientIp } from '@/lib/validation';

/**
 * POST /api/appointments
 * Public endpoint — creates a patient-facing appointment request.
 *
 * Protected by:
 *  - IP rate limiting (5 bookings per IP per hour)
 *  - Server-side input validation
 *  - DB-level UNIQUE(date, startTime) constraint for atomic double-booking prevention
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limit: 5 bookings per IP per hour
  const allowed = dbCheckRateLimit(ip, 'booking', 5, 60 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de demandes. Veuillez réessayer plus tard.' },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  // Server-side validation — never trust client values
  const validation = validateAppointmentInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  // Record attempt for rate limiting
  dbRecordRateLimitAttempt(ip, 'booking');

  const result = dbCreateAppointment({
    patientName: String(body.patientName).trim().slice(0, 100),
    email:       body.email ? String(body.email).trim().slice(0, 254) : undefined,
    phone:       String(body.phone).trim().slice(0, 30),
    service:     String(body.service).trim(),
    date:        String(body.date).trim(),
    startTime:   String(body.startTime).trim(),
    notes:       body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
  });

  if (!result.success) {
    if (result.error === 'slot_taken') {
      return NextResponse.json(
        { error: 'slot_taken', message: 'Ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.' },
        { status: 409 }
      );
    }
    if (result.error === 'slot_blocked') {
      return NextResponse.json(
        { error: 'slot_taken', message: 'Ce créneau n\'est pas disponible.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Données invalides' }, { status: 422 });
  }

  // Return minimal confirmation — never return the full appointment object to the public
  return NextResponse.json(
    {
      success: true,
      confirmation: {
        date: result.appointment.date,
        startTime: result.appointment.startTime,
        service: result.appointment.service,
      },
    },
    { status: 201 }
  );
}
