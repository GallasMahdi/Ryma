import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import type { Lang } from '@/lib/i18n';

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  formatted: string;
  error?: string;
  errorCode?: 'PHONE_REQUIRED' | 'INVALID_PHONE';
}

const messages = {
    es: {
    required: "El número de teléfono es obligatorio.",
    characters: "Use solo números y espacios, con + o 00 al principio para números internacionales. No use puntos, paréntesis ni letras.",
    invalid: "Introduzca un teléfono completo y válido. P. ej., 912 345 678 o +351 912 345 678. Incluya el prefijo internacional para otros países.",
    hint: "Portugal: 912 345 678. Otros países: + prefijo del país y número. Solo números y espacios.",
  },
  pt: {
    required: 'O número de telefone é obrigatório.',
    characters: 'Use apenas algarismos e espaços, com + ou 00 no início para números internacionais. Não use pontos, parênteses ou letras.',
    invalid: 'Introduza um número de telefone completo e válido. Ex.: 912 345 678 ou +351 912 345 678. Para outros países, inclua o indicativo.',
    hint: 'Portugal: 912 345 678. Outros países: + indicativo e número. Apenas algarismos e espaços.',
  },
  en: {
    required: 'Phone number is required.',
    characters: 'Use only digits and spaces, with + or 00 at the start for international numbers. Do not use dots, parentheses or letters.',
    invalid: 'Enter a complete, valid phone number. E.g. 912 345 678 or +351 912 345 678. Include the country code for other countries.',
    hint: 'Portugal: 912 345 678. Other countries: + country code and number. Digits and spaces only.',
  },
  fr: {
    required: 'Le numéro de téléphone est obligatoire.',
    characters: 'Utilisez uniquement des chiffres et des espaces, avec + ou 00 au début pour les numéros internationaux. Sans points, parenthèses ni lettres.',
    invalid: 'Saisissez un numéro de téléphone complet et valide. Ex. : 912 345 678 ou +351 912 345 678. Pour les autres pays, ajoutez l’indicatif.',
    hint: 'Portugal : 912 345 678. Autres pays : + indicatif et numéro. Chiffres et espaces uniquement.',
  },
};

export function phoneInputHint(lang: Lang): string {
  return (messages[lang] || messages.pt).hint;
}

/**
 * Validate the entire input before normalization. Never extract a number from
 * arbitrary text or silently remove punctuation. Full metadata checks both
 * length and national numbering patterns; it cannot verify ownership/reachability.
 */
export function validateAndNormalizePhone(rawPhone: unknown, lang: Lang = 'pt'): PhoneValidationResult {
  const copy = messages[lang] || messages.pt;
  const invalid = (error: string, errorCode: 'PHONE_REQUIRED' | 'INVALID_PHONE' = 'INVALID_PHONE'): PhoneValidationResult =>
    ({ isValid: false, normalized: '', formatted: '', errorCode, error });

  if (rawPhone == null || rawPhone === '') return invalid(copy.required, 'PHONE_REQUIRED');
  if (typeof rawPhone !== 'string' || rawPhone.length > 64) return invalid(copy.invalid);

  // Allow ordinary and non-breaking spaces from copy/paste, never control characters.
  const trimmed = rawPhone.replace(/^[ \u00a0\u202f]+|[ \u00a0\u202f]+$/g, '');
  if (!trimmed) return invalid(copy.required, 'PHONE_REQUIRED');
  if (!/^\+?[0-9]+(?:[ \u00a0\u202f]+[0-9]+)*$/.test(trimmed)) return invalid(copy.characters);

  const compact = trimmed.replace(/[ \u00a0\u202f]/g, '');
  const international = compact.startsWith('+') || compact.startsWith('00');
  const candidate = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  if (international ? !/^\+[1-9][0-9]{6,14}$/.test(candidate) : !/^[0-9]{9}$/.test(candidate)) {
    return invalid(copy.invalid);
  }

  const phone = parsePhoneNumberFromString(candidate, { defaultCountry: 'PT', extract: false });
  const expected = international ? candidate : `+351${candidate}`;
  // Reject parser repairs (e.g. an extra trunk zero) rather than saving a different number.
  if (!phone?.isValid() || phone.number !== expected) return invalid(copy.invalid);
  return { isValid: true, normalized: phone.number, formatted: phone.formatInternational() };
}

/** Defense for persistence methods that may be called outside an HTTP route. */
export function requireNormalizedPhone(rawPhone: unknown): string {
  const result = validateAndNormalizePhone(rawPhone);
  if (!result.isValid) throw new Error(result.errorCode);
  return result.normalized;
}

export function isValidPhoneNumber(rawPhone: string): boolean {
  return validateAndNormalizePhone(rawPhone).isValid;
}

export function formatPhoneDisplay(rawPhone: string): string {
  const result = validateAndNormalizePhone(rawPhone);
  return result.isValid ? result.formatted : rawPhone;
}

// Keep legacy record matching independent of the stricter rules for new input.
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
