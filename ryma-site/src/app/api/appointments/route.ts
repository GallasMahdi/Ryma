import { NextRequest, NextResponse } from 'next/server';
import {
  dbCreateAppointment,
  dbCheckRateLimit,
  dbRecordRateLimitAttempt,
  dbGetIdempotencyKey,
  dbSaveIdempotencyKey,
} from '@/lib/db';
import { validateAppointmentInput, getClientIp } from '@/lib/validation';
import { broadcastAppointmentCreated } from '@/lib/events';
import { sendAppointmentConfirmationEmail, sendAdminNewBookingNotification } from '@/lib/email';
import { verifyRecaptchaToken } from '@/lib/recaptcha';
import { validateAndNormalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/appointments
 * Public endpoint — creates a patient-facing appointment request.
 *
 * Protected by:
 *  - Google reCAPTCHA v3 bot scoring
 *  - Per-phone rate limiting (3 bookings per phone number per hour)
 *  - IP rate limiting (20 bookings per IP per hour — generous to handle Vercel shared IPs)
 *  - Server-side input validation
 *  - DB-level UNIQUE(date, startTime) constraint for atomic double-booking prevention
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // IP-level rate limit: 100 bookings per IP per hour (generous to accommodate mobile Carrier-Grade NAT)
    const ipAllowed = await dbCheckRateLimit(ip, 'booking_ip', 100, 60 * 60);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Trop de demandes. Veuillez réessayer plus tard.' },
        { status: 429 }
      );
    }
    await dbRecordRateLimitAttempt(ip, 'booking_ip');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    // Bot defense: Google reCAPTCHA v3 with human fallback for adblockers / slow networks
    const recaptchaToken = typeof body.recaptchaToken === 'string' ? body.recaptchaToken : null;
    const honeypot = typeof body._hp_company === 'string' ? body._hp_company : '';
    const formTimestamp = typeof body._form_rendered_at === 'number' ? body._form_rendered_at : 0;
    const elapsedMs = formTimestamp > 0 ? Date.now() - formTimestamp : 5000;

    // Honeypot check: If an automated bot filled the invisible field, strictly reject
    if (honeypot.trim().length > 0) {
      return NextResponse.json(
        { error: 'Validation de sécurité échouée (activité automatisée détectée).' },
        { status: 403 }
      );
    }

    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken);
      if (!recaptchaResult.valid) {
        return NextResponse.json(
          { error: 'Validation de sécurité échouée (activité automatisée détectée). Veuillez rafraîchir la page.' },
          { status: 403 }
        );
      }
    } else {
      // Human fallback for ad blockers (uBlock/Brave) or slow 3G/4G connections where reCAPTCHA CDN was blocked/delayed
      if (formTimestamp > 0 && elapsedMs < 1200) {
        return NextResponse.json(
          { error: 'Soumission trop rapide. Veuillez réessayer.' },
          { status: 403 }
        );
      }
      console.warn('[reCAPTCHA Fallback]: Permitted legitimate booking submission without reCAPTCHA token (adblock/slow network fallback verified).');
    }

    // Server-side validation — never trust client values
    const validation = validateAppointmentInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, errorCode: validation.errorCode }, { status: 422 });
    }

    // Per-phone rate limit: 3 bookings per normalized phone number per hour
    const rawPhone = String(body.phone ?? '').trim();
    const phoneVal = validateAndNormalizePhone(rawPhone);
    const normalizedPhone = phoneVal.isValid ? phoneVal.normalized : rawPhone;

    if (normalizedPhone) {
      const phoneAllowed = await dbCheckRateLimit(`phone:${normalizedPhone}`, 'booking_phone', 3, 60 * 60);
      if (!phoneAllowed) {
        return NextResponse.json(
          { error: 'Vous avez déjà effectué plusieurs réservations. Veuillez patienter avant d\'en faire une nouvelle.' },
          { status: 429 }
        );
      }
    }

    // Validate & sanitize coverage fields
    const rawCoverage = typeof body.coverageType === 'string' ? body.coverageType.trim().toUpperCase() : 'PARTICULAR';
    const coverageType = ['PARTICULAR', 'INSURANCE', 'ADSE'].includes(rawCoverage) ? rawCoverage : 'PARTICULAR';
    const coverageProvider = body.coverageProvider
      ? String(body.coverageProvider).replace(/[<>]|javascript:|data:/gi, '').trim().slice(0, 80)
      : undefined;
    const coverageNumber = body.coverageNumber
      ? String(body.coverageNumber).replace(/[<>]|javascript:|data:/gi, '').trim().slice(0, 50)
      : undefined;

    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      (typeof body.clientRequestId === 'string' ? body.clientRequestId : undefined) ||
      `booking_${normalizedPhone}_${String(body.date).trim()}_${String(body.startTime).trim()}`;

    if (idempotencyKey) {
      const cached = await dbGetIdempotencyKey(idempotencyKey, 'public_booking');
      if (cached) {
        return NextResponse.json(cached.responseBody, {
          status: cached.statusCode,
          headers: { 'X-Cache-Lookup': 'HIT_IDEMPOTENT' },
        });
      }
    }

    const result = await dbCreateAppointment({
      patientName:      String(body.patientName).trim().slice(0, 100),
      email:            body.email ? String(body.email).trim().slice(0, 254) : undefined,
      phone:            normalizedPhone,
      service:          String(body.service).trim(),
      date:             String(body.date).trim(),
      startTime:        String(body.startTime).trim(),
      notes:            body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
      coverageType,
      coverageProvider,
      coverageNumber,
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

    // Record legitimate successful booking rate limit against the normalized phone number
    if (normalizedPhone) {
      await dbRecordRateLimitAttempt(`phone:${normalizedPhone}`, 'booking_phone');
    }

    // Broadcast the new appointment in real-time to active admin calendar dashboards
    broadcastAppointmentCreated(result.appointment);

    // Reliably dispatch confirmation emails before serverless execution freeze
    const clientLang = typeof body.lang === 'string' ? body.lang : 'fr';
    try {
      const emailPromise = Promise.all([
        sendAppointmentConfirmationEmail(result.appointment, clientLang),
        sendAdminNewBookingNotification(result.appointment),
      ]);
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 2500)
      );
      await Promise.race([emailPromise, timeoutPromise]);
    } catch (emailErr) {
      console.error('[Booking Email Dispatch Warning]:', emailErr);
    }

    const confirmationPayload = {
      success: true,
      confirmation: {
        date: result.appointment.date,
        startTime: result.appointment.startTime,
        service: result.appointment.service,
      },
    };

    if (idempotencyKey) {
      await dbSaveIdempotencyKey(idempotencyKey, 'public_booking', 201, confirmationPayload, 300); // 5 min TTL
    }

    return NextResponse.json(confirmationPayload, { status: 201 });
  } catch (err) {
    console.error('[API /api/appointments Error]:', err);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la réservation. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
