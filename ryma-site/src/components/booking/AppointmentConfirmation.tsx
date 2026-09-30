'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconArrowUpRight, IconBrandWhatsapp, IconCalendarPlus,
  IconCheck, IconChevronDown, IconClock, IconCopy, IconDownload,
  IconMapPin, IconPhone, IconPrinter,
} from '@tabler/icons-react';
import { LogoIcon } from '@/components/ui/Logo';
import { useLanguage } from '@/lib/i18n';
import { getLocalizedText, type Service } from '@/data/services';
import { SITE } from '@/lib/site';
import { appointmentIcs, googleCalendarUrl, type AppointmentCalendarEvent } from '@/lib/appointment-calendar';
import styles from './AppointmentConfirmation.module.css';

const COPY = {
  en: {
    status: 'Appointment confirmed', title: 'Your appointment,', titleAccent: 'confirmed.',
    welcome: 'we look forward to welcoming you.', intro: 'A moment dedicated to your care, at Digital Clínica.',
    appointment: 'Your appointment', reserved: 'Reserved for you', date: 'Date', time: 'Time',
    localTime: 'Lisbon local time', patient: 'Patient', contact: 'Your contact details', coverage: 'Coverage',
    private: 'Private consultation', insurance: 'Health insurance', other: 'Other coverage',
    physiotherapy: 'Physiotherapy & rehabilitation', aesthetics: 'Advanced aesthetics',
    session: 'per session', location: 'We’ll meet you here', directions: 'Get directions',
    calendar: 'Add to calendar', calendarOptions: 'Choose your calendar', google: 'Google Calendar',
    download: 'Apple / Outlook (.ics)', print: 'Save or print', copy: 'Copy details', copied: 'Details copied',
    copyFailed: 'Could not copy. Use Save or print to keep your appointment details.',
    downloadFailed: 'Could not download. Please try Google Calendar or Save or print.',
    saved: 'Your calendar file is ready.', keep: 'Keep your appointment details close at hand.',
    before: 'Before we meet', beforeIntro: 'A few small details for a relaxed arrival.',
    arrival: 'Take your time', arrivalBody: 'Arrive 5–10 minutes early to settle in before your appointment.',
    bring: 'Bring the essentials', bringBody: 'Bring any relevant reports and your insurance details, if applicable.',
    change: 'Plans can change', changeBody: 'Contact our team if you need help with your appointment.',
    support: 'A question before your visit?', supportBody: 'Our team is here to help.',
    whatsapp: 'Message the clinic', home: 'Back to home',
    message: 'Hello, I have a question about my appointment:',
  },
  pt: {
    status: 'Marcação confirmada', title: 'A sua consulta,', titleAccent: 'confirmada.',
    welcome: 'será um prazer dar-lhe as boas-vindas.', intro: 'Um momento dedicado ao seu cuidado, na Digital Clínica.',
    appointment: 'A sua consulta', reserved: 'Reservado para si', date: 'Data', time: 'Hora',
    localTime: 'Hora local de Lisboa', patient: 'Utente', contact: 'Os seus contactos', coverage: 'Cobertura',
    private: 'Consulta particular', insurance: 'Seguro de saúde', other: 'Outra cobertura',
    physiotherapy: 'Fisioterapia & reabilitação', aesthetics: 'Estética avançada',
    session: 'por sessão', location: 'Esperamos por si aqui', directions: 'Como chegar',
    calendar: 'Adicionar ao calendário', calendarOptions: 'Escolha o seu calendário', google: 'Google Calendar',
    download: 'Apple / Outlook (.ics)', print: 'Guardar ou imprimir', copy: 'Copiar detalhes', copied: 'Detalhes copiados',
    copyFailed: 'Não foi possível copiar. Use Guardar ou imprimir para guardar os detalhes da consulta.',
    downloadFailed: 'Não foi possível transferir. Experimente Google Calendar ou Guardar ou imprimir.',
    saved: 'O ficheiro do calendário está pronto.', keep: 'Tenha os detalhes da sua consulta sempre à mão.',
    before: 'Antes da sua visita', beforeIntro: 'Pequenos detalhes para uma chegada tranquila.',
    arrival: 'Chegue com calma', arrivalBody: 'Chegue 5–10 minutos antes para se preparar com tranquilidade.',
    bring: 'Traga o essencial', bringBody: 'Traga os exames relevantes e os dados do seguro, se aplicável.',
    change: 'Os planos podem mudar', changeBody: 'Contacte a nossa equipa se precisar de ajuda com a sua consulta.',
    support: 'Alguma dúvida antes da visita?', supportBody: 'A nossa equipa está aqui para ajudar.',
    whatsapp: 'Contactar a clínica', home: 'Voltar ao início',
    message: 'Olá, tenho uma questão sobre a minha consulta:',
  },
  fr: {
    status: 'Rendez-vous confirmé', title: 'Votre rendez-vous,', titleAccent: 'confirmé.',
    welcome: 'nous avons hâte de vous accueillir.', intro: 'Un moment dédié à vos soins, chez Digital Clínica.',
    appointment: 'Votre rendez-vous', reserved: 'Réservé pour vous', date: 'Date', time: 'Heure',
    localTime: 'Heure locale de Lisbonne', patient: 'Patient', contact: 'Vos coordonnées', coverage: 'Couverture',
    private: 'Consultation privée', insurance: 'Assurance santé', other: 'Autre couverture',
    physiotherapy: 'Kinésithérapie & rééducation', aesthetics: 'Esthétique avancée',
    session: 'par séance', location: 'Retrouvez-nous ici', directions: 'Voir l’itinéraire',
    calendar: 'Ajouter au calendrier', calendarOptions: 'Choisissez votre calendrier', google: 'Google Calendar',
    download: 'Apple / Outlook (.ics)', print: 'Enregistrer ou imprimer', copy: 'Copier les détails', copied: 'Détails copiés',
    copyFailed: 'Copie impossible. Utilisez Enregistrer ou imprimer pour conserver les détails du rendez-vous.',
    downloadFailed: 'Téléchargement impossible. Essayez Google Calendar ou Enregistrer ou imprimer.',
    saved: 'Votre fichier calendrier est prêt.', keep: 'Gardez les détails de votre rendez-vous à portée de main.',
    before: 'Avant votre visite', beforeIntro: 'Quelques détails pour arriver en toute sérénité.',
    arrival: 'Prenez votre temps', arrivalBody: 'Arrivez 5 à 10 minutes en avance pour vous installer tranquillement.',
    bring: 'Apportez l’essentiel', bringBody: 'Apportez vos examens utiles et vos informations d’assurance, si nécessaire.',
    change: 'Un changement de programme ?', changeBody: 'Contactez notre équipe pour toute question sur votre rendez-vous.',
    support: 'Une question avant votre visite ?', supportBody: 'Notre équipe est là pour vous accompagner.',
    whatsapp: 'Contacter la clinique', home: 'Retour à l’accueil',
    message: 'Bonjour, j’ai une question sur mon rendez-vous :',
  },
};

export interface ConfirmationPatient {
  name: string;
  phone: string;
  email: string;
  coverageType: 'PARTICULAR' | 'INSURANCE' | 'ADSE' | 'OTHER';
  coverageProvider: string;
}

export function AppointmentConfirmation({ service, date, time, patient }: {
  service: Service;
  date: string;
  time: string;
  patient: ConfirmationPatient;
}) {
  const { lang } = useLanguage();
  const copy = COPY[lang];
  const locale = lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-GB';
  const serviceName = getLocalizedText(service.name, lang);
  const address = SITE.address[lang] || SITE.address.pt || '';
  const appointmentDate = new Date(`${date}T12:00:00`);
  const fullDate = appointmentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = patient.name.trim().split(/\s+/)[0];
  const coverage = patient.coverageType === 'ADSE' ? 'ADSE / Regime Livre'
    : patient.coverageType === 'INSURANCE' ? copy.insurance
    : patient.coverageType === 'OTHER' ? copy.other : copy.private;
  const coverageText = patient.coverageProvider ? `${coverage} · ${patient.coverageProvider}` : coverage;
  const summary = `${SITE.name}\n${copy.status}\n\n${serviceName}\n${fullDate} · ${time} (${copy.localTime})\n${patient.name.trim()}\n${address}\n${SITE.phone}`;
  const calendarEvent: AppointmentCalendarEvent = {
    service: serviceName, date, time, duration: parseInt(service.duration, 10) || 50,
    location: address, description: summary, lang,
    uid: `${date}-${time.replace(':', '')}-${service.slug}@digitalclinica.pt`,
  };
  const whatsappUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(`${copy.message}\n${serviceName}\n${fullDate} · ${time}\n${patient.name.trim()}`)}`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState('');
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const outside = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setCalendarOpen(false); calendarButtonRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [calendarOpen]);

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setFeedback(copy.copied);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch { setFeedback(copy.copyFailed); }
  };

  const downloadCalendar = () => {
    try {
      const blob = new Blob([appointmentIcs(calendarEvent)], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `digital-clinica-${date}.ics`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setCalendarOpen(false);
      calendarButtonRef.current?.focus();
      setFeedback(copy.saved);
    } catch { setFeedback(copy.downloadFailed); }
  };

  return (
    <section id="appointment-confirmation" className={styles.page} aria-labelledby="confirmation-title">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.status}><span className={styles.seal}><IconCheck size={17} stroke={1.7} aria-hidden="true" /></span>{copy.status}</div>
          <h1 id="confirmation-title" ref={headingRef} tabIndex={-1}>{copy.title} <em>{copy.titleAccent}</em></h1>
          <p><strong>{firstName}</strong>, {copy.welcome}<span>{copy.intro}</span></p>
        </header>

        <article className={styles.appointment} aria-label={copy.appointment}>
          <div className={styles.details}>
            <div className={styles.cardHeader}>
              <div className={styles.brand}><LogoIcon size={36} variant="dark" /><span>Digital Clínica<small>{getLocalizedText(SITE.city, lang)}</small></span></div>
              <span className={styles.cardEyebrow}>{copy.reserved}</span>
            </div>
            <div className={styles.treatment}>
              <span className={styles.eyebrow}>{service.pole === 'kinesitherapie' ? copy.physiotherapy : copy.aesthetics}</span>
              <h2>{serviceName}</h2>
              <div className={styles.treatmentMeta}><span><IconClock size={15} aria-hidden="true" />{service.duration}</span><i aria-hidden="true" /><span><strong>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(service.price)}</strong> {copy.session}</span></div>
            </div>
            <dl className={styles.patient}>
              <div><dt>{copy.patient}</dt><dd>{patient.name.trim()}</dd></div>
              <div><dt>{copy.coverage}</dt><dd>{coverageText}</dd></div>
              <div className={styles.contact}><dt>{copy.contact}</dt><dd>{patient.phone}<span>{patient.email}</span></dd></div>
            </dl>
            <div className={styles.location}>
              <IconMapPin size={21} stroke={1.5} aria-hidden="true" />
              <div><span className={styles.eyebrow}>{copy.location}</span><p>{address}</p></div>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">{copy.directions}<IconArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <div className={styles.schedule}>
            <div className={styles.scheduleStatus}><span />{copy.reserved}</div>
            <div className={styles.dateBlock}>
              <span className={styles.eyebrow}>{copy.date}</span>
              <time dateTime={date} aria-label={fullDate}>
                <span className={styles.day}>{appointmentDate.getDate().toString().padStart(2, '0')}</span>
                <span className={styles.month}>{appointmentDate.toLocaleDateString(locale, { month: 'long' })} <span>{appointmentDate.getFullYear()}</span></span>
                <span className={styles.weekday}>{appointmentDate.toLocaleDateString(locale, { weekday: 'long' })}</span>
              </time>
            </div>
            <div className={styles.timeBlock}><span className={styles.eyebrow}>{copy.time}</span><time dateTime={time}>{time}</time><span>{copy.localTime}</span></div>
            <span className={styles.scheduleFooter}>DIGITAL CLÍNICA <i /> LISBOA</span>
          </div>
        </article>

        <div className={styles.actions}>
          <div className={styles.calendarWrap} ref={calendarRef}>
            <button ref={calendarButtonRef} type="button" className={styles.primary} aria-expanded={calendarOpen} aria-controls="confirmation-calendar-options" onClick={() => setCalendarOpen(!calendarOpen)}><IconCalendarPlus size={19} stroke={1.6} aria-hidden="true" />{copy.calendar}<IconChevronDown size={15} aria-hidden="true" className={calendarOpen ? styles.rotated : ''} /></button>
            {calendarOpen && <div id="confirmation-calendar-options" className={styles.calendarOptions} role="group" aria-label={copy.calendarOptions}>
              <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer" onClick={() => setCalendarOpen(false)}><IconCalendarPlus size={18} aria-hidden="true" />{copy.google}<IconArrowUpRight size={15} aria-hidden="true" /></a>
              <button type="button" onClick={downloadCalendar}><IconDownload size={18} aria-hidden="true" />{copy.download}</button>
            </div>}
          </div>
          <button type="button" className={styles.secondary} onClick={() => window.print()}><IconPrinter size={18} stroke={1.6} aria-hidden="true" />{copy.print}</button>
          <button type="button" className={styles.secondary} onClick={copyDetails}>{copied ? <IconCheck size={18} aria-hidden="true" /> : <IconCopy size={18} stroke={1.6} aria-hidden="true" />}{copied ? copy.copied : copy.copy}</button>
          <p className={styles.actionNote}>{copy.keep}</p>
        </div>
        <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>

        <section className={styles.preparation} aria-labelledby="confirmation-preparation-title">
          <div className={styles.sectionHeading}><h2 id="confirmation-preparation-title">{copy.before}</h2><p>{copy.beforeIntro}</p></div>
          <ol className={styles.steps}>
            {[[copy.arrival, copy.arrivalBody], [copy.bring, copy.bringBody], [copy.change, copy.changeBody]].map(([title, body], index) => <li key={title}><span className={styles.stepNumber}>0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}
          </ol>
        </section>

        <aside className={styles.support}>
          <div><h2>{copy.support}</h2><p>{copy.supportBody}</p></div>
          <div className={styles.supportLinks}><a href={`tel:${SITE.phone.replace(/\s/g, '')}`} className={styles.phone}><IconPhone size={17} stroke={1.6} aria-hidden="true" />{SITE.phone}</a><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}><IconBrandWhatsapp size={19} stroke={1.6} aria-hidden="true" />{copy.whatsapp}<IconArrowUpRight size={16} aria-hidden="true" /></a></div>
        </aside>
        <div className={styles.home}><Link href="/"><IconArrowLeft size={15} aria-hidden="true" />{copy.home}</Link><span>Digital Clínica · {getLocalizedText(SITE.city, lang)}</span></div>
      </div>
    </section>
  );
}
