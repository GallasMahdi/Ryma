'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  IconCalendarEvent, IconListCheck, IconUsers, IconChartBar,
  IconReceiptTax, IconMessageHeart, IconStethoscope, IconUsersGroup,
  IconLayoutGrid, IconX, IconChevronRight, IconCheck, IconLock,
  IconLockOpen, IconPlus, IconLanguage, IconRefresh, IconLifebuoy, IconLogout,
} from '@tabler/icons-react';
import type { Lang } from '@/lib/i18n';
import styles from './AdminMobileNav.module.css';

export type AdminTab = 'appointments' | 'slots' | 'patients' | 'invoices' | 'reviews' | 'analytics' | 'team' | 'treatments';

interface AdminMobileNavProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  lang: Lang;
  totalAppointments: number;
  totalNotes: number;
  totalInvoices?: number;
  totalReviews?: number;
  isAnalyticsUnlocked?: boolean;
  onOpenAddModal: () => void;
  onToggleLang: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenHelpdesk: () => void;
  onLogout: () => void;
}

const prefetchTab = (tab: AdminTab) => {
  if (tab === 'treatments') void import('./TreatmentsTab');
  else if (tab === 'slots') void import('./SlotsTab');
  else if (tab === 'patients') void import('./PatientNotesTab');
  else if (tab === 'invoices') void import('./InvoicesTab');
  else if (tab === 'reviews') void import('./ReviewsTab');
  else if (tab === 'team') void import('./PractitionersTab');
};

export const AdminMobileNav = React.memo(function AdminMobileNav({
  activeTab, setActiveTab, lang, totalAppointments, totalNotes,
  totalInvoices = 0, totalReviews = 0, isAnalyticsUnlocked = false,
  onOpenAddModal, onToggleLang, onRefresh, isRefreshing, onOpenHelpdesk, onLogout,
}: AdminMobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sheetId = useId();
  const txt = (pt: string, en: string, fr: string, es: string) => lang === 'es' ? es : lang === 'pt' ? pt : lang === 'fr' ? fr : en;
  const primaryTabs = [
    { id: 'appointments' as const, label: txt('Consultas', 'Visits', 'RDV', "Visitas"), name: txt('Consultas', 'Appointments', 'Rendez-vous', "Citas"), icon: IconListCheck, count: totalAppointments },
    { id: 'slots' as const, label: txt('Agenda', 'Schedule', 'Agenda', "Agenda"), name: txt('Agenda', 'Schedule', 'Agenda', "Agenda"), icon: IconCalendarEvent, count: 0 },
    { id: 'patients' as const, label: txt('Utentes', 'Patients', 'Patients', "Pacientes"), name: txt('Utentes', 'Patients', 'Patients', "Pacientes"), icon: IconUsers, count: totalNotes },
    { id: 'invoices' as const, label: txt('Recibos', 'Invoices', 'Factures', "Facturas"), name: txt('Recibos', 'Invoices', 'Factures', "Facturas"), icon: IconReceiptTax, count: totalInvoices },
  ];
  const secondaryTabs = [
    { id: 'reviews' as const, label: txt('Avaliações', 'Reviews', 'Avis', "Opiniones"), description: txt('Opiniões dos utentes', 'Patient feedback', 'Retours des patients', "Opiniones de pacientes"), icon: IconMessageHeart, count: totalReviews },
    { id: 'treatments' as const, label: txt('Tratamentos', 'Treatments', 'Soins', "Tratamientos"), description: txt('Catálogo de cuidados', 'Your care catalogue', 'Catalogue de soins', "Su catálogo de tratamientos"), icon: IconStethoscope, count: 0 },
    { id: 'team' as const, label: txt('Equipa', 'Team', 'Équipe', "Equipo"), description: txt('Profissionais e horários', 'People and working hours', 'Praticiens et horaires', "Profesionales y horarios"), icon: IconUsersGroup, count: 0 },
    { id: 'analytics' as const, label: txt('Estatísticas', 'Analytics', 'Statistiques', "Estadísticas"), description: txt('Relatórios e receitas', 'Reports and revenue', 'Rapports et revenus', "Informes e ingresos"), icon: IconChartBar, count: 0 },
  ];
  const activeSecondary = secondaryTabs.find(tab => tab.id === activeTab);
  const MoreIcon = activeSecondary?.icon ?? IconLayoutGrid;
  const moreLabel = txt('Mais', 'More', 'Plus', "Más");
  const selectedLabel = txt('Selecionado', 'Selected', 'Sélectionné', "Seleccionado");
  const lockLabel = isAnalyticsUnlocked ? txt('Desbloqueado', 'Unlocked', 'Déverrouillé', "Desbloqueado") : txt('Protegido', 'Locked', 'Verrouillé', "Bloqueado");
  const countLabel = (count: number) => txt(`${count} registos`, `${count} records`, `${count} éléments`, `${count} registros`);

  const closeMore = () => {
    dialogRef.current?.close();
    setMoreOpen(false);
  };

  const runAction = (action: () => void) => {
    closeMore();
    action();
  };

  useEffect(() => {
    if (!moreOpen) return;
    const dialog = dialogRef.current;
    const desktop = window.matchMedia('(min-width: 1024px)');
    if (desktop.matches) {
      setMoreOpen(false);
      return;
    }
    dialog?.showModal();
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        dialog?.close();
        setMoreOpen(false);
      }
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      dialog?.close();
    };
  }, [moreOpen]);

  return (
    <>
      <nav className={styles.nav} aria-label={txt('Navegação do painel', 'Dashboard navigation', 'Navigation du tableau de bord', "Navegación del panel")}>
        <div className={styles.bar}>
          {primaryTabs.map(({ id, label, name, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              className={styles.tab}
              aria-label={count > 0 ? `${name}, ${countLabel(count)}` : name}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              onPointerEnter={() => prefetchTab(id)}
              onPointerDown={() => prefetchTab(id)}
              onFocus={() => prefetchTab(id)}
            >
              <span className={styles.icon}><Icon size={26} strokeWidth={activeTab === id ? 2.2 : 1.9} aria-hidden="true" /></span>
              <span className={styles.label}>{label}</span>
            </button>
          ))}
          <button
            type="button"
            className={styles.tab}
            data-active={!!activeSecondary || moreOpen}
            aria-label={activeSecondary ? `${moreLabel}: ${activeSecondary.label}, ${selectedLabel}` : moreLabel}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls={sheetId}
            onClick={() => setMoreOpen(true)}
          >
            <span className={styles.icon}><MoreIcon size={26} strokeWidth={activeSecondary || moreOpen ? 2.2 : 1.9} aria-hidden="true" /></span>
            <span className={styles.label}>{moreLabel}</span>
          </button>
        </div>
      </nav>

      <dialog
        ref={dialogRef}
        id={sheetId}
        className={styles.sheet}
        aria-labelledby={`${sheetId}-title`}
        onCancel={event => { event.preventDefault(); closeMore(); }}
        onClose={() => setMoreOpen(false)}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMore();
        }}
      >
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.sheetHeader}>
          <div>
            <p className={styles.eyebrow}>Digital Clínica</p>
            <h2 id={`${sheetId}-title`}>{txt('O seu espaço', 'Your workspace', 'Votre espace', "Su espacio de trabajo")}</h2>
          </div>
          <button type="button" className={styles.close} onClick={closeMore} aria-label={txt('Fechar menu', 'Close menu', 'Fermer le menu', "Cerrar menú")} autoFocus><IconX size={20} /></button>
        </div>

        <div className={styles.destinations}>
          {secondaryTabs.map(({ id, label, description, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              className={styles.destination}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => runAction(() => setActiveTab(id))}
              onPointerEnter={() => prefetchTab(id)}
              onPointerDown={() => prefetchTab(id)}
              onFocus={() => prefetchTab(id)}
            >
              <span className={styles.destinationIcon}><Icon size={25} strokeWidth={1.9} aria-hidden="true" /></span>
              <span className={styles.destinationText}><span className={styles.destinationLabel}>{label}
                {count > 0 && <span className={styles.sheetCount}>{count > 99 ? '99+' : count}</span>}
              </span><span className={styles.description}>{description}</span></span>
              {id === 'analytics' && <span className={styles.lock} role="img" aria-label={lockLabel}>{isAnalyticsUnlocked ? <IconLockOpen size={16} /> : <IconLock size={16} />}</span>}
              {activeTab === id ? <IconCheck size={18} className={styles.selected} aria-label={selectedLabel} /> : <IconChevronRight size={16} className={styles.chevron} aria-hidden="true" />}
            </button>
          ))}
        </div>

        <button type="button" className={styles.newAppointment} onClick={() => runAction(onOpenAddModal)}>
          <IconPlus size={19} aria-hidden="true" />{txt('Nova consulta', 'New appointment', 'Nouveau rendez-vous', "Nueva cita")}
        </button>
        <div className={styles.utilities}>
          <button type="button" onClick={onToggleLang} aria-label={txt('Mudar idioma', 'Switch language', 'Changer de langue', "Cambiar idioma")}><IconLanguage size={19} aria-hidden="true" /><span>{lang.toUpperCase()}</span></button>
          <button type="button" onClick={() => runAction(onRefresh)} disabled={isRefreshing}><IconRefresh size={19} aria-hidden="true" /><span>{txt('Atualizar', 'Refresh', 'Actualiser', "Actualizar")}</span></button>
          <button type="button" onClick={() => runAction(onOpenHelpdesk)}><IconLifebuoy size={19} aria-hidden="true" /><span>{txt('Ajuda', 'Help', 'Aide', "Ayuda")}</span></button>
          <button type="button" onClick={() => runAction(onLogout)}><IconLogout size={19} aria-hidden="true" /><span>{txt('Sair', 'Sign out', 'Quitter', "Cerrar sesión")}</span></button>
        </div>
      </dialog>
    </>
  );
});
