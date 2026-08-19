import { NextRequest, NextResponse } from 'next/server';
import { dbCreateAppointment, dbCheckRateLimit, dbRecordRateLimitAttempt } from '@/lib/db';
import { validateAppointmentInput, getClientIp } from '@/lib/validation';
import { broadcastAppointmentCreated } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/appointments
 * Public endpoint — creates a patient-facing appointment request.
 *
 * Protected by:
 *  - Per-phone rate limiting (3 bookings per phone number per hour)
 *  - IP rate limiting (20 bookings per IP per hour — generous to handle Vercel shared IPs)
 *  - Server-side input validation
 *  - DB-level UNIQUE(date, startTime) constraint for atomic double-booking prevention
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // IP-level rate limit: raised to 20/hour to avoid false 429s from Vercel shared reverse-proxy IPs.
    // A real patient rarely books more than 1-2 appointments per hour, so the per-phone
    // check below is the actual meaningful guard against abuse.
    const ipAllowed = await dbCheckRateLimit(ip, 'booking_ip', 20, 60 * 60);
    if (!ipAllowed) {
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

    // Per-phone rate limit: 3 bookings per phone number per hour.
    // This is the real abuse prevention that is independent of shared IPs.
    const phone = String(body.phone ?? '').trim();
    const phoneAllowed = await dbCheckRateLimit(`phone:${phone}`, 'booking_phone', 3, 60 * 60);
    if (!phoneAllowed) {
      return NextResponse.json(
        { error: 'Vous avez déjà effectué plusieurs réservations. Veuillez patienter avant d\'en faire une nouvelle.' },
        { status: 429 }
      );
    }

    // Record both rate limit counters
    await dbRecordRateLimitAttempt(ip, 'booking_ip');
    await dbRecordRateLimitAttempt(`phone:${phone}`, 'booking_phone');

    const result = await dbCreateAppointment({
      patientName:      String(body.patientName).trim().slice(0, 100),
      email:            body.email ? String(body.email).trim().slice(0, 254) : undefined,
      phone:            String(body.phone).trim().slice(0, 30),
      service:          String(body.service).trim(),
      date:             String(body.date).trim(),
      startTime:        String(body.startTime).trim(),
      notes:            body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
      coverageType:     body.coverageType ? String(body.coverageType).trim() : 'PARTICULAR',
      coverageProvider: body.coverageProvider ? String(body.coverageProvider).trim().slice(0, 100) : undefined,
      coverageNumber:   body.coverageNumber ? String(body.coverageNumber).trim().slice(0, 100) : undefined,
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

    // Broadcast the new appointment in real-time to active admin calendar dashboards
    broadcastAppointmentCreated(result.appointment);

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
  } catch (err) {
    console.error('[API /api/appointments Error]:', err);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la réservation. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
