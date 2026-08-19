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
              {lang === 'pt' ? 'Catálogo Completo de Tratamentos' : lang === 'en' ? 'Complete Treatment Catalog' : 'Catalogue Complet des Soins'}
            </Badge>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? '13 Tratamentos Especializados' : lang === 'en' ? '13 Specialized Treatments' : '13 Soins Spécialisés'}
            </h1>
            <p className="text-[#6B6058] text-lg max-w-2xl mx-auto leading-relaxed">
              {lang === 'pt'
                ? 'Dos tratamentos clínicos de fisioterapia às tecnologias de remodelação corporal de ponta, descubra os cuidados especializados da Digital Clínica.'
                : lang === 'en'
                ? 'From therapeutic physiotherapy to state-of-the-art slimming technologies, discover all treatments offered by Digital Clinic.'
                : 'Des soins thérapeutiques aux technologies minceur de pointe, découvrez tout ce que la Digital Clínica propose pour votre santé et votre silhouette.'}
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
                {lang === 'pt' ? 'Fisioterapia Terapêutica' : lang === 'en' ? 'Therapeutic Physiotherapy' : 'Kinésithérapie Thérapeutique'}
              </Badge>
              <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/25 to-transparent" />
            </div>
            <p className="text-[#8A8078] max-w-3xl text-sm leading-relaxed">
              {lang === 'pt'
                ? 'Técnicas manuais e eletroterapia para tratar a dor, reabilitar lesões, corrigir a postura e acompanhar a recuperação pós-parto. Comparticipação médica elegível com prescrição.'
                : lang === 'en'
                ? 'Manual techniques and electrotherapy to manage pain, correct posture, and support trauma or postpartum rehab. Medical insurance & receipts supported.'
                : 'Techniques manuelles et électrophysiques pour traiter les douleurs, corriger la posture et accompagner la rééducation post-traumatique ou post-partum. Prise en charge mutuelle / assurance possible sur prescription médicale.'}
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
                {lang === 'pt' ? 'Estética Corporal & Remodelação Não Invasiva' : lang === 'en' ? 'Non-Invasive Body Contouring' : 'Technologies Minceur Non-Invasives'}
              </Badge>
              <div className="h-px flex-1 bg-gradient-to-r from-[#C49A3C]/25 to-transparent" />
            </div>
            <p className="text-[#8A8078] max-w-3xl text-sm leading-relaxed">
              {lang === 'pt'
                ? 'Equipamentos médicos de última geração para esculpir, firmar e reduzir o volume corporal sem cirurgia. Resultados progressivos e duradouros.'
                : lang === 'en'
                ? 'State-of-the-art medical devices to sculpt, firm, and refine your silhouette without surgery or downtime. Progressive and lasting results.'
                : "Équipements de dernière génération pour sculpter, raffermir et affiner votre silhouette sans chirurgie ni temps d'arrêt. Résultats progressifs et durables."}
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
              {lang === 'pt'
                ? 'Tem dúvidas sobre qual o tratamento ideal para si? Comece com uma consulta de avaliação personalizada.'
                : lang === 'en'
                ? 'Not sure which treatment suits your needs best? Start with a complimentary initial assessment.'
                : 'Vous ne savez pas quel soin vous convient ? Commencez par un bilan personnalisé gratuit.'}
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
