/**
 * Shared Phone Validation and Normalization for Ryma Portugal MVP
 *
 * Rules:
 * 1. Default context is Portugal (+351).
 * 2. Portuguese local numbers: exactly 9 digits starting with:
 *    - '9' (mobile: 91, 92, 93, 96, etc.)
 *    - '2' (landline: 21, 22, etc.)
 *    - '3' (nomadic / VoIP)
 * 3. Formats supported:
 *    - '912345678'
 *    - '912 345 678'
 *    - '+351 912 345 678'
 *    - '00351 912 345 678'
 * 4. International numbers: If explicitly provided with '+' or '00' followed by a valid country code
 *    and at least 7-15 digits (E.164 standard), they are accepted to accommodate international patients in Lisbon.
 */

import type { Lang } from '@/lib/i18n';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // Clean normalized string with E.164 '+351...' or international prefix
  formatted: string;  // User-friendly display format (e.g. "+351 912 345 678")
  error?: string;
  errorCode?: 'PHONE_REQUIRED' | 'INVALID_PHONE';
}

/**
 * Normalizes and validates a phone input string.
 */
export function validateAndNormalizePhone(rawPhone: string, lang: Lang = 'pt'): PhoneValidationResult {
  const getRequiredError = () => {
    if (lang === 'fr') return 'Le numéro de téléphone est obligatoire.';
    if (lang === 'en') return 'Phone number is required.';
    return 'O número de telefone é obrigatório.';
  };

  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, normalized: '', formatted: '', errorCode: 'PHONE_REQUIRED', error: getRequiredError() };
  }

  const trimmed = rawPhone.trim();
  if (trimmed.length === 0) {
    return { isValid: false, normalized: '', formatted: '', errorCode: 'PHONE_REQUIRED', error: getRequiredError() };
  }

  // Strip all whitespace, dots, dashes, parentheses
  const cleaned = trimmed.replace(/[\s.\-()]/g, '');

  // 1. Check for Portugal numbers with +351 or 00351
  if (cleaned.startsWith('+351') || cleaned.startsWith('00351')) {
    const nationalPart = cleaned.startsWith('+351') ? cleaned.slice(4) : cleaned.slice(5);
    if (/^[239]\d{8}$/.test(nationalPart)) {
      const formatted = `+351 ${nationalPart.slice(0, 3)} ${nationalPart.slice(3, 6)} ${nationalPart.slice(6)}`;
      return {
        isValid: true,
        normalized: `+351${nationalPart}`,
        formatted,
      };
    }
  }

  // 2. Check for 9-digit Portuguese national number (e.g., 912345678 or 212345678)
  if (/^[239]\d{8}$/.test(cleaned)) {
    const formatted = `+351 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return {
      isValid: true,
      normalized: `+351${cleaned}`,
      formatted,
    };
  }

  // 3. International number handling (E.164: + followed by 7 to 15 digits)
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: cleaned,
      formatted: cleaned,
    };
  }

  if (/^00[1-9]\d{6,14}$/.test(cleaned)) {
    const normalized = `+${cleaned.slice(2)}`;
    return {
      isValid: true,
      normalized,
      formatted: normalized,
    };
  }

  return {
    isValid: false,
    normalized: '',
    formatted: '',
    errorCode: 'INVALID_PHONE',
    error:
      lang === 'fr'
        ? 'Veuillez entrer un numéro de téléphone valide (ex: 912 345 678 ou +351 912 345 678).'
        : lang === 'en'
        ? 'Please enter a valid phone number (e.g. 912 345 678 or +351 912 345 678).'
        : 'Por favor, insira um número de telefone válido (ex: 912 345 678 ou +351 912 345 678).',
  };
}

/**
 * Quick boolean check for valid phone number.
 */
export function isValidPhoneNumber(rawPhone: string): boolean {
  return validateAndNormalizePhone(rawPhone).isValid;
}

/**
 * Formats a phone string for UI display.
 */
export function formatPhoneDisplay(rawPhone: string): string {
  const res = validateAndNormalizePhone(rawPhone);
  return res.isValid ? res.formatted : rawPhone;
}

/**
 * Compares two phone numbers for equality across different formats (e.g. spaces, dashes, +351 vs national prefix).
 */
export function phonesMatch(p1?: string | null, p2?: string | null): boolean {
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;
  const digits1 = p1.replace(/\D/g, '');
  const digits2 = p2.replace(/\D/g, '');
  if (!digits1 || !digits2) return false;
  if (digits1 === digits2) return true;
  if (digits1.endsWith(digits2) || digits2.endsWith(digits1)) {
    return Math.abs(digits1.length - digits2.length) <= 4;
  }
  return false;
}
