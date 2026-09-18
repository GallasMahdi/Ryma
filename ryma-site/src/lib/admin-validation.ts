export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Midnight of a clinic calendar day, accounting for Lisbon daylight saving. */
export function lisbonDayStart(date: string): string {
  if (!isCalendarDate(date)) throw new Error('Invalid calendar date');
  const midnight = Date.parse(`${date}T00:00:00Z`);
  const zone = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Lisbon', timeZoneName: 'shortOffset' });
  let result = midnight;
  for (let i = 0; i < 2; i++) {
    const offset = zone.formatToParts(new Date(result)).find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
    const match = offset.match(/GMT([+-])(\d+)(?::(\d+))?/);
    const minutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
    result = midnight - minutes * 60_000;
  }
  return new Date(result).toISOString();
}

export function pageNumber(value: string | null, fallback: number, max = 1_000_000): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export const PAYMENT_METHODS = ['MULTIBANCO', 'MBWAY', 'CASH', 'CARD', 'TRANSFER'];
export const COVERAGE_TYPES = ['PARTICULAR', 'INSURANCE', 'ADSE', 'OTHER'];

export function invoiceUpdateError(body: Record<string, unknown>): string | null {
  if (body.paymentStatus !== undefined && !['PAID', 'PENDING'].includes(String(body.paymentStatus))) return 'Invalid payment status';
  if (body.paymentMethod !== undefined && !PAYMENT_METHODS.includes(String(body.paymentMethod))) return 'Invalid payment method';
  if (body.coverageType !== undefined && !COVERAGE_TYPES.includes(String(body.coverageType))) return 'Invalid coverage type';
  const limits: Record<string, number> = { patientName: 100, patientNif: 9, patientEmail: 254, patientAddress: 250, coverageProvider: 100, coverageNumber: 100, notes: 1000 };
  for (const [key, limit] of Object.entries(limits)) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || (body[key] as string).length > limit)) return `Invalid ${key}`;
  }
  if (body.patientName !== undefined && !(body.patientName as string).trim()) return 'Patient name is required';
  if (body.patientNif !== undefined && !/^\d{9}$/.test((body.patientNif as string).trim())) return 'Invalid NIF';
  if (body.patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((body.patientEmail as string).trim())) return 'Invalid email';
  return null;
}
