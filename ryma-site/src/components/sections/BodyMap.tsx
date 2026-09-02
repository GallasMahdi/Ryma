'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  memo,
  useRef,
  useEffect,
  useId,
  useLayoutEffect,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useLanguage, type Translations, type Lang } from '@/lib/i18n';
import { SERVICES, Service, ServicePole, getLocalizedText, getLocalizedList } from '@/data/services';
import { Button } from '@/components/ui/Button';
import {
  IconX,
  IconArrowRight,
  IconClock,
  IconCalendarPlus,
  IconCheck,
  IconBan,
  IconChevronDown,
  IconChevronUp,
  IconBodyScan,
  IconLungs,
  IconHandGrab,
  IconWalk,
  IconBone,
  IconMapPin,
  IconSearch,
  IconAdjustmentsHorizontal,
  IconStethoscope,
  IconFlame,
  IconDroplet,
  IconSparkles,
} from '@tabler/icons-react';
import type { BodyGender } from '@/components/sections/body3d/zone';
import { AnatomicalSVGViewer } from '@/components/sections/body3d/AnatomicalSVGViewer';

/* ------------------------------------------------------------------ */
/*  Types & Static Data                                                 */
/* ------------------------------------------------------------------ */

export type BodyZone = 'all' | 'torso' | 'legs' | 'arms' | 'back';
type ViewSide = 'front' | 'back';

interface MapPoint {
  serviceSlug: string;
  cx: number;
  cy: number;
  position3D?: [number, number, number];
  zone: BodyZone;
  label: { fr: string; pt?: string; en?: string; ar?: string };
  spec?: { comfort: number; speed: number; precision: number };
}

/* ── Design tokens (Ultra Luxury Champagne Gold & Obsidian Slate) ── */
const NAVY    = '#1A1412';
const SLATE   = '#6B6058';
const GOLD    = '#C49A3C';
const GOLD_LIGHT = '#F5E9C8';
const GOLD_ACCENT = '#9A7428';
const EMERALD = '#15803D';
const BORDER  = '#E8E2D8';
const SURFACE = '#FDFBF7';
const WHITE   = '#FFFFFF';

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

const POLE_FILTERS: { id: ServicePole | 'all'; label: { fr: string; pt: string; en: string } }[] = [
  { id: 'all',            label: { fr: 'Tous',           pt: 'Todos',          en: 'All' } },
  { id: 'kinesitherapie', label: { fr: 'Kinésithérapie', pt: 'Fisioterapia',   en: 'Physiotherapy' } },
  { id: 'minceur',        label: { fr: 'Minceur',        pt: 'Emagrecimento',  en: 'Slimming' } },
];

const FRONT_POINTS: MapPoint[] = [
  { serviceSlug: 'bilan-minceur', cx: 50, cy: 14, position3D: [0.0, 1.54, 0.12], zone: 'all', label: { fr: 'Diagnostic Global', pt: 'Avaliação Global', en: 'Global Assessment' }, spec: { comfort: 100, speed: 100, precision: 100 } },
  { serviceSlug: 'electrotherapie', cx: 76, cy: 36, position3D: [0.20, 1.34, 0.10], zone: 'arms', label: { fr: 'Articulations Épaules', pt: 'Ombros e Articulações', en: 'Shoulders & Joints' }, spec: { comfort: 88, speed: 94, precision: 92 } },
  { serviceSlug: 'drainage-lymphatique', cx: 24, cy: 42, position3D: [-0.22, 1.22, 0.08], zone: 'arms', label: { fr: 'Membres Supérieurs', pt: 'Membros Superiores', en: 'Upper Limbs' }, spec: { comfort: 98, speed: 92, precision: 96 } },
  { serviceSlug: 'cavitation', cx: 50, cy: 50, position3D: [0.0, 1.02, 0.20], zone: 'torso', label: { fr: 'Sangle Abdominale', pt: 'Zona Abdominal', en: 'Abdominal Wall' }, spec: { comfort: 92, speed: 85, precision: 95 } },
  { serviceSlug: 'radiofrequence', cx: 31, cy: 50, position3D: [-0.15, 0.98, 0.16], zone: 'torso', label: { fr: 'Hanches & Taille', pt: 'Ancas e Cintura', en: 'Hips & Waist' }, spec: { comfort: 96, speed: 86, precision: 94 } },
  { serviceSlug: 'cryolipolyse', cx: 39, cy: 57, position3D: [0.15, 0.94, 0.16], zone: 'torso', label: { fr: "Poignées d'amour", pt: 'Gordura Localizada', en: 'Love Handles' }, spec: { comfort: 85, speed: 92, precision: 96 } },
  { serviceSlug: 'reeducation-post-partum', cx: 50, cy: 58, position3D: [0.0, 0.84, 0.18], zone: 'torso', label: { fr: 'Périnée & Bassin', pt: 'Períneo e Bacia', en: 'Pelvic Floor & Pelvis' }, spec: { comfort: 95, speed: 90, precision: 98 } },
  { serviceSlug: 'ultrasons', cx: 73, cy: 52, position3D: [0.11, 0.68, 0.15], zone: 'legs', label: { fr: 'Quadriceps / Cuisse', pt: 'Quadríceps / Coxa', en: 'Quadriceps / Thigh' }, spec: { comfort: 94, speed: 88, precision: 90 } },
  { serviceSlug: 'laser-lipo', cx: 67, cy: 56, position3D: [-0.10, 0.48, 0.16], zone: 'legs', label: { fr: 'Genoux & Articulations', pt: 'Joelhos e Articulações', en: 'Knees & Joints' }, spec: { comfort: 90, speed: 88, precision: 92 } },
  { serviceSlug: 'pressotherapie', cx: 50, cy: 72, position3D: [0.0, 0.32, 0.14], zone: 'legs', label: { fr: 'Membres Inférieurs', pt: 'Membros Inferiores', en: 'Lower Limbs' }, spec: { comfort: 99, speed: 95, precision: 97 } },
];

const BACK_POINTS: MapPoint[] = [
  { serviceSlug: 'reeducation-posturale', cx: 50, cy: 28, position3D: [0.0, 1.30, 0.16], zone: 'back', label: { fr: 'Rachis & Omoplates', pt: 'Coluna e Omoplatas', en: 'Spine & Shoulder Blades' }, spec: { comfort: 94, speed: 90, precision: 98 } },
  { serviceSlug: 'massage-therapeutique', cx: 50, cy: 42, position3D: [0.0, 1.05, 0.18], zone: 'back', label: { fr: 'Région Lombaire', pt: 'Região Lombar', en: 'Lumbar Region' }, spec: { comfort: 97, speed: 92, precision: 96 } },
  { serviceSlug: 'massage-amincissant', cx: 55, cy: 62, position3D: [0.11, 0.82, 0.18], zone: 'legs', label: { fr: 'Fessiers & Ischios', pt: 'Glúteos e Isquiotibiais', en: 'Glutes & Hamstrings' }, spec: { comfort: 90, speed: 88, precision: 93 } },
  { serviceSlug: 'drainage-lymphatique', cx: 26, cy: 44, position3D: [-0.22, 1.20, 0.08], zone: 'arms', label: { fr: 'Bras Postérieur', pt: 'Braço Posterior', en: 'Posterior Arm' }, spec: { comfort: 98, speed: 92, precision: 96 } },
];

const POINTS_BY_VIEW: Record<ViewSide, MapPoint[]> = {
  front: FRONT_POINTS,
  back:  BACK_POINTS,
};

/* ------------------------------------------------------------------ */
/*  Reusable: Pill chip                                                 */
/* ------------------------------------------------------------------ */

function Chip({
  active,
  onClick,
  children,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] focus-visible:ring-offset-1"
      style={
        active
          ? {
              background: NAVY,
              borderColor: NAVY,
              color: WHITE,
            }
          : {
              background: WHITE,
              borderColor: BORDER,
              color: SLATE,
            }
      }
    >
      {icon && (
        <span style={{ color: active ? WHITE : GOLD }} aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
      {count !== undefined && count > 0 && (
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
          style={{
            background: active ? 'rgba(255,255,255,0.2)' : GOLD_LIGHT,
            color: active ? WHITE : GOLD_ACCENT,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export type MedicalGoal = 'all' | 'douleur' | 'minceur' | 'drainage' | 'post-partum';

const MEDICAL_GOALS: { id: MedicalGoal; label: { fr: string; pt: string; en: string }; icon: React.ReactNode }[] = [
  { id: 'all',         label: { fr: 'Tous les objectifs',       pt: 'Todos os Objetivos',    en: 'All Goals' }, icon: <IconSparkles size={14} /> },
  { id: 'douleur',     label: { fr: 'Anti-douleur & Santé',    pt: 'Alívio da Dor e Saúde', en: 'Pain Relief & Health' }, icon: <IconStethoscope size={14} /> },
  { id: 'minceur',     label: { fr: 'Minceur & Remodelage',    pt: 'Emagrecimento e Escultura', en: 'Slimming & Sculpting' }, icon: <IconFlame size={14} /> },
  { id: 'drainage',    label: { fr: 'Drainage & Lymphe',       pt: 'Drenagem e Linfa',       en: 'Drainage & Lymph' }, icon: <IconDroplet size={14} /> },
  { id: 'post-partum', label: { fr: 'Post-Partum & Périnée',   pt: 'Pós-Parto e Períneo',    en: 'Postpartum & Pelvic Floor' }, icon: <IconAdjustmentsHorizontal size={14} /> },
];

/* ------------------------------------------------------------------ */
/*  Haute-Couture Goal Segmented Switcher                                */
/* ------------------------------------------------------------------ */

function CuratorGoalTabs({
  lang,
  goal,
  onGoalChange,
}: {
  lang: Lang;
  goal: MedicalGoal;
  onGoalChange: (g: MedicalGoal) => void;
}) {
  return (
    <div
      className="flex items-center justify-start lg:justify-center gap-1.5 p-1 rounded-2xl bg-[#FAF7F0] border border-[#EBE5DA] overflow-x-auto w-full"
      style={{ scrollbarWidth: 'none' }}
      role="tablist"
      aria-label="Objectifs de soins"
    >
      {MEDICAL_GOALS.map((g) => {
        const isSel = goal === g.id;
        return (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={isSel}
            onClick={() => onGoalChange(g.id)}
            className={`relative shrink-0 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] ${
              isSel ? 'text-white' : 'text-[#6B6058] hover:text-[#1A1412]'
            }`}
          >
            {isSel && (
              <motion.div
                layoutId="activeGoalTab"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#1A1412] to-[#2B2320] shadow-sm border border-[#C49A3C]/40"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <span className={isSel ? 'text-[#E8C97A]' : 'text-[#C49A3C]'}>
                {g.icon}
              </span>
              <span>{g.label[lang] || g.label.pt || g.label.fr}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Minimalist Anatomical Zone Quick Selector                           */
/* ------------------------------------------------------------------ */

function CuratorZoneTabs({
  lang,
  zone,
  onZoneChange,
  zoneCounts,
}: {
  lang: Lang;
  zone: BodyZone;
  onZoneChange: (z: BodyZone) => void;
  zoneCounts: Record<BodyZone, number>;
}) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
      role="group"
      aria-label="Zones anatomiques"
    >
      {ZONE_ORDER.map((z) => {
        const isSelected = zone === z;
        return (
          <button
            key={z}
            type="button"
            onClick={() => onZoneChange(z)}
            className={`relative shrink-0 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] ${
              isSelected
                ? 'bg-[#1A1412] text-white shadow-2xs'
                : 'bg-white text-[#6B6058] hover:bg-[#FAF7F0] hover:text-[#1A1412] border border-[#E8E2D8]'
            }`}
          >
            <span className={isSelected ? 'text-[#E8C97A]' : 'text-[#C49A3C]'}>
              {ZONE_ICONS[z]}
            </span>
            <span>{ZONE_LABELS[z][lang]}</span>
            {zoneCounts[z] > 0 && (
              <span
                className={`ms-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  isSelected ? 'bg-white/20 text-[#F5E9C8]' : 'bg-[#FAF6EE] text-[#9A7428] border border-[#C49A3C]/20'
                }`}
              >
                {zoneCounts[z]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Cell (Price / Duration / Coverage)                            */
/* ------------------------------------------------------------------ */

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
      className="flex flex-col gap-1 py-3.5 px-3.5 rounded-2xl bg-[#FDFBF7] border border-[#E8E2D8] shadow-2xs"
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8078]"
      >
        {label}
      </span>
      <span
        className="text-lg font-bold font-mono leading-tight text-[#1A1412]"
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
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-left focus-visible:outline-none text-[#6B6058] hover:text-[#1A1412] transition-colors"
      >
        <span>{label}</span>
        <span className="text-[#9A7428]">
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

  const isKine = service.pole === 'kinesitherapie';
  const poleBadgeLabel = isKine
    ? lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'
    : lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming Care' : 'Soin Minceur';

  return (
    <motion.div
      key={service.slug}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      role="region"
      aria-live="polite"
      aria-labelledby={`${panelId}-name`}
      className="flex flex-col overflow-hidden rounded-3xl max-h-full bg-white border border-[#E8E2D8] shadow-[0_12px_40px_rgba(196,154,60,0.12)]"
    >
      {/* Luxury gold champagne accent gradient line */}
      <div className="h-1 bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] shrink-0" />

      {/* Scrollable body */}
      <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="p-6 pb-0">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    isKine
                      ? 'bg-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30'
                      : 'bg-[#FDFAF4] text-[#C49A3C] border border-[#C49A3C]/30'
                  }`}
                >
                  {poleBadgeLabel}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold bg-[#FDFBF7] text-[#6B6058] border border-[#E8E2D8]"
                >
                  <IconMapPin size={10} className="text-[#C49A3C]" aria-hidden="true" />
                  {getLocalizedText(point.label, lang)}
                </span>
              </div>

              <h3
                id={`${panelId}-name`}
                className="font-serif text-2xl font-bold leading-tight text-[#1A1412]"
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
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1A1412] text-white shadow-md hover:bg-[#C49A3C] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] active:scale-95"
              >
                <IconX size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            <StatCell
              label={lang === 'pt' ? 'Valor' : lang === 'en' ? 'Rate' : 'Tarif'}
              value={<span className="text-[#C49A3C]">{service.price} <span className="text-sm font-medium text-[#8A8078]">{t.common.currency}</span></span>}
            />
            <StatCell
              label={lang === 'pt' ? 'Duração' : lang === 'en' ? 'Duration' : 'Durée'}
              value={<span className="text-[#1A1412]">{service.duration}</span>}
              sub={<span className="flex items-center gap-1 text-[#8A8078]"><IconClock size={10} className="text-[#C49A3C]" />{lang === 'pt' ? 'por sessão' : lang === 'en' ? 'per session' : 'par session'}</span>}
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
            className="text-sm leading-relaxed mb-5 text-[#6B6058]"
          >
            {getLocalizedText(service.shortDesc, lang)}
          </p>

          {/* Indications — clean checklist */}
          {getLocalizedList(service.indications, lang).length > 0 && (
            <div className="mb-5 bg-[#FDFBF7] p-4 rounded-2xl border border-[#E8E2D8]">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-3 text-[#9A7428]"
              >
                {t.servicePage.indicationsTitle}
              </h4>
              <ul className="space-y-2">
                {getLocalizedList(service.indications, lang).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-[#332D28]">
                    <IconCheck
                      size={14}
                      className="mt-0.5 shrink-0 text-[#C49A3C]"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Protocol steps */}
          {getLocalizedList(service.sessionFlow, lang).length > 0 && (
            <div className="mb-5 bg-white p-4 rounded-2xl border border-[#E8E2D8]">
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-3 text-[#1A1412]"
              >
                {t.servicePage.sessionTitle}
              </h4>
              <ol className="space-y-2.5">
                {getLocalizedList(service.sessionFlow, lang).map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 bg-[#F5E9C8] text-[#9A7428]"
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
                    <li key={i} className="flex items-start gap-2.5 text-xs text-[#6B6058]">
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
          className="p-5 bg-white border-t border-[#E8E2D8]"
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
              className="flex-1 justify-center py-3 bg-white border-[#C49A3C]/30 text-[#1A1412] hover:border-[#C49A3C]"
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

/* ------------------------------------------------------------------ */
/*  Default prompt (no selection)                                     */
/* ------------------------------------------------------------------ */

function EmptyState({
  lang,
  selectedZone,
  currentPoints,
  serviceBySlug,
  onSelectPoint,
  onResetZone,
}: {
  lang: Lang;
  selectedZone: BodyZone;
  currentPoints: MapPoint[];
  serviceBySlug: Map<string, Service>;
  onSelectPoint: (p: MapPoint) => void;
  onResetZone: () => void;
}) {
  const { t } = useLanguage();
  const [activePoleFilter, setActivePoleFilter] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter current points by pole filter if selected
  const filteredPoints = useMemo(() => {
    return currentPoints.filter((point) => {
      if (activePoleFilter === 'all') return true;
      const service = serviceBySlug.get(point.serviceSlug);
      return service?.pole === activePoleFilter;
    });
  }, [currentPoints, activePoleFilter, serviceBySlug]);

  // Track active card index during touch scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild?.clientWidth ?? 280;
    const index = Math.round(scrollLeft / (cardWidth + 12));
    setActiveIndex(Math.min(Math.max(0, index), filteredPoints.length - 1));
  };

  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4"
    >
      {/* Zone Diagnostic Header & Reset Action */}
      <div className="flex items-center justify-between p-4 rounded-2xl border bg-white border-[#E8E2D8] text-[#1A1412] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#FDFAF4] text-[#C49A3C] border border-[#C49A3C]/20 shadow-2xs">
            <IconBodyScan size={19} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight font-serif text-[#1A1412]">
              {selectedZone === 'all'
                ? lang === 'pt' ? 'Diagnóstico Global' : lang === 'en' ? 'Global Assessment' : 'Diagnostic Global'
                : getLocalizedText(ZONE_LABELS[selectedZone], lang)}
            </h3>
            <p className="text-[11px] text-[#8A8078] font-mono font-medium">
              {filteredPoints.length} {lang === 'pt' ? 'tratamentos disponíveis' : lang === 'en' ? 'treatments available' : 'soins disponibles'}
            </p>
          </div>
        </div>

        {selectedZone !== 'all' && (
          <button
            type="button"
            onClick={onResetZone}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-[#C49A3C]/30 text-[#9A7428] bg-[#FDFAF4] hover:bg-[#F5E9C8] transition-colors"
          >
            {getLocalizedText(ZONE_LABELS.all, lang)}
          </button>
        )}
      </div>

      {/* Interactive Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5">
        <button
          type="button"
          onClick={() => setActivePoleFilter('all')}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activePoleFilter === 'all'
              ? 'bg-[#C49A3C] text-white shadow-xs'
              : 'bg-white text-[#6B6058] border border-[#E8E2D8] hover:border-[#C49A3C]/40'
          }`}
        >
          {lang === 'pt' ? 'Todos os Cuidados' : lang === 'en' ? 'All Care' : 'Tous les soins'}
        </button>
        <button
          type="button"
          onClick={() => setActivePoleFilter('kinesitherapie')}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activePoleFilter === 'kinesitherapie'
              ? 'bg-[#9A7428] text-white shadow-xs'
              : 'bg-white text-[#6B6058] border border-[#E8E2D8] hover:border-[#C49A3C]/40'
          }`}
        >
          {lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
        </button>
        <button
          type="button"
          onClick={() => setActivePoleFilter('minceur')}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            activePoleFilter === 'minceur'
              ? 'bg-[#9A7428] text-white shadow-xs'
              : 'bg-white text-[#6B6058] border border-[#E8E2D8] hover:border-[#C49A3C]/40'
          }`}
        >
          {lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
        </button>
      </div>

      {/* Cards Slider Container */}
      {filteredPoints.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#E8E2D8] rounded-2xl text-[#8A8078]">
          <p className="text-xs font-mono">
            {lang === 'pt'
              ? 'Nenhum cuidado encontrado para esta combinação.'
              : lang === 'en'
              ? 'No care found for this combination.'
              : 'Aucun soin trouvé pour cette combinaison.'}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE Carousel (< 640px) */}
          <div className="block sm:hidden">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-1 -mx-4 px-4"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {filteredPoints.map((point) => {
                const service = serviceBySlug.get(point.serviceSlug);
                if (!service) return null;
                const isKine = service.pole === 'kinesitherapie';

                return (
                  <div
                    key={point.serviceSlug}
                    className="snap-center shrink-0 w-[270px] flex flex-col justify-between p-4.5 rounded-2xl border bg-white border-[#E8E2D8] shadow-xs active:scale-[0.98] transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider ${
                            isKine
                              ? 'bg-[#F5E9C8] text-[#9A7428]'
                              : 'bg-[#FDFAF4] text-[#C49A3C] border border-[#C49A3C]/20'
                          }`}
                        >
                          {getLocalizedText(point.label, lang)}
                        </span>
                        <span className="text-[11px] text-[#8A8078] flex items-center gap-1 font-mono font-semibold">
                          <IconClock size={12} className="text-[#C49A3C]" /> {service.duration}
                        </span>
                      </div>

                      <h3 className="font-serif font-bold text-sm leading-snug line-clamp-2 mb-2 text-[#1A1412]">
                        {getLocalizedText(service.name, lang)}
                      </h3>

                      <p className="text-[11px] text-[#6B6058] line-clamp-2 mb-3 leading-relaxed">
                        {getLocalizedText(service.shortDesc, lang)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#E8E2D8]">
                      <span className="font-mono text-sm font-bold text-[#C49A3C]">
                        {service.price} {t.common.currency}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectPoint(point)}
                        className="text-xs font-bold text-[#9A7428] flex items-center bg-[#FDFAF4] border border-[#C49A3C]/25 px-2.5 py-1 rounded-lg"
                      >
                        {t.common.readMore}
                        <IconArrowRight size={12} className="ms-1" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Carousel Page Dots */}
            {filteredPoints.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {filteredPoints.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeIndex ? 'w-5 bg-[#C49A3C]' : 'w-1.5 bg-[#D4CEBE]'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* DESKTOP VIEW: 2-Column Grid */}
          <div className="hidden sm:grid grid-cols-2 gap-3">
            {filteredPoints.map((point) => {
              const service = serviceBySlug.get(point.serviceSlug);
              if (!service) return null;
              const isKine = service.pole === 'kinesitherapie';

              return (
                <button
                  key={point.serviceSlug}
                  type="button"
                  onClick={() => onSelectPoint(point)}
                  className="group text-start p-4 rounded-2xl border bg-white border-[#E8E2D8] hover:border-[#C49A3C] hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C]"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        isKine
                          ? 'bg-[#F5E9C8] text-[#9A7428]'
                          : 'bg-[#FDFAF4] text-[#C49A3C] border border-[#C49A3C]/20'
                      }`}
                    >
                      {getLocalizedText(point.label, lang)}
                    </span>
                    <span className="text-[10px] text-[#8A8078] flex items-center gap-1 font-mono">
                      <IconClock size={10} className="text-[#C49A3C]" /> {service.duration}
                    </span>
                  </div>

                  <h3 className="font-semibold text-xs leading-snug line-clamp-2 mb-2 transition-colors text-[#1A1412] group-hover:text-[#9A7428]">
                    {getLocalizedText(service.name, lang)}
                  </h3>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E8E2D8]">
                    <span className="font-mono text-xs font-bold text-[#C49A3C]">
                      {service.price} {t.common.currency}
                    </span>
                    <span className="text-[10px] font-medium text-[#8A8078] flex items-center group-hover:translate-x-0.5 transition-transform">
                      {t.common.readMore}
                      <IconArrowRight size={10} className="ms-1" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Bottom Sheet                                                 */
/* ------------------------------------------------------------------ */

function MobileBottomSheet({
  point,
  service,
  lang,
  t,
  onClose,
}: {
  point: MapPoint | null;
  service: Service | null;
  lang: Lang;
  t: Translations;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const currentDragY = useRef(0);

  // Lock body scroll instantly on mount without layout thrash
  useLayoutEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile && point) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [point]);

  // Swipe-to-dismiss handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only start drag from the handle area (first 60px of sheet)
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (e.clientY - rect.top > 64) return; // only drag from top area
    isDragging.current = true;
    dragStartY.current = e.clientY;
    currentDragY.current = 0;
    sheet.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    currentDragY.current = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
    sheetRef.current.style.transition = 'none';
  }, []);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
    // Dismiss if dragged down more than 80px
    if (currentDragY.current > 80) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence initial={false}>
      {point && service && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(15,23,42,0.55)', willChange: 'opacity' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 38, stiffness: 480, restDelta: 0.5 }}
            className="fixed bottom-0 inset-x-0 z-50 lg:hidden rounded-t-3xl overflow-hidden"
            style={{
              maxHeight: '90vh',
              background: WHITE,
              boxShadow: '0 -12px 48px rgba(15,23,42,0.18)',
              willChange: 'transform',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Sticky header: handle + close button */}
            <div
              className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3.5 pb-3"
              style={{ background: WHITE, borderBottom: `1px solid ${BORDER}` }}
            >
              {/* Drag handle */}
              <div className="flex-1" />
              <div
                className="w-10 h-1.5 rounded-full cursor-grab active:cursor-grabbing"
                style={{ background: '#D4CEBE' }}
              />
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={lang === 'pt' ? 'Fechar' : lang === 'en' ? 'Close' : 'Fermer'}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1412] text-white shadow-md hover:bg-[#C49A3C] transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C]"
                >
                  <IconX size={17} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 56px)', scrollbarWidth: 'none' }}>
              <ServiceDetailCard
                point={point}
                service={service}
                lang={lang}
                t={t}
                onClose={onClose}
                hideClose={true}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Filter Sheet                                                  */
/* ------------------------------------------------------------------ */

function MobileFilterSheet({
  open,
  onClose,
  lang,
  goal,
  onGoalChange,
  view,
  onViewChange,
  zone,
  onZoneChange,
  zoneCounts,
  onReset,
  activeCount,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  goal: MedicalGoal;
  onGoalChange: (g: MedicalGoal) => void;
  view: ViewSide;
  onViewChange: (v: ViewSide) => void;
  zone: BodyZone;
  onZoneChange: (z: BodyZone) => void;
  zoneCounts: Record<BodyZone, number>;
  onReset: () => void;
  activeCount: number;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const currentDragY = useRef(0);

  useLayoutEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (e.clientY - rect.top > 64) return; // only from top handle area
    isDragging.current = true;
    dragStartY.current = e.clientY;
    currentDragY.current = 0;
    sheet.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const delta = Math.max(0, e.clientY - dragStartY.current);
    currentDragY.current = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
    sheetRef.current.style.transition = 'none';
  }, []);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
    if (currentDragY.current > 80) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mfs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(15,23,42,0.55)', willChange: 'opacity' }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            key="mfs-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 38, stiffness: 480, restDelta: 0.5 }}
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              maxHeight: '88vh',
              background: WHITE,
              boxShadow: '0 -12px 48px rgba(15,23,42,0.18)',
              willChange: 'transform',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Header */}
            <div
              className="cursor-grab active:cursor-grabbing"
              style={{ borderBottom: `1px solid ${BORDER}` }}
            >
              {/* Drag handle pill */}
              <div className="flex justify-center pt-3 pb-1">
                <div
                  className="w-10 h-1.5 rounded-full"
                  style={{ background: '#D4CEBE' }}
                />
              </div>

              {/* Title + close */}
              <div className="flex items-center justify-between px-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#1A1412] text-white">
                    <IconAdjustmentsHorizontal size={15} />
                  </div>
                  <span className="font-serif font-bold text-base text-[#1A1412]">
                    {lang === 'pt' ? 'Filtros' : lang === 'en' ? 'Filters' : 'Filtres'}
                  </span>
                  {activeCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C49A3C] text-white text-[10px] font-bold">
                      {activeCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close filters"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1412] text-white shadow-md hover:bg-[#C49A3C] transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C]"
                >
                  <IconX size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Scrollable options */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(88vh - 120px)', scrollbarWidth: 'none' }}>
              <div className="px-5 py-4 space-y-6">

                {/* Section: Medical Goal */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A7428] mb-3">
                    {lang === 'pt' ? 'Objetivo' : lang === 'en' ? 'Goal' : 'Objectif'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {MEDICAL_GOALS.map((g) => {
                      const isSel = goal === g.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => onGoalChange(g.id)}
                          className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition-all text-start ${
                            isSel
                              ? 'bg-[#1A1412] text-white border-[#1A1412] shadow-md'
                              : 'bg-white text-[#4A4540] border-[#E8E2D8] hover:border-[#C49A3C]/50'
                          }`}
                        >
                          <span className={isSel ? 'text-[#E8C97A]' : 'text-[#C49A3C]'}>{g.icon}</span>
                          <span className="leading-tight">{g.label[lang] || g.label.fr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: BORDER }} />

                {/* Section: View */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A7428] mb-3">
                    {lang === 'pt' ? 'Vista' : lang === 'en' ? 'View' : 'Vue'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['front', 'back'] as const).map((v) => {
                      const isSel = view === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onViewChange(v)}
                          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-semibold border transition-all ${
                            isSel
                              ? 'bg-[#1A1412] text-white border-[#1A1412] shadow-md'
                              : 'bg-white text-[#4A4540] border-[#E8E2D8] hover:border-[#C49A3C]/50'
                          }`}
                        >
                          {v === 'front'
                            ? (lang === 'pt' ? 'Vista Frontal' : lang === 'en' ? 'Front View' : 'Vue Avant')
                            : (lang === 'pt' ? 'Vista Posterior' : lang === 'en' ? 'Back View' : 'Vue Arrière')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: BORDER }} />

                {/* Section: Body Zone */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A7428] mb-3">
                    {lang === 'pt' ? 'Zona Corporal' : lang === 'en' ? 'Body Zone' : 'Zone corporelle'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ZONE_ORDER.map((z) => {
                      const isSel = zone === z;
                      return (
                        <button
                          key={z}
                          type="button"
                          onClick={() => onZoneChange(z)}
                          className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-xs font-semibold border transition-all text-start ${
                            isSel
                              ? 'bg-[#1A1412] text-white border-[#1A1412] shadow-md'
                              : 'bg-white text-[#4A4540] border-[#E8E2D8] hover:border-[#C49A3C]/50'
                          }`}
                        >
                          <span className={isSel ? 'text-[#E8C97A]' : 'text-[#C49A3C]'}>{ZONE_ICONS[z]}</span>
                          <span className="flex-1 leading-tight">{ZONE_LABELS[z][lang]}</span>
                          {zoneCounts[z] > 0 && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                              isSel ? 'bg-white/20 text-[#F5E9C8]' : 'bg-[#FAF6EE] text-[#9A7428]'
                            }`}>
                              {zoneCounts[z]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer actions */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderTop: `1px solid ${BORDER}`, background: '#FDFBF7' }}
            >
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold border border-[#E8E2D8] text-[#6B6058] bg-white hover:bg-[#FAF6EE] hover:text-[#C49A3C] hover:border-[#C49A3C]/40 transition-all"
                >
                  {lang === 'pt' ? 'Limpar filtros' : lang === 'en' ? 'Clear filters' : 'Réinitialiser'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-xs font-bold bg-[#1A1412] text-white hover:bg-[#C49A3C] transition-all shadow-md"
              >
                {lang === 'pt' ? 'Ver resultados' : lang === 'en' ? 'See results' : 'Voir les résultats'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  View Toggle (Minimalist Obsidian & Champagne Switcher)              */
/* ------------------------------------------------------------------ */

function ViewToggle({
  view,
  lang,
  t,
  onViewChange,
}: {
  view: ViewSide;
  lang: Lang;
  t: Translations;
  onViewChange: (v: ViewSide) => void;
}) {
  return (
    <div
      className="inline-flex items-center p-1 rounded-full border border-[#E8E2D8] bg-[#F7F4EE]/90 shadow-2xs backdrop-blur-sm"
      role="group"
      aria-label={lang === 'pt' ? 'Vista do Corpo' : lang === 'en' ? 'Body View' : 'Vue du corps'}
    >
      {(['front', 'back'] as const).map((v) => {
        const isSel = view === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={isSel}
            onClick={() => onViewChange(v)}
            className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A3C] ${
              isSel ? 'text-white' : 'text-[#7A6E65] hover:text-[#1A1412]'
            }`}
          >
            {isSel && (
              <motion.div
                layoutId="activeViewPill"
                className="absolute inset-0 rounded-full bg-[#1A1412] shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">
              {v === 'front' ? t.bodyMap.toggleViewFront : t.bodyMap.toggleViewBack}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main BodyMap Component                                              */
/* ------------------------------------------------------------------ */

export function BodyMap() {
  const { lang, t } = useLanguage();
  const reduced = useReducedMotion() ?? false;

  const [view, setView]                   = useState<ViewSide>('front');
  const [selectedZone, setSelectedZone]   = useState<BodyZone>('all');
  const [selectedPole, setSelectedPole]   = useState<ServicePole | 'all'>('all');
  const [selectedGoal, setSelectedGoal]   = useState<MedicalGoal>('all');
  const [searchQuery, setSearchQuery]     = useState<string>('');
  const [selPoint, setSelPoint]           = useState<MapPoint | null>(null);

  const serviceBySlug = useMemo(() => {
    const m = new Map<string, Service>();
    for (const s of SERVICES) m.set(s.slug, s);
    return m;
  }, []);

  const selService = selPoint ? serviceBySlug.get(selPoint.serviceSlug) ?? null : null;

  const currentPoints = useMemo(() => {
    return POINTS_BY_VIEW[view].filter((p) => {
      // 1. Zone Filter
      if (selectedZone !== 'all' && p.zone !== selectedZone && p.zone !== 'all') return false;

      const svc = serviceBySlug.get(p.serviceSlug);
      if (!svc) return false;

      // 2. Pole Filter
      if (selectedPole !== 'all' && svc.pole !== selectedPole) return false;

      // 3. Medical Goal Filter
      if (selectedGoal === 'douleur' && svc.pole !== 'kinesitherapie') return false;
      if (selectedGoal === 'minceur' && svc.pole !== 'minceur') return false;
      if (selectedGoal === 'drainage' && !['drainage-lymphatique', 'pressotherapie'].includes(svc.slug)) return false;
      if (selectedGoal === 'post-partum' && !['reeducation-post-partum', 'ultrasons'].includes(svc.slug)) return false;

      // 4. Instant Search Filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const nameText = getLocalizedText(svc.name, lang).toLowerCase();
        const labelText = getLocalizedText(p.label, lang).toLowerCase();
        const descText = getLocalizedText(svc.shortDesc, lang).toLowerCase();
        if (!nameText.includes(q) && !labelText.includes(q) && !descText.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [view, selectedZone, selectedPole, selectedGoal, searchQuery, serviceBySlug]);

  const zoneCounts = useMemo(() => {
    const counts: Record<BodyZone, number> = { all: 0, torso: 0, legs: 0, arms: 0, back: 0 };
    for (const p of POINTS_BY_VIEW[view]) {
      const svc = serviceBySlug.get(p.serviceSlug);
      if (!svc) continue;
      if (selectedPole !== 'all' && svc.pole !== selectedPole) continue;
      counts[p.zone] = (counts[p.zone] || 0) + 1;
      if (p.zone !== 'all') counts.all++;
    }
    return counts;
  }, [view, selectedPole, serviceBySlug]);

  const handlePointSelect = useCallback(
    (point: MapPoint) => {
      if (!serviceBySlug.get(point.serviceSlug)) return;
      setSelPoint((prev) =>
        prev?.serviceSlug === point.serviceSlug ? null : point,
      );
    },
    [serviceBySlug],
  );

  const handleClose = useCallback(() => setSelPoint(null), []);

  const handleViewChange = useCallback((v: ViewSide) => {
    setView(v);
    setSelPoint(null);
  }, []);

  const hasActiveFilters = selectedZone !== 'all' || selectedPole !== 'all' || selectedGoal !== 'all' || searchQuery.trim() !== '';
  const activeFilterCount = (selectedZone !== 'all' ? 1 : 0) + (selectedGoal !== 'all' ? 1 : 0) + (view !== 'front' ? 1 : 0) + (searchQuery.trim() !== '' ? 1 : 0);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const handleResetFilters = useCallback(() => {
    setSelectedZone('all');
    setSelectedPole('all');
    setSelectedGoal('all');
    setSearchQuery('');
    setSelPoint(null);
  }, []);

  /* Arrow key navigation */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      const pts = currentPoints;
      if (pts.length === 0) return;
      const curIdx = selPoint
        ? pts.findIndex((p) => p.serviceSlug === selPoint.serviceSlug)
        : -1;
      let nextIdx: number;
      if (curIdx === -1) {
        nextIdx = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (curIdx + 1) % pts.length;
      } else {
        nextIdx = (curIdx - 1 + pts.length) % pts.length;
      }
      handlePointSelect(pts[nextIdx]);
    },
    [currentPoints, selPoint, handlePointSelect],
  );

  return (
    <section
      id="body-map"
      className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-[#FDFBF7] via-[#FAF7F0] to-[#FDFBF7]"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-10">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          className="mb-8 md:mb-10 text-center"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-3.5 px-3.5 py-1 rounded-full bg-white/90 border border-[#C49A3C]/30 shadow-2xs backdrop-blur-sm">
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#C49A3C] animate-pulse"
            />
            <span
              className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A7428]"
            >
              {lang === 'pt' ? 'Diagnóstico Interativo de Cuidados' : lang === 'en' ? 'Interactive Care Assessment' : 'Diagnostic & Carte des soins'}
            </span>
          </div>

          <h2
            className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-3 text-[#1A1412]"
          >
            {t.bodyMap.title}
          </h2>
          <p
            className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed text-[#6B6058]"
          >
            {t.bodyMap.subtitle}
          </p>
        </motion.div>

        {/* ── Mobile Compact Filter Bar (hidden on lg+) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="lg:hidden w-full max-w-5xl mx-auto mb-6"
        >
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <IconSearch size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9A7428] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'pt' ? 'Pesquisar cuidados...' : lang === 'en' ? 'Search treatments...' : 'Rechercher un soin...'}
                className="w-full ps-8 pe-7 py-2.5 text-xs rounded-2xl border border-[#E8E2D8] bg-white text-[#1A1412] placeholder:text-[#9A9088] focus:outline-none focus:border-[#C49A3C] focus:ring-2 focus:ring-[#C49A3C]/20 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#8A8078] hover:text-[#1A1412] transition-colors"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>

            {/* Filters trigger */}
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              className="relative shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border font-semibold text-xs transition-all shadow-xs"
              style={{
                background: activeFilterCount > 0 ? NAVY : WHITE,
                borderColor: activeFilterCount > 0 ? NAVY : BORDER,
                color: activeFilterCount > 0 ? WHITE : SLATE,
              }}
            >
              <IconAdjustmentsHorizontal size={14} style={{ color: activeFilterCount > 0 ? '#E8C97A' : GOLD }} />
              <span>{lang === 'pt' ? 'Filtros' : lang === 'en' ? 'Filters' : 'Filtres'}</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#C49A3C] text-white text-[9px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Active filter chips summary */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-1.5 mt-2.5"
            >
              <span className="text-[11px] font-semibold text-[#1A1412] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C]" />
                {currentPoints.length} {lang === 'pt' ? 'cuidados' : lang === 'en' ? 'treatments' : 'soins'}
              </span>
              {selectedGoal !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FDFAF4] border border-[#C49A3C]/30 text-[#9A7428] text-[11px] font-medium">
                  {getLocalizedText(MEDICAL_GOALS.find((g) => g.id === selectedGoal)!.label, lang)}
                </span>
              )}
              {selectedZone !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FDFAF4] border border-[#C49A3C]/30 text-[#9A7428] text-[11px] font-medium">
                  {getLocalizedText(ZONE_LABELS[selectedZone], lang)}
                </span>
              )}
              {view !== 'front' && (
                <span className="px-2 py-0.5 rounded-full bg-[#FDFAF4] border border-[#C49A3C]/30 text-[#9A7428] text-[11px] font-medium">
                  {lang === 'pt' ? 'Vista Posterior' : lang === 'en' ? 'Back View' : 'Vue Arrière'}
                </span>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#9A7428] hover:text-[#C49A3C] font-semibold text-[11px] flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-[#FAF6EE]"
              >
                <IconX size={11} />
                {lang === 'pt' ? 'Limpar' : lang === 'en' ? 'Clear' : 'Effacer'}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── Desktop Unified Curator Console (hidden below lg) ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0, 0, 0.2, 1] }}
          className="hidden lg:block w-full max-w-5xl mx-auto mb-10"
        >
          <div className="rounded-3xl bg-white/90 backdrop-blur-xl border border-[#E8E2D8] shadow-[0_12px_40px_rgba(26,20,18,0.04)] p-3 sm:p-4.5 space-y-3.5">
            
            {/* Tier 1: Primary Goal Tabs (Haute-Couture Segmented Switcher) */}
            <CuratorGoalTabs
              lang={lang}
              goal={selectedGoal}
              onGoalChange={setSelectedGoal}
            />

            {/* Tier 2: Precision Controls (Perspective View, Anatomical Zones, Instant Search) */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
              {/* Perspective View (Front / Back) */}
              <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                <ViewToggle
                  view={view}
                  lang={lang}
                  t={t}
                  onViewChange={handleViewChange}
                />
              </div>

              {/* Anatomical Zone Selector */}
              <div className="flex-1 overflow-x-auto no-scrollbar py-0.5">
                <CuratorZoneTabs
                  lang={lang}
                  zone={selectedZone}
                  onZoneChange={setSelectedZone}
                  zoneCounts={zoneCounts}
                />
              </div>

              {/* Refined Search Input */}
              <div className="relative w-full sm:w-60 lg:w-56 shrink-0">
                <IconSearch size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9A7428] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'pt' ? 'Pesquisar cuidados...' : lang === 'en' ? 'Search treatments...' : 'Rechercher un soin...'}
                  className="w-full ps-8 pe-7 py-2 text-xs rounded-xl border border-[#E8E2D8] bg-[#FAF8F5]/80 text-[#1A1412] placeholder:text-[#9A9088] focus:outline-none focus:bg-white focus:border-[#C49A3C] focus:ring-2 focus:ring-[#C49A3C]/20 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#8A8078] hover:text-[#1A1412] transition-colors"
                  >
                    <IconX size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Tier 3: Active Filters & Results Summary */}
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2.5 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6058]"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[#1A1412] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C]" />
                    {currentPoints.length} {lang === 'pt' ? 'cuidados encontrados' : lang === 'en' ? 'treatments found' : 'soins trouvés'}
                  </span>
                  {selectedGoal !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FDFAF4] border border-[#C49A3C]/30 text-[#9A7428] text-[11px] font-medium">
                      {getLocalizedText(MEDICAL_GOALS.find((g) => g.id === selectedGoal)!.label, lang)}
                    </span>
                  )}
                  {selectedZone !== 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FDFAF4] border border-[#C49A3C]/30 text-[#9A7428] text-[11px] font-medium">
                      {getLocalizedText(ZONE_LABELS[selectedZone], lang)}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#E8E2D8] text-[#1A1412] text-[11px] font-medium">
                      « {searchQuery} »
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[#9A7428] hover:text-[#C49A3C] font-semibold text-[11px] flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-[#FAF6EE]"
                >
                  <IconX size={12} />
                  <span>{lang === 'pt' ? 'Limpar filtros' : lang === 'en' ? 'Reset filters' : 'Réinitialiser'}</span>
                </button>
              </motion.div>
            )}

          </div>
        </motion.div>

        {/* ── Main Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">

          {/* 2D Optimized Vector Viewer Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
            className="relative"
          >
            {/* Canvas card container */}
            <div
              className="relative overflow-hidden rounded-3xl p-3 sm:p-4 bg-white border border-[#E8E2D8] shadow-[0_12px_36px_rgba(196,154,60,0.08)]"
            >
              <AnatomicalSVGViewer
                view={view}
                points={currentPoints}
                serviceBySlug={serviceBySlug}
                selectionSlug={selPoint?.serviceSlug ?? null}
                selectedZone={selectedZone}
                onSelect={handlePointSelect}
                onZoneSelect={setSelectedZone}
                lang={lang}
              />

              {/* View side badge */}
              <div
                className="absolute bottom-6 start-6 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/95 text-[#1A1412] border border-[#E8E2D8] shadow-2xs"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#C49A3C]"
                />
                {view === 'front'
                  ? lang === 'pt' ? 'Anterior' : lang === 'en' ? 'Front' : 'Antérieur'
                  : lang === 'pt' ? 'Posterior' : lang === 'en' ? 'Back' : 'Postérieur'}
              </div>

              {/* Keyboard navigation hint */}
              <div
                className="absolute bottom-6 end-6 text-[9px] font-mono tracking-wider hidden sm:block text-[#A89F91]"
              >
                {lang === 'pt' ? '← → navegar' : lang === 'en' ? '← → navigate' : '← → naviguer'}
              </div>
            </div>

            {/* Responsive Touch Gesture Hint */}
            <p
              className="text-center mt-3 text-[11px] font-medium tracking-wide flex items-center justify-center gap-1.5 text-[#8A8078]"
            >
              <IconBodyScan size={14} className="text-[#C49A3C]" />
              <span>{lang === 'pt' ? 'Clique numa zona do corpo para ver os cuidados associados' : lang === 'en' ? 'Click a body part to view associated treatments' : 'Cliquez sur une partie du corps pour afficher les soins'}</span>
            </p>
          </motion.div>

          {/* Detail Panel — Desktop */}
          <div className="hidden lg:block min-h-[420px] flex flex-col">
            <AnimatePresence mode="wait">
              {selPoint && selService ? (
                <ServiceDetailCard
                  key={selPoint.serviceSlug}
                  point={selPoint}
                  service={selService}
                  lang={lang}
                  t={t}
                  onClose={handleClose}
                />
              ) : (
                <EmptyState
                  key="empty"
                  lang={lang}
                  selectedZone={selectedZone}
                  currentPoints={currentPoints}
                  serviceBySlug={serviceBySlug}
                  onSelectPoint={handlePointSelect}
                  onResetZone={() => setSelectedZone('all')}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Empty State Prompt — Mobile */}
          <div className="lg:hidden">
            <AnimatePresence mode="wait">
              {!selPoint && (
                <EmptyState
                  key="mobile-empty"
                  lang={lang}
                  selectedZone={selectedZone}
                  currentPoints={currentPoints}
                  serviceBySlug={serviceBySlug}
                  onSelectPoint={handlePointSelect}
                  onResetZone={() => setSelectedZone('all')}
                />
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet
        point={selPoint}
        service={selService}
        lang={lang}
        t={t}
        onClose={handleClose}
      />

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        lang={lang}
        goal={selectedGoal}
        onGoalChange={(g) => { setSelectedGoal(g); }}
        view={view}
        onViewChange={(v) => { handleViewChange(v); }}
        zone={selectedZone}
        onZoneChange={(z) => { setSelectedZone(z); }}
        zoneCounts={zoneCounts}
        onReset={handleResetFilters}
        activeCount={activeFilterCount}
      />
    </section>
  );
}
