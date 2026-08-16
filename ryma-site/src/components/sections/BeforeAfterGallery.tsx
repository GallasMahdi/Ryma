'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { getLocalizedText } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconArrowRight, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';

const CASES = [
  {
    id: 'cellulite',
    category: { fr: 'Cellulite', pt: 'Celulite', en: 'Cellulite' },
    label: { fr: 'Traitement cellulite', pt: 'Tratamento de Celulite', en: 'Cellulite Treatment' },
    sessions: { fr: '8 séances', pt: '8 sessões', en: '8 sessions' },
    duration: { fr: '4 semaines', pt: '4 semanas', en: '4 weeks' },
    image: '/results/before_after_cellulite.png',
    tag: { fr: 'Minceur', pt: 'Emagrecimento', en: 'Slimming' },
    color: '#C49A3C',
  },
  {
    id: 'cryolipolyse',
    category: { fr: 'Cryolipolyse', pt: 'Criolipólise', en: 'Cryolipolysis' },
    label: { fr: 'Élimination des graisses', pt: 'Redução de Gordura Localizada', en: 'Fat Reduction' },
    sessions: { fr: '3 séances', pt: '3 sessões', en: '3 sessions' },
    duration: { fr: '6 semaines', pt: '6 semanas', en: '6 weeks' },
    image: '/results/before_after_cryolipolyse.png',
    tag: { fr: 'Corps', pt: 'Corpo', en: 'Body' },
    color: '#4A90B8',
  },
  {
    id: 'postpartum',
    category: { fr: 'Rééducation post-partum', pt: 'Reabilitação Pós-Parto', en: 'Postpartum Rehab' },
    label: { fr: 'Reconstruction abdominale', pt: 'Recuperação Abdominal e Pélvica', en: 'Abdominal Recovery' },
    sessions: { fr: '12 séances', pt: '12 sessões', en: '12 sessions' },
    duration: { fr: '6 semaines', pt: '6 semanas', en: '6 weeks' },
    image: '/results/before_after_postpartum.png',
    tag: { fr: 'Post-partum', pt: 'Pós-Parto', en: 'Postpartum' },
    color: '#A67C98',
  },
  {
    id: 'radiofrequence',
    category: { fr: 'Radiofréquence', pt: 'Radiofrequência', en: 'Radiofrequency' },
    label: { fr: 'Raffermissement cutané', pt: 'Firmeza Cutânea e Colagénio', en: 'Skin Tightening' },
    sessions: { fr: '6 séances', pt: '6 sessões', en: '6 sessions' },
    duration: { fr: '3 semaines', pt: '3 semanas', en: '3 weeks' },
    image: '/results/before_after_radiofrequence.png',
    tag: { fr: 'Visage & Corps', pt: 'Rosto e Corpo', en: 'Face & Body' },
    color: '#7B9E87',
  },
  {
    id: 'drainage',
    category: { fr: 'Drainage lymphatique', pt: 'Drenagem Linfática', en: 'Lymphatic Drainage' },
    label: { fr: 'Jambes légères & désenflées', pt: 'Pernas Leves e Descongestionadas', en: 'Heavy Legs Relief' },
    sessions: { fr: '5 séances', pt: '5 sessões', en: '5 sessions' },
    duration: { fr: '2 semaines', pt: '2 semanas', en: '2 weeks' },
    image: '/results/before_after_drainage.png',
    tag: { fr: 'Rééducation', pt: 'Reabilitação', en: 'Rehab' },
    color: '#8B7355',
  },
];

function BeforeAfterSlider({ src, alt }: { src: string; alt: string }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-col-resize select-none"
      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX); }}
      onMouseMove={(e) => { if (dragging.current) updatePos(e.clientX); }}
      onTouchMove={(e) => updatePos(e.touches[0].clientX)}
      onTouchStart={(e) => updatePos(e.touches[0].clientX)}
      role="img"
      aria-label={alt}
    >
      <Image src={src} alt={`After — ${alt}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <div className="relative w-full h-full" style={{ width: `${10000 / Math.max(pos, 1)}%` }}>
          <Image src={src} alt={`Before — ${alt}`} fill className="object-cover" style={{ filter: 'grayscale(70%) brightness(0.88) contrast(1.1)', objectPosition: 'left' }} sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
        <div className="absolute inset-0 bg-[#8B6914]/10 mix-blend-multiply pointer-events-none" />
      </div>
      <div className="absolute inset-y-0 z-20 flex items-center justify-center" style={{ left: `calc(${pos}% - 1px)`, width: 2 }}>
        <div className="absolute inset-0 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.35)]" />
        <div className="relative z-30 w-9 h-9 rounded-full bg-white shadow-[0_2px_16px_rgba(0,0,0,0.3)] flex items-center justify-center gap-0.5 border border-white/60">
          <IconChevronLeft size={12} className="text-[#1A1412]" />
          <IconChevronRight size={12} className="text-[#1A1412]" />
        </div>
      </div>
      <div className="absolute bottom-3 left-3 z-10 bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg pointer-events-none">ANTES / BEFORE</div>
      <div className="absolute bottom-3 right-3 z-10 bg-white/85 backdrop-blur-sm text-[#1A1412] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg pointer-events-none">DEPOIS / AFTER</div>
    </div>
  );
}

export function BeforeAfterGallery() {
  const { lang, t } = useLanguage();
  const [active, setActive] = useState(0);
  const current = CASES[active];

  return (
    <section id="resultats" className="relative py-20 md:py-28 overflow-hidden bg-[#0F0D0B]">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(196,154,60,0.8) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none opacity-10" style={{ background: `radial-gradient(ellipse, ${current.color}88 0%, transparent 70%)`, transition: 'background 0.5s' }} />

      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        <ScrollReveal className="text-center mb-14">
          <span className="font-mono text-xs tracking-widest text-[#C49A3C] uppercase font-semibold block mb-3">
            — {lang === 'pt' ? 'Resultados Clínicos Reais' : lang === 'en' ? 'Real Clinical Results' : 'Résultats Réels'} —
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
            {lang === 'pt' ? 'Antes e Depois' : lang === 'en' ? 'Before & After' : 'Avant & Après'}
          </h2>
          <p className="text-[#9A9A8A] max-w-xl mx-auto text-base leading-relaxed">
            {lang === 'pt'
              ? 'Transformações autênticas obtidas graças aos nossos protocolos de tratamento personalizados.'
              : lang === 'en'
              ? 'Authentic transformations achieved through our customized care protocols.'
              : 'Des transformations authentiques obtenues grâce à nos protocoles de soins personnalisés.'}
          </p>
        </ScrollReveal>

        <ScrollReveal className="flex flex-wrap justify-center gap-2 mb-12">
          {CASES.map((c, i) => (
            <button key={c.id} onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${active === i ? 'bg-[#C49A3C] border-[#C49A3C] text-[#0F0D0B] shadow-[0_0_16px_rgba(196,154,60,0.4)]' : 'bg-white/5 border-white/10 text-[#9A9A8A] hover:border-[#C49A3C]/40 hover:text-[#C49A3C]'}`}>
              {getLocalizedText(c.category, lang)}
            </button>
          ))}
        </ScrollReveal>

        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <BeforeAfterSlider src={current.image} alt={getLocalizedText(current.label, lang)} />
            </div>
            <div className="flex flex-col justify-center gap-6">
              <div>
                <span className="inline-block font-mono text-[11px] uppercase tracking-widest px-3 py-1 rounded-full font-semibold" style={{ background: `${current.color}22`, color: current.color, border: `1px solid ${current.color}44` }}>
                  {getLocalizedText(current.tag, lang)}
                </span>
              </div>
              <div>
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3">{getLocalizedText(current.category, lang)}</h3>
                <p className="text-[#9A9A8A] text-lg leading-relaxed">{getLocalizedText(current.label, lang)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 border" style={{ background: `${current.color}0D`, borderColor: `${current.color}28` }}>
                  <p className="text-[#9A9A8A] text-xs font-mono uppercase tracking-widest mb-1">{lang === 'pt' ? 'Número de Sessões' : lang === 'en' ? 'Number of Sessions' : 'Nombre de séances'}</p>
                  <p className="text-white text-2xl font-bold font-serif">{getLocalizedText(current.sessions, lang)}</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ background: `${current.color}0D`, borderColor: `${current.color}28` }}>
                  <p className="text-[#9A9A8A] text-xs font-mono uppercase tracking-widest mb-1">{lang === 'pt' ? 'Duração do Protocolo' : lang === 'en' ? 'Protocol Duration' : 'Durée du protocole'}</p>
                  <p className="text-white text-2xl font-bold font-serif">{getLocalizedText(current.duration, lang)}</p>
                </div>
              </div>
              <p className="text-[#5A5A52] text-xs leading-relaxed border-l-2 border-[#C49A3C]/30 pl-3">
                {lang === 'pt'
                  ? 'Os resultados podem variar de acordo com cada indivíduo. Cada protocolo é adaptado ao seu perfil durante a consulta inicial.'
                  : lang === 'en'
                  ? 'Results may vary by individual. Each protocol is tailored to your profile during the initial consultation.'
                  : 'Les résultats peuvent varier selon les individus. Chaque protocole est adapté à votre profil lors de la consultation initiale.'}
              </p>
              <Link href="/rendez-vous" className="inline-flex items-center gap-2.5 self-start bg-[#C49A3C] hover:bg-[#E8C97A] text-[#0F0D0B] font-bold px-7 py-3.5 rounded-full transition-all duration-200 text-sm shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.55)] hover:-translate-y-0.5">
                {t.common.bookAppointment}
                <IconArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-10">
          {CASES.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} aria-label={`Resultado ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${active === i ? 'w-6 h-2 bg-[#C49A3C]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
