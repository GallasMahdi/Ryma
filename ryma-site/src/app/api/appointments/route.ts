import { localizeApiError } from '@/lib/api-i18n';
import { isLanguage } from '@/lib/locales';
import { isJsonObject } from '@/lib/admin-validation';
import { findBookingReplay } from '@/lib/booking-service';
import type { CreateAppointmentInput } from '@/lib/db';
import { after, NextRequest, NextResponse } from 'next/server';
import {
  dbCreateAppointment,
  dbConsumeRateLimit,
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
 *  - IP rate limiting (100 attempts per IP per hour)
 *  - Server-side input validation
 *  - Database interval guards and transactional practitioner allocation
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // IP-level rate limit: 100 bookings per IP per hour (generous to accommodate mobile Carrier-Grade NAT)
    const ipAllowed = await dbConsumeRateLimit(ip, 'booking_ip', 100, 60 * 60);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: localizeApiError('Trop de demandes. Veuillez réessayer plus tard.', request) },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
      if (!isJsonObject(body)) return NextResponse.json({error:localizeApiError("JSON object required", request)},{status:400});
    } catch {
      return NextResponse.json({ error: localizeApiError('Corps de requête invalide', request) }, { status: 400 });
    }

    // Bot defense: Google reCAPTCHA v3 with human fallback for adblockers / slow networks
    const recaptchaToken = typeof body.recaptchaToken === 'string' ? body.recaptchaToken : null;
    const honeypot = typeof body._hp_company === 'string' ? body._hp_company : '';
    const formTimestamp = typeof body._form_rendered_at === 'number' ? body._form_rendered_at : 0;
    const elapsedMs = formTimestamp > 0 ? Date.now() - formTimestamp : 5000;

    // Honeypot check: If an automated bot filled the invisible field, strictly reject
    if (honeypot.trim().length > 0) {
      return NextResponse.json(
        { error: localizeApiError('Validation de sécurité échouée (activité automatisée détectée).', request) },
        { status: 403 }
      );
    }

    if (recaptchaToken || process.env.NODE_ENV === 'production') {
      const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'booking');
      if (!recaptchaResult.valid) {
        return NextResponse.json(
          { error: localizeApiError('Validation de sécurité échouée (activité automatisée détectée). Veuillez rafraîchir la page.', request) },
          { status: 403 }
        );
      }
    } else {
      // Human fallback for ad blockers (uBlock/Brave) or slow 3G/4G connections where reCAPTCHA CDN was blocked/delayed
      if (formTimestamp > 0 && elapsedMs < 1200) {
        return NextResponse.json(
          { error: localizeApiError('Soumission trop rapide. Veuillez réessayer.', request) },
          { status: 403 }
        );
      }
      // Token-free requests are supported only by local development/test fixtures.
    }

    // Server-side validation — never trust client values
    const validation = validateAppointmentInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: localizeApiError(validation.error, request), errorCode: validation.errorCode }, { status: 422 });
    }

    // Per-phone rate limit: 3 bookings per normalized phone number per hour
    const normalizedPhone = validateAndNormalizePhone(body.phone).normalized;

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

    const bookingInput: CreateAppointmentInput = {
      source: 'website',
      practitionerId: typeof body.practitionerId === 'string' ? body.practitionerId : undefined,
      bookingRequestId: 'web:' + idempotencyKey,
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
    };
    // A verified replay is the same booking, even if the patient has since reached
    // their new-booking allowance. Never use a request key without checking its payload.
    const replay = await findBookingReplay(bookingInput);
    const result = replay ?? await dbCreateAppointment(bookingInput);
    if (!result.success && result.error === 'rate_limited') {
      return NextResponse.json(
        { error: localizeApiError('Vous avez déjà effectué plusieurs réservations. Veuillez patienter avant d\'en faire une nouvelle.', request) },
        { status: 429 }
      );
    }

    if (!result.success) {
      if (result.error === 'schedule_changed') return NextResponse.json({error:localizeApiError('Schedule temporarily busy. Please retry.', request),errorCode:'SCHEDULE_BUSY'}, {status:503,headers:{'Retry-After':'1'}});
      if (result.error === 'slot_taken') {
        return NextResponse.json(
          { error: localizeApiError('slot_taken', request), message: 'Ce créneau vient d\'être réservé. Veuillez choisir un autre horaire.' },
          { status: 409 }
        );
      }
      if (result.error === 'slot_blocked') {
        return NextResponse.json(
          { error: localizeApiError('slot_taken', request), message: 'Ce créneau n\'est pas disponible.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: localizeApiError('Données invalides', request) }, { status: 422 });
    }

    // Broadcast the new appointment in real-time to active admin calendar dashboards
    if (!result.replayed) broadcastAppointmentCreated(result.appointment);

    // Next.js keeps this task alive after the response on supported hosts.
    // Delivery retries still require a durable mail queue (see deployment report).
    const clientLang = isLanguage(body.lang) ? body.lang : 'fr';
    if (!result.replayed) after(async () => {
      try {
        await Promise.all([
          sendAppointmentConfirmationEmail(result.appointment, clientLang),
          sendAdminNewBookingNotification(result.appointment, clientLang),
        ]);
      } catch { console.error('[Booking Email Dispatch Warning]'); }
    });

    const confirmationPayload = {
      success: true,
      confirmation: {
        date: result.appointment.date,
        startTime: result.appointment.startTime,
        service: result.appointment.service,
        serviceName: result.appointment.serviceNameJson ? JSON.parse(result.appointment.serviceNameJson) : null,
        servicePriceCents: result.appointment.servicePriceCents,
        id: result.appointment.id,
        practitionerId: result.appointment.practitionerId,
        practitionerName: result.appointment.practitionerName,
        durationMinutes: result.appointment.durationMinutes,
        status: result.appointment.status,
      },
    };

    return NextResponse.json(confirmationPayload, { status: 201 });
  } catch (err) {
    console.error('[API /api/appointments Error]:');
    return NextResponse.json(
      { error: localizeApiError('Erreur lors de l\'enregistrement de la réservation. Veuillez réessayer.', request) },
      { status: 500 }
    );
  }
}
