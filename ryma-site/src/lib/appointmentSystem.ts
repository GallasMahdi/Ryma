'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export interface Appointment {
  id: string;
  patientName: string;
  phone: string;
  email?: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface SlotInfo {
  time: string;
  available: boolean;
  reason?: 'booked' | 'blocked' | 'break' | 'sunday';
}

const STORAGE_KEY_APPOINTMENTS = 'ryma_appointments_v1';
const STORAGE_KEY_BLOCKED_SLOTS = 'ryma_blocked_slots_v1';
const BROADCAST_CHANNEL_NAME = 'ryma_broadcast_v1';

// Default production state is completely clean (zero mock data)
const INITIAL_APPOINTMENTS: Appointment[] = [];

// Optional demo seed data for admin testing/staging
export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'demo_1',
    patientName: 'Sarra Ben Ammar',
    phone: '+216 98 000 001',
    email: 'sarra.benammar@gmail.com',
    service: 'reeducation-post-partum',
    date: '2026-08-06',
    time: '09:00',
    status: 'confirmed',
    notes: 'Suivi post-accouchement 3ème semaine.',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'demo_2',
    patientName: 'Amel Karoui',
    phone: '+216 98 000 002',
    email: 'amel.karoui@yahoo.fr',
    service: 'cavitation',
    date: '2026-08-06',
    time: '10:30',
    status: 'confirmed',
    notes: 'Cure minceur zone abdominale.',
    createdAt: '2026-08-02T11:30:00Z',
  },
  {
    id: 'demo_3',
    patientName: 'Mehdi Ben Romdhane',
    phone: '+216 98 000 003',
    service: 'reeducation-posturale',
    date: '2026-08-07',
    time: '09:30',
    status: 'pending',
    notes: 'Douleurs lombaires chroniques.',
    createdAt: '2026-08-03T14:15:00Z',
  },
  {
    id: 'demo_4',
    patientName: 'Lilia Bouzid',
    phone: '+216 98 000 004',
    email: 'lilia.bouzid@gmail.com',
    service: 'drainage-lymphatique',
    date: '2026-08-07',
    time: '11:00',
    status: 'confirmed',
    notes: 'Sensation de jambes lourdes.',
    createdAt: '2026-08-04T09:00:00Z',
  },
];

export const DAILY_TIME_SLOTS = [
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

let inMemoryAppointments: Appointment[] = [...INITIAL_APPOINTMENTS];
let inMemoryBlockedSlots: Record<string, boolean> = {};

// Helper sound synthesizer chime using Web Audio API
export function playNotificationChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    // Silently handle autoplay restrictions
  }
}

function notifyListeners(payload?: { type: string; appointment?: Appointment }) {
  if (typeof window !== 'undefined') {
    // Local tab custom event
    window.dispatchEvent(new CustomEvent('ryma_appointments_changed', { detail: payload }));

    // Cross-tab broadcast
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(payload || { type: 'UPDATE' });
      channel.close();
    } catch (e) {
      // Fallback
    }
  }
}

// -------------------------------------------------------------------------
// Storage Functions & Real-time Conflict Engine
// -------------------------------------------------------------------------

export function getAppointments(): Appointment[] {
  if (typeof window === 'undefined') return inMemoryAppointments;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
    if (raw === null) {
      // Clean production default
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(INITIAL_APPOINTMENTS));
      inMemoryAppointments = [...INITIAL_APPOINTMENTS];
      return INITIAL_APPOINTMENTS;
    }
    const parsed = JSON.parse(raw);
    inMemoryAppointments = parsed;
    return parsed;
  } catch (err) {
    return inMemoryAppointments;
  }
}

export function getBlockedSlots(): Record<string, boolean> {
  if (typeof window === 'undefined') return inMemoryBlockedSlots;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLOCKED_SLOTS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    inMemoryBlockedSlots = parsed;
    return parsed;
  } catch (err) {
    return inMemoryBlockedSlots;
  }
}

export type AddAppointmentResult =
  | { success: true; appointment: Appointment }
  | { success: false; error: 'slot_taken' | 'invalid_data' };

/**
 * Atomic Appointment Creation with Concurrency Conflict Prevention
 */
export function addAppointment(data: Omit<Appointment, 'id' | 'createdAt' | 'status'>): AddAppointmentResult {
  const current = getAppointments();

  // Validate that the slot is not already taken by an active appointment
  const conflict = current.find(
    a => a.date === data.date && a.time === data.time && a.status !== 'cancelled'
  );

  const blockedMap = getBlockedSlots();
  const isBlocked = blockedMap[`${data.date}_${data.time}`];

  if (conflict || isBlocked) {
    return { success: false, error: 'slot_taken' };
  }

  const newApp: Appointment = {
    ...data,
    id: 'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const updated = [newApp, ...current];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
  }
  inMemoryAppointments = updated;
  notifyListeners({ type: 'NEW_APPOINTMENT', appointment: newApp });
  return { success: true, appointment: newApp };
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus): boolean {
  const current = getAppointments();
  const index = current.findIndex(a => a.id === id);
  if (index === -1) return false;

  current[index].status = status;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(current));
  }
  inMemoryAppointments = current;
  notifyListeners({ type: 'STATUS_CHANGED' });
  return true;
}

export function deleteAppointment(id: string): boolean {
  const current = getAppointments();
  const updated = current.filter(a => a.id !== id);
  if (updated.length === current.length) return false;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(updated));
  }
  inMemoryAppointments = updated;
  notifyListeners({ type: 'DELETED' });
  return true;
}

export function toggleBlockSlot(dateStr: string, timeStr: string): boolean {
  const current = getBlockedSlots();
  const key = `${dateStr}_${timeStr}`;
  const isBlocked = !current[key];

  if (isBlocked) {
    current[key] = true;
  } else {
    delete current[key];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_BLOCKED_SLOTS, JSON.stringify(current));
  }
  inMemoryBlockedSlots = current;
  notifyListeners({ type: 'SLOT_TOGGLED' });
  return isBlocked;
}

export function clearAllData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_APPOINTMENTS);
    localStorage.removeItem(STORAGE_KEY_BLOCKED_SLOTS);
  }
  inMemoryAppointments = [];
  inMemoryBlockedSlots = {};
  notifyListeners({ type: 'CLEARED' });
}

export function seedDemoAppointments() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(DEMO_APPOINTMENTS));
  }
  inMemoryAppointments = [...DEMO_APPOINTMENTS];
  notifyListeners({ type: 'SEEDED' });
}

export function getSlotsForDate(dateStr: string): SlotInfo[] {
  const dateObj = new Date(dateStr);
  const isSunday = dateObj.getDay() === 0;

  if (isSunday) {
    return DAILY_TIME_SLOTS.map(time => ({
      time,
      available: false,
      reason: 'sunday',
    }));
  }

  const appointments = getAppointments().filter(
    a => a.date === dateStr && a.status !== 'cancelled'
  );
  const bookedTimes = new Set(appointments.map(a => a.time));
  const blockedMap = getBlockedSlots();

  return DAILY_TIME_SLOTS.map(time => {
    const slotKey = `${dateStr}_${time}`;

    if (bookedTimes.has(time)) {
      return { time, available: false, reason: 'booked' };
    }

    if (blockedMap[slotKey]) {
      return { time, available: false, reason: 'blocked' };

    }

    return { time, available: true };
  });
}

// -------------------------------------------------------------------------
// Real-Time Subscribed Custom Hook with Queue Support
// -------------------------------------------------------------------------

export function useAppointmentsStore() {
  const [appointments, setAppointmentsState] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlotsState] = useState<Record<string, boolean>>({});
  const [unreadQueue, setUnreadQueue] = useState<Appointment[]>([]);

  const refresh = useCallback(() => {
    setAppointmentsState(getAppointments());
    setBlockedSlotsState(getBlockedSlots());
  }, []);

  const handleIncomingAppointment = useCallback((app: Appointment) => {
    setUnreadQueue(prev => [app, ...prev]);
    playNotificationChime();
  }, []);

  useEffect(() => {
    refresh();

    // 1. Local tab listener
    const handleLocal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.type === 'NEW_APPOINTMENT' && customEvent.detail?.appointment) {
        handleIncomingAppointment(customEvent.detail.appointment);
      }
      refresh();
    };

    window.addEventListener('ryma_appointments_changed', handleLocal);
    window.addEventListener('storage', refresh);

    // 2. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === 'NEW_APPOINTMENT' && event.data?.appointment) {
          handleIncomingAppointment(event.data.appointment);
        }
        refresh();
      };
    } catch (e) {
      // Fallback
    }

    return () => {
      window.removeEventListener('ryma_appointments_changed', handleLocal);
      window.removeEventListener('storage', refresh);
      if (channel) channel.close();
    };
  }, [refresh, handleIncomingAppointment]);

  const dismissNotification = useCallback((id: string) => {
    setUnreadQueue(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setUnreadQueue([]);
  }, []);

  const lastNewAppointment = useMemo(() => unreadQueue[0] ?? null, [unreadQueue]);

  const clearLastNewAppointment = useCallback(() => {
    setUnreadQueue(prev => prev.slice(1));
  }, []);

  return {
    appointments,
    blockedSlots,
    unreadQueue,
    lastNewAppointment,
    dismissNotification,
    clearLastNewAppointment,
    clearAllNotifications,
    refresh,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    toggleBlockSlot,
    clearAllData,
    seedDemoAppointments,
    getSlotsForDate,
  };
}
