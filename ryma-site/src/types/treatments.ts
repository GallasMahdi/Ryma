import type { Service } from '@/data/services';

export type TreatmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export interface Treatment extends Service {
  status: TreatmentStatus;
  durationMinutes: number;
  priceCents: number;
  version: number;
  updatedAt: string;
}
