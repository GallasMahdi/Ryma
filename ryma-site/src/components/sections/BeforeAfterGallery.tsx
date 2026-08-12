'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconArrowRight, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';

const CASES = [
  {
    id: 'cellulite',
    category: { fr: 'Cellulite', ar: '?????????' },
    label: { fr: 'Traitement cellulite', ar: '???? ?????????' },
    sessions: { fr: '8 séances', ar: '8 ?????' },
    duration: { fr: '4 semaines', ar: '4 ??????' },
    image: '/results/before_after_cellulite.png',
    tag: { fr: 'Minceur', ar: '?????' },
    color: '#C49A3C',
  },
  {
    id: 'cryolipolyse',
    category: { fr: 'Cryolipolyse', ar: '???????' },
    label: { fr: 'Élimination des graisses', ar: '????? ??????' },
    sessions: { fr: '3 séances', ar: '3 ?????' },
    duration: { fr: '6 semaines', ar: '6 ??????' },
    image: '/results/before_after_cryolipolyse.png',
    tag: { fr: 'Corps', ar: '?????' },
    color: '#4A90B8',
  },
  {
    id: 'postpartum',
    category: { fr: 'Rééducation post-partum', ar: '????? ??????? ??? ???????' },
    label: { fr: 'Reconstruction abdominale', ar: '????? ????? ?????' },
    sessions: { fr: '12 séances', ar: '12 ????' },
    duration: { fr: '6 semaines', ar: '6 ??????' },
    image: '/results/before_after_postpartum.png',
    tag: { fr: 'Post-partum', ar: '?? ??? ???????' },
    color: '#A67C98',
  },
  {
    id: 'radiofrequence',
    category: { fr: 'Radiofréquence', ar: '???????? ?????????' },
    label: { fr: 'Raffermissement cutané', ar: '?? ?????' },
    sessions: { fr: '6 séances', ar: '6 ?????' },
    duration: { fr: '3 semaines', ar: '3 ??????' },
    image: '/results/before_after_radiofrequence.png',
    tag: { fr: 'Visage & Corps', ar: '????? ??????' },
    color: '#7B9E87',
  },
  {
    id: 'drainage',
    category: { fr: 'Drainage lymphatique', ar: '????? ????????' },
    label: { fr: 'Jambes légères & désenflées', ar: '???? ????? ????? ????' },
    sessions: { fr: '5 séances', ar: '5 ?????' },
    duration: { fr: '2 semaines', ar: '???????' },
    image: '/results/before_after_drainage.png',
    tag: { fr: 'Rééducation', ar: '????? ???????' },
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
      <div className="absolute bottom-3 left-3 z-10 bg-black/55 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg pointer-events-none">AVANT</div>
      <div className="absolute bottom-3 right-3 z-10 bg-white/85 backdrop-blur-sm text-[#1A1412] text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg pointer-events-none">APRÈS</div>
    </div>
  );
}

export function BeforeAfterGallery() {
  const { lang } = useLanguage();
  const isFr = lang === 'fr';
  const [active, setActive] = useState(0);
  const current = CASES[active];

  return (
    <section id="resultats" className="relative py-20 md:py-28 overflow-hidden bg-[#0F0D0B]">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, rgba(196,154,60,0.8) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full pointer-events-none opacity-10" style={{ background: `radial-gradient(ellipse, ${current.color}88 0%, transparent 70%)`, transition: 'background 0.5s' }} />

      <div className="mx-auto max-w-7xl px-6 md:px-12 relative z-10">
        <ScrollReveal className="text-center mb-14">
          <span className="font-mono text-xs tracking-widest text-[#C49A3C] uppercase font-semibold block mb-3">
            — {isFr ? 'Résultats Réels' : '????? ??????'} —
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
            {isFr ? 'Avant & Après' : '??? ????'}
          </h2>
          <p className="text-[#9A9A8A] max-w-xl mx-auto text-base leading-relaxed">
            {isFr
              ? 'Des transformations authentiques obtenues grâce à nos protocoles de soins personnalisés.'
              : '?????? ?????? ????? ???? ?????????? ??????? ??????? ??? ????.'}
          </p>
        </ScrollReveal>

        <ScrollReveal className="flex flex-wrap justify-center gap-2 mb-12">
          {CASES.map((c, i) => (
            <button key={c.id} onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${active === i ? 'bg-[#C49A3C] border-[#C49A3C] text-[#0F0D0B] shadow-[0_0_16px_rgba(196,154,60,0.4)]' : 'bg-white/5 border-white/10 text-[#9A9A8A] hover:border-[#C49A3C]/40 hover:text-[#C49A3C]'}`}>
              {c.category[isFr ? 'fr' : 'ar']}
            </button>
          ))}
        </ScrollReveal>

        <AnimatePresence mode="wait">
          <motion.div key={current.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              <BeforeAfterSlider src={current.image} alt={current.label[isFr ? 'fr' : 'ar']} />
            </div>
            <div className="flex flex-col justify-center gap-6">
              <div>
                <span className="inline-block font-mono text-[11px] uppercase tracking-widest px-3 py-1 rounded-full font-semibold" style={{ background: `${current.color}22`, color: current.color, border: `1px solid ${current.color}44` }}>
                  {current.tag[isFr ? 'fr' : 'ar']}
                </span>
              </div>
              <div>
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3">{current.category[isFr ? 'fr' : 'ar']}</h3>
                <p className="text-[#9A9A8A] text-lg leading-relaxed">{current.label[isFr ? 'fr' : 'ar']}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl p-4 border" style={{ background: `${current.color}0D`, borderColor: `${current.color}28` }}>
                  <p className="text-[#9A9A8A] text-xs font-mono uppercase tracking-widest mb-1">{isFr ? 'Nombre de séances' : '??? ???????'}</p>
                  <p className="text-white text-2xl font-bold font-serif">{current.sessions[isFr ? 'fr' : 'ar']}</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ background: `${current.color}0D`, borderColor: `${current.color}28` }}>
                  <p className="text-[#9A9A8A] text-xs font-mono uppercase tracking-widest mb-1">{isFr ? 'Durée du protocole' : '??? ??????????'}</p>
                  <p className="text-white text-2xl font-bold font-serif">{current.duration[isFr ? 'fr' : 'ar']}</p>
                </div>
              </div>
              <p className="text-[#5A5A52] text-xs leading-relaxed border-l-2 border-[#C49A3C]/30 pl-3">
                {isFr
                  ? 'Les résultats peuvent varier selon les individus. Chaque protocole est adapté à votre profil lors de la consultation initiale.'
                  : '?? ????? ??????? ?? ??? ????. ??? ????? ?? ???????? ????? ????? ?????? ???? ????????? ???????.'}
              </p>
              <Link href="/rendez-vous" className="inline-flex items-center gap-2.5 self-start bg-[#C49A3C] hover:bg-[#E8C97A] text-[#0F0D0B] font-bold px-7 py-3.5 rounded-full transition-all duration-200 text-sm shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.55)] hover:-translate-y-0.5">
                {isFr ? 'Prendre rendez-vous' : '???? ??????'}
                <IconArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-10">
          {CASES.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} aria-label={`Résultat ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${active === i ? 'w-6 h-2 bg-[#C49A3C]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
