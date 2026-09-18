'use client';
import React, { useState, useMemo, memo, useId, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage, type Translations, type Lang } from '@/lib/i18n';
import { SERVICES, Service, getLocalizedText, getLocalizedList } from '@/data/services';
import { Button } from '@/components/ui/Button';
import { IconX, IconArrowRight, IconClock, IconCalendarPlus, IconCheck, IconBan, IconChevronDown, IconChevronUp, IconBodyScan, IconLungs, IconHandGrab, IconWalk, IconBone, IconMapPin, IconSearch, IconAdjustmentsHorizontal, IconStethoscope, IconFlame, IconDroplet, IconSparkles } from '@tabler/icons-react';
import { AnatomicalSVGViewer } from './body3d/AnatomicalSVGViewer';
import styles from './BodyMap.module.css';
export type BodyZone = 'all' | 'torso' | 'legs' | 'arms' | 'back';
type ViewSide = 'front' | 'back';

interface MapPoint {
  serviceSlug: string;
  cx: number;
  cy: number;
  position3D?: [number, number, number];
  zone: BodyZone;
  label: { fr: string; pt?: string; en?: string; ar?: string };
}

const BORDER = '#e4e5de';

/* Zone system — uniform medical gold accent on all zones */
const ZONE_ICONS: Record<BodyZone, React.ReactNode> = {
  all:   <IconBodyScan size={13} />,
  torso: <IconLungs size={13} />,
  legs:  <IconWalk size={13} />,
  arms:  <IconHandGrab size={13} />,
  back:  <IconBone size={13} />,
};

const ZONE_LABELS: Record<BodyZone, { fr: string; pt: string; en: string }> = {
  all:   { fr: 'Tout le corps', pt: 'Corpo Inteiro', en: 'Full Body' },
  torso: { fr: 'Buste & Abdomen', pt: 'Torso e Abdómen', en: 'Torso & Abdomen' },
  legs:  { fr: 'Membres Inférieurs', pt: 'Membros Inferiores', en: 'Lower Limbs' },
  arms:  { fr: 'Membres Supérieurs', pt: 'Membros Superiores', en: 'Upper Limbs' },
  back:  { fr: 'Rachis & Dos', pt: 'Coluna e Costas', en: 'Spine & Back' },
};

const ZONE_ORDER: BodyZone[] = ['all', 'torso', 'legs', 'arms', 'back'];

const FRONT_POINTS: MapPoint[] = [
  { serviceSlug: 'bilan-minceur', cx: 50, cy: 14, position3D: [0.0, 1.54, 0.12], zone: 'all', label: { fr: 'Diagnostic Global', pt: 'Avaliação Global', en: 'Global Assessment' } },
  { serviceSlug: 'electrotherapie', cx: 76, cy: 36, position3D: [0.20, 1.34, 0.10], zone: 'arms', label: { fr: 'Articulations Épaules', pt: 'Ombros e Articulações', en: 'Shoulders & Joints' } },
  { serviceSlug: 'drainage-lymphatique', cx: 24, cy: 42, position3D: [-0.22, 1.22, 0.08], zone: 'arms', label: { fr: 'Membres Supérieurs', pt: 'Membros Superiores', en: 'Upper Limbs' } },
  { serviceSlug: 'cavitation', cx: 50, cy: 50, position3D: [0.0, 1.02, 0.20], zone: 'torso', label: { fr: 'Sangle Abdominale', pt: 'Zona Abdominal', en: 'Abdominal Wall' } },
  { serviceSlug: 'radiofrequence', cx: 31, cy: 50, position3D: [-0.15, 0.98, 0.16], zone: 'torso', label: { fr: 'Hanches & Taille', pt: 'Ancas e Cintura', en: 'Hips & Waist' } },
  { serviceSlug: 'cryolipolyse', cx: 39, cy: 57, position3D: [0.15, 0.94, 0.16], zone: 'torso', label: { fr: "Poignées d'amour", pt: 'Gordura Localizada', en: 'Love Handles' } },
  { serviceSlug: 'reeducation-post-partum', cx: 50, cy: 58, position3D: [0.0, 0.84, 0.18], zone: 'torso', label: { fr: 'Périnée & Bassin', pt: 'Períneo e Bacia', en: 'Pelvic Floor & Pelvis' } },
  { serviceSlug: 'ultrasons', cx: 73, cy: 52, position3D: [0.11, 0.68, 0.15], zone: 'legs', label: { fr: 'Quadriceps / Cuisse', pt: 'Quadríceps / Coxa', en: 'Quadriceps / Thigh' } },
  { serviceSlug: 'laser-lipo', cx: 67, cy: 56, position3D: [-0.10, 0.48, 0.16], zone: 'legs', label: { fr: 'Genoux & Articulations', pt: 'Joelhos e Articulações', en: 'Knees & Joints' } },
  { serviceSlug: 'pressotherapie', cx: 50, cy: 72, position3D: [0.0, 0.32, 0.14], zone: 'legs', label: { fr: 'Membres Inférieurs', pt: 'Membros Inferiores', en: 'Lower Limbs' } },
];

const BACK_POINTS: MapPoint[] = [
  { serviceSlug: 'reeducation-posturale', cx: 50, cy: 28, position3D: [0.0, 1.30, 0.16], zone: 'back', label: { fr: 'Rachis & Omoplates', pt: 'Coluna e Omoplatas', en: 'Spine & Shoulder Blades' } },
  { serviceSlug: 'massage-therapeutique', cx: 50, cy: 42, position3D: [0.0, 1.05, 0.18], zone: 'back', label: { fr: 'Région Lombaire', pt: 'Região Lombar', en: 'Lumbar Region' } },
  { serviceSlug: 'massage-amincissant', cx: 55, cy: 62, position3D: [0.11, 0.82, 0.18], zone: 'legs', label: { fr: 'Fessiers & Ischios', pt: 'Glúteos e Isquiotibiais', en: 'Glutes & Hamstrings' } },
  { serviceSlug: 'drainage-lymphatique', cx: 26, cy: 44, position3D: [-0.22, 1.20, 0.08], zone: 'arms', label: { fr: 'Bras Postérieur', pt: 'Braço Posterior', en: 'Posterior Arm' } },
];

export type MedicalGoal = 'all' | 'douleur' | 'minceur' | 'drainage' | 'post-partum';

const MEDICAL_GOALS: { id: MedicalGoal; label: { fr: string; pt: string; en: string }; icon: React.ReactNode }[] = [
  { id: 'all',         label: { fr: 'Tous les objectifs',       pt: 'Todos os Objetivos',    en: 'All Goals' }, icon: <IconSparkles size={14} /> },
  { id: 'douleur',     label: { fr: 'Anti-douleur & Santé',    pt: 'Alívio da Dor e Saúde', en: 'Pain Relief & Health' }, icon: <IconStethoscope size={14} /> },
  { id: 'minceur',     label: { fr: 'Minceur & Remodelage',    pt: 'Emagrecimento e Escultura', en: 'Slimming & Sculpting' }, icon: <IconFlame size={14} /> },
  { id: 'drainage',    label: { fr: 'Drainage & Lymphe',       pt: 'Drenagem e Linfa',       en: 'Drainage & Lymph' }, icon: <IconDroplet size={14} /> },
  { id: 'post-partum', label: { fr: 'Post-Partum & Périnée',   pt: 'Pós-Parto e Períneo',    en: 'Postpartum & Pelvic Floor' }, icon: <IconAdjustmentsHorizontal size={14} /> },
];

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1 py-3.5 px-3.5 rounded-2xl bg-[#f7f8f3] border border-[#e4e5de] shadow-2xs"
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8078]"
      >
        {label}
      </span>
      <span
        className="text-lg font-bold font-mono leading-tight text-[#292c28]"
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-[#8A8078]">
          {sub}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accordion (for contraindications collapse)                          */
/* ------------------------------------------------------------------ */

function Accordion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-left focus-visible:outline-none text-[#68715f] hover:text-[#292c28] transition-colors"
      >
        <span>{label}</span>
        <span className="text-[#526943]">
          {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Service Detail Card                                                 */
/* ------------------------------------------------------------------ */

interface ServiceDetailCardProps {
  point: MapPoint;
  service: Service;
  lang: Lang;
  t: Translations;
  onClose: () => void;
  hideClose?: boolean;
}

const ServiceDetailCard = memo(function ServiceDetailCard({
  point,
  service,
  lang,
  t,
  onClose,
  hideClose = false,
}: ServiceDetailCardProps) {
  const panelId = useId();
  const reduced = useReducedMotion();

  const isKine = service.pole === 'kinesitherapie';
  const poleBadgeLabel = isKine
    ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
    : lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming Care' : 'Soin Minceur';

  return (
    <motion.div
      key={service.slug}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      role="region"
      aria-live="polite"
      aria-labelledby={`${panelId}-name`}
      className="flex flex-col overflow-hidden rounded-3xl max-h-full bg-white border border-[#e4e5de] shadow-none"
    >
      {/* Subtle accent for the selected treatment */}
      <div className="h-1 bg-gradient-to-r from-[#748461] via-[#b9c8a9] to-[#526943] shrink-0" />

      {/* Scrollable body */}
      <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="p-4 pb-0 sm:p-6 sm:pb-0">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    isKine
                      ? 'bg-[#e8eddf] text-[#526943] border border-[#748461]/30'
                      : 'bg-[#FDFAF4] text-[#748461] border border-[#748461]/30'
                  }`}
                >
                  {poleBadgeLabel}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold bg-[#f7f8f3] text-[#68715f] border border-[#e4e5de]"
                >
                  <IconMapPin size={10} className="text-[#748461]" aria-hidden="true" />
                  {getLocalizedText(point.label, lang)}
                </span>
              </div>

              <h3
                id={`${panelId}-name`}
                className="font-serif text-2xl font-bold leading-tight text-[#292c28]"
              >
                {getLocalizedText(service.name, lang)}
              </h3>
            </div>

            {/* Close button — hidden when parent (e.g. bottom sheet) provides its own */}
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'pt' ? 'Fechar' : lang === 'en' ? 'Close' : 'Fermer'}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#292c28] text-white shadow-md hover:bg-[#748461] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#748461] active:scale-95"
              >
                <IconX size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Key metrics */}
          <div className={styles.detailStats}>
            <StatCell
              label={lang === 'pt' ? 'Valor' : lang === 'en' ? 'Rate' : 'Tarif'}
              value={<span className="text-[#748461]">{service.price} <span className="text-sm font-medium text-[#8A8078]">{t.common.currency}</span></span>}
            />
            <StatCell
              label={lang === 'pt' ? 'Duração' : lang === 'en' ? 'Duration' : 'Durée'}
              value={<span className="text-[#292c28]">{service.duration}</span>}
              sub={<span className="flex items-center gap-1 text-[#8A8078]"><IconClock size={10} className="text-[#748461]" />{lang === 'pt' ? 'por sessão' : lang === 'en' ? 'per session' : 'par session'}</span>}
            />
            <StatCell
              label={lang === 'pt' ? 'Seguro / ADSE' : lang === 'en' ? 'Insurance' : 'Mutuelle / Assur.'}
              value={
                isKine ? (
                  <span className="text-xs font-bold text-[#15803D]">
                    {lang === 'pt' ? 'Elegível p/ Recibo' : lang === 'en' ? 'Receipt Provided' : 'Reçu délivré'}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#8A8078]">
                    {lang === 'pt' ? 'Regime Privado' : lang === 'en' ? 'Private Care' : 'Soin Privé'}
                  </span>
                )
              }
            />
          </div>

          {/* Short description */}
          <p
            className="text-sm leading-relaxed mb-5 text-[#68715f]"
          >
            {getLocalizedText(service.shortDesc, lang)}
          </p>

          {/* Indications — clean checklist */}
          {getLocalizedList(service.indications, lang).length > 0 && (
            <div className="mb-5 bg-[#f7f8f3] p-4 rounded-2xl border border-[#e4e5de]">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-3 text-[#526943]"
              >
                {t.servicePage.indicationsTitle}
              </h4>
              <ul className="space-y-2">
                {getLocalizedList(service.indications, lang).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#332D28]">
                    <IconCheck
                      size={14}
                      className="mt-0.5 shrink-0 text-[#748461]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Protocol steps */}
          {getLocalizedList(service.sessionFlow, lang).length > 0 && (
            <div className="mb-5 bg-white p-4 rounded-2xl border border-[#e4e5de]">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-3 text-[#292c28]"
              >
                {t.servicePage.sessionTitle}
              </h4>
              <ol className="space-y-2.5">
                {getLocalizedList(service.sessionFlow, lang).map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 bg-[#e8eddf] text-[#526943]"
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-[#4A4540]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Contraindications — collapsed by default */}
          {getLocalizedList(service.contraindications, lang).length > 0 && (
            <div className="mb-5">
              <Accordion
                label={`${t.servicePage.contraindicationsTitle} (${getLocalizedList(service.contraindications, lang).length})`}
              >
                <ul className="space-y-2 pt-1">
                  {getLocalizedList(service.contraindications, lang).map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-[#68715f]">
                      <IconBan
                        size={13}
                        className="mt-0.5 shrink-0 text-[#A9655F]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Accordion>
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          className="p-4 sm:p-5 bg-white border-t border-[#e4e5de]"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Button
              href={`/rendez-vous?service=${service.slug}`}
              variant="primary"
              className="flex-1 justify-center py-3 shadow-[0_4px_20px_rgba(196,154,60,0.25)]"
            >
              <IconCalendarPlus size={15} className="me-2" aria-hidden="true" />
              {t.bodyMap.bookThisService}
            </Button>
            <Button
              href={`/services/${service.slug}`}
              variant="outline"
              className="flex-1 justify-center py-3 bg-white border-[#748461]/30 text-[#292c28] hover:border-[#748461]"
            >
              {t.bodyMap.dedicatedPage}
              <IconArrowRight size={13} className="ms-2 rtl-flip" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});


export interface BodyMapProps { embedded?: boolean; hideHeader?: boolean; }
export const BodyMap = memo(function BodyMap({ embedded = false, hideHeader = false }: BodyMapProps = {}) {
  const { lang, t } = useLanguage();
  const [view, setView] = useState<ViewSide>('front');
  const [zone, setZone] = useState<BodyZone>('all');
  const [goal, setGoal] = useState<MedicalGoal>('all');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<MapPoint | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const lastTrigger = useRef<string | null>(null);
  useEffect(() => {
    if (!selection) return;
    detailRef.current?.focus({ preventScroll: true });
    if (window.innerWidth < 900) detailRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [selection]);
  const copy = (pt: string, en: string, fr: string) => lang === 'pt' ? pt : lang === 'en' ? en : fr;
  const serviceBySlug = useMemo(() => new Map(SERVICES.map(s => [s.slug, s])), []);
  // Search all views: a treatment should never disappear because the body faces forward.
  const points = useMemo(() => [...FRONT_POINTS, ...BACK_POINTS].filter((p, i, all) =>
    all.findIndex(other => other.serviceSlug === p.serviceSlug) === i), []);
  const matching = points.filter(p => {
    const s = serviceBySlug.get(p.serviceSlug);
    if (!s) return false;
    if (goal === 'douleur' && s.pole !== 'kinesitherapie') return false;
    if (goal === 'minceur' && s.pole !== 'minceur') return false;
    if (goal === 'drainage' && !['drainage-lymphatique', 'pressotherapie'].includes(s.slug)) return false;
    if (goal === 'post-partum' && s.slug !== 'reeducation-post-partum') return false;
    const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalize([getLocalizedText(s.name, lang), getLocalizedText(s.shortDesc, lang), getLocalizedText(p.label, lang)].join(' ')).includes(normalize(query.trim()));
  });
  const results = matching.filter(p => zone === 'all' || p.zone === zone);
  const chooseZone = (next: BodyZone) => {
    setZone(next); setSelection(null);
    if (next === 'back') setView('back');
    if (next === 'torso') setView('front');
  };
  const reset = () => { setZone('all'); setGoal('all'); setQuery(''); setSelection(null); };
  const closeDetail = () => { setSelection(null); requestAnimationFrame(() => {
    const trigger = detailRef.current?.querySelector<HTMLButtonElement>('[data-treatment="' + lastTrigger.current + '"]');
    trigger?.focus({ preventScroll: true });
  }); };
  const activeService = selection ? serviceBySlug.get(selection.serviceSlug) : undefined;
  return (
    <section id={embedded ? undefined : 'body-map'} className={styles.explorer} style={embedded ? undefined : { maxWidth: 1200, margin: '64px auto' }}>
      {!hideHeader && <header className={styles.intro}><span className={styles.eyebrow}>{copy('O seu guia de cuidados', 'Your care guide', 'Votre guide de soins')}</span><h2>{t.bodyMap.title}</h2><p>{t.bodyMap.subtitle}</p></header>}
      <div className={styles.toolbar}>
        <div><span className={styles.eyebrow}>{copy('COMECE POR SI', 'START WITH YOU', 'COMMENCEZ PAR VOUS')}</span><h3>{copy('De que precisa o seu corpo?', 'What does your body need?', 'De quoi votre corps a-t-il besoin ?')}</h3></div>
        <label className={styles.search}><IconSearch size={18} aria-hidden="true" /><span className="sr-only">{copy('Pesquisar cuidados', 'Search treatments', 'Rechercher un soin')}</span><input type="search" value={query} onChange={e => { setQuery(e.target.value); setSelection(null); }} placeholder={copy('Pesquisar um cuidado…', 'Find a treatment…', 'Rechercher un soin…')} /></label>
      </div>
      <div className={styles.goals} role="group" aria-label={copy('Objetivo', 'Care goal', 'Objectif')}>
        {MEDICAL_GOALS.map(g => <button type="button" key={g.id} aria-pressed={goal === g.id} onClick={() => { setGoal(g.id); setSelection(null); }}>{g.icon}{g.label[lang]}</button>)}
      </div>
      <div className={styles.workspace}>
        <div className={styles.mapPanel}>
          <div className={styles.panelHeading}><span className={styles.step}>01</span><div><h4>{copy('Escolha uma zona', 'Choose an area', 'Choisissez une zone')}</h4><p>{copy('Selecione no corpo ou na lista abaixo.', 'Select on the body or from the list below.', 'Sélectionnez sur le corps ou dans la liste.')}</p></div></div>
          <div className={styles.viewToggle} role="group" aria-label={copy('Vista do corpo', 'Body view', 'Vue du corps')}>
            {(['front', 'back'] as const).map(v => <button type="button" key={v} aria-pressed={view === v} onClick={() => { setView(v); setZone('all'); setSelection(null); }}>{v === 'front' ? copy('Frente', 'Front', 'Face') : copy('Costas', 'Back', 'Dos')}</button>)}
          </div>
          <AnatomicalSVGViewer view={view} selectedZone={zone} onZoneSelect={chooseZone} lang={lang} />
          <div className={styles.zones} role="group" aria-label={copy('Zonas do corpo', 'Body areas', 'Zones du corps')}>
            {ZONE_ORDER.map(z => <button type="button" key={z} aria-pressed={zone === z} onClick={() => chooseZone(z)}>{ZONE_ICONS[z]}<span>{ZONE_LABELS[z][lang]}</span><span className={styles.count}>{matching.filter(p => z === 'all' || p.zone === z).length}</span></button>)}
          </div>
        </div>
        <div className={styles.resultsPanel}>
          <div className={styles.panelHeading}><span className={styles.step}>02</span><div><h4>{copy('Explore os cuidados', 'Explore your options', 'Explorez les soins')}</h4><p aria-live="polite">{results.length} {copy('cuidados', 'treatments', 'soins')} · {ZONE_LABELS[zone][lang]}</p></div>{(zone !== 'all' || goal !== 'all' || query) && <button className={styles.reset} type="button" onClick={reset}>{copy('Limpar', 'Reset', 'Effacer')}</button>}</div>
          <div ref={detailRef} tabIndex={-1} className={styles.detail} onKeyDown={e => { if (e.key === 'Escape') closeDetail(); }}>
            {selection && activeService ? <><button type="button" className={styles.back} onClick={closeDetail}>← {copy('Voltar aos cuidados', 'Back to treatments', 'Retour aux soins')}</button><ServiceDetailCard point={selection} service={activeService} lang={lang} t={t} onClose={closeDetail} hideClose /></> : <div className={styles.list}>
              {results.map(p => { const s = serviceBySlug.get(p.serviceSlug)!; return <button type="button" key={p.serviceSlug} className={styles.treatment} data-treatment={p.serviceSlug} onClick={() => { lastTrigger.current = p.serviceSlug; setSelection(p); }}>
                <span className={styles.treatmentIcon}>{ZONE_ICONS[p.zone]}</span><span className={styles.treatmentCopy}><span className={styles.category}>{s.pole === 'kinesitherapie' ? copy('Fisioterapia', 'Physiotherapy', 'Kinésithérapie') : copy('Emagrecimento', 'Slimming care', 'Minceur')}</span><strong>{getLocalizedText(s.name, lang)}</strong><span className={styles.meta}><IconClock size={13} />{s.duration}<span>·</span>{getLocalizedText(p.label, lang)}</span></span><span className={styles.price}>{s.price} {t.common.currency}<IconArrowRight size={18} /></span>
              </button>; })}
              {results.length === 0 && <div className={styles.empty}><IconSearch size={30} /><h4>{copy('Nenhum cuidado encontrado', 'No treatments found', 'Aucun soin trouvé')}</h4><p>{copy('Experimente outra zona ou ajuste a pesquisa.', 'Try another area or adjust your search.', 'Essayez une autre zone ou modifiez votre recherche.')}</p><button type="button" onClick={reset}>{copy('Ver todos os cuidados', 'Show all treatments', 'Voir tous les soins')}</button></div>}
            </div>}
          </div>
          <div className={styles.guidance}><IconStethoscope size={22} aria-hidden="true" /><div><strong>{copy('Não sabe por onde começar?', 'Not sure where to start?', 'Besoin d’être accompagné ?')}</strong><p>{copy('Encontre o cuidado certo numa avaliação personalizada.', 'Find the right care with a personal consultation.', 'Trouvez le soin adapté lors d’un bilan personnalisé.')}</p><a href="/rendez-vous">{copy('Marcar uma avaliação', 'Book a consultation', 'Réserver un bilan')} <IconArrowRight size={14} /></a></div></div>
        </div>
      </div>
    </section>
  );
});
