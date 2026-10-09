import type { Lang } from '@/lib/i18n';

export interface AppointmentCalendarEvent {
  status?: 'CONFIRMED' | 'TENTATIVE';
  service: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  description: string;
  lang: Lang;
  uid: string;
}

// Booking times belong to the clinic, regardless of the visitor's device timezone.
function lisbonStart(date: string, time: string): Date {
  const wallTime = Date.parse(`${date}T${time}:00Z`);
  let instant = wallTime;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
    const displayed = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    instant += wallTime - displayed;
  }
  return new Date(instant);
}

function calendarDates(event: AppointmentCalendarEvent) {
  const start = lisbonStart(event.date, event.time);
  const end = new Date(start.getTime() + event.duration * 60_000);
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return { start: format(start), end: format(end), stamp: format(new Date()) };
}

function eventTitle(event: AppointmentCalendarEvent) {
  const label = event.lang === 'es' ? "Cita" : event.lang === 'pt' ? 'Consulta' : event.lang === 'fr' ? 'Rendez-vous' : 'Appointment';
  return `${label}: ${event.service} — Digital Clínica`;
}

export function googleCalendarUrl(event: AppointmentCalendarEvent): string {
  const { start, end } = calendarDates(event);
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: eventTitle(event), dates: `${start}/${end}`,
    ctz: 'Europe/Lisbon', details: event.description, location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// Calendar content lines are limited to 75 UTF-8 octets, including continuation spaces.
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let result = '';
  let length = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) { result += '\r\n '; length = 1; }
    result += character;
    length += bytes;
  }
  return result;
}

export function appointmentIcs(event: AppointmentCalendarEvent): string {
  const { start, end, stamp } = calendarDates(event);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Digital Clinica//Appointments//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${escapeIcs(event.uid)}`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${escapeIcs(eventTitle(event))}`, `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`, `STATUS:${event.status || 'CONFIRMED'}`, 'END:VEVENT', 'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n';
}
