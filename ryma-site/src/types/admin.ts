import { SERVICES, getLocalizedText } from '@/data/services';
import { Lang } from '@/lib/i18n';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type CoverageType = 'PARTICULAR' | 'INSURANCE' | 'ADSE' | 'OTHER';

export interface Appointment {
  id: string;
  patientName: string;
  phone: string;
  email?: string | null;
  service: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  coverageType?: CoverageType;
  coverageProvider?: string | null;
  coverageNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientNote {
  phone: string;
  patientName: string;
  content: string;
  tags: string;
  updatedAt: string;
}

export interface PatientSession {
  id: string;
  patientId: string;
  date: string;
  time?: string | null;
  serviceSlug: string;
  evaPainScore: number; // 0 to 10
  sessionType: 'ONLINE' | 'MANUAL' | 'PAPER';
  notes?: string | null;
  practitioner?: string | null;
  createdAt: string;
}

export interface PatientRecord {
  id: string;
  patientName: string;
  phone: string;
  email?: string | null;
  gender?: 'M' | 'F' | 'OTHER' | null;
  dob?: string | null;
  coverageType?: CoverageType | null;
  coverageProvider?: string | null;
  coverageNumber?: string | null;
  referringDoctor?: string | null;
  pathologyTags: string;
  medicalHistory?: string | null;
  totalPrescribedSessions: number;
  createdAt: string;
  updatedAt: string;
  sessions?: PatientSession[];
}

export interface SlotInfo {
  time: string;
  available: boolean;
  reason: 'booked' | 'blocked' | 'sunday' | null;
  appointmentId: string | null;
}

export function getServiceName(slug: string, lang: Lang): string {
  const service = SERVICES.find(s => s.slug === slug);
  return service ? getLocalizedText(service.name, lang) : slug;
}

export function getServicePrice(slug: string): number {
  return SERVICES.find(s => s.slug === slug)?.price ?? 0;
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNext7Days(): string[] {
  const list: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push(formatLocalDate(d));
  }
  return list;
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
}

export function formatSlotDateLabel(dateStr: string, lang: Lang): { title: string; subtitle: string; isSunday: boolean } {
  const d = new Date(dateStr + 'T12:00:00');
  const todayStr = formatLocalDate(new Date());
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrowObj);

  const isSunday = d.getDay() === 0;

  const locale = lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR';
  let title = d.toLocaleDateString(locale, { weekday: 'long' });
  if (dateStr === todayStr) title = lang === 'pt' ? 'Hoje' : lang === 'en' ? 'Today' : "Aujourd'hui";
  else if (dateStr === tomorrowStr) title = lang === 'pt' ? 'Amanhã' : lang === 'en' ? 'Tomorrow' : 'Demain';

  const subtitle = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return { title, subtitle, isSunday };
}

export const STATUS_CONFIG: Record<AppointmentStatus, { fr: string; pt: string; en: string; color: string; bg: string; border: string }> = {
  PENDING:   { fr: 'En attente',   pt: 'Pendente',      en: 'Pending',     color: 'text-[#854D0E]', bg: 'bg-[#FEF9C3]', border: 'border-[#FEF08A]' },
  CONFIRMED: { fr: 'Confirmé',     pt: 'Confirmado',    en: 'Confirmed',   color: 'text-[#166534]', bg: 'bg-[#DCFCE7]', border: 'border-[#BBF7D0]' },
  CANCELLED: { fr: 'Annulé',       pt: 'Cancelado',     en: 'Cancelled',   color: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]', border: 'border-[#FECACA]' },
  COMPLETED: { fr: 'Terminé',      pt: 'Concluído',     en: 'Completed',   color: 'text-[#1E40AF]', bg: 'bg-[#DBEAFE]', border: 'border-[#BFDBFE]' },
  NO_SHOW:   { fr: 'Non présenté', pt: 'Falta à Consulta', en: 'No-Show',     color: 'text-[#475569]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]' },
};