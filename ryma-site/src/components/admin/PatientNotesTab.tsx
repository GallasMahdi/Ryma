'use client';

import React, { useState, useMemo } from 'react';
import {
  IconSearch,
  IconPhoneCall,
  IconBrandWhatsapp,
  IconTrash,
  IconPlus,
  IconFileText,
  IconActivity,
  IconChevronRight,
  IconUserPlus,
  IconPencil,
  IconShieldCheck,
  IconTag,
  IconArrowLeft,
  IconNotes,
} from '@tabler/icons-react';
import {
  PatientNote,
  PatientRecord,
  Appointment,
  getServiceName,
  getServicePrice,
} from '@/types/admin';
import { SERVICES } from '@/data/services';
import { Lang } from '@/lib/i18n';
import { ResponsiveModal } from './ResponsiveModal';

interface PatientNotesTabProps {
  lang: Lang;
  patientNotes: PatientNote[];
  patientsList?: PatientRecord[];
  onRefreshPatients?: () => void;
  noteSearch: string;
  setNoteSearch: (s: string) => void;
  selectedNote: PatientNote | null;
  setSelectedNote: (n: PatientNote | null) => void;
  noteForm: { content: string; tags: string };
  setNoteForm: React.Dispatch<React.SetStateAction<{ content: string; tags: string }>>;
  savingNote: boolean;
  saveNote: () => void;
  deleteNote: (phone: string) => void;
  appointments: Appointment[];
  setConfirmDialog: (dlg: { title: string; onConfirm: () => void } | null) => void;
  createDirectPatientNote?: (phone: string, patientName: string, tags?: string, content?: string) => Promise<PatientNote | null>;
  onActionToast?: (toast: { type: 'success' | 'error' | 'info' | 'loading'; title: string; message?: string }) => void;
}

export function PatientNotesTab({
  lang,
  patientNotes,
  patientsList = [],
  onRefreshPatients,
  noteSearch,
  setNoteSearch,
  selectedNote,
  setSelectedNote,
  noteForm,
  setNoteForm,
  savingNote,
  saveNote,
  deleteNote,
  appointments,
  setConfirmDialog,
  createDirectPatientNote,
  onActionToast,
}: PatientNotesTabProps) {
  const txt = (frStr: string, enStr: string, ptStr: string) => {
    if (lang === 'fr') return frStr;
    if (lang === 'en') return enStr;
    return ptStr;
  };

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'overview' | 'timeline' | 'eva' | 'notes'>('overview');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newPatientForm, setNewPatientForm] = useState({
    patientName: '',
    phone: '',
    email: '',
    gender: 'F',
    dob: '',
    coverageType: 'PARTICULAR' as 'PARTICULAR' | 'INSURANCE' | 'ADSE' | 'OTHER',
    coverageProvider: '',
    coverageNumber: '',
    referringDoctor: '',
    pathologyTags: '',
    medicalHistory: '',
    totalPrescribedSessions: 10,
  });

  const [editPatientForm, setEditPatientForm] = useState({
    id: '',
    patientName: '',
    phone: '',
    email: '',
    gender: 'F',
    dob: '',
    coverageType: 'PARTICULAR' as 'PARTICULAR' | 'INSURANCE' | 'ADSE' | 'OTHER',
    coverageProvider: '',
    coverageNumber: '',
    referringDoctor: '',
    pathologyTags: '',
    medicalHistory: '',
    totalPrescribedSessionsStr: '10',
  });

  const [sessionForm, setSessionForm] = useState<{
    date: string;
    time: string;
    serviceSlug: string;
    evaPainScore: number;
    sessionType: 'ONLINE' | 'MANUAL' | 'PAPER';
    notes: string;
    practitioner: string;
  }>({
    date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    time: '10:00',
    serviceSlug: SERVICES[0]?.slug ?? 'kinesitherapie-generale',
    evaPainScore: 5,
    sessionType: 'MANUAL',
    notes: '',
    practitioner: 'Digital Clínica',
  });

  const allPatientsList = useMemo(() => {
    const map = new Map<string, PatientRecord>();
    patientsList.forEach(p => map.set(p.phone, p));

    patientNotes.forEach(n => {
      if (!map.has(n.phone)) {
        map.set(n.phone, {
          id: 'legacy_' + n.phone,
          patientName: n.patientName,
          phone: n.phone,
          pathologyTags: n.tags,
          medicalHistory: n.content,
          totalPrescribedSessions: 10,
          createdAt: n.updatedAt,
          updatedAt: n.updatedAt,
          sessions: [],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [patientsList, patientNotes]);

  const activePatient = useMemo<PatientRecord | null>(() => {
    if (selectedPatientId) {
      const foundById = patientsList.find(p => p.id === selectedPatientId);
      if (foundById) return foundById;

      const phoneFromLegacy = selectedPatientId.startsWith('legacy_')
        ? selectedPatientId.replace('legacy_', '')
        : null;
      if (phoneFromLegacy) {
        const foundByPhone = patientsList.find(p => p.phone === phoneFromLegacy);
        if (foundByPhone) return foundByPhone;
      }
    }
    if (selectedNote) {
      const foundByPhone = patientsList.find(p => p.phone === selectedNote.phone);
      if (foundByPhone) return foundByPhone;

      return {
        id: 'legacy_' + selectedNote.phone,
        patientName: selectedNote.patientName,
        phone: selectedNote.phone,
        pathologyTags: selectedNote.tags,
        medicalHistory: selectedNote.content,
        totalPrescribedSessions: 10,
        createdAt: selectedNote.updatedAt,
        updatedAt: selectedNote.updatedAt,
        sessions: [],
      };
    }
    return allPatientsList[0] ?? null;
  }, [selectedPatientId, selectedNote, patientsList, allPatientsList]);

  const filteredPatients = useMemo(() => {
    const q = noteSearch.toLowerCase().trim();
    if (!q) return allPatientsList;
    return allPatientsList.filter(
      p =>
        p.patientName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.pathologyTags.toLowerCase().includes(q) ||
        (p.referringDoctor && p.referringDoctor.toLowerCase().includes(q))
    );
  }, [allPatientsList, noteSearch]);

  const combinedTimeline = useMemo(() => {
    if (!activePatient) return [];

    const list: Array<{
      id: string;
      date: string;
      time: string;
      source: 'online' | 'manual' | 'paper';
      title: string;
      status?: string;
      notes?: string;
      evaPainScore?: number;
      price?: number;
      practitioner?: string;
    }> = [];

    const online = appointments.filter(a => a.phone === activePatient.phone);
    online.forEach(a => {
      list.push({
        id: a.id,
        date: a.date,
        time: a.startTime,
        source: 'online',
        title: getServiceName(a.service, lang),
        status: a.status,
        notes: a.notes ?? undefined,
        price: getServicePrice(a.service),
      });
    });

    if (activePatient.sessions) {
      activePatient.sessions.forEach(s => {
        list.push({
          id: s.id,
          date: s.date,
          time: s.time ?? '10:00',
          source: s.sessionType === 'PAPER' ? 'paper' : 'manual',
          title: getServiceName(s.serviceSlug, lang),
          notes: s.notes ?? undefined,
          evaPainScore: s.evaPainScore,
          practitioner: s.practitioner ?? undefined,
        });
      });
    }

    return list.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [activePatient, appointments, lang]);

  const evaAnalytics = useMemo(() => {
    if (!activePatient?.sessions || activePatient.sessions.length === 0) return null;
    const scores = activePatient.sessions
      .map(s => s.evaPainScore)
      .filter((s): s is number => typeof s === 'number');
    if (scores.length === 0) return null;

    const current = scores[0];
    const initial = scores[scores.length - 1];
    const diff = initial - current;
    return { current, initial, diff };
  }, [activePatient]);

  const handleSelectPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
    setIsMobileDetailOpen(true);
    const foundNote = patientNotes.find(n => n.phone === p.phone);
    if (foundNote) {
      setSelectedNote(foundNote);
      setNoteForm({ content: foundNote.content, tags: foundNote.tags });
    } else {
      setSelectedNote({
        phone: p.phone,
        patientName: p.patientName,
        content: p.medicalHistory ?? '',
        tags: p.pathologyTags ?? '',
        updatedAt: p.updatedAt,
      });
      setNoteForm({ content: p.medicalHistory ?? '', tags: p.pathologyTags ?? '' });
    }
  };

  const openEditPatientModal = (p: PatientRecord) => {
    const cleanId = p.id.startsWith('legacy_') ? undefined : p.id;
    setEditPatientForm({
      id: cleanId ?? '',
      patientName: p.patientName,
      phone: p.phone,
      email: p.email ?? '',
      gender: p.gender ?? 'F',
      dob: p.dob ?? '',
      coverageType: p.coverageType ?? 'PARTICULAR',
      coverageProvider: p.coverageProvider ?? '',
      coverageNumber: p.coverageNumber ?? '',
      referringDoctor: p.referringDoctor ?? '',
      pathologyTags: p.pathologyTags ?? '',
      medicalHistory: p.medicalHistory ?? '',
      totalPrescribedSessionsStr: String(p.totalPrescribedSessions || 10),
    });
    setIsEditPatientModalOpen(true);
  };

  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const parsedSessions = parseInt(editPatientForm.totalPrescribedSessionsStr, 10);
    const totalPrescribedSessions = !isNaN(parsedSessions) && parsedSessions > 0 ? parsedSessions : 10;
    try {
      const payload = {
        id: editPatientForm.id || undefined,
        patientName: editPatientForm.patientName,
        phone: editPatientForm.phone,
        email: editPatientForm.email,
        gender: editPatientForm.gender,
        dob: editPatientForm.dob,
        coverageType: editPatientForm.coverageType,
        coverageProvider: editPatientForm.coverageProvider,
        coverageNumber: editPatientForm.coverageNumber,
        referringDoctor: editPatientForm.referringDoctor,
        pathologyTags: editPatientForm.pathologyTags,
        medicalHistory: editPatientForm.medicalHistory,
        totalPrescribedSessions,
      };
      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patient?.id) {
          setSelectedPatientId(data.patient.id);
        }
        if (onRefreshPatients) onRefreshPatients();
        setIsEditPatientModalOpen(false);
        if (onActionToast) {
          onActionToast({
            type: 'success',
            title: txt('Fiche modifiée', 'File updated', 'Ficha atualizada'),
            message: editPatientForm.patientName,
          });
        }
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const updatePrescribedTarget = async (delta: number) => {
    if (!activePatient) return;
    const currentTarget = activePatient.totalPrescribedSessions || 10;
    const newTarget = Math.max(1, currentTarget + delta);
    const cleanId = activePatient.id.startsWith('legacy_') ? undefined : activePatient.id;

    try {
      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          patientName: activePatient.patientName,
          phone: activePatient.phone,
          email: activePatient.email,
          gender: activePatient.gender,
          dob: activePatient.dob,
          coverageType: activePatient.coverageType ?? 'PARTICULAR',
          coverageProvider: activePatient.coverageProvider,
          coverageNumber: activePatient.coverageNumber,
          referringDoctor: activePatient.referringDoctor,
          pathologyTags: activePatient.pathologyTags,
          medicalHistory: activePatient.medicalHistory,
          totalPrescribedSessions: newTarget,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patient?.id) {
          setSelectedPatientId(data.patient.id);
        }
        if (onRefreshPatients) onRefreshPatients();
        if (onActionToast) {
          onActionToast({
            type: 'success',
            title: txt('Prescription mise à jour', 'Prescription updated', 'Prescrição atualizada'),
            message: `${newTarget} ${txt('séances prescrites', 'prescribed sessions', 'sessões prescritas')}`,
          });
        }
      }
    } catch {
      /* silent */
    }
  };

  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.patientName || !newPatientForm.phone) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientForm),
      });

      if (res.ok) {
        const data = await res.json();
        if (onRefreshPatients) onRefreshPatients();
        if (data.patient) handleSelectPatient(data.patient);
        setIsNewPatientModalOpen(false);
        if (onActionToast) {
          onActionToast({
            type: 'success',
            title: txt('Nouveau dossier patient', 'Patient file created', 'Ficha criada'),
            message: newPatientForm.patientName,
          });
        }
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
      setNewPatientForm({
        patientName: '', phone: '', email: '', gender: 'F', dob: '',
        coverageType: 'PARTICULAR', coverageProvider: '', coverageNumber: '', referringDoctor: '',
        pathologyTags: '', medicalHistory: '', totalPrescribedSessions: 10,
      });
    }
  };

  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setSubmitting(true);

    try {
      let patientId = activePatient.id;

      if (patientId.startsWith('legacy_')) {
        const upsertRes = await fetch('/api/admin/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: activePatient.patientName,
            phone: activePatient.phone,
            email: activePatient.email,
            gender: activePatient.gender,
            dob: activePatient.dob,
            coverageType: activePatient.coverageType ?? 'PARTICULAR',
            coverageProvider: activePatient.coverageProvider,
            coverageNumber: activePatient.coverageNumber,
            referringDoctor: activePatient.referringDoctor,
            pathologyTags: activePatient.pathologyTags,
            medicalHistory: activePatient.medicalHistory,
            totalPrescribedSessions: activePatient.totalPrescribedSessions ?? 10,
          }),
        });
        if (!upsertRes.ok) return;
        const upsertData = await upsertRes.json();
        patientId = upsertData.patient?.id ?? patientId;
        if (upsertData.patient?.id) setSelectedPatientId(upsertData.patient.id);
      }

      const res = await fetch(`/api/admin/patients/${patientId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm),
      });

      if (res.ok) {
        if (onRefreshPatients) onRefreshPatients();
        setIsAddSessionModalOpen(false);
        if (onActionToast) {
          onActionToast({
            type: 'success',
            title: txt('Séance enregistrée', 'Session recorded', 'Sessão registada'),
            message: `${sessionForm.date} • EVA: ${sessionForm.evaPainScore}/10`,
          });
        }
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = (patient: PatientRecord) => {
    setConfirmDialog({
      title: txt(`Supprimer définitivement le dossier de ${patient.patientName} ?`, `Permanently delete record for ${patient.patientName}?`, `Eliminar ficha de ${patient.patientName}?`),
      onConfirm: async () => {
        const idParam = patient.id.startsWith('legacy_') ? '' : `id=${patient.id}&`;
        await fetch(`/api/admin/patients?${idParam}phone=${encodeURIComponent(patient.phone)}`, {
          method: 'DELETE',
        });
        deleteNote(patient.phone);
        if (onRefreshPatients) onRefreshPatients();
        setSelectedPatientId(null);
        setIsMobileDetailOpen(false);
      },
    });
  };

  const completedSessionsCount = activePatient?.sessions?.length ?? 0;
  const targetSessions = activePatient?.totalPrescribedSessions || 10;
  const prescriptionPercent = Math.min(100, Math.round((completedSessionsCount / targetSessions) * 100));

  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <h2 className="font-semibold text-base sm:text-lg text-[#0F172A]">
            {txt('Dossiers Médicaux & EMR Patients', 'Clinical Files & Patient Records', 'Processos Clínicos & Fichas')}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            {txt('Historique clinique, prescriptions, séances et échelle EVA', 'Medical history, prescription tracking and pain scale', 'Histórico clínico e evolução da dor')}
          </p>
        </div>

        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold shadow-xs transition-colors touch-target shrink-0"
        >
          <IconUserPlus size={16} />
          <span>{txt('Nouveau Patient', 'New Patient', 'Novo Utente')}</span>
        </button>
      </div>

      {/* Main Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Patient Master List */}
        <div
          className={`lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 flex flex-col min-h-[500px] lg:h-[750px] shadow-xs ${
            isMobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="relative mb-3">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input
              type="text"
              value={noteSearch}
              onChange={e => setNoteSearch(e.target.value)}
              placeholder={txt('Rechercher patient, téléphone...', 'Search patient, phone...', 'Pesquisar utente...')}
              className="w-full pl-10 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="flex justify-between items-center px-1 mb-2 text-xs text-[#64748B]">
            <span>{txt('Dossiers enregistrés', 'Registered Records', 'Fichas Registadas')}</span>
            <span className="font-semibold text-[#0F172A]">{filteredPatients.length}</span>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-[#64748B] text-xs">
                {txt('Aucun dossier trouvé', 'No records found', 'Nenhuma ficha encontrada')}
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = activePatient?.phone === p.phone;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between group touch-target ${
                      isSelected
                        ? 'bg-[#F8FAFC] border-[#0F172A] shadow-xs'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0 border ${
                          isSelected
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                        }`}
                      >
                        {p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-[#0F172A] truncate">
                          {p.patientName}
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <span>{p.phone}</span>
                          {p.coverageType && p.coverageType !== 'PARTICULAR' && (
                            <span className="bg-[#DCFCE7] text-[#166534] px-1.5 py-0.2 rounded text-[10px] font-medium">
                              {p.coverageType === 'ADSE' ? 'ADSE' : (p.coverageProvider || 'Mutuelle')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <IconChevronRight
                      size={15}
                      className={`shrink-0 ${isSelected ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Patient Detail Dossier View */}
        <div
          className={`lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 flex flex-col min-h-[500px] lg:h-[750px] shadow-xs overflow-hidden ${
            !isMobileDetailOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activePatient ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Mobile Back Button */}
              <div className="lg:hidden pb-1 border-b border-[#E2E8F0]">
                <button
                  onClick={() => setIsMobileDetailOpen(false)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] py-1 touch-target"
                >
                  <IconArrowLeft size={16} />
                  <span>{txt('← Retour à la liste des patients', '← Back to patient list', '← Voltar à lista de doentes')}</span>
                </button>
              </div>

              {/* Patient Identity Banner */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {activePatient.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-semibold text-base text-[#0F172A] truncate">
                        {activePatient.patientName}
                      </h3>
                      {activePatient.coverageType && activePatient.coverageType !== 'PARTICULAR' && (
                        <span className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                          <IconShieldCheck size={12} />
                          <span>
                            {activePatient.coverageType === 'ADSE' ? 'ADSE' : (activePatient.coverageProvider || txt('Mutuelle', 'Insurance', 'Seguro'))}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-3 mt-1">
                      <span>📞 {activePatient.phone}</span>
                      {activePatient.referringDoctor && (
                        <span>🩺 Dr. {activePatient.referringDoctor}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                  <button
                    onClick={() => openEditPatientModal(activePatient)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] text-xs font-medium transition-colors touch-target flex items-center gap-1"
                    title={txt('Modifier', 'Edit', 'Editar')}
                  >
                    <IconPencil size={14} className="text-[#64748B]" />
                    <span>{txt('Modifier', 'Edit', 'Editar')}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activePatient.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7] transition-colors border border-[#DCFCE7] touch-target flex items-center justify-center"
                    title="WhatsApp"
                  >
                    <IconBrandWhatsapp size={16} />
                  </a>

                  <a
                    href={`tel:${activePatient.phone}`}
                    className="p-2 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors touch-target flex items-center justify-center"
                    title={txt('Appeler', 'Call', 'Ligar')}
                  >
                    <IconPhoneCall size={16} />
                  </a>

                  <button
                    onClick={() => handleDeletePatient(activePatient)}
                    className="p-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors touch-target flex items-center justify-center"
                    title={txt('Supprimer Dossier', 'Delete File', 'Eliminar Ficha')}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              {/* Prescription Progress Tracker Bar */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                    <IconActivity size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-[#475569] flex items-center gap-2">
                      <span>{txt('Prescription Médicale :', 'Prescription :', 'Prescrição Médica :')}</span>
                      <div className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]">
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(-1)}
                          className="w-4 h-4 rounded text-[#64748B] hover:text-[#0F172A] font-bold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-[#0F172A] px-1">
                          {targetSessions}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(1)}
                          className="w-4 h-4 rounded text-[#64748B] hover:text-[#0F172A] font-bold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                      <span>{txt('séances', 'sessions', 'sessões')}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-36 sm:w-48 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div
                          className="h-full bg-[#0F172A] rounded-full transition-all duration-300"
                          style={{ width: `${prescriptionPercent}%` }}
                        />
                      </div>
                      <span className="font-semibold text-xs text-[#0F172A]">
                        {completedSessionsCount} / {targetSessions} ({prescriptionPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium transition-colors shadow-xs touch-target flex items-center justify-center gap-1.5 self-stretch sm:self-auto"
                >
                  <IconPlus size={14} />
                  <span>{txt('Enregistrer Séance', 'Log Session', 'Registar Sessão')}</span>
                </button>
              </div>

              {/* Dossier Tabs */}
              <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] pb-1 overflow-x-auto no-scrollbar text-xs shrink-0">
                {[
                  { id: 'overview', label: txt('Aperçu & Clinique', 'Overview & Clinic', 'Visão Geral') },
                  { id: 'timeline', label: txt(`Historique (${combinedTimeline.length})`, `History (${combinedTimeline.length})`, `Histórico (${combinedTimeline.length})`) },
                  { id: 'eva', label: txt('Échelle EVA & Douleur', 'EVA Pain Scale', 'Escala EVA') },
                  { id: 'notes', label: txt('Notes Libres', 'Free Notes', 'Notas Clínicas') },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveDossierTab(t.id as typeof activeDossierTab)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap touch-target ${
                      activeDossierTab === t.id
                        ? 'bg-[#0F172A] text-white font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                {activeDossierTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Pathologies & Tags */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl space-y-2">
                      <div className="text-[11px] font-semibold uppercase text-[#64748B] flex items-center gap-1.5">
                        <IconTag size={14} className="text-[#64748B]" />
                        <span>{txt('Pathologies & Diagnostic', 'Pathologies & Diagnosis', 'Patologias & Diagnóstico')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePatient.pathologyTags ? (
                          activePatient.pathologyTags.split(',').map((t, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-white border border-[#E2E8F0] text-xs font-medium text-[#0F172A]"
                            >
                              {t.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#64748B] italic">
                            {txt('Aucun diagnostic renseigné', 'No diagnosis specified', 'Sem diagnóstico')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Medical History */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl space-y-2">
                      <div className="text-[11px] font-semibold uppercase text-[#64748B] flex items-center gap-1.5">
                        <IconFileText size={14} className="text-[#64748B]" />
                        <span>{txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}</span>
                      </div>
                      <p className="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap font-sans">
                        {activePatient.medicalHistory || txt('Aucune observation clinique pour le moment.', 'No clinical observations yet.', 'Sem observações clínicas.')}
                      </p>
                    </div>

                    {/* EVA Evolution Snapshot */}
                    {evaAnalytics && (
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-semibold uppercase text-[#64748B]">
                            {txt('Évolution de la douleur (EVA)', 'Pain Score Progression (EVA)', 'Evolução da Dor (EVA)')}
                          </div>
                          <div className="font-semibold text-sm text-[#0F172A] mt-0.5">
                            {txt('Score Initial :', 'Initial :', 'Inicial :')} {evaAnalytics.initial}/10 → {txt('Actuel :', 'Current :', 'Atual :')} {evaAnalytics.current}/10
                          </div>
                        </div>
                        <div
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            evaAnalytics.diff > 0
                              ? 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                              : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                          }`}
                        >
                          {evaAnalytics.diff > 0 ? `-${evaAnalytics.diff} pts (${txt('Amélioration', 'Improvement', 'Melhoria')})` : txt('Stable', 'Stable', 'Estável')}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeDossierTab === 'timeline' && (
                  <div className="space-y-2.5">
                    {combinedTimeline.length === 0 ? (
                      <div className="text-center py-12 text-[#64748B] text-xs">
                        {txt('Aucune séance enregistrée pour ce patient', 'No recorded sessions for this patient', 'Sem sessões registadas')}
                      </div>
                    ) : (
                      combinedTimeline.map(item => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-[#0F172A]">{item.date}</span>
                              <span className="text-[#64748B]">{item.time}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  item.source === 'online'
                                    ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]'
                                    : item.source === 'paper'
                                    ? 'bg-[#FEF9C3] text-[#854D0E] border border-[#FEF08A]'
                                    : 'bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]'
                                }`}
                              >
                                {item.source === 'online'
                                  ? txt('En ligne', 'Online', 'Online')
                                  : item.source === 'paper'
                                  ? txt('Ordonnance papier', 'Paper Rx', 'Papel')
                                  : txt('Cabinet', 'Clinic', 'Presencial')}
                              </span>
                            </div>

                            {item.evaPainScore !== undefined && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-[#0F172A] border border-[#E2E8F0]">
                                EVA: {item.evaPainScore}/10
                              </span>
                            )}
                          </div>

                          <div className="font-medium text-xs text-[#0F172A]">
                            {item.title}
                          </div>

                          {item.notes && (
                            <p className="text-xs text-[#64748B] bg-white p-2 rounded-lg border border-[#E2E8F0]">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeDossierTab === 'eva' && (
                  <div className="space-y-4">
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl space-y-3">
                      <h4 className="font-semibold text-sm text-[#0F172A]">
                        {txt('Échelle Visuelle Analogique (EVA 0 – 10)', 'Visual Analog Scale (EVA 0 – 10)', 'Escala Visual Analógica (EVA 0 – 10)')}
                      </h4>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {txt(
                          'L’évaluation de la douleur permet d’ajuster le protocole de rééducation au fur et à mesure des séances.',
                          'Pain scale tracking allows fine-tuning rehabilitation protocols session by session.',
                          'A monitorização da dor permite ajustar o protocolo de reabilitação.'
                        )}
                      </p>

                      {activePatient.sessions && activePatient.sessions.length > 0 ? (
                        <div className="space-y-2 pt-2">
                          {activePatient.sessions.map((s, idx) => (
                            <div
                              key={s.id}
                              className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-3"
                            >
                              <div className="text-xs">
                                <span className="font-semibold text-[#0F172A]">{s.date}</span>
                                <span className="text-[#64748B] ml-2">{getServiceName(s.serviceSlug, lang)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      s.evaPainScore >= 7
                                        ? 'bg-[#EF4444]'
                                        : s.evaPainScore >= 4
                                        ? 'bg-[#F59E0B]'
                                        : 'bg-[#22C55E]'
                                    }`}
                                    style={{ width: `${s.evaPainScore * 10}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-xs text-[#0F172A] w-10 text-right">
                                  {s.evaPainScore}/10
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-[#64748B]">
                          {txt('Aucune note EVA enregistrée pour l’instant', 'No EVA score recorded yet', 'Sem notas EVA registadas')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeDossierTab === 'notes' && (
                  <div className="space-y-3">
                    <textarea
                      rows={8}
                      value={noteForm.content}
                      onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                      placeholder={txt('Rédigez vos notes de suivi clinique...', 'Write your clinical session notes...', 'Escreva as notas de evolução clínica...')}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-xs font-sans text-[#0F172A] focus:outline-none focus:border-[#2563EB] transition-colors"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={saveNote}
                        disabled={savingNote}
                        className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs transition-colors shadow-xs touch-target"
                      >
                        {savingNote ? txt('Enregistrement...', 'Saving...', 'A guardar...') : txt('Sauvegarder les Notes', 'Save Notes', 'Guardar Ficha')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#64748B] space-y-2">
              <IconNotes size={40} className="text-[#CBD5E1]" />
              <h3 className="font-semibold text-base text-[#0F172A]">
                {txt('Sélectionnez un patient', 'Select a patient', 'Selecione um utente')}
              </h3>
              <p className="text-xs max-w-xs">
                {txt('Choisissez une fiche patient dans la colonne de gauche pour consulter son dossier complet.', 'Pick a patient record to view their full EMR file.', 'Escolha uma ficha para consultar o processo completo.')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Patient Modal */}
      <ResponsiveModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        title={txt('Nouveau Patient', 'New Patient Record', 'Nova Ficha de Utente')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreatePatientSubmit} className="space-y-3.5 font-sans text-xs">
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Nom Complet *', 'Full Name *', 'Nome Completo *')}
            </label>
            <input
              type="text"
              required
              value={newPatientForm.patientName}
              onChange={e => setNewPatientForm(p => ({ ...p, patientName: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Téléphone *', 'Phone *', 'Telefone *')}
              </label>
              <input
                type="tel"
                required
                value={newPatientForm.phone}
                onChange={e => setNewPatientForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="font-medium text-[#475569] block mb-1">Email</label>
              <input
                type="email"
                value={newPatientForm.email}
                onChange={e => setNewPatientForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Séances prescrites', 'Prescribed Sessions', 'Sessões prescritas')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newPatientForm.totalPrescribedSessions}
                onChange={e => setNewPatientForm(p => ({ ...p, totalPrescribedSessions: Number(e.target.value) }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Médecin prescripteur', 'Referring Doctor', 'Médico Prescritor')}
              </label>
              <input
                type="text"
                value={newPatientForm.referringDoctor}
                onChange={e => setNewPatientForm(p => ({ ...p, referringDoctor: e.target.value }))}
                placeholder="Dr. Dupont"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Pathologies / Tags (séparés par virgule)', 'Pathologies (comma separated)', 'Patologias')}
            </label>
            <input
              type="text"
              value={newPatientForm.pathologyTags}
              onChange={e => setNewPatientForm(p => ({ ...p, pathologyTags: e.target.value }))}
              placeholder="Lombalgie, Cervicalgie..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}
            </label>
            <textarea
              rows={3}
              value={newPatientForm.medicalHistory}
              onChange={e => setNewPatientForm(p => ({ ...p, medicalHistory: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsNewPatientModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium disabled:opacity-50"
            >
              {submitting ? txt('Création...', 'Creating...', 'A criar...') : txt('Créer la Fiche', 'Create Record', 'Criar Ficha')}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Edit Patient Modal */}
      <ResponsiveModal
        isOpen={isEditPatientModalOpen}
        onClose={() => setIsEditPatientModalOpen(false)}
        title={txt('Modifier le Patient', 'Edit Patient', 'Editar Utente')}
        maxWidth="lg"
      >
        <form onSubmit={handleEditPatientSubmit} className="space-y-3.5 font-sans text-xs">
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Nom Complet *', 'Full Name *', 'Nome Completo *')}
            </label>
            <input
              type="text"
              required
              value={editPatientForm.patientName}
              onChange={e => setEditPatientForm(p => ({ ...p, patientName: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Téléphone *', 'Phone *', 'Telefone *')}
              </label>
              <input
                type="tel"
                required
                value={editPatientForm.phone}
                onChange={e => setEditPatientForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="font-medium text-[#475569] block mb-1">Email</label>
              <input
                type="email"
                value={editPatientForm.email}
                onChange={e => setEditPatientForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Séances prescrites', 'Prescribed Sessions', 'Sessões prescritas')}
              </label>
              <input
                type="text"
                value={editPatientForm.totalPrescribedSessionsStr}
                onChange={e => setEditPatientForm(p => ({ ...p, totalPrescribedSessionsStr: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Médecin prescripteur', 'Referring Doctor', 'Médico Prescritor')}
              </label>
              <input
                type="text"
                value={editPatientForm.referringDoctor}
                onChange={e => setEditPatientForm(p => ({ ...p, referringDoctor: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Pathologies / Tags', 'Pathologies / Tags', 'Patologias')}
            </label>
            <input
              type="text"
              value={editPatientForm.pathologyTags}
              onChange={e => setEditPatientForm(p => ({ ...p, pathologyTags: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}
            </label>
            <textarea
              rows={3}
              value={editPatientForm.medicalHistory}
              onChange={e => setEditPatientForm(p => ({ ...p, medicalHistory: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsEditPatientModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium disabled:opacity-50"
            >
              {submitting ? txt('Enregistrement...', 'Saving...', 'A guardar...') : txt('Sauvegarder', 'Save', 'Guardar')}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Add Session Modal */}
      <ResponsiveModal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        title={txt('Enregistrer une Séance de Soin', 'Log Clinical Session', 'Registar Sessão de Tratamento')}
        subtitle={activePatient ? activePatient.patientName : ''}
        maxWidth="md"
      >
        <form onSubmit={handleAddSessionSubmit} className="space-y-3.5 font-sans text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Date *', 'Date *', 'Data *')}
              </label>
              <input
                type="date"
                required
                value={sessionForm.date}
                onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="font-medium text-[#475569] block mb-1">
                {txt('Heure', 'Time', 'Hora')}
              </label>
              <input
                type="time"
                value={sessionForm.time}
                onChange={e => setSessionForm(p => ({ ...p, time: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Soin dispensé *', 'Treatment *', 'Tratamento *')}
            </label>
            <select
              value={sessionForm.serviceSlug}
              onChange={e => setSessionForm(p => ({ ...p, serviceSlug: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            >
              {SERVICES.map(s => (
                <option key={s.slug} value={s.slug}>
                  {s.name[lang] || s.name.pt || s.name.fr}
                </option>
              ))}
            </select>
          </div>

          {/* EVA Slider */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-[#0F172A] text-xs">
                {txt('Échelle de douleur EVA (0 – 10)', 'EVA Pain Score (0 – 10)', 'Escala EVA (0 – 10)')}
              </label>
              <span className="font-bold text-xs text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                {sessionForm.evaPainScore} / 10
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={sessionForm.evaPainScore}
              onChange={e => setSessionForm(p => ({ ...p, evaPainScore: Number(e.target.value) }))}
              className="w-full accent-[#0F172A]"
            />
            <div className="flex justify-between text-[10px] text-[#64748B]">
              <span>0 (Aucune douleur)</span>
              <span>5 (Modérée)</span>
              <span>10 (Intolérable)</span>
            </div>
          </div>

          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Notes cliniques de séance', 'Session clinical notes', 'Notas clínicas')}
            </label>
            <textarea
              rows={3}
              value={sessionForm.notes}
              onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
              placeholder={txt('Ex: mobilisation passive, étirements, cryothérapie...', 'E.g. passive mobilization, cryo...', 'Ex: mobilização articular...')}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg p-2.5 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsAddSessionModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium disabled:opacity-50"
            >
              {submitting ? txt('Enregistrement...', 'Saving...', 'A registar...') : txt('Valider la Séance', 'Confirm Session', 'Confirmar Sessão')}
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}