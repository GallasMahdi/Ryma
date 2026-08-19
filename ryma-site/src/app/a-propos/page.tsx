'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CounterAnimation } from '@/components/animation/CounterAnimation';

const DIPLOMAS = [
  { fr: 'Diplôme de Kinésithérapie — ISTS (2012)', pt: 'Licenciatura em Fisioterapia — ISTS (2012)', en: 'Physiotherapy Degree — ISTS (2012)' },
  { fr: 'Formation en Rééducation Périnéale — Lyon (2014)', pt: 'Especialização em Reabilitação Perineal — Lyon (2014)', en: 'Specialization in Pelvic Floor Rehab — Lyon (2014)' },
  { fr: 'Certification Drainage Lymphatique Vodder (2015)', pt: 'Certificação em Drenagem Linfática Manual — Vodder (2015)', en: 'Manual Lymphatic Drainage Certification — Vodder (2015)' },
  { fr: 'Diplôme en Médecine Esthétique Non-invasive (2017)', pt: 'Diploma em Estética Avançada Não Invasiva (2017)', en: 'Non-Invasive Aesthetic Medicine Diploma (2017)' },
  { fr: 'Formation Cryolipolyse & Cavitation — Paris (2019)', pt: 'Formação em Criolipólise e Cavitação — Paris (2019)', en: 'Cryolipolysis & Cavitation Training — Paris (2019)' },
  { fr: 'Certification RPG — Méthode Souchard (2021)', pt: 'Certificação em Reeducação Postural Global (RPG) — Método Souchard (2021)', en: 'Global Postural Reeducation (RPG) Certification (2021)' },
];

const TIMELINE = [
  { year: '2012', fr: 'Diplôme et ouverture du cabinet', pt: 'Obtenção do diploma e abertura da clínica', en: 'Graduation and opening of the clinical practice' },
  { year: '2015', fr: 'Spécialisation en drainage et minceur', pt: 'Especialização em drenagem linfática e estética', en: 'Specialization in lymphatic drainage and body contouring' },
  { year: '2017', fr: 'Technologies esthétiques non-invasives', pt: 'Introdução de tecnologias de remodelação de ponta', en: 'Introduction of advanced non-invasive technologies' },
  { year: '2020', fr: 'Agrandissement de la clinique', pt: 'Expansão da clínica e renovação tecnológica', en: 'Clinic expansion and state-of-the-art equipment upgrade' },
  { year: '2024', fr: 'Plus de 1200 patientes accompagnées', pt: 'Mais de 1200 pacientes acompanhadas com sucesso', en: 'Over 1,200 satisfied patients served' },
];

export default function AboutPage() {
  const { lang, t } = useLanguage();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 overflow-hidden bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-96"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 md:px-12 text-center">
          <ScrollReveal>
            <Badge variant="gold" className="mb-6">
              {lang === 'pt' ? 'Sobre a Digital Clínica' : lang === 'en' ? 'About Digital Clinic' : 'À Propos de Digital Clínica'}
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1412] mb-6">
              {lang === 'pt' ? (
                <>Uma vocação,<br /><span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#9A7428] bg-clip-text text-transparent">uma especialização</span></>
              ) : lang === 'en' ? (
                <>A passion,<br /><span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#9A7428] bg-clip-text text-transparent">medical expertise</span></>
              ) : (
                <>Une vocation,<br /><span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#9A7428] bg-clip-text text-transparent">une expertise</span></>
              )}
            </h1>
            <p className="text-[#6B6058] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {lang === 'pt'
                ? 'Com anos de experiência clínica consolidada, a Digital Clínica alia o rigor médico às tecnologias de vanguarda para a sua saúde e remodelação corporal.'
                : lang === 'en'
                ? 'With years of clinical excellence, Digital Clinic combines medical expertise and state-of-the-art technologies for your health and body contouring.'
                : 'Avec des années d\'expérience clinique, Digital Clínica conjugue expertise médicale et technologies de pointe pour votre santé et votre silhouette.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Portrait & Bio ───────────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <ScrollReveal direction="left">
              {/* Portrait card */}
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-[#C49A3C]/40 shadow-xl group">
                <Image
                  src="/ryma_ouichka.jpg"
                  alt="Digital Clínica — Fisioterapia"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Subtle gradient vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1412]/80 via-transparent to-transparent opacity-90" />

                {/* Name & Title Overlay */}
                <div className="absolute bottom-16 inset-x-6 text-center text-white">
                  <h3 className="font-serif text-2xl font-bold mb-1 drop-shadow-md">Digital Clínica</h3>
                  <span className="font-mono text-xs font-semibold text-[#E8C97A] tracking-wider uppercase bg-[#1A1412]/60 backdrop-blur-md px-3 py-1 rounded-full border border-[#C49A3C]/40 inline-block shadow-sm">
                    {lang === 'pt' ? 'Fisioterapia & Estética Médica' : lang === 'en' ? 'Physiotherapy & Medical Aesthetics' : 'Kinésithérapie & Soins Avancés'}
                  </span>
                </div>

                {/* Tags bottom bar */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-white/90 backdrop-blur-md border-t border-[#C49A3C]/30">
                  <div className="flex gap-2.5 justify-center">
                    {[
                      lang === 'pt' ? '12+ anos de prática' : lang === 'en' ? '12+ years experience' : '12+ ans d\'expérience',
                      lang === 'pt' ? '1200+ pacientes' : lang === 'en' ? '1,200+ patients' : '1200+ patients',
                      lang === 'pt' ? 'Seguros & Regime Livre' : lang === 'en' ? 'Insurance Coverage' : 'Mutuelles & Assurances',
                    ].map((tag) => (
                      <span key={tag} className="font-mono text-[11px] bg-[#F5E9C8] border border-[#C49A3C]/40 px-2.5 py-1 rounded-full text-[#9A7428] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="space-y-5 text-[#6B6058] text-base leading-relaxed">
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412] mb-6">
                  {t.about.bioTitle}
                </h2>
                <p>
                  {t.about.bioText1}
                </p>
                <p>
                  {t.about.bioText2}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Stats Band ───────────────────────────────── */}
      <section className="py-12 bg-[#F5E9C8]/40 border-y border-[#C49A3C]/20">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { end: 1200, suffix: '+', label: { fr: 'Patientes accompagnées', pt: 'Pacientes Satisfeitas', en: 'Satisfied Patients' } },
              { end: 12, suffix: ' ans', label: { fr: "D'expérience clinique", pt: 'Anos de Experiência Clínicos', en: 'Years of Clinical Practice' } },
              { end: 100, suffix: '%', label: { fr: 'Soins personnalisés', pt: 'Tratamentos Personalizados', en: 'Personalized Protocols' } },
              { end: 13, suffix: '', label: { fr: 'Soins spécialisés', pt: 'Tratamentos Especializados', en: 'Specialized Treatments' } },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div>
                  <div className="font-serif text-3xl md:text-4xl font-bold text-[#C49A3C] mb-1">
                    <CounterAnimation end={stat.end} suffix={stat.suffix} />
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#8A8078] tracking-wide uppercase">
                    {stat.label[lang] || stat.label.pt || stat.label.fr}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diplomas ─────────────────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <ScrollReveal className="mb-10">
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase mb-3 block font-semibold">
              — {lang === 'pt' ? 'Diplomas & Certificações' : lang === 'en' ? 'Diplomas & Certifications' : 'Diplômes & Certifications'} —
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412]">
              {lang === 'pt' ? 'Formação Clínica Contínua e Rigorosa' : lang === 'en' ? 'Rigorous Continuous Education' : 'Une formation continue rigoureuse'}
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIPLOMAS.map((diploma, i) => (
              <ScrollReveal key={i} delay={i * 0.07}>
                <div className="flex items-start gap-4 bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm hover:border-[#C49A3C]/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#F5E9C8] border border-[#C49A3C]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#9A7428] text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1412] leading-relaxed">
                    {diploma[lang as keyof typeof diploma] || diploma.pt || diploma.fr}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <ScrollReveal className="mb-10">
            <h2 className="font-serif text-3xl font-bold text-[#1A1412]">
              {lang === 'pt' ? 'Percurso Profissional' : lang === 'en' ? 'Career Journey' : 'Mon Parcours'}
            </h2>
          </ScrollReveal>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute start-4 md:start-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C49A3C] via-[#E8C97A] to-transparent" />

            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="flex items-start gap-6 md:gap-8">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 md:w-12 h-8 md:h-12 rounded-full bg-white border-2 border-[#C49A3C] flex items-center justify-center shadow-sm">
                        <span className="font-mono text-xs md:text-sm font-bold text-[#9A7428]">
                          {item.year.slice(2)}
                        </span>
                      </div>
                    </div>
                    <div className="pb-8">
                      <div className="font-mono text-xs font-bold text-[#C49A3C] mb-1">{item.year}</div>
                      <p className="text-[#332D28] font-medium leading-relaxed">
                        {item[lang as keyof typeof item] || item.pt || item.fr}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="py-16 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-xl px-6 md:px-12 text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? 'Agende a sua Consulta' : lang === 'en' ? 'Book Your Appointment' : 'Prenez rendez-vous'}
            </h2>
            <p className="text-[#6B6058] mb-8 text-base">
              {lang === 'pt' ? 'Primeira avaliação oferecida em pacotes de 10 sessões ou mais.' : lang === 'en' ? 'Complimentary initial assessment with packages of 10 sessions or more.' : 'Le premier bilan est offert pour tout programme de 10 séances ou plus.'}
            </p>
            <Button href="/rendez-vous" variant="primary" size="lg">
              {t.common.bookAppointment}
            </Button>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
