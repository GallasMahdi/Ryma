'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Service } from '@/data/services';
import type { BodyGender, BodyZone, HotspotPoint, ViewSide } from './zone';
import type { Lang } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/*  Design Tokens (Ultra Luxury & Warm Gold Aesthetics)                 */
/* ------------------------------------------------------------------ */

const OBSIDIAN = '#1A1412';
const GOLD = '#C49A3C';
const GOLD_LIGHT = '#F5E9C8';
const GOLD_ACCENT = '#9A7428';
const SLATE = '#6B6058';
const BORDER = '#E8E2D8';
const WHITE = '#FFFFFF';

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface AnatomicalSVGViewerProps {
  view: ViewSide;
  gender?: BodyGender;
  points: HotspotPoint[];
  serviceBySlug: Map<string, Service>;
  selectionSlug: string | null;
  selectedZone: BodyZone;
  onSelect: (p: HotspotPoint) => void;
  onZoneSelect?: (z: BodyZone) => void;
  lang: Lang;
}

/* ------------------------------------------------------------------ */
/*  Vector Muscle Paths — Male Anterior (Front) View                   */
/* ------------------------------------------------------------------ */

function FrontMaleAnatomySVG({
  hoveredZone,
  setHoveredZone,
  selectedZone,
  onZoneClick,
}: {
  hoveredZone: BodyZone | null;
  setHoveredZone: (z: BodyZone | null) => void;
  selectedZone: BodyZone;
  onZoneClick: (z: BodyZone) => void;
}) {
  const getZoneStyle = (z: BodyZone) => {
    const active = selectedZone === z || hoveredZone === z;
    return {
      fill: active ? 'rgba(196, 154, 60, 0.16)' : 'rgba(250, 248, 244, 0.85)',
      stroke: active ? GOLD : '#D4CEBE',
      strokeWidth: active ? 2.0 : 1.1,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    };
  };

  return (
    <g className="anatomy-front-male">
      {/* ── Head & Neck ── */}
      <path
        d="M 88 26 C 88 12, 112 12, 112 26 C 112 38, 108 44, 100 46 C 92 44, 88 38, 88 26 Z M 93 46 L 93 58 L 107 58 L 107 46 Z"
        style={getZoneStyle('all')}
        onMouseEnter={() => setHoveredZone('all')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('all')}
      />

      {/* ── Male Broad Shoulders & Arms ── */}
      <g
        style={getZoneStyle('arms')}
        onMouseEnter={() => setHoveredZone('arms')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('arms')}
      >
        {/* Left Deltoid & Bicep / Forearm */}
        <path d="M 72 58 C 58 62, 48 74, 44 98 C 40 120, 38 145, 36 168 C 42 171, 48 171, 51 165 C 54 142, 57 120, 63 98 C 67 82, 72 70, 75 62 Z" />
        {/* Right Deltoid & Bicep / Forearm */}
        <path d="M 128 58 C 142 62, 152 74, 156 98 C 160 120, 162 145, 164 168 C 158 171, 152 171, 149 165 C 146 142, 143 120, 137 98 C 133 82, 128 70, 125 62 Z" />
      </g>

      {/* ── Athletic Male Torso & Abdomen (Chest, Abs, Obliques) ── */}
      <g
        style={getZoneStyle('torso')}
        onMouseEnter={() => setHoveredZone('torso')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('torso')}
      >
        {/* Main Athletic V-Taper Torso */}
        <path d="M 75 58 L 125 58 C 130 76, 126 96, 121 118 C 118 135, 115 152, 110 166 L 90 166 C 85 152, 82 135, 79 118 C 74 96, 70 76, 75 58 Z" />
        {/* Pectoral Muscle Contour Lines */}
        <path d="M 77 82 Q 100 88 123 82" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
        {/* Linea Alba (Center Abs Line) */}
        <path d="M 100 60 L 100 158" fill="none" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="3 2" />
        {/* 6-Pack Abdominal Rows */}
        <path d="M 84 104 Q 100 108 116 104" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
        <path d="M 86 124 Q 100 128 114 124" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
        <path d="M 88 144 Q 100 148 112 144" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
      </g>

      {/* ── Athletic Male Legs (Quads & Knees) ── */}
      <g
        style={getZoneStyle('legs')}
        onMouseEnter={() => setHoveredZone('legs')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('legs')}
      >
        {/* Left Leg */}
        <path d="M 90 166 C 87 198, 85 232, 83 262 C 81 282, 79 302, 77 322 L 89 322 C 91 302, 93 282, 95 252 C 97 222, 98 192, 99 166 Z" />
        {/* Right Leg */}
        <path d="M 110 166 C 113 198, 115 232, 117 262 C 119 282, 121 302, 123 322 L 111 322 C 109 302, 107 282, 105 252 C 103 222, 102 192, 101 166 Z" />
        {/* Patella / Knee Joint Indicators */}
        <circle cx="88" cy="246" r="5.5" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
        <circle cx="112" cy="246" r="5.5" fill="none" stroke="#CBD5E1" strokeWidth="0.8" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Vector Muscle Paths — Female Anterior View                         */
/* ------------------------------------------------------------------ */

function FrontFemaleAnatomySVG({
  hoveredZone,
  setHoveredZone,
  selectedZone,
  onZoneClick,
}: {
  hoveredZone: BodyZone | null;
  setHoveredZone: (z: BodyZone | null) => void;
  selectedZone: BodyZone;
  onZoneClick: (z: BodyZone) => void;
}) {
  const getZoneStyle = (z: BodyZone) => {
    const active = selectedZone === z || hoveredZone === z;
    return {
      fill: active ? 'rgba(196, 154, 60, 0.16)' : 'rgba(250, 248, 244, 0.85)',
      stroke: active ? GOLD : '#D4CEBE',
      strokeWidth: active ? 2.0 : 1.1,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    };
  };

  return (
    <g className="anatomy-front-female">
      {/* Head & Neck */}
      <path
        d="M 90 28 C 90 14, 110 14, 110 28 C 110 40, 106 46, 100 48 C 94 46, 90 40, 90 28 Z M 95 48 L 95 58 L 105 58 L 105 48 Z"
        style={getZoneStyle('all')}
        onMouseEnter={() => setHoveredZone('all')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('all')}
      />

      {/* Arms */}
      <g
        style={getZoneStyle('arms')}
        onMouseEnter={() => setHoveredZone('arms')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('arms')}
      >
        <path d="M 76 60 C 64 64, 56 74, 52 96 C 48 118, 46 142, 44 165 C 48 168, 54 168, 56 163 C 58 142, 60 118, 66 96 C 70 82, 74 72, 78 64 Z" />
        <path d="M 124 60 C 136 64, 144 74, 148 96 C 152 118, 154 142, 156 165 C 152 168, 146 168, 144 163 C 142 142, 140 118, 134 96 C 130 82, 126 72, 122 64 Z" />
      </g>

      {/* Torso */}
      <g
        style={getZoneStyle('torso')}
        onMouseEnter={() => setHoveredZone('torso')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('torso')}
      >
        <path d="M 78 60 L 122 60 C 126 74, 124 94, 120 118 C 118 134, 116 150, 112 165 L 88 165 C 84 150, 82 134, 80 118 C 76 94, 74 74, 78 60 Z" />
        <path d="M 80 84 Q 100 90 120 84" fill="none" stroke="#D4CEBE" strokeWidth="0.75" />
        <path d="M 100 62 L 100 155" fill="none" stroke="#D4CEBE" strokeWidth="0.75" strokeDasharray="2 2" />
      </g>

      {/* Legs */}
      <g
        style={getZoneStyle('legs')}
        onMouseEnter={() => setHoveredZone('legs')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('legs')}
      >
        <path d="M 88 165 C 86 195, 84 230, 82 260 C 80 280, 78 300, 76 320 L 88 320 C 90 300, 92 280, 94 250 C 96 220, 97 190, 98 165 Z" />
        <path d="M 112 165 C 114 195, 116 230, 118 260 C 120 280, 122 300, 124 320 L 112 320 C 110 300, 108 280, 106 250 C 104 220, 103 190, 102 165 Z" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Vector Muscle Paths — Posterior (Back) View                        */
/* ------------------------------------------------------------------ */

function BackAnatomySVG({
  hoveredZone,
  setHoveredZone,
  selectedZone,
  onZoneClick,
}: {
  hoveredZone: BodyZone | null;
  setHoveredZone: (z: BodyZone | null) => void;
  selectedZone: BodyZone;
  onZoneClick: (z: BodyZone) => void;
}) {
  const getZoneStyle = (z: BodyZone) => {
    const active = selectedZone === z || hoveredZone === z;
    return {
      fill: active ? 'rgba(196, 154, 60, 0.16)' : 'rgba(250, 248, 244, 0.85)',
      stroke: active ? GOLD : '#D4CEBE',
      strokeWidth: active ? 2.0 : 1.1,
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    };
  };

  return (
    <g className="anatomy-back">
      {/* Head & Neck */}
      <path
        d="M 90 28 C 90 14, 110 14, 110 28 C 110 40, 106 46, 100 48 C 94 46, 90 40, 90 28 Z M 95 48 L 95 58 L 105 58 L 105 48 Z"
        style={getZoneStyle('all')}
        onMouseEnter={() => setHoveredZone('all')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('all')}
      />

      {/* Posterior Arms */}
      <g
        style={getZoneStyle('arms')}
        onMouseEnter={() => setHoveredZone('arms')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('arms')}
      >
        <path d="M 75 58 C 61 62, 51 74, 47 98 C 43 120, 41 145, 39 168 C 45 171, 51 171, 54 165 C 57 142, 60 120, 66 98 C 70 82, 75 70, 78 62 Z" />
        <path d="M 125 58 C 139 62, 149 74, 153 98 C 157 120, 159 145, 161 168 C 155 171, 149 171, 146 165 C 143 142, 140 120, 134 98 C 130 82, 125 70, 122 62 Z" />
      </g>

      {/* Spine & Back (Rachis & Omoplates) */}
      <g
        style={getZoneStyle('back')}
        onMouseEnter={() => setHoveredZone('back')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('back')}
      >
        <path d="M 75 58 L 125 58 C 129 74, 126 94, 121 118 C 118 134, 115 148, 110 160 L 90 160 C 85 148, 82 134, 79 118 C 74 94, 71 74, 75 58 Z" />
        {/* Spine Line */}
        <path d="M 100 58 L 100 160" stroke={GOLD} strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
        {/* Shoulder Blades */}
        <path d="M 80 72 L 94 88 M 120 72 L 106 88" fill="none" stroke="#D4CEBE" strokeWidth="0.8" />
      </g>

      {/* Glutes & Posterior Legs */}
      <g
        style={getZoneStyle('legs')}
        onMouseEnter={() => setHoveredZone('legs')}
        onMouseLeave={() => setHoveredZone(null)}
        onClick={() => onZoneClick('legs')}
      >
        <path d="M 88 160 Q 100 178 112 160 Q 100 148 88 160 Z" />
        <path d="M 88 165 C 86 195, 84 230, 82 260 C 80 280, 78 300, 76 320 L 88 320 C 90 300, 92 280, 94 250 C 96 220, 97 190, 98 165 Z" />
        <path d="M 112 165 C 114 195, 116 230, 118 260 C 120 280, 122 300, 124 320 L 112 320 C 110 300, 108 280, 106 250 C 104 220, 103 190, 102 165 Z" />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Optimized Vector Component                                    */
/* ------------------------------------------------------------------ */

export function AnatomicalSVGViewer({
  view,
  points,
  serviceBySlug,
  selectionSlug,
  selectedZone,
  onSelect,
  onZoneSelect,
  lang,
}: AnatomicalSVGViewerProps) {
  const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

  const handleZoneClick = (z: BodyZone) => {
    if (onZoneSelect) onZoneSelect(z);
    const match = points.find((p) => p.zone === z) || points[0];
    if (match) onSelect(match);
  };

  const currentActiveZone = hoveredZone || selectedZone;

  return (
    <div
      className="relative w-full aspect-[5/6] overflow-hidden rounded-2xl select-none flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#FDFBF7] to-[#F7F4EC] border border-[#E8E2D8] shadow-[inset_0_2px_12px_rgba(196,154,60,0.04)] transition-all"
    >
      {/* ── Background Precision Medical Grid Pattern ── */}
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="medGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E8E2D8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#medGrid)" />
        </svg>
      </div>

      {/* ── Medical Height Scale Ruler ── */}
      <div className="absolute start-3 top-6 bottom-6 flex flex-col justify-between text-[9px] font-mono text-[#A89F91] pointer-events-none select-none">
        <span>175 cm</span>
        <span>140 cm</span>
        <span>100 cm</span>
        <span>60 cm</span>
        <span>20 cm</span>
      </div>

      {/* ── Interactive Vector Silhouette ── */}
      <motion.div
        key={view}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-[250px] h-full flex items-center justify-center py-2"
      >
        <svg
          viewBox="0 0 200 340"
          className="w-full h-full drop-shadow-xs"
          style={{ overflow: 'visible' }}
        >
          {view === 'front' ? (
            <FrontMaleAnatomySVG
              hoveredZone={hoveredZone}
              setHoveredZone={setHoveredZone}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
            />
          ) : (
            <BackAnatomySVG
              hoveredZone={hoveredZone}
              setHoveredZone={setHoveredZone}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
            />
          )}
        </svg>
      </motion.div>

      {/* ── Active Zone HUD Badge ── */}
      <div className="absolute bottom-3 end-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-[#C49A3C]/30 text-[10px] font-mono font-bold text-[#1A1412] shadow-xs backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C] animate-pulse" />
        <span>
          {currentActiveZone === 'all'
            ? lang === 'pt' ? 'Corpo Inteiro' : lang === 'en' ? 'Full Body' : 'Tout le corps'
            : currentActiveZone === 'torso'
            ? lang === 'pt' ? 'Torso e Abdómen' : lang === 'en' ? 'Torso & Abdomen' : 'Buste & Abdomen'
            : currentActiveZone === 'legs'
            ? lang === 'pt' ? 'Membros Inferiores' : lang === 'en' ? 'Lower Limbs' : 'Membres Inférieurs'
            : currentActiveZone === 'arms'
            ? lang === 'pt' ? 'Membros Superiores' : lang === 'en' ? 'Upper Limbs' : 'Membres Supérieurs'
            : lang === 'pt' ? 'Coluna e Costas' : lang === 'en' ? 'Spine & Back' : 'Rachis & Dos'}
        </span>
      </div>
    </div>
  );
}
