import type { PatientSession } from '@/types/admin';

export class ClinicalError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message); }
}

export function validEva(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10);
}

export function completedSessions(sessions: PatientSession[] = []): PatientSession[] {
  return sessions.filter(s => s.clinicalStatus === 'COMPLETED' && !!s.completedAt && !s.archivedAt);
}

export function measuredSessions(sessions: PatientSession[] = []): (PatientSession & { evaPainScore: number })[] {
  return completedSessions(sessions).filter((s): s is PatientSession & {evaPainScore:number} => typeof s.evaPainScore === 'number');
}
