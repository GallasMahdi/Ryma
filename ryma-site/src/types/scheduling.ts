import type { Treatment } from '@/types/treatments';
export interface Practitioner {
  id: string;
  name: string;
  profession: string;
  color: string;
  active: number;
  bookable: number;
  priority: number;
}

export interface PractitionerService {
  practitionerId: string;
  service: string;
  durationMinutes: number | null;
  bufferBefore: number;
  bufferAfter: number;
}

export interface WorkingInterval {
  practitionerId: string; // '*' denotes the clinic
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface ScheduleException {
  id: string;
  practitionerId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  kind: 'closed' | 'open';
  label: string;
}

export interface SharedResource { id: string; name: string; active: number }
export interface ServiceResource { service: string; resourceId: string }
export interface SchedulingConfiguration {
  treatments?: Treatment[];
  revision: number;
  practitioners: Practitioner[];
  services: PractitionerService[];
  hours: WorkingInterval[];
  exceptions: ScheduleException[];
  resources: SharedResource[];
  serviceResources: ServiceResource[];
}

export interface BookingAssignment {
  serviceNameJson?: string | null;
  servicePriceCents?: number | null;
  servicePole?: string | null;
  practitionerId: string;
  practitionerName: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  resourceIds: string;
}

export const LEGACY_PRACTITIONER_ID = 'legacy';
export const CLINIC_SCOPE = '*';
export const TIME_GRID = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
export const DEFAULT_HOURS = [1, 2, 3, 4, 5, 6].flatMap(dayOfWeek => [
  { dayOfWeek, startMinute: 510, endMinute: 750 },
  { dayOfWeek, startMinute: 840, endMinute: 1050 },
]);

export const formatMinute = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
