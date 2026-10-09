'use client';
import { SITE } from '@/lib/site';
import { useServices } from '@/components/ServiceCatalogProvider';

import { EditorialPageHeader } from '@/components/layout/EditorialPageHeader';
import headerStyles from '@/components/layout/EditorialPageHeader.module.css';
import { EDITORIAL_PAGES } from '@/data/editorial-pages';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Button } from '@/components/ui/Button';
import { playSoftClick } from '@/lib/sound';
import {
  IconShieldCheck,
  IconStethoscope,
  IconFlame,
  IconCalendarEvent,
  IconBrandWhatsapp,
  IconArrowRight,
} from '@tabler/icons-react';

export default function AboutPage() {
  const SERVICES=useServices();
  const { lang, t } = useLanguage();

  const intro = EDITORIAL_PAGES.about[lang];
  return (
    <div className="bg-[#FAFAF8] text-[#1A1412]">
      
      <EditorialPageHeader
        eyebrow={intro.eyebrow} title={intro.title} emphasis={intro.emphasis} description={intro.description}
        aside={<><span className={headerStyles.asideLabel}>{intro.asideLabel}</span><ol className={headerStyles.principles}>{intro.principles.map((principle, index) => <li key={principle}><span aria-hidden="true">0{index + 1}</span>{principle}</li>)}</ol></>}
      >
        <div className={headerStyles.actions}>
          <a href="#our-approach" className={headerStyles.primary}>{intro.action}<IconArrowRight size={16} aria-hidden="true" /></a>
          <Link href="/rendez-vous" className={headerStyles.secondary}>{intro.secondary}</Link>
        </div>
        <p className={headerStyles.footnote}>{intro.note}</p>
      </EditorialPageHeader>

      {/* ── Editorial Story & Pillars Grid ───────────────────────── */}
      <section id="our-approach" className="scroll-mt-28 py-12 sm:py-20 bg-[#FAFAF8]">
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
                      {SITE.address[lang] || t.common.location}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Narrative & Pillars */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal delay={0.1}>
                <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-bold block mb-1">
                  — {lang === 'es' ? "Nuestra filosofía" : lang === 'pt' ? 'A Nossa Filosofia' : lang === 'en' ? 'Our Philosophy' : 'Notre Philosophie'} —
                </span>

                <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-4 leading-snug">
                  {lang === 'es' ? "Un enfoque integral centrado en la persona" : lang === 'pt'
                    ? 'Uma Abordagem Médica e Humana para o Seu Bem-Estar'
                    : lang === 'en'
                    ? 'A Comprehensive, Human-Centered Approach'
                    : 'Une approche médicale et humaine dédiée à votre équilibre'}
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-[#554C42] leading-relaxed mb-4 font-normal">
                  {lang === 'es' ? "En Digital Clínica, sabemos que cada cuerpo tiene unas características biomecánicas únicas. Desde la reeducación postural global (RPG) hasta el alivio del dolor crónico y el remodelado corporal no invasivo, adaptamos cada protocolo a sus necesidades." : lang === 'pt'
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
                      title: {
    es: "Precisión clínica", pt: 'Diagnóstico & Rigor Clínico', en: 'Clinical Precision', fr: 'Précision Clinique' },
                      desc: {
    es: "Evaluación exhaustiva antes de cualquier tratamiento para garantizar la máxima seguridad.",
                        pt: 'Avaliação detalhada antes de qualquer protocolo, assegurando total segurança.',
                        en: 'Thorough assessment prior to any treatment, guaranteeing supreme safety.',
                        fr: 'Bilan approfondi avant tout soin pour garantir une sécurité absolue.',
                      },
                    },
                    {
                      icon: <IconFlame size={18} className="text-[#C49A3C]" />,
                      title: {
    es: "Tecnología de vanguardia", pt: 'Tecnologias Médicas de Ponta', en: 'Cutting-Edge Technology', fr: 'Haute Technologie' },
                      desc: {
    es: "Equipos certificados de alto rendimiento para criolipólisis, cavitación y radiofrecuencia.",
                        pt: 'Equipamentos certificados de criolipólise, cavitação e radiofrequência.',
                        en: 'Certified high-performance cryolipolysis, cavitation, and radiofrequency devices.',
                        fr: 'Dispositifs certifiés pour des résultats visibles et durables.',
                      },
                    },
                    {
                      icon: <IconShieldCheck size={18} className="text-[#6F8F72]" />,
                      title: {
    es: "Atención individualizada", pt: 'Atendimento Exclusivo 1-a-1', en: '1-on-1 Dedicated Care', fr: 'Séances 1-à-1 Privées' },
                      desc: {
    es: "Sesiones individuales en un entorno clínico tranquilo y discreto.",
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

      {/* ── Luxury CTA Card ──────────────────────────────────────── */}
      <section className="py-14 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-12 text-center">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#C49A3C]/35 bg-white/95 backdrop-blur-xl p-8 sm:p-12 shadow-[0_12px_40px_rgba(196,154,60,0.12)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A]" />

              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#1A1412] mb-3">
                {lang === 'es' ? "Comience su programa personalizado" : lang === 'pt' ? 'Inicie o Seu Programa Personalizado' : lang === 'en' ? 'Start Your Personalized Journey' : 'Commencez Votre Programme'}
              </h2>

              <p className="text-xs sm:text-base text-[#6B6058] max-w-lg mx-auto mb-8 leading-relaxed">
                {lang === 'es' ? "Reserve su primera consulta clínica para diseñar el protocolo ideal para su postura, recuperación y bienestar." : lang === 'pt'
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
