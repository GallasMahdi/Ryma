import { SERVICES } from '@/data/services';
import { validateAndNormalizePhone } from '@/lib/phone';
import type { Lang } from '@/lib/i18n';

// Shared server-side validation utilities.
// These are the ONLY valid values — they are enforced here, not in frontend code.

export const VALID_TIME_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
] as const;

// Dynamically derived from the authoritative SERVICES dataset
export const VALID_SERVICES = SERVICES.map(s => s.slug);

export type ValidService = string;

interface ValidationResult {
  ok: true;
}
interface ValidationError {
  ok: false;
  error: string;
  errorCode?: string;
}

/**
 * Validates all fields required to create an appointment.
 * This runs SERVER-SIDE — it is the authoritative source of truth.
 */
export function validateAppointmentInput(
  body: Record<string, unknown>,
  preferredLang?: Lang
): ValidationResult | ValidationError {
  const lang: Lang = (body.lang as Lang) || preferredLang || 'pt';
  const { patientName, phone, service, date, startTime } = body;

  // Required string fields
  if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
    return {
      ok: false,
      errorCode: 'PATIENT_NAME_REQUIRED',
      error:
        lang === 'fr'
          ? 'Le nom du patient est obligatoire (minimum 2 caractères).'
          : lang === 'en'
          ? 'Patient name is required (minimum 2 characters).'
          : 'O nome do utente é obrigatório (mínimo 2 caracteres).',
    };
  }

  // Reject malicious HTML tags, script injection, and CSV formula prefixes in patient name
  if (/[<>]|javascript:|data:/i.test(patientName)) {
    return {
      ok: false,
      errorCode: 'PATIENT_NAME_INVALID',
      error:
        lang === 'fr'
          ? 'Le nom du patient contient des caractères non autorisés.'
          : lang === 'en'
          ? 'Patient name contains invalid characters or formatting.'
          : 'O nome do utente contém caracteres ou formatação inválida.',
    };
  }
  if (/^[=\+\-@\t\r]/.test(patientName.trim())) {
    return {
      ok: false,
      errorCode: 'PATIENT_NAME_FORMULA',
      error:
        lang === 'fr'
          ? 'Le nom du patient ne peut pas commencer par un symbole de formule (=, @, +, -).'
          : lang === 'en'
          ? 'Patient name cannot start with formula symbols (=, @, +, -).'
          : 'O nome do utente não pode iniciar com símbolos de fórmula (=, @, +, -).',
    };
  }

  if (!phone || typeof phone !== 'string') {
    return {
      ok: false,
      errorCode: 'PHONE_REQUIRED',
      error:
        lang === 'fr'
          ? 'Le numéro de téléphone est obligatoire.'
          : lang === 'en'
          ? 'Phone number is required.'
          : 'O número de telefone é obrigatório.',
    };
  }

  const phoneValidation = validateAndNormalizePhone(phone, lang);
  if (!phoneValidation.isValid) {
    return {
      ok: false,
      errorCode: phoneValidation.errorCode || 'INVALID_PHONE',
      error:
        phoneValidation.error ||
        (lang === 'fr'
          ? 'Veuillez entrer un numéro de téléphone valide (ex: 912 345 678 ou +351 912 345 678).'
          : lang === 'en'
          ? 'Please enter a valid phone number (e.g. 912 345 678 or +351 912 345 678).'
          : 'Por favor, insira um número de telefone válido (ex: 912 345 678 ou +351 912 345 678).'),
    };
  }

  // Service must be in the allowed list
  if (!service || typeof service !== 'string' || !VALID_SERVICES.includes(service.trim())) {
    return {
      ok: false,
      errorCode: 'INVALID_SERVICE',
      error:
        lang === 'fr'
          ? 'Soin / prestation non reconnu.'
          : lang === 'en'
          ? 'Unrecognized treatment / service.'
          : 'Tratamento / cuidado não reconhecido.',
    };
  }

  // Date format
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      ok: false,
      errorCode: 'INVALID_DATE_FORMAT',
      error:
        lang === 'fr'
          ? 'Format de date invalide (AAAA-MM-JJ).'
          : lang === 'en'
          ? 'Invalid date format (YYYY-MM-DD).'
          : 'Formato de data inválido (AAAA-MM-DD).',
    };
  }

  // Date must not be in the past
  const todayStr = new Date().toISOString().split('T')[0];
  if (date < todayStr) {
    return {
      ok: false,
      errorCode: 'PAST_DATE',
      error:
        lang === 'fr'
          ? 'La date du rendez-vous ne peut pas être dans le passé.'
          : lang === 'en'
          ? 'The appointment date cannot be in the past.'
          : 'A data da consulta não pode ser no passado.',
    };
  }

  // Time must be in the allowed slots
  if (!startTime || !VALID_TIME_SLOTS.includes(startTime as typeof VALID_TIME_SLOTS[number])) {
    return {
      ok: false,
      errorCode: 'INVALID_SLOT',
      error:
        lang === 'fr'
          ? 'Créneau horaire sélectionné invalide.'
          : lang === 'en'
          ? 'Selected time slot is invalid.'
          : 'Horário selecionado inválido.',
    };
  }

  // If date is today, slot must not be in the past
  if (date === todayStr) {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (String(startTime) <= currentHHMM) {
      return {
        ok: false,
        errorCode: 'PAST_TIME',
        error:
          lang === 'fr'
            ? 'Ce créneau est déjà passé pour aujourd’hui.'
            : lang === 'en'
            ? 'This time slot has already passed for today.'
            : 'Este horário já passou para o dia de hoje.',
      };
    }
  }

  // Optional email format check
  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return {
        ok: false,
        errorCode: 'INVALID_EMAIL',
        error:
          lang === 'fr'
            ? 'Adresse e-mail invalide.'
            : lang === 'en'
            ? 'Invalid email address.'
            : 'Endereço de email inválido.',
      };
    }
  }

  // Notes length limit (prevent oversized input)
  if (body.notes && typeof body.notes === 'string' && body.notes.length > 1000) {
    return {
      ok: false,
      errorCode: 'NOTES_TOO_LONG',
      error:
        lang === 'fr'
          ? 'Les notes ne peuvent pas dépasser 1000 caractères.'
          : lang === 'en'
          ? 'Clinical notes cannot exceed 1000 characters.'
          : 'As notas clínicas não podem exceder 1000 caracteres.',
    };
  }

  return { ok: true };
}

/**
 * Extracts and sanitizes the client IP address from request headers.
 * Prioritizes edge-verified headers (Cloudflare, Vercel) before falling back to X-Forwarded-For.
 */
export function getClientIp(request: { headers: { get: (name: string) => string | null } }): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim() !== '') return cfIp.trim();

  const vercelIp = request.headers.get('x-vercel-ip');
  if (vercelIp && vercelIp.trim() !== '') return vercelIp.trim();

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim() !== '') return realIp.trim();

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0 && ips[0] !== '') return ips[0];
  }

  return '127.0.0.1';
}
