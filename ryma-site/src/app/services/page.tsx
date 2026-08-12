'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { SERVICES } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconStethoscope, IconFlame } from '@tabler/icons-react';

export default function ServicesPage() {
  const { lang, t } = useLanguage();

  const kine    = SERVICES.filter((s) => s.pole === 'kinesitherapie');
  const minceur = SERVICES.filter((s) => s.pole === 'minceur');

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-14 overflow-hidden bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 md:px-12 text-center">
          <ScrollReveal>
            <Badge variant="gold" className="mb-6">
              {lang === 'fr' ? 'Catalogue Complet des Soins' : 'كتالوج العلاجات الكامل'}
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'fr' ? '13 Soins Spécialisés' : '13 علاجاً متخصصاً'}
            </h1>
            <p className="text-[#6B6058] text-lg max-w-2xl mx-auto leading-relaxed">
              {lang === 'fr'
                ? 'Des soins thérapeutiques aux technologies minceur de pointe, découvrez tout ce que le cabinet Ryma Ouichka propose pour votre santé et votre silhouette.'
                : 'من العلاجات الطبية إلى أحدث تقنيات التنحيف، اكتشفي كل ما تقدمه عيادة ريما ويشكة لصحتك وقوامك.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Kinésithérapie Pole ──────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <ScrollReveal className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C49A3C] to-[#E8C97A] flex items-center justify-center text-white shadow-sm">
                <IconStethoscope size={17} />
              </div>
              <Badge variant="teal" className="text-sm px-5 py-2">
                {lang === 'fr' ? 'Kinésithérapie Thérapeutique' : 'العلاج الطبيعي العلاجي'}
              </Badge>
              <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/25 to-transparent" />
            </div>
            <p className="text-[#8A8078] max-w-3xl text-sm leading-relaxed">
              {lang === 'fr'
                ? 'Techniques manuelles et électrophysiques pour traiter les douleurs, corriger la posture et accompagner la rééducation post-traumatique ou post-partum. Prise en charge CNAM possible sur prescription médicale.'
                : 'تقنيات يدوية وفيزيائية لعلاج الآلام وتصحيح الوضعية ومرافقة إعادة التأهيل. إمكانية تغطية CNAM بوصفة طبية.'}
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kine.map((service, i) => (
              <ScrollReveal key={service.slug} delay={i * 0.07}>
                <ServiceCard service={service} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Minceur Pole ─────────────────────────────── */}
      <section className="py-16 bg-[#FDFCF8]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <ScrollReveal className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9A7428] to-[#C49A3C] flex items-center justify-center text-white shadow-sm">
                <IconFlame size={17} />
              </div>
              <Badge variant="bronze" className="text-sm px-5 py-2">
                {lang === 'fr' ? 'Technologies Minceur Non-Invasives' : 'تقنيات التنحيف غير الجراحية'}
              </Badge>
              <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/25 to-transparent" />
            </div>
            <p className="text-[#8A8078] max-w-3xl text-sm leading-relaxed">
              {lang === 'fr'
                ? "Équipements de dernière génération pour sculpter, raffermir et affiner votre silhouette sans chirurgie ni temps d'arrêt. Résultats progressifs et durables."
                : 'معدات من أحدث جيل لنحت الجسم وشده وتنحيفه بدون جراحة ولا توقف عن الأنشطة. نتائج تدريجية ودائمة.'}
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {minceur.map((service, i) => (
              <ScrollReveal key={service.slug} delay={i * 0.07}>
                <ServiceCard service={service} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────── */}
      <section className="py-16 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-xl px-6 md:px-12 text-center">
          <ScrollReveal>
            <p className="text-[#8A8078] mb-6 leading-relaxed">
              {lang === 'fr'
                ? 'Vous ne savez pas quel soin vous convient ? Commencez par un bilan personnalisé gratuit.'
                : 'لا تعرفين أي علاج يناسبك؟ ابدئي بتقييم شخصي مجاني.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/rendez-vous" variant="primary">
                {t.common.bookAppointment}
              </Button>
              <Button href="/tarifs" variant="outline">
                {t.common.seeRates}
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
