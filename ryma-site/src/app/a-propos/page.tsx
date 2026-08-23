'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { CounterAnimation } from '@/components/animation/CounterAnimation';
import { Button } from '@/components/ui/Button';
import { playSoftClick } from '@/lib/sound';
import {
  IconSparkles,
  IconAward,
  IconShieldCheck,
  IconStethoscope,
  IconFlame,
  IconCalendarEvent,
  IconCheck,
  IconBrandWhatsapp,
  IconArrowRight,
  IconMapPin,
} from '@tabler/icons-react';

const DIPLOMAS = [
  {
    title: {
      fr: 'Diplôme de Kinésithérapie — ISTS (2012)',
      pt: 'Licenciatura em Fisioterapia — ISTS (2012)',
      en: 'Degree in Physiotherapy — ISTS (2012)',
    },
    detail: {
      fr: 'Formation médicale d\'État & biomécanique clinique',
      pt: 'Formação médica oficial & biomecânica clínica',
      en: 'Official medical training & clinical biomechanics',
    },
  },
  {
    title: {
      fr: 'Formation en Rééducation Périnéale — Lyon (2014)',
      pt: 'Especialização em Reabilitação Perineal — Lyon (2014)',
      en: 'Specialization in Pelvic Floor Rehabilitation — Lyon (2014)',
    },
    detail: {
      fr: 'Santé de la femme & rééducation post-partum ciblée',
      pt: 'Saúde da mulher & reabilitação pós-parto personalizada',
      en: 'Women\'s health & targeted postpartum therapy',
    },
  },
  {
    title: {
      fr: 'Certification Drainage Lymphatique Vodder (2015)',
      pt: 'Certificação em Drenagem Linfática Manual — Método Vodder (2015)',
      en: 'Manual Lymphatic Drainage Certification — Vodder (2015)',
    },
    detail: {
      fr: 'Technique originelle Vodder pour œdèmes et circulation',
      pt: 'Técnica original Vodder para edemas e circulação',
      en: 'Original Vodder technique for edema & circulation',
    },
  },
  {
    title: {
      fr: 'Diplôme en Médecine Esthétique Non-invasive (2017)',
      pt: 'Diploma em Estética Médica Avançada Não Invasiva (2017)',
      en: 'Non-Invasive Aesthetic Medicine Diploma (2017)',
    },
    detail: {
      fr: 'Remodelage corporel et régénération tissulaire',
      pt: 'Remodelação corporal e regeneração tecidular',
      en: 'Body contouring & tissue regeneration',
    },
  },
  {
    title: {
      fr: 'Formation Cryolipolyse & Cavitation — Paris (2019)',
      pt: 'Formação em Criolipólise e Cavitação Ultrassónica — Paris (2019)',
      en: 'Cryolipolysis & Ultrasonic Cavitation — Paris (2019)',
    },
    detail: {
      fr: 'Technologies de réduction graisseuse par le froid et ultrasons',
      pt: 'Tecnologias de redução adiposa por frio e ultrassons',
      en: 'Fat apoptosis technologies via cryo & ultrasound',
    },
  },
  {
    title: {
      fr: 'Certification RPG — Méthode Souchard (2021)',
      pt: 'Certificação em Reeducação Postural Global (RPG) — Método Souchard (2021)',
      en: 'Global Postural Reeducation (GPR) — Souchard Method (2021)',
    },
    detail: {
      fr: 'Alignement postural global & chaînes musculaires',
      pt: 'Alinhamento postural global & cadeias musculares',
      en: 'Global postural alignment & muscular chain therapy',
    },
  },
];

const TIMELINE = [
  {
    year: '2012',
    title: {
      pt: 'Fundação & Prática Clínica',
      en: 'Foundation & Clinical Practice',
      fr: 'Diplôme & Début de Pratique',
    },
    desc: {
      pt: 'Início da atividade clínica com foco em reabilitação motora e correção postural.',
      en: 'Launch of private practice focusing on musculoskeletal rehabilitation and posture.',
      fr: 'Début de l\'activité clinique axée sur la rééducation motrice et posturale.',
    },
  },
  {
    year: '2015',
    title: {
      pt: 'Especialização em Drenagem & Linfologia',
      en: 'Drainage & Lymphology Mastery',
      fr: 'Spécialisation en Drainage & Lymphologie',
    },
    desc: {
      pt: 'Certificação internacional Vodder e integração de protocolos de pós-parto e circulação.',
      en: 'International Vodder certification integrating postpartum and vascular therapies.',
      fr: 'Certification internationale Vodder et intégration des protocoles post-partum.',
    },
  },
  {
    year: '2018',
    title: {
      pt: 'Vanguarda Tecnológica Não Invasiva',
      en: 'Non-Invasive High-Tech Expansion',
      fr: 'Technologies Minceur Haut de Gamme',
    },
    desc: {
      pt: 'Adoção de equipamentos de criolipólise, radiofrequência e cavitação médica.',
      en: 'Acquisition of medical-grade cryolipolysis, radiofrequency, and ultrasound devices.',
      fr: 'Adoption d\'équipements médicaux certifiés pour le remodelage corporel sans chirurgie.',
    },
  },
  {
    year: '2022',
    title: {
      pt: 'Expansão da Clínica em Lisboa',
      en: 'Lisbon Practice Modernization',
      fr: 'Modernisation du Cabinet à Lisbonne',
    },
    desc: {
      pt: 'Instalações no coração nobre de Lisboa, concebidas para o máximo conforto e discrição.',
      en: 'Flagship suite in prime Lisbon created for supreme privacy, comfort, and safety.',
      fr: 'Nouveaux espaces au cœur de Lisbonne conçus pour le confort et la discrétion.',
    },
  },
  {
    year: '2026',
    title: {
      pt: 'Mais de 1.200 Pacientes Acompanhados',
      en: 'Over 1,200 Successfully Treated Patients',
      fr: 'Plus de 1 200 Patients Accompagnés',
    },
    desc: {
      pt: 'Reconhecimento continuado por excelência clínica, empatia e resultados duradouros.',
      en: 'Consistent recognition for clinical precision, human care, and lasting results.',
      fr: 'Reconnaissance continue pour l\'excellence des soins et la satisfaction des patients.',
    },
  },
];

export default function AboutPage() {
  const { lang, t } = useLanguage();

  return (
    <div className="bg-[#FAFAF8] text-[#1A1412] select-none">
      
      {/* ── Cinematic Hero with Background Image & Ambient Animation ── */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-20 overflow-hidden bg-[#1A1412] text-white text-center">
        {/* Photographic Background Layer with Smooth Zoom */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero/clinic.jpg"
            alt="Digital Clínica Lisboa"
            fill
            priority
            className="object-cover object-center opacity-30 scale-105 transform transition-transform duration-1000"
          />
          {/* Obsidian & Champagne Gold Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A1412]/90 via-[#1A1412]/75 to-[#1A1412]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 75% 60% at 50% 20%, rgba(196,154,60,0.3) 0%, transparent 75%)',
            }}
          />
        </div>

        {/* Ambient Floating Gold Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
          {[
            { top: '15%', left: '15%', size: 4, dur: 4.3, delay: 0 },
            { top: '25%', left: '80%', size: 3.5, dur: 5.1, delay: 0.8 },
            { top: '65%', left: '10%', size: 3, dur: 4.6, delay: 0.5 },
            { top: '55%', left: '88%', size: 4.5, dur: 5.9, delay: 1.2 },
            { top: '78%', left: '46%', size: 3.2, dur: 5.0, delay: 1.9 },
          ].map((p, idx) => (
            <motion.div
              key={idx}
              className="absolute rounded-full bg-[#E8C97A] opacity-60"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                boxShadow: '0 0 12px 2px rgba(232, 201, 122, 0.8)',
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.9, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-[#C49A3C]/40 px-4 py-1.5 rounded-full mb-4 sm:mb-5 shadow-[0_2px_12px_rgba(196,154,60,0.25)]">
              <IconSparkles size={14} className="text-[#E8C97A]" />
              <span className="font-mono text-[11px] tracking-[0.24em] text-[#F5E9C8] uppercase font-bold">
                {lang === 'pt' ? 'Sobre a Digital Clínica' : lang === 'en' ? 'About Digital Clinic' : 'À Propos de la Clinique'}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-[1.1] drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
              {lang === 'pt' ? (
                <>
                  Rigor Clínico & <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#E8C97A] via-[#F5E9C8] to-[#C49A3C] bg-clip-text text-transparent">
                    Sensibilidade Estética
                  </span>
                </>
              ) : lang === 'en' ? (
                <>
                  Clinical Precision & <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#E8C97A] via-[#F5E9C8] to-[#C49A3C] bg-clip-text text-transparent">
                    Aesthetic Excellence
                  </span>
                </>
              ) : (
                <>
                  Rigueur Médicale & <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#E8C97A] via-[#F5E9C8] to-[#C49A3C] bg-clip-text text-transparent">
                    Sensibilité Esthétique
                  </span>
                </>
              )}
            </h1>

            <p className="text-[#E8E2D8] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal mb-8">
              {lang === 'pt'
                ? 'Aliamos mais de uma década de prática fisioterapêutica médica às tecnologias de remodelação corporal mais avançadas da Europa, garantindo um acompanhamento totalmente individualizado.'
                : lang === 'en'
                ? 'Combining over a decade of clinical physiotherapy expertise with Europe’s most advanced non-invasive body contouring technologies in a private, serene setting.'
                : 'Alliant plus d\'une décennie d\'expérience clinique aux technologies minceur de pointe pour vous offrir une prise en charge sur mesure, sûre et bienveillante.'}
            </p>

            {/* Trust Highlights Ribbon */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-6 text-xs text-[#F5E9C8] font-medium">
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconAward size={15} className="text-[#E8C97A]" />
                {lang === 'pt' ? '14+ Anos de Experiência' : lang === 'en' ? '14+ Years Clinical Care' : '14+ Ans d\'Expérience'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconStethoscope size={15} className="text-[#E8C97A]" />
                {lang === 'pt' ? 'Fisioterapeuta D.E. & RPG' : lang === 'en' ? 'Licensed Physio & GPR' : 'Kinésithérapeute D.E'}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#2A221E]/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#C49A3C]/30 shadow-xs">
                <IconMapPin size={15} className="text-[#E8C97A]" />
                {lang === 'pt' ? 'Avenida da Liberdade • Lisboa' : lang === 'en' ? 'Avenida da Liberdade • Lisbon' : 'Avenida da Liberdade • Lisbonne'}
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Editorial Story & Pillars Grid ───────────────────────── */}
      <section className="py-12 sm:py-20 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            
            {/* Left Image Showcase */}
            <div className="lg:col-span-5 relative">
              <ScrollReveal direction="left">
                <div className="relative aspect-[3/4] max-w-md mx-auto rounded-3xl overflow-hidden border border-[#C49A3C]/35 shadow-2xl group">
                  <Image
                    src="/hero/clinic.jpg"
                    alt="Digital Clínica Lisboa"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1412]/85 via-transparent to-transparent" />

                  {/* Floating badge inside image */}
                  <div className="absolute bottom-5 inset-x-5 text-center text-white">
                    <div className="font-serif text-xl sm:text-2xl font-bold mb-1">Digital Clínica</div>
                    <p className="font-mono text-[10px] sm:text-xs text-[#E8C97A] tracking-wider uppercase">
                      Avenida da Liberdade 120 • Lisboa
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Narrative & Pillars */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal delay={0.1}>
                <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
                  — {lang === 'pt' ? 'A Nossa Filosofia' : lang === 'en' ? 'Our Philosophy' : 'Notre Philosophie'} —
                </span>

                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-4 leading-snug">
                  {lang === 'pt'
                    ? 'Uma Abordagem Médica e Humana para o Seu Bem-Estar'
                    : lang === 'en'
                    ? 'A Comprehensive, Human-Centered Approach'
                    : 'Une approche médicale et humaine dédiée à votre équilibre'}
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-[#554C42] leading-relaxed mb-4 font-normal">
                  {lang === 'pt'
                    ? 'Na Digital Clínica, acreditamos que cada corpo possui uma história biomecânica única. Desde a correção postural profunda (RPG) ao alívio de dores crónicas e à tonificação corporal não invasiva, desenhamos programas terapêuticos adaptados ao seu ritmo e aos seus objetivos.'
                    : lang === 'en'
                    ? 'At Digital Clinic, we recognize that every body has a distinct biomechanical signature. From deep postural reeducation (GPR) to chronic pain relief and non-invasive body contouring, every protocol is tailored specifically to your needs.'
                    : 'À la Digital Clínica, nous pensons que chaque corps est unique. De la rééducation posturale globale au soulagement des douleurs et aux soins minceur haute précision, nous concevons un protocole rigoureux et personnalisé.'}
                </p>

                {/* 3 Core Pillars */}
                <div className="space-y-3 pt-2">
                  {[
                    {
                      icon: <IconStethoscope size={18} className="text-[#9A7428]" />,
                      title: { pt: 'Diagnóstico & Rigor Clínico', en: 'Clinical Precision', fr: 'Précision Clinique' },
                      desc: {
                        pt: 'Avaliação detalhada antes de qualquer protocolo, assegurando total segurança.',
                        en: 'Thorough assessment prior to any treatment, guaranteeing supreme safety.',
                        fr: 'Bilan approfondi avant tout soin pour garantir une sécurité absolue.',
                      },
                    },
                    {
                      icon: <IconFlame size={18} className="text-[#C49A3C]" />,
                      title: { pt: 'Tecnologias Médicas de Ponta', en: 'Cutting-Edge Technology', fr: 'Haute Technologie' },
                      desc: {
                        pt: 'Equipamentos certificados de criolipólise, cavitação e radiofrequência.',
                        en: 'Certified high-performance cryolipolysis, cavitation, and radiofrequency devices.',
                        fr: 'Dispositifs certifiés pour des résultats visibles et durables.',
                      },
                    },
                    {
                      icon: <IconShieldCheck size={18} className="text-[#6F8F72]" />,
                      title: { pt: 'Atendimento Exclusivo 1-a-1', en: '1-on-1 Dedicated Care', fr: 'Séances 1-à-1 Privées' },
                      desc: {
                        pt: 'Sessões individuais em ambiente sereno e com total privacidade.',
                        en: 'Private one-on-one sessions in a peaceful, discreet clinical environment.',
                        fr: 'Séances individuelles dans un cadre intimiste et apaisant.',
                      },
                    },
                  ].map((pillar, i) => (
                    <div key={i} className="flex items-start gap-3.5 p-3 sm:p-4 rounded-2xl bg-white border border-[#E8E2D8] shadow-xs">
                      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#C49A3C]/20 shrink-0">
                        {pillar.icon}
                      </div>
                      <div>
                        <h3 className="font-serif text-sm sm:text-base font-bold text-[#1A1412]">
                          {pillar.title[lang] || pillar.title.pt}
                        </h3>
                        <p className="text-xs text-[#6B6058] leading-relaxed">
                          {pillar.desc[lang] || pillar.desc.pt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Ribbon ─────────────────────────────────────────── */}
      <section className="py-10 sm:py-12 bg-white border-y border-[#C49A3C]/25">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center divide-x-0 sm:divide-x divide-[#C49A3C]/20">
            {[
              { end: 1200, suffix: '+', label: { fr: 'Patients Accompagnés', pt: 'Pacientes Acompanhados', en: 'Treated Patients' } },
              { end: 12,   suffix: '+', label: { fr: 'Années d\'Expérience', pt: 'Anos de Experiência', en: 'Years Experience' } },
              { end: 13,   suffix: '',  label: { fr: 'Soins Spécialisés', pt: 'Protocolos Clínicos', en: 'Clinical Protocols' } },
              { end: 100,  suffix: '%', label: { fr: 'Séances Individuelles', pt: 'Atendimento Individual', en: 'Individual Sessions' } },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="px-2">
                  <div className="font-serif text-3xl sm:text-4xl font-bold bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#7D5B18] bg-clip-text text-transparent mb-1">
                    <CounterAnimation end={stat.end} suffix={stat.suffix} />
                  </div>
                  <div className="font-mono text-[10px] sm:text-xs font-semibold text-[#8A8078] tracking-wider uppercase line-clamp-1">
                    {stat.label[lang] || stat.label.pt || stat.label.fr}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diplomas & Certifications Grid ───────────────────────── */}
      <section className="py-14 sm:py-20 bg-[#FAFAF8]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-12">
          
          <ScrollReveal className="text-center mb-10 sm:mb-12">
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
              — {lang === 'pt' ? 'Qualificação Profissional' : lang === 'en' ? 'Professional Accreditation' : 'Diplômes & Certifications'} —
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-3">
              {lang === 'pt' ? 'Formação Clínica Contínua e Rigorosa' : lang === 'en' ? 'Continuous Clinical Education' : 'Formation Médicale & Certifications'}
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6058] max-w-xl mx-auto">
              {lang === 'pt'
                ? 'Especializações internacionais reconhecidas pelas ordens profissionais de saúde.'
                : lang === 'en'
                ? 'International certifications recognized by official medical and healthcare councils.'
                : 'Spécialisations internationales certifiées pour une prise en charge d\'excellence.'}
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DIPLOMAS.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <div className="h-full flex items-start gap-3.5 bg-white border border-[#E8E2D8] hover:border-[#C49A3C]/50 p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-sm transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF5EA] border border-[#C49A3C]/30 text-[#8A6A24] font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    0{i + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1412] text-xs sm:text-sm mb-1 leading-snug">
                      {item.title[lang] || item.title.pt || item.title.fr}
                    </h3>
                    <p className="text-[11px] text-[#8A8078] leading-relaxed font-normal">
                      {item.detail[lang] || item.detail.pt || item.detail.fr}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Career Chronology ────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-[#FDFBF7] border-t border-[#E8E2D8]/80">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-12">
          
          <ScrollReveal className="text-center mb-12">
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
              — {lang === 'pt' ? 'Trajetória' : lang === 'en' ? 'Timeline' : 'Parcours'} —
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412]">
              {lang === 'pt' ? 'Marcos do Percurso Clínico' : lang === 'en' ? 'Key Clinical Milestones' : 'Les Grandes Étapes'}
            </h2>
          </ScrollReveal>

          <div className="relative pl-6 sm:pl-8">
            {/* Timeline vertical bar */}
            <div className="absolute left-2.5 sm:left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#C49A3C] via-[#E8C97A] to-transparent" />

            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.06}>
                  <div className="relative flex items-start gap-4">
                    {/* Node Dot */}
                    <div className="absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#C49A3C] shadow-xs flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C49A3C]" />
                    </div>

                    <div className="bg-white border border-[#E8E2D8] rounded-2xl p-4 sm:p-5 shadow-xs w-full">
                      <span className="font-mono text-xs font-bold text-[#C49A3C] bg-[#FAF5EA] px-2.5 py-0.5 rounded-md inline-block mb-1.5">
                        {item.year}
                      </span>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1412] mb-1">
                        {item.title[lang] || item.title.pt || item.title.fr}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#6B6058] leading-relaxed font-normal">
                        {item.desc[lang] || item.desc.pt || item.desc.fr}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Luxury CTA Card ──────────────────────────────────────── */}
      <section className="py-14 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-12 text-center">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#C49A3C]/35 bg-white/95 backdrop-blur-xl p-8 sm:p-12 shadow-[0_12px_40px_rgba(196,154,60,0.12)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A]" />

              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1A1412] mb-3">
                {lang === 'pt' ? 'Inicie o Seu Programa Personalizado' : lang === 'en' ? 'Start Your Personalized Journey' : 'Commencez Votre Programme'}
              </h2>

              <p className="text-xs sm:text-base text-[#6B6058] max-w-lg mx-auto mb-8 leading-relaxed">
                {lang === 'pt'
                  ? 'Agende a sua consulta inicial de avaliação para desenharmos o protocolo ideal para a sua saúde e bem-estar.'
                  : lang === 'en'
                  ? 'Schedule your initial clinical consultation to craft the ideal protocol for your posture, recovery, and wellness.'
                  : 'Réservez votre bilan initial pour concevoir le protocole parfaitement adapté à vos besoins.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Button
                  href="/rendez-vous"
                  onClick={playSoftClick}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto text-sm px-8 py-3.5 shadow-md justify-center"
                >
                  <IconCalendarEvent size={17} className="me-2" />
                  {t.common.bookAppointment}
                </Button>

                <Button
                  href={`https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`}
                  onClick={playSoftClick}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-sm px-8 py-3.5 bg-white border-[#C49A3C]/30 text-[#1A1412] justify-center"
                >
                  <IconBrandWhatsapp size={17} className="me-2 text-[#25D366]" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
