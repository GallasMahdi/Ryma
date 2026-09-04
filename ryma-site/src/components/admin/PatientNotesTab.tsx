'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  IconSearch,
  IconPhoneCall,
  IconBrandWhatsapp,
  IconTrash,
  IconPlus,
  IconFileText,
  IconActivity,
  IconChevronRight,
  IconChevronLeft,
  IconChevronsLeft,
  IconChevronsRight,
  IconUserPlus,
  IconPencil,
  IconShieldCheck,
  IconTag,
  IconArrowLeft,
  IconNotes,
  IconReceiptTax,
  IconPrinter,
  IconCheck,
  IconClock,
  IconX,
  IconCalendarEvent,
  IconCalendarRepeat,
  IconSparkles,
  IconFilter,
  IconUsers,
} from '@tabler/icons-react';
import {
  PatientNote,
  PatientRecord,
  Appointment,
  Invoice,
  PatientPrescription,
  CreateInvoiceInput,
  getServiceName,
  getServicePrice,
} from '@/types/admin';
import { SERVICES } from '@/data/services';
import { Lang } from '@/lib/i18n';
import { phonesMatch } from '@/lib/phone';
import { ResponsiveModal } from './ResponsiveModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { CreatePrescriptionModal } from './CreatePrescriptionModal';
import { PrescriptionDetailModal } from './PrescriptionDetailModal';
import { MultipleSessionsModal } from './MultipleSessionsModal';
import { EvaScorePicker, getEvaColor } from './EvaScorePicker';
import { formatPrescriptionWhatsAppMessage } from '@/lib/prescriptionPdf';
import { SITE } from '@/lib/site';

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
  const [activeDossierTab, setActiveDossierTab] = useState<'overview' | 'timeline' | 'eva' | 'invoices' | 'prescriptions' | 'notes'>('overview');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isMultipleSessionsModalOpen, setIsMultipleSessionsModalOpen] = useState(false);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Prescriptions & Recommendations Pad state
  const [isCreatePrescriptionOpen, setIsCreatePrescriptionOpen] = useState(false);
  const [selectedPrescriptionForModal, setSelectedPrescriptionForModal] = useState<PatientPrescription | null>(null);
  const [isPrescriptionDetailOpen, setIsPrescriptionDetailOpen] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState<PatientPrescription[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // High-performance SWR In-Memory Caches for Instant (0ms) Patient Switching
  const invoicesCacheRef = useRef<Record<string, Invoice[]>>({});
  const prescriptionsCacheRef = useRef<Record<string, PatientPrescription[]>>({});

  // Fetch invoices for active patient (Instant SWR + silent revalidation)
  const fetchActivePatientInvoices = async (phone: string, force = false) => {
    if (!phone) return;
    if (!force && invoicesCacheRef.current[phone]) {
      setPatientInvoices(invoicesCacheRef.current[phone]);
      // Silently revalidate in background
      fetch(`/api/admin/invoices?patientPhone=${encodeURIComponent(phone)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data.invoices)) {
            invoicesCacheRef.current[phone] = data.invoices;
            setPatientInvoices(data.invoices);
          }
        })
        .catch(() => { });
      return;
    }

    setLoadingInvoices(true);
    try {
      const res = await fetch(`/api/admin/invoices?patientPhone=${encodeURIComponent(phone)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.invoices || [];
        invoicesCacheRef.current[phone] = list;
        setPatientInvoices(list);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Fetch prescriptions for active patient (Instant SWR + silent revalidation)
  const fetchActivePatientPrescriptions = async (phone: string, force = false) => {
    if (!phone) return;
    if (!force && prescriptionsCacheRef.current[phone]) {
      setPatientPrescriptions(prescriptionsCacheRef.current[phone]);
      // Silently revalidate in background
      fetch(`/api/admin/prescriptions?patientPhone=${encodeURIComponent(phone)}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data.prescriptions)) {
            prescriptionsCacheRef.current[phone] = data.prescriptions;
            setPatientPrescriptions(data.prescriptions);
          }
        })
        .catch(() => { });
      return;
    }

    setLoadingPrescriptions(true);
    try {
      const res = await fetch(`/api/admin/prescriptions?patientPhone=${encodeURIComponent(phone)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.prescriptions || [];
        prescriptionsCacheRef.current[phone] = list;
        setPatientPrescriptions(list);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  // Sync selectedPatientId when selectedNote changes from outside
  useEffect(() => {
    if (selectedNote) {
      const match = patientsList.find(p => phonesMatch(p.phone, selectedNote.phone));
      if (match) {
        setSelectedPatientId(match.id);
        fetchActivePatientInvoices(match.phone);
        fetchActivePatientPrescriptions(match.phone);
      } else {
        setSelectedPatientId('legacy_' + selectedNote.phone);
        fetchActivePatientInvoices(selectedNote.phone);
        fetchActivePatientPrescriptions(selectedNote.phone);
      }
    }
  }, [selectedNote, patientsList]);

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
    totalPrescribedSessionsStr: '',
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

  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    serviceSlug: SERVICES[0]?.slug || 'reeducation-posturale',
    evaPainScore: 5,
    notes: '',
  });

  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'INSURANCE' | 'PARTICULAR' | 'ACTIVE_SESSIONS'>('ALL');

  // Consolidated Patient Record List (Merge structured + legacy notes)
  const unifiedPatients: PatientRecord[] = useMemo(() => {
    const list: PatientRecord[] = [...patientsList];

    patientNotes.forEach(note => {
      const exists = list.some(p => phonesMatch(p.phone, note.phone));
      if (!exists) {
        list.push({
          id: 'legacy_' + note.phone,
          patientName: note.patientName || note.phone,
          phone: note.phone,
          pathologyTags: note.tags,
          medicalHistory: note.content,
          totalPrescribedSessions: 10,
          createdAt: note.updatedAt,
          updatedAt: note.updatedAt,
        });
      }
    });

    return list;
  }, [patientsList, patientNotes]);

  // Counts for quick filter pills
  const filterCounts = useMemo(() => {
    const all = unifiedPatients.length;
    const insurance = unifiedPatients.filter(
      p => p.coverageType === 'INSURANCE' || p.coverageType === 'ADSE' || (p.coverageProvider && p.coverageProvider.trim().length > 0)
    ).length;
    const particular = unifiedPatients.filter(
      p => !p.coverageType || p.coverageType === 'PARTICULAR'
    ).length;
    const withSessions = unifiedPatients.filter(
      p => (p.sessions && p.sessions.length > 0)
    ).length;
    return { all, insurance, particular, withSessions };
  }, [unifiedPatients]);

  // Filtered Patients based on Search & Quick Filter
  const filteredPatients = useMemo(() => {
    let list = unifiedPatients;

    // Apply Quick Filter
    if (quickFilter === 'INSURANCE') {
      list = list.filter(
        p => p.coverageType === 'INSURANCE' || p.coverageType === 'ADSE' || (p.coverageProvider && p.coverageProvider.trim().length > 0)
      );
    } else if (quickFilter === 'PARTICULAR') {
      list = list.filter(
        p => !p.coverageType || p.coverageType === 'PARTICULAR'
      );
    } else if (quickFilter === 'ACTIVE_SESSIONS') {
      list = list.filter(
        p => (p.sessions && p.sessions.length > 0)
      );
    }

    // Apply Search
    if (noteSearch.trim()) {
      const q = noteSearch.toLowerCase();
      list = list.filter(
        p =>
          p.patientName.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          (p.pathologyTags && p.pathologyTags.toLowerCase().includes(q)) ||
          (p.coverageProvider && p.coverageProvider.toLowerCase().includes(q)) ||
          (p.referringDoctor && p.referringDoctor.toLowerCase().includes(q))
      );
    }

    return list;
  }, [unifiedPatients, noteSearch, quickFilter]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [noteSearch, quickFilter, pageSize]);

  // Pagination bounds & slice
  const totalFiltered = filteredPatients.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPatients = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, safeCurrentPage, pageSize]);

  const startIndex = totalFiltered === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalFiltered);

  // Smart page numbers generator (with ellipsis)
  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  }, [totalPages, safeCurrentPage]);

  // Active Selected Patient
  const activePatient: PatientRecord | null = useMemo(() => {
    if (!selectedPatientId) return null;
    return unifiedPatients.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, unifiedPatients]);

  // Select patient handler
  const handleSelectPatient = (patient: PatientRecord) => {
    setSelectedPatientId(patient.id);
    setIsMobileDetailOpen(true);
    fetchActivePatientInvoices(patient.phone);
    fetchActivePatientPrescriptions(patient.phone);

    // Sync noteForm for quick notes tab
    setNoteForm({
      content: patient.medicalHistory || '',
      tags: patient.pathologyTags || '',
    });

    // Sync legacy selectedNote
    const legacyMatch = patientNotes.find(n => phonesMatch(n.phone, patient.phone));
    if (legacyMatch) {
      setSelectedNote(legacyMatch);
    } else {
      setSelectedNote({
        phone: patient.phone,
        patientName: patient.patientName,
        tags: patient.pathologyTags || '',
        content: patient.medicalHistory || '',
        updatedAt: patient.updatedAt,
      });
    }
  };

  // Timeline computation (Past appointments + Structured sessions)
  const combinedTimeline = useMemo(() => {
    if (!activePatient) return [];

    const items: Array<{
      id: string;
      date: string;
      time?: string;
      title: string;
      source: 'online' | 'manual' | 'paper';
      evaPainScore?: number;
      notes?: string;
    }> = [];

    // Add structured clinical sessions
    if (activePatient.sessions) {
      activePatient.sessions.forEach(s => {
        items.push({
          id: s.id,
          date: s.date,
          time: s.time || undefined,
          title: getServiceName(s.serviceSlug, lang),
          source: s.sessionType === 'ONLINE' ? 'online' : s.sessionType === 'PAPER' ? 'paper' : 'manual',
          evaPainScore: s.evaPainScore,
          notes: s.notes || undefined,
        });
      });
    }

    // Add completed online appointments
    appointments
      .filter(a => phonesMatch(a.phone, activePatient.phone) && a.status === 'COMPLETED')
      .forEach(a => {
        const alreadyInSessions = items.some(it => it.date === a.date && it.time === a.startTime);
        if (!alreadyInSessions) {
          items.push({
            id: a.id,
            date: a.date,
            time: a.startTime,
            title: getServiceName(a.service, lang),
            source: 'online',
            notes: a.notes || undefined,
          });
        }
      });

    // Sort descending by date
    items.sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime());
    return items;
  }, [activePatient, appointments, lang]);

  // EVA Progression computation
  const evaAnalytics = useMemo(() => {
    if (!activePatient?.sessions || activePatient.sessions.length === 0) return null;
    const sorted = [...activePatient.sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const initial = sorted[0].evaPainScore;
    const current = sorted[sorted.length - 1].evaPainScore;
    const diff = initial - current; // Positive means pain decreased (improved)
    return { initial, current, diff, count: sorted.length };
  }, [activePatient]);

  // Create Patient Submit
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsedSessions = parseInt(newPatientForm.totalPrescribedSessionsStr, 10);
      const totalPrescribedSessions = !isNaN(parsedSessions) && parsedSessions > 0
        ? Math.min(100, Math.max(1, parsedSessions))
        : 10;

      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPatientForm,
          totalPrescribedSessions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar paciente');

      setIsNewPatientModalOpen(false);
      setNewPatientForm({
        patientName: '',
        phone: '',
        email: '',
        gender: 'F',
        dob: '',
        coverageType: 'PARTICULAR',
        coverageProvider: '',
        coverageNumber: '',
        referringDoctor: '',
        pathologyTags: '',
        medicalHistory: '',
        totalPrescribedSessionsStr: '',
      });

      if (onRefreshPatients) onRefreshPatients();
      if (data.patient) {
        handleSelectPatient(data.patient);
      }
      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: txt('Patient Enregistré', 'Patient Created', 'Utente Registado'),
          message: data.patient?.patientName,
        });
      }
    } catch (err: any) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur de Création', 'Creation Error', 'Erro ao Criar'),
          message: err.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditPatientModal = (patient: PatientRecord) => {
    setEditPatientForm({
      id: patient.id.startsWith('legacy_') ? '' : patient.id,
      patientName: patient.patientName,
      phone: patient.phone,
      email: patient.email || '',
      gender: (patient.gender as any) || 'F',
      dob: patient.dob || '',
      coverageType: (patient.coverageType as any) || 'PARTICULAR',
      coverageProvider: patient.coverageProvider || '',
      coverageNumber: patient.coverageNumber || '',
      referringDoctor: patient.referringDoctor || '',
      pathologyTags: patient.pathologyTags || '',
      medicalHistory: patient.medicalHistory || '',
      totalPrescribedSessionsStr: String(patient.totalPrescribedSessions || 10),
    });
    setIsEditPatientModalOpen(true);
  };

  // Edit Patient Submit
  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsedSessions = parseInt(editPatientForm.totalPrescribedSessionsStr, 10);
      const totalPrescribedSessions = !isNaN(parsedSessions) && parsedSessions > 0
        ? Math.min(100, Math.max(1, parsedSessions))
        : 10;

      const res = await fetch('/api/admin/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editPatientForm,
          totalPrescribedSessions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar paciente');

      setIsEditPatientModalOpen(false);
      if (onRefreshPatients) onRefreshPatients();
      if (data.patient) {
        handleSelectPatient(data.patient);
      }
      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: txt('Fiche Mise à Jour', 'Record Updated', 'Ficha Atualizada'),
          message: data.patient?.patientName,
        });
      }
    } catch (err: any) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur', 'Error', 'Erro'),
          message: err.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Add Session Submit
  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setSubmitting(true);
    try {
      const cleanPatientId = activePatient.id.startsWith('legacy_') ? undefined : activePatient.id;

      // If patient is legacy, save them first to get a permanent patient record
      let targetPatientId = cleanPatientId;
      if (!targetPatientId) {
        const upRes = await fetch('/api/admin/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientName: activePatient.patientName,
            phone: activePatient.phone,
            totalPrescribedSessions: activePatient.totalPrescribedSessions || 10,
          }),
        });
        const upData = await upRes.json();
        if (upData.patient) targetPatientId = upData.patient.id;
      }

      if (!targetPatientId) throw new Error('Patient ID introuvable');

      const res = await fetch(`/api/admin/patients/${targetPatientId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sessionForm,
          sessionType: 'MANUAL',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registar sessão');

      setIsAddSessionModalOpen(false);
      setSessionForm({
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        serviceSlug: SERVICES[0]?.slug || 'reeducation-posturale',
        evaPainScore: 5,
        notes: '',
      });

      if (onRefreshPatients) onRefreshPatients();
      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: txt('Séance Enregistrée', 'Session Logged', 'Sessão Registada'),
          message: `EVA: ${sessionForm.evaPainScore}/10`,
        });
      }
    } catch (err: any) {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur', 'Error', 'Erro'),
          message: err.message,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const [editingEvaSessionId, setEditingEvaSessionId] = useState<string | null>(null);

  // Update EVA score for an existing session with immediate optimistic feedback
  const handleUpdateSessionEva = async (sessionId: string, newScore: number) => {
    if (!activePatient) return;
    setEditingEvaSessionId(null);

    try {
      const cleanId = activePatient.id.startsWith('legacy_') ? '' : activePatient.id;
      if (!cleanId) return;

      const res = await fetch(`/api/admin/patients/${cleanId}/sessions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, evaPainScore: newScore }),
      });

      if (!res.ok) throw new Error('Falha ao atualizar score EVA');

      if (onRefreshPatients) onRefreshPatients();
      if (onActionToast) {
        onActionToast({
          type: 'success',
          title: txt('Score EVA Atualizado', 'EVA Score Updated', 'Score EVA Atualizado'),
          message: `Sessão ajustada para EVA ${newScore}/10`,
        });
      }
    } catch {
      if (onActionToast) {
        onActionToast({
          type: 'error',
          title: txt('Erreur', 'Error', 'Erro'),
          message: 'Falha ao atualizar score EVA',
        });
      }
    }
  };

  // Quick increment/decrement prescribed sessions
  const updatePrescribedTarget = async (delta: number) => {
    if (!activePatient) return;
    const currentTarget = activePatient.totalPrescribedSessions || 10;
    const newTarget = Math.min(100, Math.max(1, currentTarget + delta));
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
          coverageType: activePatient.coverageType,
          coverageProvider: activePatient.coverageProvider,
          coverageNumber: activePatient.coverageNumber,
          referringDoctor: activePatient.referringDoctor,
          pathologyTags: activePatient.pathologyTags,
          medicalHistory: activePatient.medicalHistory,
          totalPrescribedSessions: newTarget,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onRefreshPatients) onRefreshPatients();
        if (data.patient) handleSelectPatient(data.patient);
      }
    } catch {
      /* silent */
    }
  };

  // Delete Patient Action
  const handleDeletePatient = (patient: PatientRecord) => {
    setConfirmDialog({
      title: txt(
        `Supprimer définitivement le dossier de ${patient.patientName} (${patient.phone}) ?`,
        `Permanently delete clinical record for ${patient.patientName} (${patient.phone})?`,
        `Eliminar definitivamente a ficha de ${patient.patientName} (${patient.phone})?`
      ),
      onConfirm: async () => {
        // Optimistic UI state reset
        setSelectedPatientId(null);
        setIsMobileDetailOpen(false);
        deleteNote(patient.phone);

        try {
          const cleanId = patient.id.startsWith('legacy_') ? '' : patient.id;
          await fetch(`/api/admin/patients?id=${encodeURIComponent(cleanId)}&phone=${encodeURIComponent(patient.phone)}`, {
            method: 'DELETE',
          });
          if (onRefreshPatients) onRefreshPatients();
          if (onActionToast) {
            onActionToast({
              type: 'info',
              title: txt('Dossier Supprimé', 'Record Deleted', 'Ficha Eliminada'),
              message: patient.patientName,
            });
          }
        } catch {
          /* silent */
        }
      },
    });
  };

  const completedSessionsCount = activePatient?.sessions?.length ?? 0;
  const targetSessions = activePatient?.totalPrescribedSessions || 10;
  const prescriptionPercent = Math.min(100, Math.round((completedSessionsCount / targetSessions) * 100));

  return (
    <div className="space-y-3 sm:space-y-4 font-sans max-w-full overflow-hidden">
      {/* Top Banner Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h2 className="font-bold text-base sm:text-lg text-[#0F172A] tracking-tight truncate">
              {txt('Dossiers Médicaux & EMR Patients', 'Clinical Files & Patient Records', 'Processos Clínicos & Fichas')}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 truncate">
            {txt('Historique clinique, prescriptions, séances et facturation', 'Medical history, prescription tracking, sessions and billing', 'Histórico clínico, evolução da dor e faturação')}
          </p>
        </div>

        <button
          onClick={() => setIsNewPatientModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all touch-target w-full sm:w-auto shrink-0"
        >
          <IconUserPlus size={16} />
          <span>{txt('Nouveau Patient', 'New Patient', 'Novo Utente')}</span>
        </button>
      </div>

      {/* Main Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Patient Master List (Hidden on mobile when detail is open) */}
        <div
          className={`lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-4 flex flex-col shadow-xs ${isMobileDetailOpen ? 'hidden lg:flex' : 'flex'
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
              className="w-full pl-10 pr-8 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm sm:text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all"
            />
            {noteSearch && (
              <button
                type="button"
                onClick={() => setNoteSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1 mb-2.5 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: 'ALL' as const, label: txt('Tous', 'All', 'Todos'), count: filterCounts.all },
              { id: 'INSURANCE' as const, label: txt('Assurance/Mutuelle', 'Insurance/ADSE', 'Seguro/ADSE'), count: filterCounts.insurance },
              { id: 'PARTICULAR' as const, label: txt('Particulier', 'Private', 'Particular'), count: filterCounts.particular },
              { id: 'ACTIVE_SESSIONS' as const, label: txt('Avec Séances', 'With Sessions', 'Com Sessões'), count: filterCounts.withSessions },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuickFilter(f.id)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${quickFilter === f.id
                  ? 'bg-[#0F172A] text-white shadow-2xs'
                  : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                  }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-mono ${quickFilter === f.id ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* List Header & Page Size */}
          <div className="flex justify-between items-center px-1 mb-2 text-xs text-[#64748B]">
            <span className="font-medium text-[11px]">
              {totalFiltered > 0 ? (
                <>
                  {txt('Affichage', 'Showing', 'A mostrar')}{' '}
                  <strong className="text-[#0F172A] font-mono">{startIndex}–{endIndex}</strong> {txt('sur', 'of', 'de')}{' '}
                  <strong className="text-[#0F172A] font-mono">{totalFiltered}</strong>
                </>
              ) : (
                txt('0 dossier', '0 records', '0 fichas')
              )}
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-[11px]">
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-0.5 text-[11px] font-bold text-[#0F172A] outline-none cursor-pointer"
                title={txt('Fiches par page', 'Records per page', 'Itens por página')}
              >
                <option value={8}>8 / {txt('page', 'page', 'pág')}</option>
                <option value={10}>10 / {txt('page', 'page', 'pág')}</option>
                <option value={20}>20 / {txt('page', 'page', 'pág')}</option>
                <option value={50}>50 / {txt('page', 'page', 'pág')}</option>
              </select>
            </div>
          </div>

          {/* List items (Paginated) */}
          <div className="overflow-y-auto space-y-2 pr-0.5 min-h-[300px] max-h-[520px] custom-scrollbar flex-1">
            {paginatedPatients.length === 0 ? (
              <div className="text-center py-12 px-4 text-[#64748B] text-xs bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1]">
                <IconSearch size={28} className="mx-auto text-[#94A3B8] mb-2" />
                <p className="font-semibold">{txt('Aucun dossier trouvé', 'No records found', 'Nenhuma ficha encontrada')}</p>
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  {txt('Vérifiez la recherche ou modifiez les filtres.', 'Check search or change filters.', 'Verifique a pesquisa ou altere os filtros.')}
                </p>
              </div>
            ) : (
              paginatedPatients.map(p => {
                const isSelected = activePatient?.phone === p.phone;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group touch-target ${isSelected
                      ? 'bg-[#F8FAFC] border-[#0F172A] shadow-xs ring-1 ring-[#0F172A]'
                      : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border transition-colors ${isSelected
                          ? 'bg-[#0F172A] text-white border-[#0F172A]'
                          : 'bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]'
                          }`}
                      >
                        {p.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm sm:text-xs text-[#0F172A] truncate">
                          {p.patientName}
                        </div>
                        <div className="text-xs sm:text-[11px] text-[#64748B] flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{p.phone}</span>
                          {p.coverageType && p.coverageType !== 'PARTICULAR' && (
                            <span className="bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              {p.coverageType === 'ADSE' ? 'ADSE' : (p.coverageProvider || 'Mutuelle')}
                            </span>
                          )}
                          {p.sessions && p.sessions.length > 0 && (
                            <span className="bg-[#EFF6FF] text-[#1E40AF] border border-[#DBEAFE] px-1.5 py-0.2 rounded text-[10px] font-semibold">
                              {p.sessions.length} sessões
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <IconChevronRight
                      size={18}
                      className={`shrink-0 ml-2 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-[#0F172A]' : 'text-[#CBD5E1]'
                        }`}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Advanced Pagination Footer Bar */}
          {totalPages > 1 && (
            <div className="pt-3 mt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2">
              {/* Prev / First */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Primeira página"
                >
                  <IconChevronsLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <IconChevronLeft size={15} />
                </button>
              </div>

              {/* Numbered page pills */}
              <div className="flex items-center gap-1">
                {paginationRange.map((num, idx) => {
                  if (num === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-1 text-xs text-[#94A3B8] font-bold">
                        …
                      </span>
                    );
                  }

                  const isCurrent = num === safeCurrentPage;
                  return (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => setCurrentPage(Number(num))}
                      className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${isCurrent
                        ? 'bg-[#0F172A] text-white shadow-2xs ring-1 ring-[#0F172A]'
                        : 'bg-[#F8FAFC] border border-[#CBD5E1] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
                        }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {/* Next / Last */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Página seguinte"
                >
                  <IconChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Última página"
                >
                  <IconChevronsRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Patient Detail Dossier View */}
        <div
          className={`lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-3.5 sm:p-5 flex flex-col shadow-xs ${!isMobileDetailOpen ? 'hidden lg:flex' : 'flex'
            }`}
        >
          {activePatient ? (
            <div className="flex flex-col space-y-4">
              {/* Mobile Back Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setIsMobileDetailOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-bold text-[#0F172A] transition-colors touch-target"
                >
                  <IconArrowLeft size={16} />
                  <span>{txt('← Retour à la liste des patients', '← Back to patient list', '← Voltar à lista de utentes')}</span>
                </button>
              </div>

              {/* Patient Identity Banner */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 sm:p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#0F172A] text-[#E8C97A] font-serif font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {activePatient.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-bold text-base sm:text-lg text-[#0F172A] truncate">
                          {activePatient.patientName}
                        </h3>
                        {activePatient.coverageType && activePatient.coverageType !== 'PARTICULAR' && (
                          <span className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <IconShieldCheck size={12} />
                            <span>
                              {activePatient.coverageType === 'ADSE' ? 'ADSE' : (activePatient.coverageProvider || txt('Mutuelle', 'Insurance', 'Seguro'))}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#64748B] flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="font-mono font-medium">📞 {activePatient.phone}</span>
                        {activePatient.referringDoctor && (
                          <span>🩺 Dr. {activePatient.referringDoctor}</span>
                        )}
                        {activePatient.email && (
                          <span className="truncate">✉️ {activePatient.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Responsive Toolbar */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => openEditPatientModal(activePatient)}
                    className="min-h-[46px] p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] active:scale-95 text-xs font-bold transition-all touch-target flex flex-col items-center justify-center gap-1 shadow-2xs"
                    title={txt('Modifier', 'Edit', 'Editar')}
                  >
                    <IconPencil size={16} className="text-[#64748B]" />
                    <span className="text-[11px]">{txt('Modifier', 'Edit', 'Editar')}</span>
                  </button>

                  {activePatient.phone.replace(/[^0-9]/g, '') ? (
                    <a
                      href={`https://wa.me/${activePatient.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[46px] p-2 rounded-xl bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7] active:scale-95 transition-all border border-[#BBF7D0] touch-target flex flex-col items-center justify-center gap-1 text-xs font-bold shadow-2xs"
                      title="WhatsApp"
                    >
                      <IconBrandWhatsapp size={16} className="text-[#16A34A]" />
                      <span className="text-[11px]">WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="min-h-[46px] p-2 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed flex flex-col items-center justify-center gap-1 text-xs opacity-50"
                      title={txt('WhatsApp non disponible (aucun numéro)', 'WhatsApp unavailable (no phone)', 'WhatsApp indisponível (sem número)')}
                    >
                      <IconBrandWhatsapp size={16} />
                      <span className="text-[11px]">WhatsApp</span>
                    </button>
                  )}

                  <a
                    href={`tel:${activePatient.phone}`}
                    className="min-h-[46px] p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] active:scale-95 transition-all touch-target flex flex-col items-center justify-center gap-1 text-xs font-bold shadow-2xs"
                    title={txt('Appeler', 'Call', 'Telefonar')}
                  >
                    <IconPhoneCall size={16} className="text-[#64748B]" />
                    <span className="text-[11px]">{txt('Appeler', 'Call', 'Telefonar')}</span>
                  </a>

                  <button
                    onClick={() => handleDeletePatient(activePatient)}
                    className="min-h-[46px] p-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2] active:scale-95 transition-all touch-target flex flex-col items-center justify-center gap-1 text-xs font-bold shadow-2xs"
                    title={txt('Supprimer Dossier', 'Delete File', 'Eliminar Ficha')}
                  >
                    <IconTrash size={16} className="text-[#EF4444]" />
                    <span className="text-[11px]">{txt('Supprimer', 'Delete', 'Eliminar')}</span>
                  </button>
                </div>
              </div>

              {/* Prescription Progress Tracker Bar */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <IconActivity size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold uppercase text-[#475569] flex flex-wrap items-center gap-2">
                      <span>{txt('Prescription Médicale :', 'Prescription :', 'Prescrição Médica :')}</span>
                      <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(-1)}
                          className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] active:scale-95 font-bold flex items-center justify-center text-sm touch-target"
                          title={txt('Diminuer séances', 'Decrease sessions', 'Diminuir sessões')}
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-[#0F172A] px-2 min-w-[24px] text-center">
                          {targetSessions}
                        </span>
                        <button
                          type="button"
                          onClick={() => updatePrescribedTarget(1)}
                          className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] active:scale-95 font-bold flex items-center justify-center text-sm touch-target"
                          title={txt('Augmenter séances', 'Increase sessions', 'Aumentar sessões')}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-[#64748B] lowercase">{txt('séances', 'sessions', 'sessões')}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 sm:w-48 h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0F172A] to-[#2563EB] rounded-full transition-all duration-300"
                          style={{ width: `${prescriptionPercent}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-[#0F172A] shrink-0">
                        {completedSessionsCount} / {targetSessions} ({prescriptionPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsMultipleSessionsModalOpen(true)}
                    className="px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] active:scale-[0.98] text-[#0F172A] text-xs font-bold transition-all shadow-2xs touch-target flex items-center justify-center gap-1.5 w-full sm:w-auto"
                  >
                    <IconCalendarRepeat size={16} className="text-[#0F172A]" />
                    <span>{txt('Plan de Séances', 'Multiple Sessions', 'Plano de Sessões')}</span>
                  </button>

                  <button
                    onClick={() => setIsAddSessionModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm touch-target flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <IconPlus size={16} />
                    <span>{txt('Enregistrer Séance', 'Log Session', 'Registar Sessão')}</span>
                  </button>
                </div>
              </div>

              {/* Dossier Tabs (Horizontal Scrollable Rail with distinct pills) */}
              <div className="bg-[#F1F5F9]/80 p-1.5 rounded-2xl border border-[#E2E8F0] overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex items-center gap-1.5 min-w-max">
                  {[
                    { id: 'overview', icon: IconFileText, label: txt('Aperçu Clinique', 'Overview', 'Visão Geral'), count: null },
                    { id: 'timeline', icon: IconClock, label: txt('Historique', 'History', 'Histórico'), count: combinedTimeline.length },
                    { id: 'eva', icon: IconActivity, label: txt('Échelle EVA', 'EVA Pain Scale', 'Escala EVA'), count: null },
                    { id: 'invoices', icon: IconReceiptTax, label: txt('Facturation', 'Invoices', 'Faturação'), count: patientInvoices.length },
                    { id: 'prescriptions', icon: IconNotes, label: txt('Recommandations', 'Recommendations', 'Recomendações'), count: patientPrescriptions.length },
                    { id: 'notes', icon: IconPencil, label: txt('Notes Libres', 'Notes', 'Notas'), count: null },
                  ].map(t => {
                    const Icon = t.icon;
                    const isActive = activeDossierTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveDossierTab(t.id as typeof activeDossierTab);
                          if (t.id === 'invoices' && activePatient) {
                            fetchActivePatientInvoices(activePatient.phone);
                          }
                          if (t.id === 'prescriptions' && activePatient) {
                            fetchActivePatientPrescriptions(activePatient.phone);
                          }
                        }}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap select-none touch-target ${isActive
                          ? 'bg-[#0F172A] text-white shadow-sm'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80 active:scale-95'
                          }`}
                      >
                        <Icon size={15} className={isActive ? 'text-[#E8C97A]' : 'text-[#64748B]'} />
                        <span>{t.label}</span>
                        {t.count !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#334155]'
                              }`}
                          >
                            {t.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content Body */}
              <div className="space-y-4 pt-1">
                {activeDossierTab === 'overview' && (
                  <div className="space-y-3.5">
                    {/* Pathologies & Tags */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold uppercase text-[#64748B] flex items-center gap-1.5">
                        <IconTag size={15} className="text-[#64748B]" />
                        <span>{txt('Pathologies & Diagnostic', 'Pathologies & Diagnosis', 'Patologias & Diagnóstico')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activePatient.pathologyTags ? (
                          activePatient.pathologyTags.split(',').map((t, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-lg bg-white border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] shadow-2xs"
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
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold uppercase text-[#64748B] flex items-center gap-1.5">
                        <IconFileText size={15} className="text-[#64748B]" />
                        <span>{txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}</span>
                      </div>
                      <p className="text-sm sm:text-xs text-[#334155] leading-relaxed whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-[#E2E8F0]">
                        {activePatient.medicalHistory || txt('Aucune observation clinique pour le moment.', 'No clinical observations yet.', 'Sem observações clínicas.')}
                      </p>
                    </div>

                    {/* EVA Evolution Snapshot */}
                    {evaAnalytics && (
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <div className="text-[11px] font-bold uppercase text-[#64748B]">
                            {txt('Évolution de la douleur (EVA)', 'Pain Score Progression (EVA)', 'Evolução da Dor (EVA)')}
                          </div>
                          <div className="font-bold text-sm sm:text-base text-[#0F172A] mt-0.5">
                            {txt('Score Initial :', 'Initial :', 'Inicial :')} <span className="text-amber-600">{evaAnalytics.initial}/10</span> → {txt('Actuel :', 'Current :', 'Atual :')} <span className="text-emerald-600">{evaAnalytics.current}/10</span>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center justify-center ${evaAnalytics.diff > 0
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
                      <div className="text-center py-12 px-4 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                        <IconCalendarEvent size={32} className="mx-auto text-[#CBD5E1]" />
                        <p className="font-semibold text-xs text-[#64748B]">
                          {txt('Aucune séance enregistrée pour ce patient', 'No recorded sessions for this patient', 'Sem sessões registadas')}
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddSessionModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#0F172A] text-white text-xs font-bold shadow-xs hover:bg-[#1E293B] transition-all"
                        >
                          {txt('Enregistrer Première Séance', 'Log First Session', 'Registar Primeira Sessão')}
                        </button>
                      </div>
                    ) : (
                      combinedTimeline.map(item => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 shadow-2xs hover:border-[#CBD5E1] transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-[#0F172A] font-mono">{item.date}</span>
                              {item.time && <span className="text-[#64748B] font-mono">{item.time}</span>}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.source === 'online'
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
                                    : txt('Presencial', 'Clinic', 'Presencial')}
                              </span>
                            </div>

                            {item.evaPainScore !== undefined && (
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white text-[#0F172A] border border-[#CBD5E1] shadow-2xs">
                                EVA: <span className={item.evaPainScore >= 7 ? 'text-rose-600' : item.evaPainScore >= 4 ? 'text-amber-600' : 'text-emerald-600'}>{item.evaPainScore}/10</span>
                              </span>
                            )}
                          </div>

                          <div className="font-bold text-sm sm:text-xs text-[#0F172A]">
                            {item.title}
                          </div>

                          {item.notes && (
                            <p className="text-xs text-[#475569] bg-white p-3 rounded-xl border border-[#E2E8F0] leading-relaxed">
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
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                            <IconActivity size={18} className="text-[#C49A3C]" />
                            <span>{txt('Échelle Visuelle Analogique (EVA 0 – 10)', 'Visual Analog Scale (EVA 0 – 10)', 'Escala Visual Analógica (EVA 0 – 10)')}</span>
                          </h4>
                          <p className="text-xs text-[#64748B] leading-relaxed mt-0.5">
                            {txt(
                              'Cliquez sur le score d’une séance pour ajuster instantanément le niveau de douleur.',
                              'Click on any session score to adjust pain level in real-time.',
                              'Clique no score de uma sessão para ajustar instantaneamente o nível de dor.'
                            )}
                          </p>
                        </div>

                        {/* EVA Progression summary badge */}
                        {evaAnalytics && (
                          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#CBD5E1] shadow-2xs">
                            <div className="text-right">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                                {txt('Évolution Globale', 'Pain Evolution', 'Evolução Global')}
                              </div>
                              <div className="text-xs font-bold font-mono">
                                <span className="text-rose-600">EVA {evaAnalytics.initial}</span>
                                <span className="text-[#94A3B8] mx-1">→</span>
                                <span className="text-emerald-600">EVA {evaAnalytics.current}</span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-lg text-xs font-bold ${evaAnalytics.diff > 0
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : evaAnalytics.diff < 0
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                                }`}
                            >
                              {evaAnalytics.diff > 0
                                ? `-${evaAnalytics.diff} pts (${Math.round((evaAnalytics.diff / (evaAnalytics.initial || 1)) * 100)}%)`
                                : evaAnalytics.diff < 0
                                  ? `+${Math.abs(evaAnalytics.diff)} pts`
                                  : txt('Estável', 'Stable', 'Stable')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Visual scale reference guide */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-[#E2E8F0] text-center text-[10px] font-bold">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          0 - 3 : {txt('Légère / Sans douleur', 'Mild / No pain', 'Leve / Sem dor')}
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                          4 - 6 : {txt('Modérée', 'Moderate', 'Moderada')}
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                          7 - 10 : {txt('Intense / Sévère', 'Severe / Worst', 'Intensa / Severa')}
                        </div>
                      </div>

                      {activePatient.sessions && activePatient.sessions.length > 0 ? (
                        <div className="space-y-2.5 pt-2">
                          {activePatient.sessions.map((s, sIdx) => {
                            const isEditing = editingEvaSessionId === s.id;
                            const colorConf = getEvaColor(s.evaPainScore);

                            return (
                              <div
                                key={s.id}
                                className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all shadow-2xs space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                      #{activePatient.sessions!.length - sIdx}
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-[#0F172A] text-xs font-mono">{s.date}</span>
                                        {s.time && <span className="text-[11px] text-[#64748B] font-mono">• {s.time}</span>}
                                      </div>
                                      <span className="text-[11px] text-[#64748B]">{getServiceName(s.serviceSlug, lang)}</span>
                                    </div>
                                  </div>

                                  {/* Interactive EVA Score Pill (Click to toggle quick-adjust buttons) */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 sm:w-32 h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${colorConf.bg}`}
                                        style={{ width: `${Math.max(5, s.evaPainScore * 10)}%` }}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setEditingEvaSessionId(isEditing ? null : s.id)}
                                      className={`px-2.5 py-1 rounded-lg border font-bold text-xs flex items-center gap-1.5 transition-all touch-target shadow-2xs ${colorConf.badgeBg} hover:scale-105`}
                                      title={txt('Cliquer pour modifier le score', 'Click to modify score', 'Clique para alterar')}
                                    >
                                      <IconPencil size={12} className="opacity-70" />
                                      <span>EVA {s.evaPainScore}/10</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded 1-Tap Quick Number Adjuster */}
                                {isEditing && (
                                  <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-[#475569]">
                                      <span>{txt('Sélectionnez le nouveau score :', 'Select new score:', 'Selecione o novo score:')}</span>
                                      <button
                                        type="button"
                                        onClick={() => setEditingEvaSessionId(null)}
                                        className="text-[#94A3B8] hover:text-[#0F172A]"
                                      >
                                        <IconX size={14} />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-11 gap-1">
                                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                        const isCurrent = s.evaPainScore === num;
                                        const c = getEvaColor(num);
                                        return (
                                          <button
                                            key={num}
                                            type="button"
                                            onClick={() => handleUpdateSessionEva(s.id, num)}
                                            className={`py-1.5 rounded-lg font-bold text-xs text-center transition-all ${isCurrent
                                              ? `${c.bg} text-white shadow-sm ring-2 ring-[#0F172A] ring-offset-1`
                                              : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155]'
                                              }`}
                                          >
                                            {num}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-[#64748B]">
                          {txt('Aucune note EVA enregistrée pour l’instant', 'No EVA score recorded yet', 'Sem notas EVA registadas')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeDossierTab === 'invoices' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h4 className="font-bold text-[#0F172A] text-sm">
                          {txt('Historique de Facturation & Reçus', 'Billing & Tax Receipts History', 'Histórico de Faturação & Recibos')}
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Documentos com NIF válidos para IRS e reembolso de seguros (ADSE, Médis, Multicare).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreateInvoiceOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] hover:brightness-105 active:scale-[0.98] text-[#1A1412] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all w-full sm:w-auto"
                      >
                        <IconPlus size={16} />
                        <span>{txt('Émettre Recibo', 'New Invoice', 'Emitir Recibo')}</span>
                      </button>
                    </div>

                    {loadingInvoices ? (
                      <div className="py-12 text-center text-xs text-[#94A3B8] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                        A carregar recibos...
                      </div>
                    ) : patientInvoices.length === 0 ? (
                      <div className="p-8 text-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                        <IconReceiptTax size={36} className="mx-auto text-[#CBD5E1]" />
                        <p className="font-bold text-xs text-[#475569]">Nenhum recibo emitido para este utente</p>
                        <button
                          type="button"
                          onClick={() => setIsCreateInvoiceOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs transition-all"
                        >
                          Emitir Primeiro Recibo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-4 bg-white border border-[#E2E8F0] rounded-2xl hover:border-[#C49A3C] transition-all flex flex-col gap-3 shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-bold text-[#0F172A] text-xs bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                                    {inv.invoiceNumber}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${inv.paymentStatus === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                  >
                                    {inv.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                                  </span>
                                </div>
                                <p className="font-bold text-sm sm:text-xs text-[#1E293B]">{inv.serviceName}</p>
                                <p className="text-[11px] text-[#64748B] font-mono">
                                  {inv.createdAt ? inv.createdAt.split('T')[0] : ''} • NIF: {inv.patientNif} • {inv.paymentMethod}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono font-bold text-base sm:text-sm text-[#0F172A]">
                                  {inv.amount.toFixed(2)} €
                                </span>
                              </div>
                            </div>

                            {/* Mobile-Friendly Action Toolbar */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInvoiceForModal(inv);
                                  setIsInvoiceDetailOpen(true);
                                }}
                                className="min-h-[42px] sm:min-h-0 sm:py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] active:scale-95 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs touch-target"
                                title="Ver / Imprimir PDF"
                              >
                                <IconPrinter size={16} />
                                <span>Imprimir / PDF</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const cleanPhone = inv.patientPhone.replace(/[^0-9]/g, '');
                                  const msg = encodeURIComponent(
                                    `Olá ${inv.patientName}! 👋\n` +
                                    `Recibo da *Digital Clínica*:\n` +
                                    `🧾 *Nº:* ${inv.invoiceNumber}\n` +
                                    `🩺 *Tratamento:* ${inv.serviceName}\n` +
                                    `💰 *Valor:* ${inv.amount.toFixed(2)} €\n` +
                                    `📌 *NIF:* ${inv.patientNif}\n` +
                                    `✅ *Estado:* ${inv.paymentStatus === 'PAID' ? 'PAGO / Quitado' : 'Pendente'}`
                                  );
                                  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                }}
                                className="min-h-[42px] sm:min-h-0 sm:py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 border border-emerald-200 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs touch-target"
                                title="Enviar por WhatsApp"
                              >
                                <IconBrandWhatsapp size={16} />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDossierTab === 'prescriptions' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h4 className="font-bold text-[#0F172A] text-sm">
                          {txt('Ordonnances de Conseils & Matériel Recommandé', 'Clinical Recommendations & Equipment Pad', 'Fichas de Recomendações & Material')}
                        </h4>
                        <p className="text-[11px] text-[#64748B]">
                          Orientações terapêuticas, produtos tópicos e ergonomia para acompanhamento ao domicílio.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCreatePrescriptionOpen(true)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C49A3C] to-[#E8C97A] hover:brightness-105 active:scale-[0.98] text-[#1A1412] font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all w-full sm:w-auto"
                      >
                        <IconPlus size={16} />
                        <span>{txt('Nouvelle Recommandation', 'New Recommendation', 'Nova Ficha')}</span>
                      </button>
                    </div>

                    {loadingPrescriptions ? (
                      <div className="py-12 text-center text-xs text-[#94A3B8] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                        A carregar recomendações...
                      </div>
                    ) : patientPrescriptions.length === 0 ? (
                      <div className="p-8 text-center bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-3">
                        <IconNotes size={36} className="mx-auto text-[#CBD5E1]" />
                        <p className="font-bold text-xs text-[#475569]">Nenhuma ficha de recomendações emitida</p>
                        <button
                          type="button"
                          onClick={() => setIsCreatePrescriptionOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold shadow-xs transition-all"
                        >
                          Criar Primeira Recomendação
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientPrescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="p-4 bg-white border border-[#E2E8F0] rounded-2xl hover:border-[#C49A3C] transition-all flex flex-col gap-3 shadow-xs"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-[#0F172A] text-xs bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                                  {rx.date}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8F5] text-[#9A7428] border border-[#E8E2D8]">
                                  {rx.items.length} itens prescritos
                                </span>
                              </div>
                              {rx.diagnosisOrGoal && (
                                <p className="font-bold text-sm sm:text-xs text-[#1E293B]">{rx.diagnosisOrGoal}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {rx.items.slice(0, 3).map((it, i) => (
                                  <span key={i} className="text-[10px] bg-[#F1F5F9] text-[#475569] font-medium px-2.5 py-1 rounded-md border border-[#E2E8F0]">
                                    {it.title}
                                  </span>
                                ))}
                                {rx.items.length > 3 && (
                                  <span className="text-[10px] text-[#94A3B8] font-bold self-center">
                                    +{rx.items.length - 3} mais
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Mobile-Friendly Action Toolbar */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0]">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPrescriptionForModal(rx);
                                  setIsPrescriptionDetailOpen(true);
                                }}
                                className="min-h-[42px] sm:min-h-0 sm:py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:bg-[#F8FAFC] active:scale-95 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs touch-target"
                                title="Ver / Imprimir PDF"
                              >
                                <IconPrinter size={16} />
                                <span>Imprimir / PDF</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const cleanPhone = rx.patientPhone.replace(/[^0-9]/g, '');
                                  const msg = encodeURIComponent(formatPrescriptionWhatsAppMessage(rx));
                                  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                }}
                                className="min-h-[42px] sm:min-h-0 sm:py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-95 border border-emerald-200 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs touch-target"
                                title="Enviar por WhatsApp"
                              >
                                <IconBrandWhatsapp size={16} />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeDossierTab === 'notes' && (
                  <div className="space-y-3">
                    <textarea
                      rows={8}
                      value={noteForm.content}
                      onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
                      placeholder={txt('Rédigez vos notes de suivi clinique...', 'Write your clinical session notes...', 'Escreva as notas de evolução clínica...')}
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-3.5 text-sm sm:text-xs font-sans text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-all"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={saveNote}
                        disabled={savingNote}
                        className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.98] text-white font-bold text-xs transition-all shadow-sm touch-target w-full sm:w-auto"
                      >
                        {savingNote ? txt('Enregistrement...', 'Saving...', 'A guardar...') : txt('Sauvegarder les Notes', 'Save Notes', 'Guardar Ficha')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 text-[#64748B] space-y-3 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#94A3B8]">
                <IconNotes size={32} />
              </div>
              <h3 className="font-bold text-base text-[#0F172A]">
                {txt('Sélectionnez un patient', 'Select a patient', 'Selecione um utente')}
              </h3>
              <p className="text-xs max-w-sm leading-relaxed">
                {txt('Choisissez une fiche patient dans la colonne de gauche pour consulter son dossier complet.', 'Pick a patient record to view their full EMR file.', 'Escolha uma ficha para consultar o processo clínico completo, recibos e recomendações.')}
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
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Nom Complet *', 'Full Name *', 'Nome Completo *')}
            </label>
            <input
              type="text"
              required
              value={newPatientForm.patientName}
              onChange={e => setNewPatientForm(p => ({ ...p, patientName: e.target.value }))}
              placeholder="Ex: Maria Silva"
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Téléphone *', 'Phone *', 'Telefone *')}
              </label>
              <input
                type="tel"
                required
                value={newPatientForm.phone}
                onChange={e => setNewPatientForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+351 912 345 678"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A] font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-[#475569] block mb-1">Email</label>
              <input
                type="email"
                value={newPatientForm.email}
                onChange={e => setNewPatientForm(p => ({ ...p, email: e.target.value }))}
                placeholder="paciente@email.pt"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Séances prescrites', 'Prescribed Sessions', 'Sessões prescritas')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={newPatientForm.totalPrescribedSessionsStr}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setNewPatientForm(p => ({ ...p, totalPrescribedSessionsStr: '' }));
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    setNewPatientForm(p => ({
                      ...p,
                      totalPrescribedSessionsStr: num <= 0 ? '' : String(Math.min(100, num)),
                    }));
                  }
                }}
                placeholder="10"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Médecin prescripteur', 'Referring Doctor', 'Médico Prescritor')}
              </label>
              <input
                type="text"
                value={newPatientForm.referringDoctor}
                onChange={e => setNewPatientForm(p => ({ ...p, referringDoctor: e.target.value }))}
                placeholder="Dr. Dupont"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Pathologies / Tags (séparés par virgule)', 'Pathologies (comma separated)', 'Patologias')}
            </label>
            <input
              type="text"
              value={newPatientForm.pathologyTags}
              onChange={e => setNewPatientForm(p => ({ ...p, pathologyTags: e.target.value }))}
              placeholder="Lombalgia, Escoliose..."
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}
            </label>
            <textarea
              rows={3}
              value={newPatientForm.medicalHistory}
              onChange={e => setNewPatientForm(p => ({ ...p, medicalHistory: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsNewPatientModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] font-bold text-xs"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs disabled:opacity-50 shadow-sm"
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
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Nom Complet *', 'Full Name *', 'Nome Completo *')}
            </label>
            <input
              type="text"
              required
              value={editPatientForm.patientName}
              onChange={e => setEditPatientForm(p => ({ ...p, patientName: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Téléphone *', 'Phone *', 'Telefone *')}
              </label>
              <input
                type="tel"
                required
                value={editPatientForm.phone}
                onChange={e => setEditPatientForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A] font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-[#475569] block mb-1">Email</label>
              <input
                type="email"
                value={editPatientForm.email}
                onChange={e => setEditPatientForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Séances prescrites', 'Prescribed Sessions', 'Sessões prescritas')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={editPatientForm.totalPrescribedSessionsStr}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditPatientForm(p => ({ ...p, totalPrescribedSessionsStr: '' }));
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    setEditPatientForm(p => ({
                      ...p,
                      totalPrescribedSessionsStr: num <= 0 ? '' : String(Math.min(100, num)),
                    }));
                  }
                }}
                placeholder="10"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Médecin prescripteur', 'Referring Doctor', 'Médico Prescritor')}
              </label>
              <input
                type="text"
                value={editPatientForm.referringDoctor}
                onChange={e => setEditPatientForm(p => ({ ...p, referringDoctor: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Pathologies / Tags', 'Pathologies / Tags', 'Patologias')}
            </label>
            <input
              type="text"
              value={editPatientForm.pathologyTags}
              onChange={e => setEditPatientForm(p => ({ ...p, pathologyTags: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Antécédents & Observations', 'Medical History', 'Histórico Médico')}
            </label>
            <textarea
              rows={3}
              value={editPatientForm.medicalHistory}
              onChange={e => setEditPatientForm(p => ({ ...p, medicalHistory: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsEditPatientModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] font-bold text-xs"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs disabled:opacity-50 shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Date *', 'Date *', 'Data *')}
              </label>
              <input
                type="date"
                required
                value={sessionForm.date}
                onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
            <div>
              <label className="font-bold text-[#475569] block mb-1">
                {txt('Heure', 'Time', 'Hora')}
              </label>
              <input
                type="time"
                value={sessionForm.time}
                onChange={e => setSessionForm(p => ({ ...p, time: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Soin dispensé *', 'Treatment *', 'Tratamento *')}
            </label>
            <select
              value={sessionForm.serviceSlug}
              onChange={e => setSessionForm(p => ({ ...p, serviceSlug: e.target.value }))}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            >
              {SERVICES.map(s => (
                <option key={s.slug} value={s.slug}>
                  {s.name[lang] || s.name.pt || s.name.fr}
                </option>
              ))}
            </select>
          </div>

          {/* EVA Score Picker */}
          <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-4 rounded-2xl">
            <EvaScorePicker
              value={sessionForm.evaPainScore}
              onChange={score => setSessionForm(p => ({ ...p, evaPainScore: score }))}
              lang={lang}
            />
          </div>

          <div>
            <label className="font-bold text-[#475569] block mb-1">
              {txt('Notes cliniques de séance', 'Session clinical notes', 'Notas clínicas')}
            </label>
            <textarea
              rows={3}
              value={sessionForm.notes}
              onChange={e => setSessionForm(p => ({ ...p, notes: e.target.value }))}
              placeholder={txt('Ex: mobilisation passive, étirements...', 'E.g. passive mobilization...', 'Ex: mobilização articular, alongamentos...')}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] rounded-xl p-3 text-sm sm:text-xs focus:outline-none focus:border-[#0F172A]"
            />
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsAddSessionModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] font-bold text-xs"
            >
              {txt('Annuler', 'Cancel', 'Cancelar')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs disabled:opacity-50 shadow-sm"
            >
              {submitting ? txt('Enregistrement...', 'Saving...', 'A registar...') : txt('Valider la Séance', 'Confirm Session', 'Confirmar Sessão')}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Direct Create Invoice Modal for Active Patient */}
      {activePatient && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onCreated={(newInv) => {
            fetchActivePatientInvoices(activePatient.phone);
            if (onRefreshPatients) onRefreshPatients();
            if (onActionToast) {
              onActionToast({
                type: 'success',
                title: 'Fatura-Recibo Emitida',
                message: `${newInv.invoiceNumber} — ${newInv.amount.toFixed(2)} €`,
              });
            }
          }}
          lang={lang}
          patients={patientsList}
          appointments={appointments}
          prefilledData={{
            patientId: activePatient.id,
            patientName: activePatient.patientName,
            patientPhone: activePatient.phone,
            patientEmail: activePatient.email || undefined,
            coverageType: activePatient.coverageType || 'PARTICULAR',
            coverageProvider: activePatient.coverageProvider || undefined,
            coverageNumber: activePatient.coverageNumber || undefined,
          }}
        />
      )}

      {/* Invoice Detail Viewer / Print */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForModal}
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoiceForModal(null);
        }}
        onUpdateStatus={async (id, newStatus, newMethod) => {
          try {
            await fetch(`/api/admin/invoices/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentStatus: newStatus,
                ...(newMethod ? { paymentMethod: newMethod } : {}),
              }),
            });
            if (activePatient) {
              fetchActivePatientInvoices(activePatient.phone, true);
            }
            if (selectedInvoiceForModal && selectedInvoiceForModal.id === id) {
              setSelectedInvoiceForModal(prev => (prev ? {
                ...prev,
                paymentStatus: newStatus,
                ...(newMethod ? { paymentMethod: newMethod } : {}),
                paidAt: newStatus === 'PAID' ? new Date().toISOString() : prev.paidAt,
              } : null));
            }
            if (onActionToast) {
              onActionToast({
                type: 'success',
                title: lang === 'pt' ? 'Estado Atualizado' : lang === 'fr' ? 'Statut mis à jour' : 'Status Updated',
                message: `${newStatus === 'PAID' ? (lang === 'fr' ? 'Payé' : lang === 'en' ? 'Paid' : 'Pago') : (lang === 'fr' ? 'En attente' : lang === 'en' ? 'Pending' : 'Pendente')}`,
              });
            }
          } catch {
            /* silent */
          }
        }}
        lang={lang}
      />

      {/* Create Prescription Modal */}
      {activePatient && (
        <CreatePrescriptionModal
          isOpen={isCreatePrescriptionOpen}
          onClose={() => setIsCreatePrescriptionOpen(false)}
          onCreated={(newRx) => {
            fetchActivePatientPrescriptions(activePatient.phone);
            if (onActionToast) {
              onActionToast({
                type: 'success',
                title: 'Ficha de Recomendações Emitida',
                message: `${newRx.items.length} itens prescritos para ${newRx.patientName}`,
              });
            }
          }}
          patientPhone={activePatient.phone}
          patientName={activePatient.patientName}
          patientId={activePatient.id}
          lang={lang}
        />
      )}

      {/* Multiple Sessions Scheduling Modal */}
      <MultipleSessionsModal
        isOpen={isMultipleSessionsModalOpen}
        onClose={() => setIsMultipleSessionsModalOpen(false)}
        lang={lang}
        patientsList={unifiedPatients}
        initialPatient={activePatient}
        onActionToast={onActionToast}
        onSuccess={() => {
          if (onRefreshPatients) onRefreshPatients();
        }}
      />

      {/* Prescription Detail Viewer / PDF / WhatsApp */}
      <PrescriptionDetailModal
        prescription={selectedPrescriptionForModal}
        isOpen={isPrescriptionDetailOpen}
        onClose={() => {
          setIsPrescriptionDetailOpen(false);
          setSelectedPrescriptionForModal(null);
        }}
        onDelete={async (id) => {
          await fetch(`/api/admin/prescriptions/${id}`, { method: 'DELETE' });
          if (activePatient) fetchActivePatientPrescriptions(activePatient.phone);
        }}
        lang={lang}
      />
    </div>
  );
}