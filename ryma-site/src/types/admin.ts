import { SERVICES, getLocalizedText } from '@/data/services';
import { Lang } from '@/lib/i18n';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientName: string;
  email: string | null;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  notes: string | null;
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
  cnamStatus?: 'OUI' | 'NON' | 'EN_COURS' | null;
  cnamNumber?: string | null;
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

export function getNext7Days(): string[] {
  const list: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push(d.toISOString().split('T')[0]);
  }
  return list;
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

export function formatSlotDateLabel(dateStr: string, lang: Lang): { title: string; subtitle: string; isSunday: boolean } {
  const d = new Date(dateStr + 'T12:00:00');
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const isSunday = d.getDay() === 0;

  const locale = lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR';
  let title = d.toLocaleDateString(locale, { weekday: 'long' });
  if (dateStr === todayStr) title = lang === 'pt' ? 'Hoje' : lang === 'en' ? 'Today' : "Aujourd'hui";
  else if (dateStr === tomorrowStr) title = lang === 'pt' ? 'Amanhã' : lang === 'en' ? 'Tomorrow' : 'Demain';

  const subtitle = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return { title, subtitle, isSunday };
}

export const STATUS_CONFIG: Record<AppointmentStatus, { fr: string; pt: string; en: string; color: string; bg: string; border: string }> = {
  PENDING:   { fr: 'En attente',   pt: 'Pendente',      en: 'Pending',     color: 'text-[#B08A45]', bg: 'bg-[#B08A45]/15', border: 'border-[#B08A45]/30' },
  CONFIRMED: { fr: 'Confirmé',     pt: 'Confirmado',    en: 'Confirmed',   color: 'text-[#6F8F72]', bg: 'bg-[#6F8F72]/15', border: 'border-[#6F8F72]/30' },
  CANCELLED: { fr: 'Annulé',       pt: 'Cancelado',     en: 'Cancelled',   color: 'text-[#A9655F]', bg: 'bg-[#A9655F]/15', border: 'border-[#A9655F]/30' },
  COMPLETED: { fr: 'Terminé',      pt: 'Concluído',     en: 'Completed',   color: 'text-[#5B82A6]', bg: 'bg-[#5B82A6]/15', border: 'border-[#5B82A6]/30' },
  NO_SHOW:   { fr: 'Non présenté', pt: 'Falta à Consulta', en: 'No-Show',     color: 'text-[#77736B]', bg: 'bg-[#77736B]/15', border: 'border-[#77736B]/30' },
};