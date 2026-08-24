'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { SERVICES } from '@/data/services';
import { IconAlertTriangle } from '@tabler/icons-react';

import {
  Appointment,
  AppointmentStatus,
  PatientNote,
  PatientRecord,
  SlotInfo,
  Invoice,
  InvoiceStats,
  InvoicePaymentStatus,
  PaymentMethod,
  getServiceName,
  getServicePrice,
  getNext7Days,
  formatLocalDate,
} from '@/types/admin';
import { playNotificationChime } from '@/lib/sound';
import { phonesMatch } from '@/lib/phone';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav, AdminTab } from '@/components/admin/AdminMobileNav';
import { AdminKpiCards } from '@/components/admin/AdminKpiCards';
import { AppointmentsTab } from '@/components/admin/AppointmentsTab';
import { SlotsTab } from '@/components/admin/SlotsTab';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { PatientNotesTab } from '@/components/admin/PatientNotesTab';
import { InvoicesTab } from '@/components/admin/InvoicesTab';
import { AddAppointmentModal } from '@/components/admin/AddAppointmentModal';
import { MultipleSessionsModal } from '@/components/admin/MultipleSessionsModal';
import { CreateInvoiceModal } from '@/components/admin/CreateInvoiceModal';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { ClinicHelpdeskDrawer } from '@/components/admin/ClinicHelpdeskDrawer';
import { LuxuryToastContainer, LuxuryProgressBar, LuxuryToast } from '@/components/admin/LuxuryFeedback';

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: 'same-origin', cache: 'no-store' });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Sessão expirada. A redirecionar...');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Erro HTTP ${res.status}`);
  }
  return res.json() as T;
}

export default function AdminPage() {
  const { lang, toggleLang } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');

  // ── State ──────────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [isGlobalBusy, setIsGlobalBusy] = useState(false);

  // Real-time synchronization state
  const [recentNewIds, setRecentNewIds] = useState<Set<string>>(new Set());
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const knownAppointmentIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Toast Queue
  const [toasts, setToasts] = useState<LuxuryToast[]>([]);

  const addToast = useCallback((toast: Omit<LuxuryToast, 'id'>) => {
    const id = 'toast_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newToast: LuxuryToast = { id, ...toast };
    setToasts(prev => [newToast, ...prev.slice(0, 4)]);

    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3500);
    if (toast.type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateForSlots, setSelectedDateForSlots] = useState<string>(
    () => formatLocalDate(new Date())
  );
  const [slotList, setSlotList] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // In-memory slot cache & abort controller for zero-freeze switching
  const slotCacheRef = useRef<Record<string, SlotInfo[]>>({});
  const slotAbortRef = useRef<AbortController | null>(null);

  // Patient notes & structured EMR state
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [patientsList, setPatientsList] = useState<PatientRecord[]>([]);
  const [noShowCounts, setNoShowCounts] = useState<Record<string, number>>({});
  const [noteSearch, setNoteSearch] = useState('');

  // Invoicing & Tax Receipts state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Clinic Support & Helpdesk state
  const [isHelpdeskOpen, setIsHelpdeskOpen] = useState(false);

  // ── Handle Newly Arrived Booking ───────────────────────────────────────────
  const handleNewIncomingAppointment = useCallback(
    (appt: Appointment, isInitial = false) => {
      if (!appt || !appt.id) return;
      if (knownAppointmentIdsRef.current.has(appt.id)) return;

      knownAppointmentIdsRef.current.add(appt.id);

      if (!isInitial) {
        setRecentNewIds(prev => new Set(prev).add(appt.id));

        setTimeout(() => {
          setRecentNewIds(prev => {
            const next = new Set(prev);
            next.delete(appt.id);
            return next;
          });
        }, 30000);

        playNotificationChime();

        const svcName = getServiceName(appt.service, lang);
        const toastTitle =
          lang === 'fr'
            ? 'Nouveau Rendez-vous !'
            : lang === 'en'
            ? 'New Appointment Booked!'
            : 'Nova Consulta Agendada!';
        const toastMsg =
          lang === 'fr'
            ? `${appt.patientName} — ${svcName} le ${appt.date} à ${appt.startTime}`
            : lang === 'en'
            ? `${appt.patientName} — ${svcName} on ${appt.date} at ${appt.startTime}`
            : `${appt.patientName} — ${svcName} a ${appt.date} às ${appt.startTime}`;

        addToast({
          type: 'success',
          title: toastTitle,
          message: toastMsg,
          duration: 7000,
        });

        slotCacheRef.current = {};
      }
    },
    [lang, addToast]
  );

  // ── Fetch admin metadata ───────────────────────────────────────────────────
  const fetchAdminMetadata = useCallback(async () => {
    try {
      const data = await apiFetch<{ authenticated: boolean; noShowCounts?: Record<string, number> }>('/api/admin/me');
      if (data.noShowCounts) {
        setNoShowCounts(data.noShowCounts);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAdminMetadata();
  }, [fetchAdminMetadata]);

  const [selectedNote, setSelectedNote] = useState<PatientNote | null>(null);
  const [noteForm, setNoteForm] = useState({ content: '', tags: '' });
  const [savingNote, setSavingNote] = useState(false);

  // Desktop Sidebar Drawer Collapsed State (Persisted)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ryma_admin_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ryma_admin_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCreateInvoiceFromPaletteOpen, setIsCreateInvoiceFromPaletteOpen] = useState(false);

  // Keyboard shortcut Ctrl+B / Cmd+B (Sidebar) and Ctrl+K / Cmd+K (Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / Cmd+K -> Open/Close Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ctrl+B / Cmd+B -> Toggle Sidebar Drawer
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleSidebar]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMultipleSessionsModalOpen, setIsMultipleSessionsModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    patientName: '',
    phone: '',
    email: '',
    service: SERVICES[0]?.slug ?? '',
    date: formatLocalDate(new Date()),
    startTime: '09:00',
    notes: '',
  });
  const [addingError, setAddingError] = useState<string | null>(null);
  const [addingLoading, setAddingLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Fetch appointments ─────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingAppointments(prev => prev || appointments.length === 0);
    }
    setAppointmentsError(null);
    try {
      const data = await apiFetch<{ appointments: Appointment[] }>('/api/admin/appointments');
      if (Array.isArray(data.appointments)) {
        if (!isInitialLoadDoneRef.current) {
          data.appointments.forEach(a => knownAppointmentIdsRef.current.add(a.id));
          isInitialLoadDoneRef.current = true;
          setAppointments(data.appointments);
        } else {
          const newIncoming = data.appointments.filter(a => !knownAppointmentIdsRef.current.has(a.id));
          newIncoming.forEach(a => knownAppointmentIdsRef.current.add(a.id));
          setAppointments(data.appointments);

          if (!isSilent && newIncoming.length > 0) {
            if (newIncoming.length === 1) {
              handleNewIncomingAppointment(newIncoming[0], false);
            } else {
              const patientName = newIncoming[0].patientName;
              addToast({
                type: 'success',
                title: lang === 'pt' ? 'Plano de Sessões Agendado' : lang === 'en' ? 'Sessions Scheduled' : 'Plan de Séances Planifié',
                message: `${patientName} • ${newIncoming.length} sessões agendadas com sucesso.`,
                duration: 7000,
              });
              playNotificationChime();
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).message !== 'Session expirée' && (err as Error).message !== 'Sessão expirada. A redirecionar...') {
        if (!isSilent)
          setAppointmentsError(
            lang === 'fr'
              ? 'Erreur de chargement des rendez-vous'
              : lang === 'en'
              ? 'Error loading appointments'
              : 'Erro ao carregar consultas'
          );
      }
    } finally {
      setLoadingAppointments(false);
    }
  }, [lang, handleNewIncomingAppointment, appointments.length]);

  // ── Fetch patient notes ────────────────────────────────────────────────────
  const fetchPatientNotes = useCallback(async () => {
    try {
      const data = await apiFetch<{ notes: PatientNote[]; patients: PatientRecord[] }>('/api/admin/patients');
      setPatientNotes(data.notes ?? []);
      setPatientsList(data.patients ?? []);
    } catch { /* silent */ }
  }, []);

  // ── Fetch invoices & tax receipts ──────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const data = await apiFetch<{ invoices: Invoice[]; stats: InvoiceStats }>('/api/admin/invoices');
      setInvoices(data.invoices ?? []);
      setInvoiceStats(data.stats ?? null);
    } catch (err) {
      console.warn('[Invoices Fetch Error]:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const handleInvoiceCreated = useCallback((newInv: Invoice) => {
    setInvoices(prev => [newInv, ...prev]);
    fetchInvoices();
    addToast({
      type: 'success',
      title: lang === 'pt' ? 'Fatura-Recibo Emitida' : 'Invoice Created',
      message: `${newInv.invoiceNumber} — ${newInv.patientName} (${newInv.amount.toFixed(2)} €)`,
    });
  }, [addToast, fetchInvoices, lang]);

  const handleUpdateInvoiceStatus = useCallback(async (id: string, newStatus: InvoicePaymentStatus, newMethod?: PaymentMethod) => {
    // Optimistic instant UI update
    setInvoices(prev => prev.map(inv => (inv.id === id ? {
      ...inv,
      paymentStatus: newStatus,
      ...(newMethod ? { paymentMethod: newMethod } : {}),
      paidAt: newStatus === 'PAID' ? new Date().toISOString() : inv.paidAt,
    } : inv)));

    try {
      const res = await apiFetch<{ invoice: Invoice }>(`/api/admin/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: newStatus,
          ...(newMethod ? { paymentMethod: newMethod } : {}),
        }),
      });
      setInvoices(prev => prev.map(inv => (inv.id === id ? res.invoice : inv)));
      fetchInvoices();
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Estado Atualizado' : lang === 'fr' ? 'Statut mis à jour' : 'Status Updated',
        message: `${res.invoice.invoiceNumber}: ${newStatus === 'PAID' ? (lang === 'fr' ? 'Payé' : lang === 'en' ? 'Paid' : 'Pago') : (lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'Pendente')}`,
      });
    } catch (err: any) {
      fetchInvoices(); // rollback
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao atualizar estado' : 'Error updating status',
        message: err.message,
      });
    }
  }, [addToast, fetchInvoices, lang]);

  const handleDeleteInvoice = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      fetchInvoices();
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Recibo Anulado' : 'Invoice Voided',
        message: lang === 'pt' ? 'O documento foi anulado com sucesso.' : 'Invoice voided.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erro ao anular recibo',
        message: err.message,
      });
    }
  }, [addToast, fetchInvoices, lang]);

  // ── Server-Sent Events (SSE) Live Real-Time Stream ──────────────────────────
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const setupSSE = () => {
      if (isUnmounted) return;
      try {
        eventSource = new EventSource('/api/admin/events');

        eventSource.onopen = () => {
          if (!isUnmounted) setIsLiveConnected(true);
        };

        eventSource.addEventListener('connected', () => {
          if (!isUnmounted) setIsLiveConnected(true);
        });

        eventSource.addEventListener('appointment:created', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            const appt: Appointment = parsed.data;
            if (appt && appt.id) {
              setAppointments(prev => {
                if (prev.some(a => a.id === appt.id)) return prev;
                return [appt, ...prev];
              });
              handleNewIncomingAppointment(appt, false);
            }
          } catch { /* silent */ }
        });

        eventSource.addEventListener('appointments:batch_created', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            const { appointments: batchAppts, count, patientName, service } = parsed.data;
            if (Array.isArray(batchAppts) && batchAppts.length > 0) {
              const newAppts = batchAppts.filter(a => !knownAppointmentIdsRef.current.has(a.id));
              if (newAppts.length > 0) {
                newAppts.forEach(a => knownAppointmentIdsRef.current.add(a.id));
                setAppointments(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const toAdd = newAppts.filter(a => !existingIds.has(a.id));
                  return [...toAdd, ...prev];
                });

                playNotificationChime();
                slotCacheRef.current = {};

                // Display EXACTLY 1 consolidated toast for the entire batch
                const svcName = getServiceName(service || newAppts[0].service, lang);
                const toastTitle =
                  lang === 'fr'
                    ? 'Plan de Séances Créé !'
                    : lang === 'en'
                    ? 'Treatment Plan Created!'
                    : 'Plano de Sessões Criado!';
                const toastMsg =
                  lang === 'fr'
                    ? `${patientName || newAppts[0].patientName} — ${count || newAppts.length} séances planifiées (${svcName})`
                    : lang === 'en'
                    ? `${patientName || newAppts[0].patientName} — ${count || newAppts.length} sessions scheduled (${svcName})`
                    : `${patientName || newAppts[0].patientName} — ${count || newAppts.length} sessões agendadas com sucesso (${svcName})`;

                addToast({
                  type: 'success',
                  title: toastTitle,
                  message: toastMsg,
                  duration: 7000,
                });
              }
            }
          } catch { /* silent */ }
        });

        eventSource.addEventListener('appointment:updated', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            const updated = parsed.data;
            if (updated && updated.id) {
              setAppointments(prev =>
                prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a))
              );
              slotCacheRef.current = {};
            }
          } catch { /* silent */ }
        });

        eventSource.addEventListener('appointment:deleted', (e: MessageEvent) => {
          try {
            const parsed = JSON.parse(e.data);
            const { id } = parsed.data;
            if (id) {
              setAppointments(prev => prev.filter(a => a.id !== id));
              slotCacheRef.current = {};
            }
          } catch { /* silent */ }
        });

        eventSource.onerror = () => {
          if (!isUnmounted) {
            setIsLiveConnected(false);
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
            reconnectTimer = setTimeout(setupSSE, 5000);
          }
        };
      } catch {
        if (!isUnmounted) setIsLiveConnected(false);
      }
    };

    setupSSE();

    return () => {
      isUnmounted = true;
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [handleNewIncomingAppointment]);

  // ── Auto-refresh & window focus sync ───────────────────────────────────────
  useEffect(() => {
    Promise.all([fetchAppointments(false), fetchPatientNotes(), fetchInvoices(), fetchAdminMetadata()]);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchAppointments(true);
      }
    }, 6000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAppointments(true);
        fetchInvoices();
        fetchAdminMetadata();
      }
    };

    const handleWindowFocus = () => {
      fetchAppointments(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchAppointments, fetchPatientNotes, fetchAdminMetadata]);

  // ── Cached Slot Fetching ───────────────────────────────────────────────────
  const fetchSlots = useCallback(async (date: string, forceRefresh = false) => {
    if (!forceRefresh && slotCacheRef.current[date]) {
      setSlotList(slotCacheRef.current[date]);
      setLoadingSlots(false);
      return;
    }

    setLoadingSlots(true);

    if (slotAbortRef.current) {
      slotAbortRef.current.abort();
    }
    const controller = new AbortController();
    slotAbortRef.current = controller;

    try {
      const res = await fetch(`/api/admin/slots?date=${date}`, {
        signal: controller.signal,
        credentials: 'same-origin',
      });

      if (res.ok) {
        const data = await res.json();
        const slotsData = data.slots ?? [];
        slotCacheRef.current[date] = slotsData;
        setSlotList(slotsData);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Quiet catch
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingSlots(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchSlots(selectedDateForSlots);
    }
  }, [selectedDateForSlots, activeTab, fetchSlots]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  };

  // ── Action helpers ─────────────────────────────────────────────────────────
  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const prevList = appointments;
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a));
    setIsGlobalBusy(true);

    try {
      await apiFetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      slotCacheRef.current = {};
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Estado Atualizado' : lang === 'en' ? 'Status Updated' : 'Statut Mis à Jour',
        message: lang === 'pt' ? `A consulta foi marcada como ${status}.` : lang === 'en' ? `Appointment marked as ${status}.` : `Rendez-vous marqué comme ${status}.`,
      });
    } catch (err) {
      setAppointments(prevList);
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro na Atualização' : lang === 'en' ? 'Update Error' : 'Erreur de Mise à Jour',
        message: (err as Error).message,
      });
    } finally {
      setIsGlobalBusy(false);
    }
  };

  const toggleSlot = async (time: string) => {
    const prevList = slotList;
    const targetSlot = prevList.find(s => s.time === time);
    if (!targetSlot) return;

    const willBeBlocked = targetSlot.available || targetSlot.reason !== 'blocked';

    // Immediate optimistic update with correct reason
    setSlotList(prev => prev.map(s => {
      if (s.time !== time) return s;
      return {
        ...s,
        available: !willBeBlocked,
        reason: willBeBlocked ? 'blocked' : null,
      };
    }));
    setIsGlobalBusy(true);

    try {
      const res = await apiFetch<{ blocked: boolean; date: string; time: string }>('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateForSlots, time }),
      });
      delete slotCacheRef.current[selectedDateForSlots];

      // Sync exact server result
      setSlotList(prev => prev.map(s => {
        if (s.time !== time) return s;
        return {
          ...s,
          available: !res.blocked,
          reason: res.blocked ? 'blocked' : null,
        };
      }));

      addToast({
        type: 'success',
        title: res.blocked
          ? (lang === 'pt' ? 'Horário Bloqueado' : lang === 'fr' ? 'Créneau Bloqué' : 'Slot Blocked')
          : (lang === 'pt' ? 'Horário Desbloqueado' : lang === 'fr' ? 'Créneau Débloqué' : 'Slot Unblocked'),
        message: `${selectedDateForSlots} • ${time}`,
      });
      return res.blocked;
    } catch (err) {
      setSlotList(prevList);
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Alterar Horário' : lang === 'fr' ? 'Erreur Créneau' : 'Slot Error',
        message: (err as Error).message,
      });
      return undefined;
    } finally {
      setIsGlobalBusy(false);
    }
  };

  const softDeleteAppointment = async (id: string) => {
    const prevList = appointments;
    setAppointments(prev => prev.filter(a => a.id !== id));
    setIsGlobalBusy(true);

    try {
      await apiFetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
      slotCacheRef.current = {};
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Consulta Eliminada' : lang === 'en' ? 'Appointment Deleted' : 'Rendez-vous Supprimé',
        message: lang === 'pt' ? 'O registo foi removido.' : lang === 'en' ? 'Record deleted.' : 'Enregistrement supprimé.',
      });
    } catch (err) {
      setAppointments(prevList);
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Eliminar' : lang === 'en' ? 'Delete Error' : 'Erreur de Suppression',
        message: (err as Error).message,
      });
    } finally {
      setIsGlobalBusy(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLoading(true);
    setIsGlobalBusy(true);
    setAddingError(null);

    try {
      const data = await apiFetch<{ appointment: Appointment }>('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });

      setAppointments(prev => [data.appointment, ...prev]);
      slotCacheRef.current = {};
      setIsAddModalOpen(false);
      setNewForm({
        patientName: '',
        phone: '',
        email: '',
        service: SERVICES[0]?.slug ?? '',
        date: formatLocalDate(new Date()),
        startTime: '09:00',
        notes: '',
      });
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Consulta Criada' : lang === 'en' ? 'Appointment Created' : 'Rendez-vous Créé',
        message: `${data.appointment.patientName} — ${data.appointment.date} ${data.appointment.startTime}`,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setAddingError(msg);
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Criar Consulta' : lang === 'en' ? 'Creation Error' : 'Erreur de Création',
        message: msg,
      });
    } finally {
      setAddingLoading(false);
      setIsGlobalBusy(false);
    }
  };

  const openPatientNote = (appt: Appointment) => {
    const existing = patientNotes.find(n => phonesMatch(n.phone, appt.phone));
    if (existing) {
      setSelectedNote(existing);
      setNoteForm({ content: existing.content, tags: existing.tags });
    } else {
      setSelectedNote({
        phone: appt.phone,
        patientName: appt.patientName,
        content: '',
        tags: '',
        updatedAt: new Date().toISOString(),
      });
      setNoteForm({ content: '', tags: '' });
    }
    setActiveTab('patients');
  };

  const createDirectPatientNote = async (phone: string, patientName: string, tags = '', content = ''): Promise<PatientNote | null> => {
    setIsGlobalBusy(true);
    try {
      const data = await apiFetch<{ note: PatientNote }>('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, patientName, tags, content }),
      });
      setPatientNotes(prev => {
        const filtered = prev.filter(n => !phonesMatch(n.phone, phone));
        return [data.note, ...filtered];
      });
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Ficha Criada' : lang === 'en' ? 'File Created' : 'Dossier Créé',
        message: patientName,
      });
      return data.note;
    } catch (err) {
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Criar Ficha' : lang === 'en' ? 'Creation Error' : 'Erreur Création Fiche',
        message: (err as Error).message,
      });
      return null;
    } finally {
      setIsGlobalBusy(false);
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    setSavingNote(true);
    setIsGlobalBusy(true);
    try {
      const data = await apiFetch<{ note: PatientNote }>('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedNote.phone,
          patientName: selectedNote.patientName,
          content: noteForm.content,
          tags: noteForm.tags,
        }),
      });
      setPatientNotes(prev => {
        const filtered = prev.filter(n => !phonesMatch(n.phone, selectedNote.phone));
        return [data.note, ...filtered];
      });
      setSelectedNote(data.note);
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Ficha Guardada' : lang === 'en' ? 'File Saved' : 'Dossier Enregistré',
        message: selectedNote.patientName,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Guardar Ficha' : lang === 'en' ? 'Save Error' : 'Erreur d\'Enregistrement',
        message: (err as Error).message,
      });
    } finally {
      setSavingNote(false);
      setIsGlobalBusy(false);
    }
  };

  const deleteNote = async (phone: string) => {
    setIsGlobalBusy(true);
    try {
      await apiFetch(`/api/admin/patients?phone=${encodeURIComponent(phone)}`, { method: 'DELETE' });
      setPatientNotes(prev => prev.filter(n => !phonesMatch(n.phone, phone)));
      setPatientsList(prev => prev.filter(p => !phonesMatch(p.phone, phone)));
      if (selectedNote && phonesMatch(selectedNote.phone, phone)) setSelectedNote(null);
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Ficha Eliminada' : lang === 'en' ? 'File Deleted' : 'Dossier Supprimé',
        message: lang === 'pt' ? 'O processo clínico foi removido.' : lang === 'en' ? 'Patient file deleted.' : 'Dossier patient supprimé.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Eliminar' : lang === 'en' ? 'Delete Error' : 'Erreur de Suppression',
        message: (err as Error).message,
      });
    } finally {
      setIsGlobalBusy(false);
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchFilter = filter === 'all' || a.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        a.patientName.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.service.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [appointments, filter, searchQuery]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'CONFIRMED').length;
    const pending = appointments.filter(a => a.status === 'PENDING').length;
    const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;
    const revenue = appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED')
      .reduce((sum, a) => sum + getServicePrice(a.service), 0);
    return { total, confirmed, pending, cancelled, completed, noShow, revenue };
  }, [appointments]);

  const analyticsData = useMemo(() => {
    const dowLabels =
      lang === 'fr'
        ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
        : lang === 'en'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const dowCounts = Array(7).fill(0);
    appointments.forEach(a => {
      const d = new Date(a.date + 'T12:00:00');
      const idx = (d.getDay() + 6) % 7;
      dowCounts[idx]++;
    });

    const svcMap: Record<string, number> = {};
    appointments.forEach(a => { svcMap[a.service] = (svcMap[a.service] ?? 0) + 1; });
    const topServices = Object.entries(svcMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const hourMap: Record<string, number> = {};
    appointments.forEach(a => { hourMap[a.startTime] = (hourMap[a.startTime] ?? 0) + 1; });
    const peakHours = Object.entries(hourMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const cancelRate = stats.total > 0
      ? Math.round(((stats.cancelled + stats.noShow) / stats.total) * 100)
      : 0;

    const completionRate = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

    return { dowLabels, dowCounts, topServices, peakHours, cancelRate, completionRate };
  }, [appointments, stats, lang]);

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const next7Days = useMemo(() => getNext7Days(), []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-hidden font-sans">
      {/* Activity Progress Bar */}
      <LuxuryProgressBar isLoading={isGlobalBusy || loadingAppointments || loadingSlots} />

      {/* Real-time Toast Notifications */}
      <LuxuryToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl text-center font-sans"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] flex items-center justify-center mx-auto">
                <IconAlertTriangle size={24} />
              </div>
              <h3 className="font-semibold text-base text-[#0F172A] leading-snug">
                {confirmDialog.title}
              </h3>
              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors touch-target"
                >
                  {lang === 'fr' ? 'Annuler' : lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-xs transition-colors touch-target"
                >
                  {lang === 'fr' ? 'Confirmer' : lang === 'en' ? 'Confirm' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <AdminHeader
        lang={lang}
        toggleLang={toggleLang}
        loadingAppointments={loadingAppointments || isGlobalBusy}
        isLive={isLiveConnected}
        onRefresh={() => fetchAppointments(false)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenMultipleSessions={() => setIsMultipleSessionsModalOpen(true)}
        onLogout={handleLogout}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
          totalAppointments={stats.total}
          totalNotes={Math.max(patientsList.length, patientNotes.length)}
          totalInvoices={invoices.length}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-8 bg-[#F8FAFC] space-y-4 sm:space-y-6 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {activeTab === 'appointments' && (
              <>
                <AdminKpiCards stats={stats} lang={lang} />
                <AppointmentsTab
                  lang={lang}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filter={filter}
                  setFilter={setFilter}
                  appointmentsError={appointmentsError}
                  loadingAppointments={loadingAppointments}
                  appointments={appointments}
                  filteredAppointments={filteredAppointments}
                  updateStatus={updateStatus}
                  setConfirmDialog={setConfirmDialog}
                  softDeleteAppointment={softDeleteAppointment}
                  openPatientNote={openPatientNote}
                  noShowCounts={noShowCounts}
                  recentNewIds={recentNewIds}
                />
              </>
            )}

            {activeTab === 'slots' && (
              <SlotsTab
                lang={lang}
                selectedDateForSlots={selectedDateForSlots}
                setSelectedDateForSlots={setSelectedDateForSlots}
                todayStr={todayStr}
                next7Days={next7Days}
                slotList={slotList}
                loadingSlots={loadingSlots}
                appointments={appointments}
                toggleSlot={toggleSlot}
                refreshSlots={(date) => {
                  delete slotCacheRef.current[date];
                  fetchSlots(date, true);
                }}
                onActionToast={addToast}
              />
            )}

            {activeTab === 'patients' && (
              <PatientNotesTab
                lang={lang}
                patientNotes={patientNotes}
                patientsList={patientsList}
                onRefreshPatients={() => {
                  fetchPatientNotes();
                  fetchAppointments(true);
                }}
                noteSearch={noteSearch}
                setNoteSearch={setNoteSearch}
                selectedNote={selectedNote}
                setSelectedNote={setSelectedNote}
                noteForm={noteForm}
                setNoteForm={setNoteForm}
                savingNote={savingNote}
                saveNote={saveNote}
                deleteNote={deleteNote}
                appointments={appointments}
                setConfirmDialog={setConfirmDialog}
                createDirectPatientNote={createDirectPatientNote}
                onActionToast={addToast}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesTab
                invoices={invoices}
                stats={invoiceStats}
                loading={loadingInvoices}
                onRefresh={fetchInvoices}
                onCreated={handleInvoiceCreated}
                onUpdateStatus={handleUpdateInvoiceStatus}
                onDelete={handleDeleteInvoice}
                patients={patientsList}
                appointments={appointments}
                lang={lang}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsTab
                lang={lang}
                stats={stats}
                analyticsData={analyticsData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <AdminMobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        totalAppointments={stats.total}
        totalNotes={Math.max(patientsList.length, patientNotes.length)}
        totalInvoices={invoices.length}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Add Appointment Modal / Bottom Sheet */}
      <AddAppointmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        lang={lang}
        newForm={newForm}
        setNewForm={setNewForm}
        addingError={addingError}
        addingLoading={addingLoading}
        onSubmit={handleCreateAppointment}
      />

      {/* Multiple Sessions Scheduling Modal */}
      <MultipleSessionsModal
        isOpen={isMultipleSessionsModalOpen}
        onClose={() => setIsMultipleSessionsModalOpen(false)}
        lang={lang}
        patientsList={patientsList}
        onActionToast={addToast}
        onSuccess={(created) => {
          if (Array.isArray(created)) {
            created.forEach(a => knownAppointmentIdsRef.current.add(a.id));
          }
          fetchAppointments(true);
          fetchPatientNotes();
          slotCacheRef.current = {};
        }}
      />

      {/* Global Command Palette (Ctrl+K / Cmd+K) */}
      <AdminCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        lang={lang}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appointments={appointments}
        patientsList={patientsList}
        patientNotes={patientNotes}
        invoices={invoices}
        onOpenNewAppointment={() => setIsAddModalOpen(true)}
        onOpenMultipleSessions={() => setIsMultipleSessionsModalOpen(true)}
        onOpenCreateInvoice={() => setIsCreateInvoiceFromPaletteOpen(true)}
        onSelectPatient={(patient) => {
          setActiveTab('patients');
          setNoteSearch(patient.patientName);
          const existing = patientNotes.find(n => phonesMatch(n.phone, patient.phone));
          if (existing) {
            setSelectedNote(existing);
            setNoteForm({ content: existing.content, tags: existing.tags });
          } else {
            setSelectedNote({
              phone: patient.phone,
              patientName: patient.patientName,
              tags: patient.pathologyTags || '',
              content: patient.medicalHistory || '',
              updatedAt: patient.updatedAt || new Date().toISOString(),
            });
            setNoteForm({ content: patient.medicalHistory || '', tags: patient.pathologyTags || '' });
          }
        }}
        onSelectAppointment={(appt) => {
          setActiveTab('appointments');
          setSearchQuery(appt.patientName);
        }}
        onRefresh={() => {
          fetchAppointments(false);
          fetchPatientNotes();
          fetchInvoices();
          fetchAdminMetadata();
        }}
        toggleLang={toggleLang}
        onLogout={handleLogout}
        onOpenHelpdesk={() => setIsHelpdeskOpen(true)}
      />

      {/* Direct Create Invoice Modal triggered from Command Palette */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceFromPaletteOpen}
        onClose={() => setIsCreateInvoiceFromPaletteOpen(false)}
        onCreated={(inv) => {
          handleInvoiceCreated(inv);
          setIsCreateInvoiceFromPaletteOpen(false);
        }}
        lang={lang}
        patients={patientsList}
        appointments={appointments}
      />

      {/* Clinic Tech Support & Emergency Helpdesk Drawer */}
      <ClinicHelpdeskDrawer
        isOpen={isHelpdeskOpen}
        onClose={() => setIsHelpdeskOpen(false)}
        lang={lang}
        activeTab={activeTab}
        isLiveConnected={isLiveConnected}
      />
    </div>
  );
}