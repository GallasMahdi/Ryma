'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconPhoneCall,
  IconBrandWhatsapp,
  IconTrash,
  IconPlus,
  IconFileText,
  IconStethoscope,
  IconActivity,
  IconX,
  IconUserCheck,
  IconChevronRight,
  IconUserPlus,
  IconCheck,
  IconCalendar,
  IconClock,
  IconPencil,
  IconShieldCheck,
  IconUser,
  IconTag,
  IconMedicalCross,
} from '@tabler/icons-react';
import {
  PatientNote,
  PatientRecord,
  PatientSession,
  Appointment,
  getServiceName,
  getServicePrice,
} from '@/types/admin';
import { SERVICES } from '@/data/services';

import { Lang } from '@/lib/i18n';

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

const QUICK_PATHOLOGIES = [
  'Lombalgie',
  'Cervicalgie',
  'Entorse Genou',
  'Rééducation Périnéale',
  'Post-Opératoire',
  'Drainage Lymphatique',
  'Prothèse Hanche',
  'Accident de Travail',
  'Seguro / Regime Livre',
];

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

  // Selected EMR Patient State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<'overview' | 'timeline' | 'eva' | 'notes'>('overview');

  // Modals state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Patient Form
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

  // Edit Patient Form — totalPrescribedSessions stored as string so user can clear & retype freely
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
    totalPrescribedSessionsStr: '',
  });

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
      totalPrescribedSessionsStr: String(p.totalPrescribedSessions || ''),
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
            title: lang === 'pt' ? 'Ficha Atualizada' : lang === 'en' ? 'File Updated' : 'Dossier Mis à Jour',
            message: editPatientForm.patientName,
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (onActionToast) {
          onActionToast({
            type: 'error',
            title: lang === 'pt' ? 'Erro na Edição' : lang === 'en' ? 'Update Error' : 'Erreur de Modification',
            message: errData.error || 'Não foi possível guardar as alterações.',
          });
        }
      }
    } catch (err) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: lang === 'pt' ? 'Erro de Rede' : lang === 'en' ? 'Network Error' : 'Erreur Réseau',
          message: (err as Error).message,
        });
      }
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
            title: lang === 'pt' ? 'Prescrição Ajustada' : lang === 'en' ? 'Prescription Adjusted' : 'Prescription Ajustée',
            message: `${newTarget} ${lang === 'pt' ? 'sessões prescritas' : lang === 'en' ? 'prescribed sessions' : 'séances prescrites'}`,
          });
        }
      }
    } catch (err) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: lang === 'pt' ? 'Erro ao Ajustar' : lang === 'en' ? 'Adjustment Error' : 'Erreur d\'Ajustement',
          message: (err as Error).message,
        });
      }
    }
  };

  // New Session Form
  const [sessionForm, setSessionForm] = useState<{
    date: string;
    time: string;
    serviceSlug: string;
    evaPainScore: number;
    sessionType: 'ONLINE' | 'MANUAL' | 'PAPER';
    notes: string;
    practitioner: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    serviceSlug: SERVICES[0]?.slug ?? 'kinesitherapie-generale',
    evaPainScore: 5,
    sessionType: 'MANUAL',
    notes: '',
    practitioner: 'Ryma Ouichka',
  });

  // Active Patient Object
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

      // Fallback object from legacy note
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
    return patientsList[0] ?? null;
  }, [selectedPatientId, selectedNote, patientsList]);

  // Combined List of Patients (Merging Patients + Legacy Notes)
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

  // Filtered patient list
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

  // Combined Timeline (Online Appointments + Registered EMR Sessions)
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

    // Online Appointments for this patient's phone
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

    // Structured EMR Sessions
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

  // EVA Score Analytics
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

  // Select patient handler
  const handleSelectPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
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

  // Submit New Patient
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
            title: lang === 'pt' ? 'Ficha de Utente Criada' : lang === 'en' ? 'Patient File Created' : 'Fiche Patient Créée',
            message: newPatientForm.patientName,
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (onActionToast) {
          onActionToast({
            type: 'error',
            title: lang === 'pt' ? 'Erro ao Criar Ficha' : lang === 'en' ? 'Creation Error' : 'Erreur de Création',
            message: errData.error || 'Não foi possível criar a ficha do utente.',
          });
        }
      }
    } catch (err) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: lang === 'pt' ? 'Erro de Rede' : lang === 'en' ? 'Network Error' : 'Erreur Réseau',
          message: (err as Error).message,
        });
      }
    } finally {
      setSubmitting(false);
      setNewPatientForm({
        patientName: '', phone: '', email: '', gender: 'F', dob: '',
        coverageType: 'PARTICULAR', coverageProvider: '', coverageNumber: '', referringDoctor: '',
        pathologyTags: '', medicalHistory: '', totalPrescribedSessions: 10,
      });
    }
  };

  // Submit New Session Log
  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setSubmitting(true);

    try {
      let patientId = activePatient.id;

      // If this is a legacy patient (not yet persisted to DB), upsert them first
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
        if (!upsertRes.ok) {
          if (onActionToast) {
            onActionToast({
              type: 'error',
              title: lang === 'pt' ? 'Erro ao Inicializar Utente' : lang === 'en' ? 'Initialization Error' : 'Erreur Initialisation',
              message: 'Não foi possível persistir o registo do utente.',
            });
          }
          return;
        }
        const upsertData = await upsertRes.json();
        patientId = upsertData.patient?.id ?? patientId;
        if (upsertData.patient?.id) {
          setSelectedPatientId(upsertData.patient.id);
        }
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
            title: lang === 'pt' ? 'Sessão Registada' : lang === 'en' ? 'Session Recorded' : 'Séance Enregistrée',
            message: `${sessionForm.date} • Dor EVA: ${sessionForm.evaPainScore}/10`,
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (onActionToast) {
          onActionToast({
            type: 'error',
            title: lang === 'pt' ? 'Erro ao Registar Sessão' : lang === 'en' ? 'Session Error' : 'Erreur Enregistrement Séance',
            message: errData.error || 'Não foi possível registar a sessão.',
          });
        }
      }
    } catch (err) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: lang === 'pt' ? 'Erro de Rede' : lang === 'en' ? 'Network Error' : 'Erreur Réseau',
          message: (err as Error).message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Patient Handler
  const handleDeletePatient = (patient: PatientRecord) => {
    setConfirmDialog({
      title: lang === 'pt'
        ? `Eliminar definitivamente o processo de ${patient.patientName}?`
        : lang === 'en'
        ? `Permanently delete record for ${patient.patientName}?`
        : `Supprimer définitivement le dossier de ${patient.patientName} ?`,
      onConfirm: async () => {
        // Use phone as the canonical key (works for both legacy and real patients)
        // Only pass real DB id if it's not a legacy placeholder
        const idParam = patient.id.startsWith('legacy_') ? '' : `id=${patient.id}&`;
        await fetch(`/api/admin/patients?${idParam}phone=${encodeURIComponent(patient.phone)}`, {
          method: 'DELETE',
        });
        deleteNote(patient.phone);
        if (onRefreshPatients) onRefreshPatients();
        setSelectedPatientId(null);
      },
    });
  };

  // Delete Session Handler
  const handleDeleteSession = (patientId: string, sessionId: string) => {
    setConfirmDialog({
      title: lang === 'pt' ? 'Eliminar esta sessão?' : lang === 'en' ? 'Delete this session?' : 'Supprimer cette séance ?',
      onConfirm: async () => {
        await fetch(`/api/admin/patients/${patientId}/sessions?sessionId=${sessionId}`, {
          method: 'DELETE',
        });
        if (onRefreshPatients) onRefreshPatients();
      },
    });
  };


  return (
    <div className="space-y-4 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">
            {lang === 'pt' ? 'Processos Clínicos & Fichas de Doentes' : lang === 'en' ? 'Clinical Files & Patient Records' : 'Dossiers Patients & EMR Médical'}
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            {lang === 'pt' ? 'Histórico médico, sessões de tratamento e evolução da dor' : lang === 'en' ? 'Medical history, treatment sessions, and pain evolution' : 'Historique médical et suivi des séances'}
          </p>
        </div>

        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium transition-colors shrink-0"
        >
          <IconUserPlus size={15} />
          <span>{lang === 'pt' ? 'Novo Utente' : lang === 'en' ? 'New Patient' : 'Nouveau Patient'}</span>
        </button>
      </div>

      {/* Main Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Patient Sidebar List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col h-[700px]">
          {/* Search Box */}
          <div className="relative mb-3">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={15} />
            <input
              type="text"
              value={noteSearch}
              onChange={e => setNoteSearch(e.target.value)}
              placeholder={lang === 'pt' ? 'Pesquisar utente, telefone...' : lang === 'en' ? 'Search patient, phone...' : 'Rechercher patient...'}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
            />
          </div>

          {/* Patients Counter */}
          <div className="flex justify-between items-center px-1 mb-2 text-[11px] text-[#64748B] font-medium">
            <span>{lang === 'pt' ? 'Fichas Registadas' : lang === 'en' ? 'Registered Records' : 'Dossiers enregistrés'}</span>
            <span className="font-semibold text-[#0F172A]">{filteredPatients.length}</span>
          </div>

          {/* Patients List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-[#94A3B8] text-xs">
                {lang === 'pt' ? 'Nenhuma ficha encontrada' : lang === 'en' ? 'No records found' : 'Aucun dossier trouvé'}
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = activePatient?.phone === p.phone;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#F8FAFC] border-[#0F172A]'
                        : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center font-semibold text-xs shrink-0 border ${
                        isSelected ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                      }`}>
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
                              {p.coverageType === 'ADSE' ? 'ADSE' : (p.coverageProvider || 'Seguro')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <IconChevronRight size={14} className={`shrink-0 ${isSelected ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Clinical Dossier Active View (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col h-[700px] overflow-hidden">
          {activePatient ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Active Patient Identity Badge */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white font-semibold text-sm flex items-center justify-center shrink-0">
                    {activePatient.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base text-[#0F172A]">{activePatient.patientName}</h3>
                      {activePatient.coverageType && activePatient.coverageType !== 'PARTICULAR' && (
                        <span className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                          <IconShieldCheck size={11} />
                          <span>
                            {activePatient.coverageType === 'ADSE' ? 'ADSE' : (activePatient.coverageProvider || (lang === 'pt' ? 'Seguro' : lang === 'en' ? 'Insurance' : 'Mutuelle'))}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs text-[#77736B] flex items-center gap-4 mt-1">
                      <span>📞 {activePatient.phone}</span>
                      {activePatient.referringDoctor && (
                        <span>🩺 Dr. {activePatient.referringDoctor}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Communication & Edit Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditPatientModal(activePatient)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-medium transition-colors flex items-center gap-1"
                    title={txt('Modifier le dossier', 'Edit file', 'Editar ficha')}
                  >
                    <IconPencil size={14} />
                    <span className="hidden sm:inline">{txt('Editar', 'Edit', 'Editar')}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activePatient.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7] transition-colors border border-[#DCFCE7]"
                    title="WhatsApp"
                  >
                    <IconBrandWhatsapp size={16} />
                  </a>
                  <a
                    href={`tel:${activePatient.phone}`}
                    className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#334155] hover:bg-[#F8FAFC] transition-colors"
                    title={txt('Appeler', 'Call', 'Chamar')}
                  >
                    <IconPhoneCall size={16} />
                  </a>
                  <button
                    onClick={() => handleDeletePatient(activePatient)}
                    className="p-1.5 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] transition-colors"
                    title={txt('Supprimer Dossier', 'Delete File', 'Eliminar Ficha')}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              {/* Prescription Session Progress Counter */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-xl flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                    <IconActivity size={16} />
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] uppercase font-semibold flex items-center gap-2">
                      <span>{txt('Prescrição de Tratamento :', 'Prescription :', 'Prescrição Médica :')}</span>
                      {/* Prescribed Target Adjuster (- / +) */}
                      <div className="inline-flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-[#CBD5E1]">
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(-1)}
                          title={txt('Diminuer séances prescrites', 'Decrease prescribed sessions', 'Diminuir sessões prescritas')}
                          className="w-4 h-4 rounded text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-[#0F172A] px-1">
                          {activePatient.totalPrescribedSessions ?? 10}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(1)}
                          title={txt('Augmenter séances prescrites', 'Increase prescribed sessions', 'Aumentar sessões prescritas')}
                          className="w-4 h-4 rounded text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-[#0F172A] mt-0.5">
                      {activePatient.sessions?.length ?? 0} de {activePatient.totalPrescribedSessions ?? 10} {txt('séances effectuées', 'sessions completed', 'sessões concluídas')}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-xs mx-3 hidden sm:block">
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0F172A] rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.round(((activePatient.sessions?.length ?? 0) / (activePatient.totalPrescribedSessions || 10)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <IconPlus size={14} />
                  <span>{txt('+ Sessão', '+ Session', '+ Nova Sessão')}</span>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-[#E2E8F0] gap-4 shrink-0">
                <button
                  onClick={() => setActiveDossierTab('overview')}
                  className={`pb-2.5 text-xs font-medium transition-colors border-b-2 ${activeDossierTab === 'overview'
                    ? 'border-[#0F172A] text-[#0F172A]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                    }`}
                >
                  {txt('Ficha do Utente', 'Patient File', 'Ficha do Utente')}
                </button>
                <button
                  onClick={() => setActiveDossierTab('timeline')}
                  className={`pb-2.5 text-xs font-medium transition-colors border-b-2 ${activeDossierTab === 'timeline'
                    ? 'border-[#0F172A] text-[#0F172A]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                    }`}
                >
                  {txt('Histórico & Sessões', 'History & Sessions', 'Histórico & Sessões')} ({combinedTimeline.length})
                </button>
                <button
                  onClick={() => setActiveDossierTab('eva')}
                  className={`pb-2.5 text-xs font-medium transition-colors border-b-2 ${activeDossierTab === 'eva'
                    ? 'border-[#0F172A] text-[#0F172A]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                    }`}
                >
                  {txt('Evolução da Dor (EVA)', 'EVA Pain Evolution', 'Evolução da Dor (EVA)')}
                </button>
              </div>

              {/* Tab Content Areas */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {/* TAB 1: OVERVIEW */}
                {activeDossierTab === 'overview' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Medical Details */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                          {txt('Informação Médica', 'Medical Information', 'Informação Médica')}
                        </div>
                        <div className="text-xs text-[#0F172A] space-y-1">
                          <div><span className="text-[#64748B]">{txt('Médico Assistente :', 'Attending Physician :', 'Médico Assistente :')}</span> <strong>{activePatient.referringDoctor || txt('Não especificado', 'Not specified', 'Não especificado')}</strong></div>
                          <div>
                            <span className="text-[#64748B]">{txt('Regime / Cobertura :', 'Healthcare Coverage :', 'Regime / Cobertura :')}</span>{' '}
                            <strong>
                              {activePatient.coverageType === 'ADSE'
                                ? 'ADSE'
                                : activePatient.coverageType === 'INSURANCE'
                                ? `${txt('Seguro', 'Insurance', 'Seguro')}${activePatient.coverageProvider ? ` (${activePatient.coverageProvider})` : ''}`
                                : activePatient.coverageType === 'OTHER'
                                ? txt('Outro', 'Other', 'Outro')
                                : txt('Particular', 'Private', 'Particular')}
                              {activePatient.coverageNumber ? ` • N.º ${activePatient.coverageNumber}` : ''}
                            </strong>
                          </div>
                          <div><span className="text-[#64748B]">{txt('Prescrição :', 'Prescription :', 'Prescrição :')}</span> <strong>{activePatient.totalPrescribedSessions || 10} {txt('sessões', 'sessions', 'sessões')}</strong></div>
                        </div>
                      </div>

                      {/* Pathology Tags */}
                      <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                          {txt('Patologias & Diagnóstico', 'Pathologies & Tags', 'Patologias & Diagnóstico')}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activePatient.pathologyTags ? (
                            activePatient.pathologyTags.split(',').map((t, i) => (
                              <span key={i} className="bg-white border border-[#E2E8F0] text-[#0F172A] text-[11px] font-medium px-2 py-0.5 rounded">
                                {t.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#94A3B8]">{txt('Nenhuma patologia indicada', 'No tags', 'Nenhuma patologia indicada')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Medical History Notes */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                          {txt('Antecedentes & Notas Clínicas', 'History & Therapeutic Notes', 'Antecedentes & Notas Clínicas')}
                        </div>
                        <button
                          onClick={saveNote}
                          disabled={savingNote}
                          className="px-2.5 py-1 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          {savingNote ? txt('A guardar...', 'Saving...', 'A guardar...') : txt('Guardar Nota', 'Save Note', 'Guardar Nota')}
                        </button>
                      </div>

                      <textarea
                        value={noteForm.content}
                        onChange={e => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={6}
                        placeholder={txt('Introduza os detalhes clínicos, antecedentes e evolução...', 'Enter clinical details, medical history...', 'Introduza os detalhes clínicos, antecedentes e evolução...')}
                        className="w-full p-3 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: TIMELINE */}
                {activeDossierTab === 'timeline' && (
                  <div className="space-y-2.5">
                    {combinedTimeline.length === 0 ? (
                      <div className="text-center py-12 text-[#94A3B8] text-xs">
                        {txt('Sem sessões ou consultas registadas', 'No sessions or appointments recorded', 'Sem sessões ou consultas registadas')}
                      </div>
                    ) : (
                      combinedTimeline.map(item => (
                        <div
                          key={item.id}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg flex items-center justify-between gap-3 hover:bg-white transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold border ${item.source === 'online'
                              ? 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]'
                              : item.source === 'paper'
                                ? 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]'
                                : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                              }`}>
                              {item.source === 'online' ? 'WEB' : item.source === 'paper' ? 'MAN' : 'SESS'}
                            </div>

                            <div>
                              <div className="font-semibold text-xs text-[#0F172A]">{item.title}</div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                                <span>{item.date} {item.time ? `• ${item.time}` : ''}</span>
                                {item.evaPainScore !== undefined && (
                                  <span className="font-semibold text-[#991B1B]">Dor EVA: {item.evaPainScore}/10</span>
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-[#334155] mt-1 bg-white p-2 rounded border border-[#E2E8F0]">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {item.price && (
                            <div className="font-semibold text-xs text-[#0F172A] shrink-0">
                              {item.price} €
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: EVA PAIN CHART */}
                {activeDossierTab === 'eva' && (
                  <div className="space-y-4 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs uppercase tracking-wider text-[#0F172A]">
                        {txt('Trajetória da Dor (Escala EVA 0–10)', 'Pain Trajectory (EVA Scale 0–10)', 'Trajetória da Dor (Escala EVA 0–10)')}
                      </h4>
                      {evaAnalytics && (
                        <div className="text-xs font-semibold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-2.5 py-0.5 rounded">
                          {txt(`Melhoria: -${evaAnalytics.diff} pontos`, `Improvement: -${evaAnalytics.diff} points`, `Melhoria: -${evaAnalytics.diff} pontos`)}
                        </div>
                      )}
                    </div>

                    {!activePatient.sessions || activePatient.sessions.length === 0 ? (
                      <div className="text-center py-8 text-[#94A3B8] text-xs">
                        {txt('Nenhum registo de dor EVA registado nas sessões', 'No EVA score recorded in sessions', 'Nenhum registo de dor EVA registado nas sessões')}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activePatient.sessions.map((s, idx) => (
                          <div key={s.id} className="space-y-1">
                            <div className="flex justify-between items-center text-xs text-[#0F172A]">
                              <span className="font-medium">Sessão {activePatient.sessions!.length - idx} ({s.date})</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#991B1B]">Dor EVA: {s.evaPainScore}/10</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(activePatient.id, s.id)}
                                  className="p-1 rounded text-[#94A3B8] hover:text-[#991B1B] hover:bg-[#FEE2E2] transition-colors"
                                  title={txt('Eliminar esta sessão', 'Delete this session', 'Eliminar esta sessão')}
                                >
                                  <IconTrash size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${s.evaPainScore > 7
                                  ? 'bg-[#EF4444]'
                                  : s.evaPainScore > 4
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-[#10B981]'
                                  }`}
                                style={{ width: `${(s.evaPainScore / 10) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-[#94A3B8] text-xs flex flex-col items-center justify-center h-full">
              <IconUser size={40} className="mb-2 text-[#CBD5E1]" />
              <span className="font-medium">{txt('Selecione uma ficha de utente na lista ao lado', 'Select a patient from the list', 'Selecione uma ficha de utente na lista ao lado')}</span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW PATIENT */}
      <AnimatePresence>
        {isNewPatientModalOpen && (
          <div className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-lg"
            >
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                <h3 className="font-semibold text-base text-[#0F172A]">
                  {txt('Criar Ficha de Utente', 'Create Patient File', 'Criar Ficha de Utente')}
                </h3>
                <button onClick={() => setIsNewPatientModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors">
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePatientSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-[#475569] mb-1">{txt('Nome & Apelido *', 'Full Name *', 'Nome & Apelido *')}</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.patientName}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, patientName: e.target.value }))}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Telefone *', 'Phone *', 'Telefone *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+351 9XX XXX XXX"
                      value={newPatientForm.phone}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Regime / Cobertura', 'Coverage Type', 'Regime / Cobertura')}
                    </label>
                    <select
                      value={newPatientForm.coverageType}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, coverageType: e.target.value as any }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    >
                      <option value="PARTICULAR">{txt('Particular (Sem seguro)', 'Private (Self-pay)', 'Particular (Sem seguro)')}</option>
                      <option value="INSURANCE">{txt('Seguro de Saúde', 'Health Insurance', 'Seguro de Saúde')}</option>
                      <option value="ADSE">ADSE / Subsistema</option>
                      <option value="OTHER">{txt('Outro', 'Other', 'Outro')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Seguradora / Entidade', 'Insurance Provider', 'Seguradora / Entidade')}
                    </label>
                    <input
                      type="text"
                      placeholder="Médis, Multicare..."
                      value={newPatientForm.coverageProvider}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, coverageProvider: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('N.º Beneficiário / Cartão', 'Policy / Card Number', 'N.º Beneficiário / Cartão')}
                    </label>
                    <input
                      type="text"
                      placeholder="123456789"
                      value={newPatientForm.coverageNumber}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, coverageNumber: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Médico Assistente', 'Referring Doctor', 'Médico Assistente')}
                    </label>
                    <input
                      type="text"
                      placeholder="Dr. Silva"
                      value={newPatientForm.referringDoctor}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, referringDoctor: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Sessões Prescritas', 'Prescribed Sessions', 'Sessões Prescritas')}
                    </label>
                    <input
                      type="number"
                      value={newPatientForm.totalPrescribedSessions}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, totalPrescribedSessions: parseInt(e.target.value) || 10 }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#475569] mb-1">Patologias & Tags Clínicas</label>
                  <input
                    type="text"
                    placeholder="Lombalgia, Pós-Operatório, Reabilitação Ombro"
                    value={newPatientForm.pathologyTags}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, pathologyTags: e.target.value }))}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors text-xs"
                  >
                    {txt('Cancelar', 'Cancel', 'Cancelar')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs disabled:opacity-50 transition-colors"
                  >
                    {submitting ? txt('A guardar...', 'Saving...', 'A guardar...') : txt('Criar Ficha', 'Create File', 'Criar Ficha')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD SESSION */}
      <AnimatePresence>
        {isAddSessionModalOpen && activePatient && (
          <div className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-lg font-sans"
            >
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                <h3 className="font-semibold text-base text-[#0F172A]">
                  {txt(`+ Sessão para ${activePatient.patientName}`, `+ Session for ${activePatient.patientName}`, `+ Sessão para ${activePatient.patientName}`)}
                </h3>
                <button onClick={() => setIsAddSessionModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors">
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSessionSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">Data da Sessão *</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.date}
                      onChange={e => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">Hora</label>
                    <input
                      type="time"
                      value={sessionForm.time}
                      onChange={e => setSessionForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#475569] mb-1">Tratamento Realizado</label>
                  <select
                    value={sessionForm.serviceSlug}
                    onChange={e => setSessionForm(prev => ({ ...prev, serviceSlug: e.target.value }))}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  >
                    {SERVICES.map(s => (
                      <option key={s.slug} value={s.slug}>
                        {s.name[lang] || s.name.pt || s.name.fr} ({s.price} €)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-medium text-[#475569]">Nível de Dor EVA (0–10)</label>
                    <span className="font-semibold text-xs text-[#991B1B]">{sessionForm.evaPainScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={sessionForm.evaPainScore}
                    onChange={e => setSessionForm(prev => ({ ...prev, evaPainScore: parseInt(e.target.value) || 0 }))}
                    className="w-full accent-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#475569] mb-1">Observações & Evolução</label>
                  <textarea
                    rows={3}
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Exercícios realizados, resposta ao tratamento..."
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsAddSessionModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors text-xs"
                  >
                    {txt('Cancelar', 'Cancel', 'Cancelar')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs disabled:opacity-50 transition-colors"
                  >
                    {submitting ? txt('A registar...', 'Recording...', 'A registar...') : txt('Registar Sessão', 'Record Session', 'Registar Sessão')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDIT PATIENT */}
      <AnimatePresence>
        {isEditPatientModalOpen && (
          <div className="fixed inset-0 z-[99999] bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-lg font-sans"
            >
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                <h3 className="font-semibold text-base text-[#0F172A]">
                  {txt('Editar Ficha de Utente', 'Edit Patient File', 'Editar Ficha de Utente')}
                </h3>
                <button onClick={() => setIsEditPatientModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors">
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleEditPatientSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">Nome & Apelido *</label>
                    <input
                      type="text"
                      required
                      value={editPatientForm.patientName}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, patientName: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">Telefone *</label>
                    <input
                      type="text"
                      required
                      value={editPatientForm.phone}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-[#0F172A] mb-1">
                      {txt('Sessões Prescritas *', 'Prescribed Sessions *', 'Sessões Prescritas *')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      required
                      value={editPatientForm.totalPrescribedSessionsStr}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, totalPrescribedSessionsStr: e.target.value }))}
                      onBlur={e => {
                        const v = parseInt(e.target.value);
                        if (isNaN(v) || v < 1) {
                          setEditPatientForm(prev => ({ ...prev, totalPrescribedSessionsStr: '10' }));
                        }
                      }}
                      placeholder="ex: 10"
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Regime / Cobertura', 'Coverage Type', 'Regime / Cobertura')}
                    </label>
                    <select
                      value={editPatientForm.coverageType}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, coverageType: e.target.value as any }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    >
                      <option value="PARTICULAR">{txt('Particular (Sem seguro)', 'Private (Self-pay)', 'Particular (Sem seguro)')}</option>
                      <option value="INSURANCE">{txt('Seguro de Saúde', 'Health Insurance', 'Seguro de Saúde')}</option>
                      <option value="ADSE">ADSE / Subsistema</option>
                      <option value="OTHER">{txt('Outro', 'Other', 'Outro')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Seguradora / Entidade', 'Insurance Provider', 'Seguradora / Entidade')}
                    </label>
                    <input
                      type="text"
                      placeholder="Médis, Multicare..."
                      value={editPatientForm.coverageProvider}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, coverageProvider: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('N.º Beneficiário / Cartão', 'Policy / Card Number', 'N.º Beneficiário / Cartão')}
                    </label>
                    <input
                      type="text"
                      placeholder="123456789"
                      value={editPatientForm.coverageNumber}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, coverageNumber: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-[#475569] mb-1">
                      {txt('Médico Assistente', 'Referring Doctor', 'Médico Assistente')}
                    </label>
                    <input
                      type="text"
                      placeholder="Dr. Silva"
                      value={editPatientForm.referringDoctor}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, referringDoctor: e.target.value }))}
                      className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#475569] mb-1">Patologias & Tags</label>
                  <input
                    type="text"
                    placeholder="Lombalgia, Pós-Operatório"
                    value={editPatientForm.pathologyTags}
                    onChange={e => setEditPatientForm(prev => ({ ...prev, pathologyTags: e.target.value }))}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsEditPatientModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors text-xs"
                  >
                    {txt('Cancelar', 'Cancel', 'Cancelar')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium text-xs disabled:opacity-50 transition-colors"
                  >
                    {submitting ? txt('A guardar...', 'Saving...', 'A guardar...') : txt('Atualizar Ficha', 'Update File', 'Atualizar Ficha')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}