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
  'Prise en charge CNAM',
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
    cnamStatus: 'NON',
    cnamNumber: '',
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
    cnamStatus: 'NON',
    cnamNumber: '',
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
      cnamStatus: p.cnamStatus ?? 'NON',
      cnamNumber: p.cnamNumber ?? '',
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
        cnamStatus: editPatientForm.cnamStatus,
        cnamNumber: editPatientForm.cnamNumber,
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
          cnamStatus: activePatient.cnamStatus,
          cnamNumber: activePatient.cnamNumber,
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
      }
    } catch {
      /* silent */
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
      }
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
      setIsNewPatientModalOpen(false);
      setNewPatientForm({
        patientName: '', phone: '', email: '', gender: 'F', dob: '',
        cnamStatus: 'NON', cnamNumber: '', referringDoctor: '',
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
            cnamStatus: activePatient.cnamStatus,
            cnamNumber: activePatient.cnamNumber,
            referringDoctor: activePatient.referringDoctor,
            pathologyTags: activePatient.pathologyTags,
            medicalHistory: activePatient.medicalHistory,
            totalPrescribedSessions: activePatient.totalPrescribedSessions ?? 10,
          }),
        });
        if (!upsertRes.ok) return;
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
      }
    } catch {
      /* silent */
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E9E6DF] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#9A7428] font-bold uppercase tracking-wider mb-1">
            <IconStethoscope size={16} />
            <span>{lang === 'pt' ? 'Processo Clínico & EMR Médico' : lang === 'en' ? 'Patient File & Medical EMR' : 'Dossier Patient & EMR Médical'}</span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#202020]">
            {lang === 'pt' ? 'Gestão de Tratamentos & Histórico' : lang === 'en' ? 'Care Management & Medical History' : 'Gestion des Soins & Historique'}
          </h2>
        </div>

        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#C6A15B] hover:bg-[#B5904B] text-white text-xs font-mono font-bold shadow-md transition-all shrink-0 cursor-pointer"
        >
          <IconUserPlus size={16} />
          <span>{lang === 'pt' ? '+ Novo Paciente' : lang === 'en' ? '+ New Patient' : '+ Nouveau Patient'}</span>
        </button>
      </div>

      {/* Main Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Sidebar List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E9E6DF] rounded-3xl p-5 shadow-xs flex flex-col h-[750px]">
          {/* Search Box */}
          <div className="relative mb-4">
            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736B]" size={18} />
            <input
              type="text"
              value={noteSearch}
              onChange={e => setNoteSearch(e.target.value)}
              placeholder={lang === 'pt' ? 'Pesquisar nome, telefone, patologia...' : lang === 'en' ? 'Search name, phone, condition...' : 'Rechercher nom, téléphone, pathologie...'}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-2xl text-xs font-mono text-[#202020] placeholder-[#77736B] focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          {/* Patients Counter */}
          <div className="flex justify-between items-center px-1 mb-3 text-xs font-mono text-[#77736B]">
            <span>{lang === 'pt' ? 'Processos Registados :' : lang === 'en' ? 'Registered Records :' : 'Dossiers enregistrés :'}</span>
            <span className="font-bold text-[#C6A15B]">{filteredPatients.length}</span>
          </div>

          {/* Patients List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-[#77736B] text-xs font-mono">
                {lang === 'pt' ? 'Nenhum processo encontrado' : lang === 'en' ? 'No records found' : 'Aucun dossier trouvé'}
              </div>
            ) : (
              filteredPatients.map(p => {
                const isSelected = activePatient?.phone === p.phone;
                const totalCompleted = p.sessions?.length ?? 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${isSelected
                      ? 'bg-[#F9F6F0] border-[#C6A15B] shadow-xs'
                      : 'bg-white border-[#E9E6DF] hover:border-[#C6A15B]/50 hover:bg-[#FAFAF8]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm shrink-0 ${isSelected ? 'bg-[#C6A15B] text-white' : 'bg-[#F4F2EE] text-[#202020]'
                        }`}>
                        {p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-serif font-bold text-sm text-[#202020] truncate">
                          {p.patientName}
                        </div>
                        <div className="font-mono text-[11px] text-[#77736B] flex items-center gap-1.5 mt-0.5">
                          <span>{p.phone}</span>
                          {p.cnamStatus === 'OUI' && (
                            <span className="bg-[#6F8F72]/15 text-[#6F8F72] px-1.5 py-0.2 rounded-full text-[9px] font-bold">CNAM</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-[10px] bg-[#E9E6DF]/60 text-[#202020] px-2 py-1 rounded-full">
                        {totalCompleted} {lang === 'pt' ? 'sessões' : lang === 'en' ? 'sessions' : 'séances'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Clinical Dossier Active View (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E9E6DF] rounded-3xl p-6 shadow-xs flex flex-col h-[750px] overflow-hidden">
          {activePatient ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-6">
              {/* Active Patient Identity Badge */}
              <div className="bg-[#FAFAF8] border border-[#E9E6DF] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#C6A15B] text-white font-serif font-bold text-xl flex items-center justify-center shadow-md">
                    {activePatient.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-xl font-bold text-[#202020]">{activePatient.patientName}</h3>
                      {activePatient.cnamStatus === 'OUI' && (
                        <span className="bg-[#6F8F72]/15 border border-[#6F8F72]/30 text-[#6F8F72] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <IconShieldCheck size={12} />
                          <span>CNAM</span>
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
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditPatientModal(activePatient)}
                    className="p-2.5 rounded-xl bg-[#FAFAF8] hover:bg-[#F4F2EE] text-[#202020] font-mono text-xs font-bold transition-all border border-[#E9E6DF] flex items-center gap-1.5 cursor-pointer"
                    title={txt('Modifier le dossier', 'Edit file', 'Editar ficha')}
                  >
                    <IconPencil size={16} />
                    <span className="hidden sm:inline">{txt('Modifier', 'Edit', 'Editar')}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activePatient.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-all border border-[#25D366]/30"
                    title="WhatsApp"
                  >
                    <IconBrandWhatsapp size={18} />
                  </a>
                  <a
                    href={`tel:${activePatient.phone}`}
                    className="p-2.5 rounded-xl bg-[#C6A15B]/10 text-[#C6A15B] hover:bg-[#C6A15B]/20 transition-all border border-[#C6A15B]/30"
                    title={txt('Appeler', 'Call', 'Chamar')}
                  >
                    <IconPhoneCall size={18} />
                  </a>
                  <button
                    onClick={() => handleDeletePatient(activePatient)}
                    className="p-2.5 rounded-xl bg-[#A9655F]/10 text-[#A9655F] hover:bg-[#A9655F]/20 transition-all border border-[#A9655F]/30 cursor-pointer"
                    title={txt('Supprimer Dossier', 'Delete File', 'Eliminar Ficha')}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Prescription Session Progress Counter */}
              <div className="bg-[#FAF8F5] border border-[#E8E2D8] p-4 rounded-2xl flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C6A15B]/15 text-[#C6A15B] flex items-center justify-center">
                    <IconActivity size={20} />
                  </div>
                  <div>
                    <div className="font-mono text-xs text-[#77736B] uppercase font-bold flex items-center gap-2">
                      <span>{txt('Ordonnance Kinesi :', 'Kine Prescription:', 'Prescrição Kinesi:')}</span>
                      {/* Prescribed Target Adjuster (- / +) */}
                      <div className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-[#E8E2D8]">
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(-1)}
                          title={txt('Diminuer séances prescrites', 'Decrease prescribed sessions', 'Diminuir sessões prescritas')}
                          className="w-5 h-5 rounded bg-[#FAFAF8] hover:bg-[#E9E6DF] text-[#202020] font-mono font-bold flex items-center justify-center text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-[#C6A15B] px-1">
                          {activePatient.totalPrescribedSessions ?? 10}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(1)}
                          title={txt('Augmenter séances prescrites', 'Increase prescribed sessions', 'Aumentar sessões prescritas')}
                          className="w-5 h-5 rounded bg-[#FAFAF8] hover:bg-[#E9E6DF] text-[#202020] font-mono font-bold flex items-center justify-center text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="font-serif font-bold text-sm text-[#202020]">
                      {activePatient.sessions?.length ?? 0} / {activePatient.totalPrescribedSessions ?? 10} {txt('séances effectuées', 'sessions completed', 'sessões concluídas')}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-xs mx-4">
                  <div className="w-full h-2.5 bg-[#E9E6DF] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C6A15B] to-[#E8D7B0] rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(((activePatient.sessions?.length ?? 0) / (activePatient.totalPrescribedSessions || 10)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="px-4 py-2 bg-[#C6A15B] hover:bg-[#B5904B] text-white text-xs font-mono font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <IconPlus size={14} />
                  <span>{txt('+ Séance', '+ Session', '+ Sessão')}</span>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-[#E9E6DF] gap-4 shrink-0">
                <button
                  onClick={() => setActiveDossierTab('overview')}
                  className={`pb-3 text-xs font-mono font-bold transition-all border-b-2 cursor-pointer ${activeDossierTab === 'overview'
                    ? 'border-[#C6A15B] text-[#C6A15B]'
                    : 'border-transparent text-[#77736B] hover:text-[#202020]'
                    }`}
                >
                  {txt('📋 Fiche Patient', '📋 Patient File', '📋 Ficha do Doente')}
                </button>
                <button
                  onClick={() => setActiveDossierTab('timeline')}
                  className={`pb-3 text-xs font-mono font-bold transition-all border-b-2 cursor-pointer ${activeDossierTab === 'timeline'
                    ? 'border-[#C6A15B] text-[#C6A15B]'
                    : 'border-transparent text-[#77736B] hover:text-[#202020]'
                    }`}
                >
                  {txt('⏱️ Historique & Séances', '⏱️ History & Sessions', '⏱️ Histórico & Sessões')} ({combinedTimeline.length})
                </button>
                <button
                  onClick={() => setActiveDossierTab('eva')}
                  className={`pb-3 text-xs font-mono font-bold transition-all border-b-2 cursor-pointer ${activeDossierTab === 'eva'
                    ? 'border-[#C6A15B] text-[#C6A15B]'
                    : 'border-transparent text-[#77736B] hover:text-[#202020]'
                    }`}
                >
                  {txt('📊 Évolution Douleur EVA', '📊 EVA Pain Evolution', '📊 Evolução da Dor EVA')}
                </button>
              </div>

              {/* Tab Content Areas */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                {/* TAB 1: OVERVIEW */}
                {activeDossierTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Medical Details */}
                      <div className="bg-[#FAFAF8] p-4 rounded-2xl border border-[#E9E6DF] space-y-2">
                        <div className="font-mono text-xs font-bold text-[#9A7428] uppercase">
                          {txt('Informations Médicales', 'Medical Information', 'Informação Médica')}
                        </div>
                        <div className="text-xs text-[#202020] space-y-1.5 font-mono">
                          <div><strong>{txt('Médecin traitant :', 'Attending Physician:', 'Médico Assistente:')}</strong> {activePatient.referringDoctor || txt('Non renseigné', 'Not specified', 'Não especificado')}</div>
                          <div><strong>{txt('Prise en charge CNAM :', 'CNAM Coverage:', 'Cobertura CNAM:')}</strong> {activePatient.cnamStatus || 'NON'} {activePatient.cnamNumber ? `(#${activePatient.cnamNumber})` : ''}</div>
                          <div><strong>{txt('Prescription :', 'Prescription:', 'Prescrição:')}</strong> {activePatient.totalPrescribedSessions || 10} {txt('séances', 'sessions', 'sessões')}</div>
                        </div>
                      </div>

                      {/* Pathology Tags */}
                      <div className="bg-[#FAFAF8] p-4 rounded-2xl border border-[#E9E6DF] space-y-2">
                        <div className="font-mono text-xs font-bold text-[#9A7428] uppercase">
                          {txt('Pathologies & Tag', 'Pathologies & Tags', 'Patologias & Tags')}
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {activePatient.pathologyTags ? (
                            activePatient.pathologyTags.split(',').map((t, i) => (
                              <span key={i} className="bg-[#C6A15B]/15 border border-[#C6A15B]/30 text-[#C6A15B] text-[10px] font-mono font-bold px-2.5 py-1 rounded-full">
                                {t.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#77736B] font-mono">{txt('Aucun tag', 'No tags', 'Sem tags')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Medical History Notes */}
                    <div className="bg-[#FAFAF8] p-5 rounded-2xl border border-[#E9E6DF] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs font-bold text-[#9A7428] uppercase">
                          {txt('Antécédents & Notes Thérapeutiques', 'History & Therapeutic Notes', 'Antecedentes & Notas Terapêuticas')}
                        </div>
                        <button
                          onClick={saveNote}
                          disabled={savingNote}
                          className="px-3 py-1.5 bg-[#C6A15B] text-white rounded-xl text-xs font-mono font-bold hover:bg-[#B5904B] transition-all cursor-pointer"
                        >
                          {savingNote ? txt('Sauvegarde...', 'Saving...', 'A guardar...') : txt('Enregistrer Note', 'Save Note', 'Guardar Nota')}
                        </button>
                      </div>

                      <textarea
                        value={noteForm.content}
                        onChange={e => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                        rows={6}
                        placeholder={txt('Saisissez les détails cliniques, antécédents et objectifs du patient...', 'Enter clinical details, medical history and patient goals...', 'Introduza os detalhes clínicos, antecedentes e objetivos do doente...')}
                        className="w-full p-3.5 bg-white border border-[#E9E6DF] rounded-xl text-xs font-mono text-[#202020] placeholder-[#77736B] focus:outline-none focus:border-[#C6A15B]"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: TIMELINE */}
                {activeDossierTab === 'timeline' && (
                  <div className="space-y-3">
                    {combinedTimeline.length === 0 ? (
                      <div className="text-center py-12 text-[#77736B] text-xs font-mono">
                        {txt('Aucune séance ou rendez-vous enregistré', 'No sessions or appointments recorded', 'Sem sessões ou consultas registadas')}
                      </div>
                    ) : (
                      combinedTimeline.map(item => (
                        <div
                          key={item.id}
                          className="bg-[#FAFAF8] border border-[#E9E6DF] p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-[#C6A15B]/40 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${item.source === 'online'
                              ? 'bg-[#5B82A6]/15 text-[#5B82A6]'
                              : item.source === 'paper'
                                ? 'bg-[#B08A45]/15 text-[#B08A45]'
                                : 'bg-[#6F8F72]/15 text-[#6F8F72]'
                              }`}>
                              {item.source === 'online' ? 'WEB' : item.source === 'paper' ? 'PAP' : 'KINÉ'}
                            </div>

                            <div>
                              <div className="font-serif font-bold text-sm text-[#202020]">{item.title}</div>
                              <div className="font-mono text-[11px] text-[#77736B] flex items-center gap-3 mt-0.5">
                                <span>📅 {item.date} {item.time ? `à ${item.time}` : ''}</span>
                                {item.evaPainScore !== undefined && (
                                  <span className="font-bold text-[#A9655F]">EVA: {item.evaPainScore}/10</span>
                                )}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-[#202020] font-mono mt-1 bg-white p-2 rounded-lg border border-[#E9E6DF]">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          {item.price && (
                            <div className="font-mono font-bold text-xs text-[#C6A15B] shrink-0">
                              {item.price} TND
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: EVA PAIN CHART */}
                {activeDossierTab === 'eva' && (
                  <div className="space-y-5 p-4 bg-[#FAFAF8] border border-[#E9E6DF] rounded-2xl">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-base text-[#202020]">
                        {txt('Trajectoire de la Douleur (Échelle EVA 0–10)', 'Pain Trajectory (EVA Scale 0–10)', 'Trajetória da Dor (Escala EVA 0–10)')}
                      </h4>
                      {evaAnalytics && (
                        <div className="font-mono text-xs font-bold text-[#6F8F72] bg-[#6F8F72]/15 px-3 py-1 rounded-full">
                          {txt(`Amélioration : -${evaAnalytics.diff} points`, `Improvement: -${evaAnalytics.diff} points`, `Melhoria: -${evaAnalytics.diff} pontos`)}
                        </div>
                      )}
                    </div>

                    {!activePatient.sessions || activePatient.sessions.length === 0 ? (
                      <div className="text-center py-8 text-[#77736B] text-xs font-mono">
                        {txt('Aucun score EVA enregistré dans les séances', 'No EVA score recorded in sessions', 'Nenhum valor EVA registado nas sessões')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activePatient.sessions.map((s, idx) => (
                          <div key={s.id} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-mono text-[#202020]">
                              <span>Séance {activePatient.sessions!.length - idx} ({s.date})</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#A9655F]">Douleur: {s.evaPainScore}/10</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(activePatient.id, s.id)}
                                  className="p-1 rounded-lg text-[#A9655F]/60 hover:text-[#A9655F] hover:bg-[#A9655F]/10 transition-all cursor-pointer"
                                  title={txt('Supprimer cette séance', 'Delete this session', 'Eliminar esta sessão')}
                                >
                                  <IconTrash size={12} />
                                </button>
                              </div>
                            </div>
                            <div className="w-full h-3 bg-[#E9E6DF] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${s.evaPainScore > 7
                                  ? 'bg-[#A9655F]'
                                  : s.evaPainScore > 4
                                    ? 'bg-[#C6A15B]'
                                    : 'bg-[#6F8F72]'
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
            <div className="text-center py-24 text-[#77736B] text-xs font-mono flex flex-col items-center justify-center h-full">
              <IconUser size={48} className="mb-3 text-[#E9E6DF]" />
              <span>{txt('Sélectionnez un patient dans la liste', 'Select a patient from the list', 'Selecione um doente da lista')}</span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW PATIENT */}
      <AnimatePresence>
        {isNewPatientModalOpen && (
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E9E6DF] p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#E9E6DF] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#202020]">
                  {txt('Créer une Fiche Patient', 'Create Patient File', 'Criar Ficha de Doente')}
                </h3>
                <button onClick={() => setIsNewPatientModalOpen(false)} className="text-[#77736B] hover:text-[#202020]">
                  <IconX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePatientSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Nom & Prénom *</label>
                  <input
                    type="text"
                    required
                    value={newPatientForm.patientName}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, patientName: e.target.value }))}
                    className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Téléphone *</label>
                    <input
                      type="text"
                      required
                      value={newPatientForm.phone}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Prise en charge CNAM</label>
                    <select
                      value={newPatientForm.cnamStatus}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, cnamStatus: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    >
                      <option value="NON">NON</option>
                      <option value="OUI">OUI</option>
                      <option value="EN_COURS">EN COURS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Médecin Traitant</label>
                    <input
                      type="text"
                      placeholder="Dr. Ben Ammar"
                      value={newPatientForm.referringDoctor}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, referringDoctor: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Séances Prescrites</label>
                    <input
                      type="number"
                      value={newPatientForm.totalPrescribedSessions}
                      onChange={e => setNewPatientForm(prev => ({ ...prev, totalPrescribedSessions: parseInt(e.target.value) || 10 }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Pathologies / Tags</label>
                  <input
                    type="text"
                    placeholder="Lombalgie, Post-Op"
                    value={newPatientForm.pathologyTags}
                    onChange={e => setNewPatientForm(prev => ({ ...prev, pathologyTags: e.target.value }))}
                    className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsNewPatientModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-xs font-mono text-[#77736B]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#C6A15B] text-white text-xs font-mono font-bold shadow-xs hover:bg-[#B5904B]"
                  >
                    {submitting ? 'Création...' : 'Créer Dossier'}
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
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E9E6DF] p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#E9E6DF] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#202020]">
                  {txt(`+ Séance pour ${activePatient.patientName}`, `+ Session for ${activePatient.patientName}`, `+ Sessão para ${activePatient.patientName}`)}
                </h3>
                <button onClick={() => setIsAddSessionModalOpen(false)} className="text-[#77736B] hover:text-[#202020]">
                  <IconX size={20} />
                </button>
              </div>

              <form onSubmit={handleAddSessionSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Date Séance *</label>
                    <input
                      type="date"
                      required
                      value={sessionForm.date}
                      onChange={e => setSessionForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Heure</label>
                    <input
                      type="time"
                      value={sessionForm.time}
                      onChange={e => setSessionForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Soin Effectué</label>
                  <select
                    value={sessionForm.serviceSlug}
                    onChange={e => setSessionForm(prev => ({ ...prev, serviceSlug: e.target.value }))}
                    className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                  >
                    {SERVICES.map(s => (
                      <option key={s.slug} value={s.slug}>
                        {s.name.fr} ({s.price} TND)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-mono font-bold text-[#77736B]">Niveau de Douleur EVA (0–10)</label>
                    <span className="font-mono text-xs font-bold text-[#A9655F]">{sessionForm.evaPainScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={sessionForm.evaPainScore}
                    onChange={e => setSessionForm(prev => ({ ...prev, evaPainScore: parseInt(e.target.value) || 0 }))}
                    className="w-full accent-[#C6A15B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Notes de Traitement</label>
                  <textarea
                    rows={3}
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observations, exercices réalisés, évolution..."
                    className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddSessionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-xs font-mono text-[#77736B]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#C6A15B] text-white text-xs font-mono font-bold shadow-xs hover:bg-[#B5904B]"
                  >
                    {submitting ? 'Enregistrement...' : 'Enregistrer Séance'}
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
          <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E9E6DF] p-6 rounded-3xl max-w-lg w-full space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center border-b border-[#E9E6DF] pb-3">
                <h3 className="font-serif font-bold text-lg text-[#202020]">
                  {txt('Modifier le Dossier Patient', 'Edit Patient File', 'Editar Ficha do Doente')}
                </h3>
                <button onClick={() => setIsEditPatientModalOpen(false)} className="text-[#77736B] hover:text-[#202020]">
                  <IconX size={20} />
                </button>
              </div>

              <form onSubmit={handleEditPatientSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Nom & Prénom *</label>
                    <input
                      type="text"
                      required
                      value={editPatientForm.patientName}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, patientName: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Téléphone *</label>
                    <input
                      type="text"
                      required
                      value={editPatientForm.phone}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#C6A15B] mb-1">
                      {txt('Séances Prescrites *', 'Prescribed Sessions *', 'Sessões Prescritas *')}
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
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#C6A15B]/50 rounded-xl text-xs font-mono font-bold text-[#202020]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Prise en charge CNAM</label>
                    <select
                      value={editPatientForm.cnamStatus}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, cnamStatus: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    >
                      <option value="NON">NON</option>
                      <option value="OUI">OUI</option>
                      <option value="EN_COURS">EN COURS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">N° CNAM (facultatif)</label>
                    <input
                      type="text"
                      placeholder="123456789"
                      value={editPatientForm.cnamNumber}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, cnamNumber: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Médecin Traitant</label>
                    <input
                      type="text"
                      placeholder="Dr. Ben Ammar"
                      value={editPatientForm.referringDoctor}
                      onChange={e => setEditPatientForm(prev => ({ ...prev, referringDoctor: e.target.value }))}
                      className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-[#77736B] mb-1">Pathologies & Tags</label>
                  <input
                    type="text"
                    placeholder="Lombalgie, Post-Op"
                    value={editPatientForm.pathologyTags}
                    onChange={e => setEditPatientForm(prev => ({ ...prev, pathologyTags: e.target.value }))}
                    className="w-full p-2.5 bg-[#FAFAF8] border border-[#E9E6DF] rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditPatientModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAFAF8] border border-[#E9E6DF] text-xs font-mono text-[#77736B]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#C6A15B] text-white text-xs font-mono font-bold shadow-xs hover:bg-[#B5904B]"
                  >
                    {submitting ? 'Enregistrement...' : 'Mettre à jour Dossier'}
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