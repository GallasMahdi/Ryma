import { EventEmitter } from 'events';
import type { Appointment } from '@/types/admin';

export type AdminEventType =
  | 'appointment:created'
  | 'appointment:updated'
  | 'appointment:deleted'
  | 'slot:updated';

export interface AdminEventPayload {
  type: AdminEventType;
  timestamp: string;
  data: any;
}

// Attach to globalThis so the singleton survives Next.js dev hot-reloads
const globalForEvents = globalThis as unknown as {
  _adminEventBus?: EventEmitter;
};

export const adminEventBus: EventEmitter =
  globalForEvents._adminEventBus ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents._adminEventBus = adminEventBus;
}

// Increase max listeners to support multiple open admin tabs/windows
adminEventBus.setMaxListeners(50);

/**
 * Broadcast an event to all connected admin clients
 */
export function broadcastAdminEvent(type: AdminEventType, data: any) {
  const payload: AdminEventPayload = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };
  adminEventBus.emit('admin_event', payload);
}

/**
 * Convenience helper to broadcast a newly created appointment
 */
export function broadcastAppointmentCreated(appointment: any) {
  broadcastAdminEvent('appointment:created', appointment);
}

/**
 * Convenience helper to broadcast an updated appointment
 */
export function broadcastAppointmentUpdated(appointment: { id: string; [key: string]: any }) {
  broadcastAdminEvent('appointment:updated', appointment);
}

/**
 * Convenience helper to broadcast a deleted appointment
 */
export function broadcastAppointmentDeleted(id: string) {
  broadcastAdminEvent('appointment:deleted', { id });
}
