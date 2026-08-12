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
  { fr: 'Diplôme de Kinésithérapie — ISTS Tunis (2012)', ar: 'دبلوم العلاج الطبيعي — ISTS تونس (2012)' },
  { fr: 'Formation en Rééducation Périnéale — Lyon, France (2014)', ar: 'تكوين في إعادة التأهيل العجاني — ليون، فرنسا (2014)' },
  { fr: 'Certification Drainage Lymphatique Manuel — Méthode Vodder (2015)', ar: 'شهادة الصرف اللمفاوي اليدوي — طريقة فودر (2015)' },
  { fr: 'Diplôme en Médecine Esthétique Non-invasive — Tunis (2017)', ar: 'دبلوم الطب التجميلي غير الجراحي — تونس (2017)' },
  { fr: 'Formation Cryolipolyse & Cavitation Ultrasonique — Paris (2019)', ar: 'تكوين تحليل الدهون بالتبريد والتكهيف — باريس (2019)' },
  { fr: 'Certification Rééducation Posturale Globale (RPG) — Méthode Souchard (2021)', ar: 'شهادة إعادة التأهيل الوضعي الشامل — طريقة سوشار (2021)' },
];

const TIMELINE = [
  { year: '2012', fr: 'Diplôme et ouverture du premier cabinet à Ezzahra', ar: 'دبلوم وافتتاح أول عيادة بالزهراء' },
  { year: '2015', fr: 'Spécialisation en drainage lymphatique et soins minceur', ar: 'التخصص في الصرف اللمفاوي وعلاجات التنحيف' },
  { year: '2017', fr: 'Introduction des premières technologies esthétiques non-invasives', ar: 'إدخال أولى تقنيات التجميل غير الجراحية' },
  { year: '2020', fr: 'Agrandissement du cabinet et équipement de pointe', ar: 'توسيع العيادة وتجهيزها بأحدث المعدات' },
  { year: '2024', fr: 'Plus de 1200 patientes accompagnées — 8 ans d\'expertise', ar: 'أكثر من 1200 مريضة — 8 سنوات من الخبرة' },
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
              {lang === 'fr' ? 'À Propos de Ryma Ouichka' : 'عن ريما ويشكة'}
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-[#1A1412] mb-6">
              {lang === 'fr' ? (
                <>Une vocation,<br /><span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#9A7428] bg-clip-text text-transparent">une expertise</span></>
              ) : (
                <>رسالة،<br /><span className="bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#9A7428] bg-clip-text text-transparent">وخبرة</span></>
              )}
            </h1>
            <p className="text-[#6B6058] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {lang === 'fr'
                ? 'Kinésithérapeute diplômée avec 8 ans d\'expérience à Ezzahra, Ryma Ouichka conjugue expertise médicale et technologies de pointe pour votre santé et votre silhouette.'
                : 'معالجة فيزيائية حاملة للشهادة مع 8 سنوات من الخبرة بالزهراء، تجمع ريما ويشكة بين الخبرة الطبية وأحدث التقنيات لصحتك وقوامك.'}
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
                  alt="Ryma Ouichka — Kinésithérapeute Ezzahra"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* Subtle gradient vignette at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1412]/80 via-transparent to-transparent opacity-90" />

                {/* Name & Title Overlay */}
                <div className="absolute bottom-16 inset-x-6 text-center text-white">
                  <h3 className="font-serif text-2xl font-bold mb-1 drop-shadow-md">Ryma Ouichka</h3>
                  <span className="font-mono text-xs font-semibold text-[#E8C97A] tracking-wider uppercase bg-[#1A1412]/60 backdrop-blur-md px-3 py-1 rounded-full border border-[#C49A3C]/40 inline-block shadow-sm">
                    {lang === 'fr' ? 'Kinésithérapeute & Esthéticienne Médicale' : 'معالجة فيزيائية وتجميل طبي'}
                  </span>
                </div>

                {/* Tags bottom bar */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-white/90 backdrop-blur-md border-t border-[#C49A3C]/30">
                  <div className="flex gap-2.5 justify-center">
                    {['8+ ans d\'expérience', '1200+ patients', 'Prise en charge CNAM'].map((tag) => (
                      <span key={tag} className="font-mono text-[11px] bg-[#F5E9C8] border border-[#C49A3C]/40 px-2.5 py-1 rounded-full text-[#9A7428] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right">
              <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase mb-4 block font-semibold">
                {lang === 'fr' ? '— Ma philosophie de soin —' : '— فلسفتي في العلاج —'}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412] mb-6">
                {lang === 'fr' ? 'L\'humain au cœur de chaque soin' : 'الإنسان في قلب كل علاج'}
              </h2>
              <div className="space-y-4 text-[#6B6058] leading-relaxed text-base">
                {lang === 'fr' ? (
                  <>
                    <p>Originaire de Tunisie, j'ai toujours été fascinée par le corps humain et ses capacités de résilience et de transformation. Mon parcours de kinésithérapeute a démarré par une passion pour aider les autres à se sentir bien dans leur corps.</p>
                    <p>Au fil des années, j'ai élargi mon expertise aux techniques d'amincissement non-invasives, convaincu qu'une approche globale — alliant rééducation, traitement de la douleur et soins esthétiques — est la voie la plus efficace vers le bien-être durable.</p>
                    <p>Ma philosophie est simple : chaque patiente est unique, chaque programme doit l'être aussi. Je refuse les solutions génériques et les promesses miraculeuses. Je préfère des résultats réels, obtenus progressivement, qui respectent votre corps et votre rythme.</p>
                  </>
                ) : (
                  <>
                    <p>تونسية الأصل، افتتنت دائماً بالجسم البشري وقدرته على الصمود والتحول. بدأت مسيرتي كمعالجة فيزيائية بشغف لمساعدة الآخرين على الشعور بالرضا في أجسادهم.</p>
                    <p>على مر السنين، وسّعت خبرتي لتشمل تقنيات التنحيف غير الجراحية، مقتنعةً بأن النهج الشامل هو الطريق الأكثر فعالية للعافية الدائمة.</p>
                    <p>فلسفتي بسيطة: كل مريضة فريدة، وكل برنامج يجب أن يكون كذلك. أرفض الحلول العامة والوعود المعجزة. أفضّل نتائج حقيقية تُحترم فيها طبيعة جسمك وإيقاعك.</p>
                  </>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { end: 1200, suffix: '+', label: { fr: 'Patients accompagnés', ar: 'مريضة مرافَقة' } },
              { end: 8, suffix: '+', label: { fr: 'Années d\'expérience', ar: 'سنوات الخبرة' } },
              { end: 13, suffix: '', label: { fr: 'Soins proposés', ar: 'علاجاً متاحاً' } },
              { end: 6, suffix: '', label: { fr: 'Certifications', ar: 'شهادات' } },
            ].map((stat, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <div className="bg-white border border-[#E8E2D8] rounded-2xl text-center py-8 px-4 shadow-sm hover:border-[#C49A3C]/40 transition-colors">
                  <div className="font-serif text-4xl font-bold text-[#C49A3C] mb-2">
                    <CounterAnimation end={stat.end} suffix={stat.suffix} />
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#8A8078] tracking-wide uppercase">
                    {stat.label[lang]}
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
              {lang === 'fr' ? '— Diplômes & Certifications —' : '— الدبلومات والشهادات —'}
            </span>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1A1412]">
              {lang === 'fr' ? 'Une formation continue rigoureuse' : 'تكوين مستمر ودقيق'}
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIPLOMAS.map((diploma, i) => (
              <ScrollReveal key={i} delay={i * 0.07}>
                <div className="flex items-start gap-4 bg-white border border-[#E8E2D8] p-5 rounded-2xl shadow-sm hover:border-[#C49A3C]/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#F5E9C8] border border-[#C49A3C]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[#9A7428] text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1412] leading-relaxed">{diploma[lang]}</p>
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
              {lang === 'fr' ? 'Mon Parcours' : 'مسيرتي'}
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
                      <p className="text-[#332D28] font-medium leading-relaxed">{item[lang]}</p>
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
              {lang === 'fr' ? 'Prenez rendez-vous' : 'احجزي موعداً'}
            </h2>
            <p className="text-[#6B6058] mb-8 text-base">
              {lang === 'fr' ? 'Le premier bilan est offert pour tout programme de 10 séances ou plus.' : 'التقييم الأول مجاني لكل برنامج من 10 جلسات أو أكثر.'}
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
