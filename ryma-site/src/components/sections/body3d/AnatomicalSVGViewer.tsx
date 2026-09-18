'use client';

import { useId, useState } from 'react';
import type { BodyZone, ViewSide } from './zone';
import type { Lang } from '@/lib/i18n';

export interface AnatomicalSVGViewerProps {
  view: ViewSide;
  selectedZone: BodyZone;
  onZoneSelect: (zone: BodyZone) => void;
  lang: Lang;
}

const labels = {
  arms: { pt: 'Braços', en: 'Arms', fr: 'Bras' },
  torso: { pt: 'Abdómen', en: 'Abdomen', fr: 'Abdomen' },
  back: { pt: 'Costas', en: 'Back', fr: 'Dos' },
  legs: { pt: 'Pernas', en: 'Legs', fr: 'Jambes' },
};

/** A lightweight body-area selector. Native buttons below provide the same keyboard path. */
export function AnatomicalSVGViewer({ view, selectedZone, onZoneSelect, lang }: AnatomicalSVGViewerProps) {
  const gradient = useId();
  const [hover, setHover] = useState<BodyZone | null>(null);
  const trunk = view === 'front' ? 'torso' : 'back';
  const regions: { zone: 'arms' | 'torso' | 'back' | 'legs'; paths: string[] }[] = [
    { zone: trunk, paths: ['M137 80 Q130 94 132 117 L139 160 Q138 178 130 197 Q145 214 160 207 Q175 214 190 197 Q182 178 181 160 L188 117 Q190 94 183 80 L174 76 Q160 85 146 76Z'] },
    { zone: 'arms', paths: ['M137 81 Q120 82 114 104 L103 151 L93 198 Q89 207 88 216 Q88 225 93 224 L99 213 Q100 223 104 218 L108 202 L122 165 L132 124 Q139 101 137 81Z', 'M183 81 Q200 82 206 104 L217 151 L227 198 Q231 207 232 216 Q232 225 227 224 L221 213 Q220 223 216 218 L212 202 L198 165 L188 124 Q181 101 183 81Z'] },
    { zone: 'legs', paths: ['M130 197 Q145 203 158 207 L155 259 Q155 276 152 289 Q151 317 145 352 L145 366 Q148 374 144 377 L127 378 Q121 375 128 369 L133 362 L131 332 Q127 309 132 282 Q124 244 130 197Z', 'M190 197 Q175 203 162 207 L165 259 Q165 276 168 289 Q169 317 175 352 L175 366 Q172 374 176 377 L193 378 Q199 375 192 369 L187 362 L189 332 Q193 309 188 282 Q196 244 190 197Z'] },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[390px] py-2">
      <svg viewBox="0 0 320 402" className="mx-auto block h-[340px] w-full sm:h-[370px]" role="group" aria-label={lang === 'pt' ? 'Selecionar uma zona do corpo' : lang === 'en' ? 'Select a body area' : 'Sélectionner une zone du corps'}>
        <defs><linearGradient id={gradient} x1="0" x2="1"><stop stopColor="#dce2d4"/><stop offset=".48" stopColor="#f1f3eb"/><stop offset="1" stopColor="#cdd7c3"/></linearGradient></defs>
        <ellipse cx="160" cy="210" rx="112" ry="163" fill="#eef1e7" />
        <ellipse cx="160" cy="384" rx="43" ry="5" fill="#dce2d3" opacity=".55" />
        <path d="M145 72 L146 61 Q137 53 138 37 Q137 18 160 17 Q183 18 182 37 Q183 53 174 61 L175 72 L183 80 Q160 94 137 80Z" fill={`url(#${gradient})`} stroke="#b3bfa5" strokeWidth="1" />
        {regions.map(({zone, paths}) => <g key={zone} role="button" tabIndex={0} aria-label={labels[zone][lang]} aria-pressed={selectedZone === zone} onClick={() => onZoneSelect(zone)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZoneSelect(zone); } }} onMouseEnter={() => setHover(zone)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(zone)} onBlur={() => setHover(null)} style={{cursor:'pointer', outline:'none'}} fill={selectedZone === zone || hover === zone ? '#c0cfae' : `url(#${gradient})`} stroke={selectedZone === zone || hover === zone ? '#5a7545' : '#adbda0'} strokeWidth={selectedZone === zone || hover === zone ? 1.8 : 1}>
          {paths.map(d => <path key={d} d={d} />)}
        </g>)}
        <g fill="none" stroke="#a9b99b" strokeWidth=".8" opacity=".7" pointerEvents="none">
          {view === 'front' ? <><path d="M138 110 Q149 116 159 111 M161 111 Q171 116 182 110 M160 91 L160 154 M145 175 Q160 183 175 175"/><circle cx="160" cy="165" r="1.5"/></> : <><path d="M160 87 L160 184 M139 101 Q140 125 153 133 M181 101 Q180 125 167 133"/><path d="M157 96 H163 M157 106 H163 M157 116 H163 M157 126 H163 M157 136 H163 M157 146 H163 M157 156 H163"/></>}
          <path d="M136 276 Q142 280 150 276 M170 276 Q178 280 184 276 M144 222 L142 259 M176 222 L178 259"/>
        </g>
        {([{zone:'arms', x:113, y:135, end:32, labelX:24, anchor:'start'}, {zone:trunk, x:175, y:161, end:286, labelX:294, anchor:'end'}, {zone:'legs', x:145, y:294, end:32, labelX:24, anchor:'start'}] as const).map(item => <g key={item.zone} pointerEvents="none">
          <path d={`M${item.x} ${item.y} H${item.end}`} fill="none" stroke="#9fab91" strokeWidth=".8"/><circle cx={item.x} cy={item.y} r="4" fill={selectedZone === item.zone ? '#52713d' : '#fff'} stroke="#718761" strokeWidth="1.5"/>
          <text x={item.labelX} y={item.y-10} textAnchor={item.anchor} fill="#66745a" fontSize="11" fontFamily="inherit">{labels[item.zone][lang]}</text>
        </g>)}
      </svg>
    </div>
  );
}
