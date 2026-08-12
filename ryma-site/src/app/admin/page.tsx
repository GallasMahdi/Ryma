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

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...opts, credentials: 'same-origin' });
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
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

  // Action feedback toasts
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    onConfirm: () => void;
  } | null>(null);

  // ── ⚡ Parallel Fast Initial Batch Load ────────────────────────────────────
  const initDashboard = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError(null);

    try {
      const [apptsData, patientsData, meData] = await Promise.all([
        apiFetch<{ appointments: Appointment[] }>('/api/admin/appointments'),
        apiFetch<{ notes: PatientNote[]; patients: PatientRecord[] }>('/api/admin/patients').catch(() => ({ notes: [], patients: [] })),
        apiFetch<{ authenticated: boolean; noShowCounts?: Record<string, number> }>('/api/admin/me').catch(() => ({ authenticated: true })),
      ]);

      if (apptsData.appointments) setAppointments(apptsData.appointments);
      if (patientsData.notes) setPatientNotes(patientsData.notes);
      if (patientsData.patients) setPatientsList(patientsData.patients);
      if (meData.noShowCounts) setNoShowCounts(meData.noShowCounts);
    } catch (err) {
      if ((err as Error).message !== 'Session expirée') {
        setAppointmentsError(lang === 'fr' ? 'Erreur de chargement des données' : 'خطأ في تحميل البيانات');
      }
    } finally {
      setLoadingAppointments(false);
    }
  }, [lang]);

  // ── ⚡ Silent Background Auto-Refresh (No Spinners or UI Flickers) ──────────
  const fetchAppointmentsSilent = useCallback(async () => {
    try {
      const data = await apiFetch<{ appointments: Appointment[] }>('/api/admin/appointments');
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } catch {
      /* Silent background catch */
    }
  }, []);

  useEffect(() => {
    initDashboard();
    // Background polling every 15s — silent update without page spinners
    const interval = setInterval(() => {
      fetchAppointmentsSilent();
    }, 15000);
    return () => clearInterval(interval);
  }, [initDashboard, fetchAppointmentsSilent]);

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

      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const slotsData = data.slots ?? [];
        slotCacheRef.current[date] = slotsData;
        setSlotList(slotsData);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        /* Silent catch */
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

  // ── Action helpers with 0ms Optimistic UI Updates ───────────────────────────
  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    // 0ms Optimistic UI Update: update list instantly in local memory
    const previousAppointments = appointments;
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a))
    );

    try {
      await apiFetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      slotCacheRef.current = {};
      showMsg('success', lang === 'fr' ? 'Statut mis à jour' : 'تم تحديث الحالة');
    } catch (err) {
      // Revert optimistic update on failure
      setAppointments(previousAppointments);
      showMsg('error', (err as Error).message);
    }
  };

  const softDeleteAppointment = async (id: string) => {
    // 0ms Optimistic UI Update: mark as CANCELLED instantly
    const previousAppointments = appointments;
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'CANCELLED' } : a))
    );

    try {
      await apiFetch(`/api/admin/appointments/${id}`, { method: 'DELETE' });
      slotCacheRef.current = {};
      showMsg('success', lang === 'fr' ? 'Rendez-vous annulé' : 'تم إلغاء الموعد');
    } catch (err) {
      setAppointments(previousAppointments);
      showMsg('error', (err as Error).message);
    }
  };

  const toggleSlot = async (date: string, time: string) => {
    // 0ms Optimistic UI Update: toggle slot state instantly in local memory
    setSlotList(prev =>
      prev.map(s => {
        if (s.time !== time) return s;
        const isBlocked = s.reason === 'blocked';
        return isBlocked
          ? { ...s, available: true, reason: null }
          : { ...s, available: false, reason: 'blocked' };
      })
    );

    try {
      await apiFetch('/api/admin/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time }),
      });
      delete slotCacheRef.current[date];
      showMsg('success', lang === 'fr' ? 'Créneau mis à jour' : 'تم تحديث التوقيت');
    } catch (err) {
      // Revert state on network error
      fetchSlots(date, true);
      showMsg('error', (err as Error).message);
    }
  };

  const handleBulkSlots = async (scope: 'day' | 'morning' | 'afternoon', action: 'block' | 'unblock') => {
    try {
      await apiFetch('/api/admin/slots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateForSlots, scope, action }),
      });
      delete slotCacheRef.current[selectedDateForSlots];
      fetchSlots(selectedDateForSlots, true);
      showMsg('success', lang === 'fr' ? 'Action groupée appliquée' : 'تم تطبيق الإجراء الجماعي');
    } catch (err) {
      showMsg('error', (err as Error).message);
    }
  };

  // ── Save patient note ──────────────────────────────────────────────────────
  const openPatientNote = (appt: Appointment) => {
    const note = patientNotes.find(n => n.phone === appt.phone) ?? {
      phone: appt.phone,
      patientName: appt.patientName,
      content: '',
      tags: '',
      updatedAt: '',
    };
    setSelectedNote(note);
    setNoteForm({ content: note.content, tags: note.tags });
  };

  const savePatientNote = async () => {
    if (!selectedNote) return;
    setSavingNote(true);
    try {
      const data = await apiFetch<{ patient: PatientRecord; note: PatientNote }>('/api/admin/patients', {
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
      setSelectedNote(null);
      showMsg('success', lang === 'fr' ? 'Fiche patient enregistrée' : 'تم حفظ ملف المريض');
    } catch (err) {
      showMsg('error', (err as Error).message);
    } finally {
      setSavingNote(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* silent */ }
    router.push('/admin/login');
  };

  // ── Create appointment via modal ───────────────────────────────────────────
  const handleCreateAppointment = async () => {
    setAddingLoading(true);
    setAddingError(null);
    try {
      const data = await apiFetch<{ appointment: Appointment }>('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });

      // Optimistically add to appointments list instantly
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
      showMsg('success', lang === 'fr' ? 'Rendez-vous créé' : 'تم إنشاء الموعد');
    } catch (err) {
      setAddingError((err as Error).message);
    } finally {
      setAddingLoading(false);
    }
  };

  // ── Memoized computations for ultra-fast UI renders ──────────────────────
  const filteredAppointments = useMemo(() => {
    return appointments.filter(item => {
      const matchFilter = filter === 'all' || item.status === filter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.patientName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.service.toLowerCase().includes(q) ||
        item.date.includes(q);
      return matchFilter && matchSearch;
    });
  }, [appointments, filter, searchQuery]);

  const kpis = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'PENDING').length;
    const confirmed = appointments.filter(a => a.status === 'CONFIRMED').length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;

    const totalRevenue = appointments
      .filter(a => a.status === 'CONFIRMED' || a.status === 'COMPLETED')
      .reduce((sum, a) => sum + getServicePrice(a.service), 0);

    return { total, pending, confirmed, completed, cancelled, totalRevenue };
  }, [appointments]);

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1A1412] font-sans antialiased">
      {/* Top Bar Navigation */}
      <AdminHeader
        lang={lang}
        toggleLang={toggleLang}
        handleLogout={handleLogout}
        setIsAddModalOpen={setIsAddModalOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar
          lang={lang}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          kpis={kpis}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto overflow-x-hidden">
          {/* Toast Notification */}
          <AnimatePresence>
            {actionMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg font-medium text-sm border flex items-center gap-2 ${
                  actionMsg.type === 'success'
                    ? 'bg-[#1C3A27] text-white border-[#2A5238]'
                    : 'bg-[#4A1818] text-white border-[#6B2424]'
                }`}
              >
                {actionMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Key Metric KPI Cards */}
          <AdminKpiCards
            lang={lang}
            kpis={kpis}
            setFilter={setFilter}
            setActiveTab={setActiveTab}
          />

          {/* Error Banner */}
          {appointmentsError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <IconAlertTriangle size={18} />
                <span>{appointmentsError}</span>
              </div>
              <button
                onClick={initDashboard}
                className="underline hover:text-red-900 font-semibold cursor-pointer"
              >
                {lang === 'fr' ? 'Réessayer' : 'إعادة المحاولة'}
              </button>
            </div>
          )}

          {/* Tabs View Manager */}
          {activeTab === 'appointments' && (
            <AppointmentsTab
              lang={lang}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filter={filter}
              setFilter={setFilter}
              appointmentsError={appointmentsError}
              loadingAppointments={loadingAppointments}
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
              slotList={slotList}
              loadingSlots={loadingSlots}
              toggleSlot={toggleSlot}
              handleBulkSlots={handleBulkSlots}
              getNext7Days={getNext7Days}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              lang={lang}
              appointments={appointments}
              kpis={kpis}
            />
          )}

          {activeTab === 'patients' && (
            <PatientNotesTab
              lang={lang}
              noteSearch={noteSearch}
              setNoteSearch={setNoteSearch}
              patientNotes={patientNotes}
              patientsList={patientsList}
              openPatientNote={openPatientNote}
              fetchPatientNotes={initDashboard}
            />
          )}
        </main>
      </div>

      {/* Add Appointment Modal */}
      <AddAppointmentModal
        lang={lang}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        newForm={newForm}
        setNewForm={setNewForm}
        addingLoading={addingLoading}
        addingError={addingError}
        handleCreateAppointment={handleCreateAppointment}
      />

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl max-w-md w-full border border-[#E8E2D8] shadow-xl text-center"
            >
              <h3 className="text-lg font-bold text-[#1A1412] mb-3">{confirmDialog.title}</h3>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#D4CEBE] text-[#6B6058] text-sm font-semibold hover:bg-[#FAFAF8] transition-colors"
                >
                  {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
                >
                  {lang === 'fr' ? 'Confirmer' : 'تأكيد'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Patient Note Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 md:p-8 rounded-3xl max-w-lg w-full border border-[#E8E2D8] shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1412]">{selectedNote.patientName}</h3>
                  <p className="text-xs text-[#8A8078] font-mono">{selectedNote.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="text-[#8A8078] hover:text-[#1A1412] text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#8A8078] uppercase mb-1">
                    {lang === 'fr' ? 'Tags / Pathologies' : 'وسوم / أمراض'}
                  </label>
                  <input
                    type="text"
                    value={noteForm.tags}
                    onChange={e => setNoteForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="Lombalgie, CNAM, Post-partum..."
                    className="w-full bg-[#FAFAF8] border border-[#E8E2D8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C49A3C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#8A8078] uppercase mb-1">
                    {lang === 'fr' ? 'Notes Médicales & Historique' : 'ملاحظات طبية وتاريخ المرض'}
                  </label>
                  <textarea
                    rows={4}
                    value={noteForm.content}
                    onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                    placeholder="Historique des séances, douleur EVA, particularités..."
                    className="w-full bg-[#FAFAF8] border border-[#E8E2D8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C49A3C] resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="px-5 py-2.5 rounded-xl border border-[#D4CEBE] text-[#6B6058] text-sm font-semibold hover:bg-[#FAFAF8] transition-colors"
                >
                  {lang === 'fr' ? 'Fermer' : 'إغلاق'}
                </button>
                <button
                  onClick={savePatientNote}
                  disabled={savingNote}
                  className="px-6 py-2.5 rounded-xl bg-[#C49A3C] text-white text-sm font-semibold hover:bg-[#9A7428] transition-colors shadow-sm"
                >
                  {savingNote ? '...' : lang === 'fr' ? 'Enregistrer' : 'حفظ'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}