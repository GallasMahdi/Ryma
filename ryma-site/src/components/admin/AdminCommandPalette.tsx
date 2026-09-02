'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconSearch,
  IconX,
  IconCalendarEvent,
  IconClock,
  IconNotes,
  IconReceiptTax,
  IconChartBar,
  IconPlus,
  IconCalendarRepeat,
  IconRefresh,
  IconFileSpreadsheet,
  IconLanguage,
  IconLock,
  IconUser,
  IconPhone,
  IconSparkles,
  IconArrowRight,
  IconCornerDownLeft,
  IconShieldCheck,
  IconLifebuoy,
  IconWifi,
} from '@tabler/icons-react';
import { Lang } from '@/lib/i18n';
import { AdminTab } from './AdminMobileNav';
import { Appointment, PatientRecord, Invoice, PatientNote, getServiceName } from '@/types/admin';

export interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  appointments: Appointment[];
  patientsList: PatientRecord[];
  patientNotes: PatientNote[];
  invoices: Invoice[];
  onOpenNewAppointment: () => void;
  onOpenMultipleSessions?: () => void;
  onOpenCreateInvoice: () => void;
  onOpenCreatePrescription?: () => void;
  onSelectPatient: (patient: PatientRecord) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onRefresh: () => void;
  toggleLang: () => void;
  onLogout: () => void;
  onOpenHelpdesk?: () => void;
}

type PaletteCategory = 'all' | 'actions' | 'patients' | 'appointments' | 'invoices';

interface PaletteItem {
  id: string;
  category: 'action' | 'navigation' | 'patient' | 'appointment' | 'invoice';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  onSelect: () => void;
}

export function AdminCommandPalette({
  isOpen,
  onClose,
  lang,
  setActiveTab,
  appointments,
  patientsList,
  patientNotes,
  invoices,
  onOpenNewAppointment,
  onOpenMultipleSessions,
  onOpenCreateInvoice,
  onOpenCreatePrescription,
  onSelectPatient,
  onSelectAppointment,
  onRefresh,
  toggleLang,
  onLogout,
  onOpenHelpdesk,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PaletteCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const txt = (fr: string, en: string, pt: string) =>
    lang === 'fr' ? fr : lang === 'en' ? en : pt;

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setSelectedCategory('all');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Combine unified patients list
  const unifiedPatients = useMemo(() => {
    const list: PatientRecord[] = [...patientsList];
    const existingPhones = new Set(list.map((p) => p.phone));

    patientNotes.forEach((n) => {
      if (!existingPhones.has(n.phone)) {
        list.push({
          id: `legacy_${n.phone}`,
          patientName: n.patientName || txt('Sans Nom', 'Unnamed', 'Sem Nome'),
          phone: n.phone,
          medicalHistory: n.content,
          pathologyTags: n.tags,
          totalPrescribedSessions: 10,
          createdAt: n.updatedAt,
          updatedAt: n.updatedAt,
        });
      }
    });

    return list;
  }, [patientsList, patientNotes, lang]);

  // Compute all available items
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase().trim();
    const result: PaletteItem[] = [];

    // ── 1. Quick Actions ───────────────────────────────────────────────────
    const actions: PaletteItem[] = [
      {
        id: 'action-new-appointment',
        category: 'action',
        title: txt('Nouveau Rendez-vous', 'New Appointment', 'Nova Consulta'),
        subtitle: txt('Créer une consultation pour un patient', 'Book an appointment slot', 'Marcar consulta para utente'),
        badge: txt('Action', 'Action', 'Ação'),
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: IconPlus,
        onSelect: () => {
          onClose();
          onOpenNewAppointment();
        },
      },
      ...(onOpenMultipleSessions
        ? [
            {
              id: 'action-multiple-sessions',
              category: 'action',
              title: txt('Planifier Séances Multiples', 'Multiple Sessions / Treatment Plan', 'Marcar Múltiplas Sessões (Plano)'),
              subtitle: txt('Créer un forfait récurrent avec validation des créneaux', 'Book recurring plan with real-time slot blocking', 'Agendamento recorrente com validação e bloqueio'),
              badge: txt('Forfait', 'Plan', 'Pacote'),
              badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
              icon: IconCalendarRepeat,
              onSelect: () => {
                onClose();
                onOpenMultipleSessions();
              },
            } as PaletteItem,
          ]
        : []),
      {
        id: 'action-new-invoice',
        category: 'action',
        title: txt('Créer une Facture / Recibo', 'Create Invoice / Receipt', 'Emitir Fatura / Recibo'),
        subtitle: txt('Facturation avec calcul TVA & NIF', 'Invoice with VAT & tax receipt', 'Faturação com NIF e taxas'),
        badge: txt('Finances', 'Finance', 'Finanças'),
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: IconReceiptTax,
        onSelect: () => {
          onClose();
          onOpenCreateInvoice();
        },
      },
      ...(onOpenCreatePrescription
        ? [
            {
              id: 'action-new-prescription',
              category: 'action',
              title: txt('Nouvelle Prescription / Ordonnance', 'New Prescription / Care Pad', 'Novo Plano de Cuidados'),
              subtitle: txt('Recommandations kiné, exercices & conseils', 'Physio recommendations & exercises', 'Recomendações e exercícios'),
              badge: txt('EMR', 'EMR', 'Clínica'),
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
              icon: IconNotes,
              onSelect: () => {
                onClose();
                onOpenCreatePrescription();
              },
            } as PaletteItem,
          ]
        : []),
      {
        id: 'action-refresh',
        category: 'action',
        title: txt('Actualiser les Données', 'Refresh System Data', 'Atualizar Dados do Sistema'),
        subtitle: txt('Synchronisation en direct avec la base de données', 'Live refresh from server database', 'Sincronizar com base de dados'),
        badge: txt('Système', 'System', 'Sistema'),
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: IconRefresh,
        onSelect: () => {
          onClose();
          onRefresh();
        },
      },
      {
        id: 'action-export-csv',
        category: 'action',
        title: txt('Exporter les Rendez-vous (CSV)', 'Export Appointments (CSV)', 'Exportar Consultas (CSV)'),
        subtitle: txt('Téléchargement direct du tableur', 'Direct spreadsheet download', 'Descarregar ficheiro CSV'),
        badge: 'CSV',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: IconFileSpreadsheet,
        onSelect: () => {
          onClose();
          window.open('/api/admin/export?type=appointments', '_blank');
        },
      },
      {
        id: 'action-toggle-lang',
        category: 'action',
        title: txt('Changer de Langue (FR / EN / PT)', 'Switch Language (FR / EN / PT)', 'Mudar Idioma (FR / EN / PT)'),
        subtitle: txt(`Langue actuelle: ${lang.toUpperCase()}`, `Current language: ${lang.toUpperCase()}`, `Idioma atual: ${lang.toUpperCase()}`),
        badge: lang.toUpperCase(),
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: IconLanguage,
        onSelect: () => {
          toggleLang();
        },
      },
      ...(onOpenHelpdesk
        ? [
            {
              id: 'action-helpdesk',
              category: 'action',
              title: txt('Assistance & Support Technique Clinique', 'Clinic Support & Tech Helpdesk', 'Suporte Técnico & Helpdesk'),
              subtitle: txt('Urgences, diagnostic et cheatsheet réception', 'Emergencies, diagnostic & reception cheatsheet', 'Canais de emergência, diagnóstico e Wi-Fi'),
              badge: txt('Support', 'Helpdesk', 'Ajuda'),
              badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
              icon: IconLifebuoy,
              onSelect: () => {
                onClose();
                onOpenHelpdesk();
              },
            } as PaletteItem,
          ]
        : []),
      {
        id: 'action-logout',
        category: 'action',
        title: txt('Se Déconnecter', 'Sign Out / Logout', 'Terminar Sessão'),
        subtitle: txt('Fermer la session clinique sécurisée', 'End authenticated session', 'Fechar sessão segura'),
        badge: txt('Sécurité', 'Security', 'Segurança'),
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: IconLock,
        onSelect: () => {
          onClose();
          onLogout();
        },
      },
    ];

    // ── 2. Navigation Tabs ─────────────────────────────────────────────────
    const navItems: PaletteItem[] = [
      {
        id: 'nav-appointments',
        category: 'navigation',
        title: txt('Planning & Rendez-vous', 'Appointments & Schedule', 'Consultas & Agenda'),
        subtitle: txt('Liste des rendez-vous et KPIs', 'List of all bookings and metrics', 'Lista de consultas e métricas'),
        badge: `${appointments.length}`,
        badgeColor: 'bg-slate-900 text-white',
        icon: IconCalendarEvent,
        onSelect: () => {
          setActiveTab('appointments');
          onClose();
        },
      },
      {
        id: 'nav-slots',
        category: 'navigation',
        title: txt('Créneaux & Horaires', 'Slots & Availability', 'Vagas & Horários'),
        subtitle: txt('Gestion des disponibilités et blocages', 'Manage opening hours & blocked slots', 'Gestão de horários e bloqueios'),
        badge: txt('Agenda', 'Calendar', 'Agenda'),
        badgeColor: 'bg-blue-100 text-blue-800',
        icon: IconClock,
        onSelect: () => {
          setActiveTab('slots');
          onClose();
        },
      },
      {
        id: 'nav-patients',
        category: 'navigation',
        title: txt('Dossiers Patients (EMR & EVA)', 'Patient Records (EMR & Pain Scale)', 'Fichas de Utentes (Processos & EVA)'),
        subtitle: txt('Historique médical, séances et prescriptions', 'Medical history, sessions and care plans', 'Histórico clínico e sessões'),
        badge: `${unifiedPatients.length}`,
        badgeColor: 'bg-slate-900 text-white',
        icon: IconNotes,
        onSelect: () => {
          setActiveTab('patients');
          onClose();
        },
      },
      {
        id: 'nav-invoices',
        category: 'navigation',
        title: txt('Facturation & Recibos Fiscaux', 'Invoicing & Tax Receipts', 'Faturação & Recibos Fiscais'),
        subtitle: txt('Historique des factures et récapitulatif TVA', 'Invoice history and tax compliance', 'Histórico de faturas e recibos'),
        badge: `${invoices.length}`,
        badgeColor: 'bg-slate-900 text-white',
        icon: IconReceiptTax,
        onSelect: () => {
          setActiveTab('invoices');
          onClose();
        },
      },
      {
        id: 'nav-analytics',
        category: 'navigation',
        title: txt('Statistiques & Revenus', 'Analytics & Revenue Reports', 'Estatísticas & Receitas'),
        subtitle: txt('Graphiques de fréquentation et taux de présence', 'Attendance rates and clinic performance', 'Taxas de ocupação e métricas'),
        badge: txt('Rapports', 'Reports', 'Relatórios'),
        badgeColor: 'bg-indigo-100 text-indigo-800',
        icon: IconChartBar,
        onSelect: () => {
          setActiveTab('analytics');
          onClose();
        },
      },
    ];

    // Filter Actions & Navigation
    if (selectedCategory === 'all' || selectedCategory === 'actions') {
      const filteredActions = actions.filter(
        (a) => !q || a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
      );
      const filteredNav = navItems.filter(
        (n) => !q || n.title.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q)
      );
      result.push(...filteredActions, ...filteredNav);
    }

    // ── 3. Patients Search ─────────────────────────────────────────────────
    if (selectedCategory === 'all' || selectedCategory === 'patients') {
      const patientItems: PaletteItem[] = unifiedPatients
        .filter((p) => {
          if (!q) return selectedCategory === 'patients'; // show all if explicitly in patients tab
          return (
            p.patientName.toLowerCase().includes(q) ||
            p.phone.toLowerCase().includes(q) ||
            (p.email && p.email.toLowerCase().includes(q)) ||
            (p.pathologyTags && p.pathologyTags.toLowerCase().includes(q)) ||
            (p.referringDoctor && p.referringDoctor.toLowerCase().includes(q))
          );
        })
        .slice(0, 15)
        .map((p) => {
          const isInsured = p.coverageType && p.coverageType !== 'PARTICULAR';
          return {
            id: `patient-${p.id}`,
            category: 'patient',
            title: p.patientName,
            subtitle: `${p.phone}${p.email ? ` • ${p.email}` : ''}${p.pathologyTags ? ` • [${p.pathologyTags}]` : ''}`,
            badge: isInsured
              ? (p.coverageType === 'ADSE' ? 'ADSE' : p.coverageProvider || txt('Mutuelle', 'Insurance', 'Seguro'))
              : txt('Utente', 'Patient', 'Utente'),
            badgeColor: isInsured
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-700 border-slate-200',
            icon: IconUser,
            onSelect: () => {
              onSelectPatient(p);
              onClose();
            },
          };
        });
      result.push(...patientItems);
    }

    // ── 4. Appointments Search ─────────────────────────────────────────────
    if (selectedCategory === 'all' || selectedCategory === 'appointments') {
      const apptItems: PaletteItem[] = appointments
        .filter((a) => {
          if (a.status === 'CANCELLED') return false;
          if (!q) return selectedCategory === 'appointments';
          const svcName = getServiceName(a.service, lang).toLowerCase();
          return (
            a.patientName.toLowerCase().includes(q) ||
            a.phone.toLowerCase().includes(q) ||
            a.date.includes(q) ||
            a.startTime.includes(q) ||
            a.status.toLowerCase().includes(q) ||
            svcName.includes(q)
          );
        })
        .slice(0, 15)
        .map((a) => {
          const statusColors: Record<string, string> = {
            CONFIRMED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
            COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
            CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
          };

          return {
            id: `appt-${a.id}`,
            category: 'appointment',
            title: `${a.patientName} — ${a.date} ${a.startTime}`,
            subtitle: `${getServiceName(a.service, lang)} • 📞 ${a.phone}`,
            badge: a.status,
            badgeColor: statusColors[a.status] || 'bg-slate-100 text-slate-700',
            icon: IconCalendarEvent,
            onSelect: () => {
              onSelectAppointment(a);
              onClose();
            },
          };
        });
      result.push(...apptItems);
    }

    // ── 5. Invoices Search ─────────────────────────────────────────────────
    if (selectedCategory === 'all' || selectedCategory === 'invoices') {
      const invoiceItems: PaletteItem[] = invoices
        .filter((inv) => {
          if (!q) return selectedCategory === 'invoices';
          return (
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.patientName.toLowerCase().includes(q) ||
            (inv.patientNif && inv.patientNif.includes(q)) ||
            inv.paymentStatus.toLowerCase().includes(q) ||
            inv.serviceName.toLowerCase().includes(q)
          );
        })
        .slice(0, 15)
        .map((inv) => {
          const formattedDate = inv.createdAt ? inv.createdAt.split('T')[0] : '';
          return {
            id: `invoice-${inv.id}`,
            category: 'invoice',
            title: `${inv.invoiceNumber} • ${inv.patientName}`,
            subtitle: `${formattedDate} • ${inv.serviceName} • NIF: ${inv.patientNif || 'Consumidor Final'}`,
            badge: `${inv.amount.toFixed(2)} €`,
            badgeColor:
              inv.paymentStatus === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-amber-100 text-amber-800 border-amber-200',
            icon: IconReceiptTax,
            onSelect: () => {
              setActiveTab('invoices');
              onClose();
            },
          };
        });
      result.push(...invoiceItems);
    }

    return result;
  }, [
    query,
    selectedCategory,
    appointments,
    unifiedPatients,
    invoices,
    lang,
    onClose,
    onOpenNewAppointment,
    onOpenCreateInvoice,
    onOpenCreatePrescription,
    onRefresh,
    toggleLang,
    onLogout,
    setActiveTab,
    onSelectPatient,
    onSelectAppointment,
  ]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length, query, selectedCategory]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(`[data-palette-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[999999] flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 font-sans select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-sm touch-none"
            aria-hidden="true"
          />

          {/* Palette Box */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className="relative z-10 w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] overscroll-contain"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-[#E2E8F0] gap-3 bg-[#FAFAF9]/80">
              <IconSearch size={20} className="text-[#64748B] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={txt(
                  'Rechercher patient, action, RDV, facture, commande...',
                  'Search patient, action, appointment, invoice, command...',
                  'Pesquisar utente, ação, consulta, fatura, comando...'
                )}
                className="w-full bg-transparent text-sm sm:text-base text-[#0F172A] placeholder:text-[#94A3B8] font-medium outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
                >
                  <IconX size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-bold text-[#64748B] bg-white border border-[#CBD5E1] rounded-md shadow-2xs">
                ESC
              </kbd>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#E2E8F0] bg-white overflow-x-auto no-scrollbar">
              {[
                { id: 'all' as const, label: txt('Tout', 'All', 'Tudo') },
                { id: 'actions' as const, label: txt('Actions & Menu', 'Actions & Menu', 'Ações & Menu') },
                { id: 'patients' as const, label: txt('Patients', 'Patients', 'Utentes') },
                { id: 'appointments' as const, label: txt('Rendez-vous', 'Appointments', 'Consultas') },
                { id: 'invoices' as const, label: txt('Factures', 'Invoices', 'Faturas') },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    inputRef.current?.focus();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#0F172A] text-white shadow-2xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="overflow-y-auto p-2 space-y-1 flex-1 custom-scrollbar min-h-[220px] max-h-[460px]"
            >
              {items.length === 0 ? (
                <div className="text-center py-12 px-4 text-[#64748B]">
                  <IconSparkles size={28} className="mx-auto text-[#94A3B8] mb-2" />
                  <p className="font-semibold text-xs text-[#0F172A]">
                    {txt('Aucun résultat trouvé', 'No matching results', 'Nenhum resultado encontrado')}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    {txt(
                      'Essayez de rechercher par nom, téléphone, statut ou commande.',
                      'Try searching by name, phone, status or action command.',
                      'Tente pesquisar por nome, telefone, estado ou comando.'
                    )}
                  </p>
                </div>
              ) : (
                items.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-palette-index={idx}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                        isSelected
                          ? 'bg-[#0F172A] text-white shadow-xs'
                          : 'bg-white hover:bg-[#F8FAFC] text-[#1E293B]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[#F1F5F9] text-[#64748B] group-hover:text-[#0F172A] group-hover:bg-[#E2E8F0]'
                          }`}
                        >
                          <Icon size={18} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-white' : 'text-[#0F172A]'
                            }`}
                          >
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div
                              className={`text-[11px] truncate mt-0.5 ${
                                isSelected ? 'text-white/70' : 'text-[#64748B]'
                              }`}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border text-center ${
                              isSelected
                                ? 'bg-white/20 text-white border-white/30'
                                : item.badgeColor || 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        <IconCornerDownLeft
                          size={14}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                            isSelected ? 'text-white opacity-100' : 'text-[#94A3B8]'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Keyboard Footer Guide */}
            <div className="px-4 py-2.5 bg-[#FAFAF9] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[10px] font-mono font-bold shadow-2xs">
                    ↑
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[10px] font-mono font-bold shadow-2xs">
                    ↓
                  </kbd>
                  <span>{txt('Naviguer', 'Navigate', 'Navegar')}</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-[#CBD5E1] rounded text-[10px] font-mono font-bold shadow-2xs">
                    ↵
                  </kbd>
                  <span>{txt('Ouvrir', 'Select', 'Selecionar')}</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                {items.length} {txt('résultats', 'results', 'resultados')}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
