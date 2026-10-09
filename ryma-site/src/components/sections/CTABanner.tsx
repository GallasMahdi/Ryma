'use client';
import { legacyText } from '@/data/translations/legacy-es';


import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconBrandWhatsapp, IconCalendar, IconCheck } from '@tabler/icons-react';

export function CTABanner() {
  const { lang, t } = useLanguage();

  const trustItems = [
    { text: lang === 'es' ? "Recibos para el reembolso del seguro médico" : lang === 'pt' ? 'Faturas-recibo para reembolso de seguros e ADSE' : lang === 'en' ? 'Receipts for health insurance reimbursement' : 'Factures-reçus pour mutuelles et assurances' },
    { text: lang === 'es' ? "Sin compromiso" : lang === 'pt' ? 'Sem compromisso' : lang === 'en' ? 'No commitment required' : 'Sans engagement' },
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
            {lang === 'es' ? "— ¿Preparado para empezar a cuidar de su salud? —" : lang === 'pt' ? '— Pronto(a) para começar a sua transformação ? —' : lang === 'en' ? '— Ready to start your health journey ? —' : '— Prêt(e) à commencer votre parcours ? —'}
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-6">
            {lang === 'es' ? <>{legacyText("Your well-being,", lang)}<br /><span className="text-gradient-gold">{legacyText("our priority", lang)}</span></> : lang === 'pt'
              ? <>O seu bem-estar,<br /><span className="text-gradient-gold">a nossa prioridade</span></>
              : lang === 'en'
              ? <>{legacyText("Your well-being,", lang)}<br /><span className="text-gradient-gold">{legacyText("our priority", lang)}</span></>
              : <>Votre bien-être,<br /><span className="text-gradient-gold">notre priorité</span></>}
          </h2>
          <p className="text-[#6B5A3A] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            {lang === 'es' ? "Reserve su cita en línea o contacte directamente por WhatsApp. Descubra los tratamientos disponibles." : lang === 'pt'
              ? 'Agende a sua consulta online ou envie-nos uma mensagem no WhatsApp. Consulte os tratamentos disponíveis.'
              : lang === 'en'
              ? 'Book your appointment online or contact us directly via WhatsApp. Explore the available treatments.'
              : 'Prenez rendez-vous en ligne ou contactez-nous sur WhatsApp. Découvrez les soins disponibles.'}
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
            {lang === 'es' ? "WhatsApp directo" : lang === 'pt' ? 'WhatsApp Direto' : lang === 'en' ? 'Direct WhatsApp' : 'WhatsApp Direct'}
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
