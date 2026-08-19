'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, ServicePole } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick } from '@/lib/sound';
import {
  IconStethoscope,
  IconFlame,
  IconSparkles,
  IconArrowRight,
  IconShieldCheck,
  IconCalendarEvent,
  IconFilter,
} from '@tabler/icons-react';

export function ServicesHub() {
  const { lang, t } = useLanguage();
  const [activePole, setActivePole] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');

  const filteredServices = SERVICES.filter((service) => {
    const matchesPole = activePole === 'all' || service.pole === activePole;
    if (!matchesPole) return false;

    if (activeTag === 'all') return true;
    if (activeTag === 'posture') {
      return ['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'].includes(service.slug);
    }
    if (activeTag === 'slimming') {
      return ['cryolipolyse', 'cavitation', 'radiofrequence', 'laser-lipo'].includes(service.slug);
    }
    if (activeTag === 'drainage') {
      return ['drainage-lymphatique', 'pressotherapie', 'massage-drainant'].includes(service.slug);
    }
    if (activeTag === 'postpartum') {
      return ['reeducation-post-partum', 'pressotherapie', 'massage-therapeutique'].includes(service.slug);
    }
    return true;
  });

  return (
    <section id="services" className="relative py-16 sm:py-24 bg-[#FAFAF8] overflow-hidden select-none">
      
      {/* Background Architectural Light Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[550px]"
          style={{
            background:
              'radial-gradient(ellipse 70% 45% at 50% 30%, rgba(245,233,200,0.45) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-12">
        
        {/* ── Section Header ── */}
        <ScrollReveal className="text-center mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md border border-[#C49A3C]/35 px-4 py-1.5 rounded-full mb-3 sm:mb-4 shadow-xs">
            <IconSparkles size={14} className="text-[#C49A3C]" />
            <span className="font-mono text-[11px] tracking-[0.24em] text-[#9A7428] uppercase font-bold">
              {lang === 'pt' ? 'Polos Clínicos de Excelência' : lang === 'en' ? 'Centers of Clinical Excellence' : 'Pôles de Soins d\'Excellence'}
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-3 sm:mb-4 tracking-tight">
            {lang === 'pt' ? 'Os Nossos Cuidados Especializados' : lang === 'en' ? 'Specialized Medical Treatments' : 'Nos Soins & Protocoles Médicaux'}
          </h2>

          <p className="text-[#6B6058] max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed font-normal">
            {lang === 'pt'
              ? '13 tratamentos de vanguarda estruturados para a saúde postural, alívio de dor articular e remodelação corporal sem cirurgia.'
              : lang === 'en'
              ? '13 advanced protocols tailored for postural alignment, joint recovery, and non-invasive silhouette remodeling.'
              : '13 soins sur mesure alliant précision clinique et technologies de pointe pour votre posture et votre silhouette.'}
          </p>

          {/* ── Category Segmented Switcher ── */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-1.5 bg-white border border-[#C49A3C]/30 rounded-full max-w-md mx-auto mt-6 sm:mt-8 shadow-xs">
            <button
              onClick={() => { setActivePole('all'); setActiveTag('all'); playSoftClick(); }}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
                activePole === 'all'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                  : 'text-[#554C42] hover:text-[#9A7428]'
              }`}
            >
              {lang === 'pt' ? 'Todos (13)' : lang === 'en' ? 'All (13)' : 'Tous (13)'}
            </button>
            <button
              onClick={() => { setActivePole('kinesitherapie'); setActiveTag('all'); playSoftClick(); }}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
                activePole === 'kinesitherapie'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                  : 'text-[#554C42] hover:text-[#9A7428]'
              }`}
            >
              {lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
            </button>
            <button
              onClick={() => { setActivePole('minceur'); setActiveTag('all'); playSoftClick(); }}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
                activePole === 'minceur'
                  ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                  : 'text-[#554C42] hover:text-[#9A7428]'
              }`}
            >
              {lang === 'pt' ? 'Estética Minceur' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
            </button>
          </div>

          {/* ── Sub-Filter Goal Chips ── */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 max-w-2xl mx-auto">
            {[
              { id: 'all', label: { pt: 'Todos os Objetivos', en: 'All Goals', fr: 'Tous les Objectifs' } },
              { id: 'posture', label: { pt: 'Postura & Coluna', en: 'Posture & Spine', fr: 'Posture & Dos' } },
              { id: 'slimming', label: { pt: 'Gordura & Firmeza', en: 'Fat & Tightening', fr: 'Graisse & Fermeté' } },
              { id: 'drainage', label: { pt: 'Drenagem & Pernas', en: 'Drainage & Legs', fr: 'Drainage & Jambes' } },
              { id: 'postpartum', label: { pt: 'Saúde Pós-Parto', en: 'Postpartum Care', fr: 'Soins Post-Partum' } },
            ].map((tag) => (
              <button
                key={tag.id}
                onClick={() => { setActiveTag(tag.id); playSoftClick(); }}
                className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all border ${
                  activeTag === tag.id
                    ? 'bg-[#FAF5EA] border-[#C49A3C] text-[#8A6A24] font-bold shadow-xs'
                    : 'bg-white/70 border-[#E8E2D8] text-[#8A8078] hover:text-[#1A1412] hover:bg-white'
                }`}
              >
                {tag.label[lang] || tag.label.pt}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ── Services Responsive Grid ── */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, i) => (
              <motion.div
                key={service.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <ServiceCard service={service} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ── Bottom Section CTA Action ── */}
        <div className="mt-12 sm:mt-16 text-center">
          <ScrollReveal>
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-2 sm:p-2.5 bg-white border border-[#C49A3C]/30 rounded-2xl sm:rounded-full shadow-xs">
              <div className="flex items-center gap-2 px-3 text-xs text-[#554C42]">
                <IconShieldCheck size={16} className="text-[#6F8F72]" />
                <span className="font-semibold">
                  {lang === 'pt'
                    ? 'Avaliação personalizada e recibos para comparticipação ADSE/Seguros'
                    : lang === 'en'
                    ? 'Personalized consultation & certified insurance receipts'
                    : 'Bilan personnalisé & factures conformes mutuelles'}
                </span>
              </div>

              <Link
                href="/services"
                onClick={playSoftClick}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl sm:rounded-full bg-[#1A1412] hover:bg-[#2C2420] text-[#E8C97A] text-xs font-bold transition-all shadow-xs"
              >
                <span>{lang === 'pt' ? 'Ver Catálogo Completo' : lang === 'en' ? 'View Full Catalog' : 'Catalogue Complet'}</span>
                <IconArrowRight size={13} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
