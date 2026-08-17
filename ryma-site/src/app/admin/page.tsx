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
  getServicePrice,
  getNext7Days,
} from '@/types/admin';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminKpiCards } from '@/components/admin/AdminKpiCards';
import { AppointmentsTab } from '@/components/admin/AppointmentsTab';
import { SlotsTab } from '@/components/admin/SlotsTab';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { PatientNotesTab } from '@/components/admin/PatientNotesTab';
import { AddAppointmentModal } from '@/components/admin/AddAppointmentModal';
import { LuxuryToastContainer, LuxuryProgressBar, LuxuryToast } from '@/components/admin/LuxuryFeedback';

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: 'same-origin' });
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
  const [activeTab, setActiveTab] = useState<'appointments' | 'slots' | 'analytics' | 'patients'>('appointments');

  // ── State ──────────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);
  const [isGlobalBusy, setIsGlobalBusy] = useState(false);

  // Luxury Toasts Queue
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
    new Date().toISOString().split('T')[0]
  );
  const [slotList, setSlotList] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // In-memory slot cache & abort controller for zero-freeze, buttery-smooth switching
  const slotCacheRef = useRef<Record<string, SlotInfo[]>>({});
  const slotAbortRef = useRef<AbortController | null>(null);

  // Patient notes & structured EMR state
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [patientsList, setPatientsList] = useState<PatientRecord[]>([]);
  const [noShowCounts, setNoShowCounts] = useState<Record<string, number>>({});
  const [noteSearch, setNoteSearch] = useState('');

  // ── Fetch admin metadata (Backup & No-Show counts) ─────────────────────────
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

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    patientName: '',
    phone: '',
    email: '',
    service: SERVICES[0]?.slug ?? '',
    date: new Date().toISOString().split('T')[0],
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
    if (!isSilent) setLoadingAppointments(true);
    setAppointmentsError(null);
    try {
      const data = await apiFetch<{ appointments: Appointment[] }>('/api/admin/appointments');
      setAppointments(data.appointments);
    } catch (err) {
      if ((err as Error).message !== 'Session expirée') {
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
      if (!isSilent) setLoadingAppointments(false);
    }
  }, [lang]);

  // ── Fetch patient notes ────────────────────────────────────────────────────
  const fetchPatientNotes = useCallback(async () => {
    try {
      const data = await apiFetch<{ notes: PatientNote[]; patients: PatientRecord[] }>('/api/admin/patients');
      setPatientNotes(data.notes ?? []);
      setPatientsList(data.patients ?? []);
    } catch { /* silent */ }
  }, []);

  // ── Parallel Initial Loading & Silent Auto-Polling ──────────────────────────
  useEffect(() => {
    // Fire all initial requests in parallel
    Promise.all([fetchAppointments(false), fetchPatientNotes(), fetchAdminMetadata()]);

    const interval = setInterval(() => {
      fetchAppointments(true); // Silent background auto-refresh every 15s
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchPatientNotes, fetchAdminMetadata]);

  // ── Fast, Cached Slot Fetching ─────────────────────────────────────────────
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
    // 0ms Optimistic UI update: update local state instantly
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
    // 0ms Optimistic toggle: flip the available boolean instantly
    const prevList = slotList;
    setSlotList(prev => prev.map(s => s.time === time ? { ...s, available: !s.available } : s));
    setIsGlobalBusy(true);

    try {
      await apiFetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateForSlots, time }),
      });
      delete slotCacheRef.current[selectedDateForSlots];
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Horário Atualizado' : lang === 'en' ? 'Slot Updated' : 'Créneau Modifié',
        message: `${selectedDateForSlots} às ${time}`,
      });
    } catch (err) {
      setSlotList(prevList);
      addToast({
        type: 'error',
        title: lang === 'pt' ? 'Erro ao Alterar Horário' : lang === 'en' ? 'Slot Error' : 'Erreur Créneau',
        message: (err as Error).message,
      });
    } finally {
      setIsGlobalBusy(false);
    }
  };

  const softDeleteAppointment = async (id: string) => {
    // 0ms Optimistic removal
    const prevList = appointments;
    setAppointments(prev => prev.filter(a => a.id !== id));
    setIsGlobalBusy(true);

    try {
      await apiFetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
      slotCacheRef.current = {};
      addToast({
        type: 'success',
        title: lang === 'pt' ? 'Consulta Eliminada' : lang === 'en' ? 'Appointment Deleted' : 'Rendez-vous Supprimé',
        message: lang === 'pt' ? 'O registo foi removido com sucesso.' : lang === 'en' ? 'Record deleted successfully.' : 'Enregistrement supprimé.',
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
        date: new Date().toISOString().split('T')[0],
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
    const existing = patientNotes.find(n => n.phone === appt.phone);
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
        const filtered = prev.filter(n => n.phone !== phone);
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
        const filtered = prev.filter(n => n.phone !== selectedNote.phone);
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
      setPatientNotes(prev => prev.filter(n => n.phone !== phone));
      setPatientsList(prev => prev.filter(p => p.phone !== phone));
      if (selectedNote?.phone === phone) setSelectedNote(null);
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

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const next7Days = useMemo(() => getNext7Days(), []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#FAFAF8] text-[#202020] flex flex-col overflow-hidden font-sans">
      {/* Global Luxury Gold Activity Progress Bar */}
      <LuxuryProgressBar isLoading={isGlobalBusy || loadingAppointments || loadingSlots} />

      {/* Luxury Real-time Toast Notifications */}
      <LuxuryToastContainer toasts={toasts} onDismiss={dismissToast} />



      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E9E6DF] p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C6A15B] via-[#E8D7B0] to-[#C6A15B]" />
              <div className="w-12 h-12 rounded-2xl bg-[#A9655F]/10 text-[#A9655F] flex items-center justify-center mx-auto">
                <IconAlertTriangle size={24} />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#202020]">{confirmDialog.title}</h3>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-xs font-mono text-[#77736B] hover:text-[#202020] hover:bg-[#F4F2EE] transition-all"
                >
                  {lang === 'fr' ? 'Annuler' : lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#A9655F] hover:bg-[#8F534D] text-white text-xs font-mono font-bold shadow-md transition-all"
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
        onRefresh={() => fetchAppointments(false)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
          totalAppointments={stats.total}
          totalNotes={Math.max(patientsList.length, patientNotes.length)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FAFAF8] space-y-6">
          <AdminKpiCards stats={stats} lang={lang} />

          {activeTab === 'appointments' && (
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
            />
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
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              lang={lang}
              stats={stats}
              analyticsData={analyticsData}
            />
          )}

          {activeTab === 'patients' && (
            <PatientNotesTab
              lang={lang}
              patientNotes={patientNotes}
              patientsList={patientsList}
              onRefreshPatients={fetchPatientNotes}
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
        </main>
      </div>

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
    </div>
  );
}