/** Shared by server validation, content and the client language provider. */
export const SUPPORTED_LANGUAGES = ['pt', 'en', 'fr', 'es'] as const;
export type Lang = (typeof SUPPORTED_LANGUAGES)[number];
export const LOCALES: Record<Lang, string> = { pt: 'pt-PT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
export function isLanguage(value: unknown): value is Lang {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as Lang);
}
