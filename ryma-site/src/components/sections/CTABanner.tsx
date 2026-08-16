'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconBrandWhatsapp, IconCalendar, IconCheck } from '@tabler/icons-react';

export function CTABanner() {
  const { lang, t } = useLanguage();

  const trustItems = [
    { text: lang === 'pt' ? 'Possibilidade de comparticipação CNAM' : lang === 'en' ? 'CNAM insurance coverage available' : 'Prise en charge CNAM possible' },
    { text: lang === 'pt' ? 'Sem compromisso' : lang === 'en' ? 'No commitment required' : 'Sans engagement' },
    { text: lang === 'pt' ? 'Lembrete automático 24h antes' : lang === 'en' ? 'Automatic 24h SMS reminder' : 'Rappel automatique 24h avant' },
  ];

  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Gold champagne gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F9F0DC] via-[#F5E9C8] to-[#EDD9A0]" />
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #C49A3C 0, #C49A3C 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Soft white vignette edges */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FAFAF8] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FAFAF8] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 md:px-12 text-center">
        <ScrollReveal>
          <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-semibold mb-4 block">
            {lang === 'pt' ? '— Pronto(a) para começar a sua transformação ? —' : lang === 'en' ? '— Ready to start your health journey ? —' : '— Prêt(e) à commencer votre parcours ? —'}
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-6">
            {lang === 'pt'
              ? <>O seu bem-estar,<br /><span className="text-gradient-gold">a nossa prioridade</span></>
              : lang === 'en'
              ? <>Your well-being,<br /><span className="text-gradient-gold">our priority</span></>
              : <>Votre bien-être,<br /><span className="text-gradient-gold">notre priorité</span></>}
          </h2>
          <p className="text-[#6B5A3A] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {lang === 'pt'
              ? 'Agende a sua consulta online ou envie-nos uma mensagem no WhatsApp. Primeira avaliação oferecida no plano de 10 sessões.'
              : lang === 'en'
              ? 'Book your appointment online or contact us directly via WhatsApp. Complimentary initial assessment with 10-session packages.'
              : 'Prenez rendez-vous en ligne ou contactez-nous sur WhatsApp. Premier bilan offert pour tout nouveau programme de 10 séances.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/rendez-vous" variant="primary" size="lg">
            <IconCalendar size={18} className="me-2" />
            {t.common.bookAppointment}
          </Button>
          <Button
            href={`https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`}
            variant="secondary"
            size="lg"
          >
            <IconBrandWhatsapp size={18} className="me-2" />
            {lang === 'pt' ? 'WhatsApp Direto' : lang === 'en' ? 'Direct WhatsApp' : 'WhatsApp Direct'}
          </Button>
        </ScrollReveal>

        {/* Trust indicators */}
        <ScrollReveal delay={0.35} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[#7A6A48]">
              <span className="w-5 h-5 rounded-full bg-white/70 border border-[#C49A3C]/30 flex items-center justify-center">
                <IconCheck size={11} className="text-[#9A7428]" strokeWidth={3} />
              </span>
              {item.text}
            </div>
          ))}
        </ScrollReveal>
      </div>
    </section>
  );
}
