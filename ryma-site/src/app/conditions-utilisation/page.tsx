'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconFileCheck, IconCalendarEvent, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

export default function ConditionsUtilisationPage() {
  const { lang, t } = useLanguage();

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] pt-28 pb-24">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#9A7428] hover:text-[#C49A3C] transition-colors mb-8 bg-[#F5E9C8] border border-[#C49A3C]/30 px-4 py-2 rounded-full"
          >
            <IconArrowLeft size={14} className="rtl-flip" />
            <span>{t.common.backToHome}</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30">
              <IconFileCheck size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {lang === 'pt' ? 'Termos e Condições de Serviço' : lang === 'en' ? 'Terms of Service' : 'Conditions de Service'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {lang === 'pt' ? 'Termos e Condições Gerais' : lang === 'en' ? 'Terms & Conditions' : 'Conditions Générales d\'Utilisation'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {lang === 'pt'
              ? 'Bem-vindo ao website oficial da Digital Clínica. A utilização deste website e dos serviços de agendamento online rege-se pelos presentes termos e condições.'
              : lang === 'en'
              ? 'Welcome to the official website of Digital Clinic. The use of this website and its online booking services is subject to these Terms & Conditions.'
              : 'Bienvenue sur le site de la Digital Clínica. L\'utilisation de ce site et des services de réservation en ligne implique l\'acceptation pleine et entière des présentes conditions.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Modalités de Réservation */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconCalendarEvent className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '1. Agendamento de Consultas & Compromissos' : lang === 'en' ? '1. Appointment Booking & Commitments' : '1. Prise de rendez-vous & Engagements'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {lang === 'pt'
                ? 'O serviço de marcação online permite aos utentes selecionar um tratamento e um horário de atendimento disponível. A confirmação do agendamento é enviada por mensagem (SMS/WhatsApp) ou contacto telefónico.'
                : lang === 'en'
                ? 'The online booking service allows patients to select a treatment and an available time slot. Booking confirmation is sent via SMS, WhatsApp, or phone call.'
                : 'Le service de réservation en ligne permet aux patients de sélectionner un soin et un créneau horaire disponible.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {lang === 'pt'
                ? 'A marcação de uma consulta compromete o utente a comparecer à hora agendada nas instalações da clínica em Lisboa, Portugal.'
                : lang === 'en'
                ? 'Booking an appointment commits the patient to arrive at the scheduled time at the clinic facilities in Lisbon, Portugal.'
                : 'Tout rendez-vous réservé engage le patient à se présenter à l\'heure convenue à la clinique à Lisbonne.'}
            </p>
          </div>

          {/* 2. Annulation & Report */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconAlertCircle className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '2. Política de Desmarcação e Reagendamento' : lang === 'en' ? '2. Cancellation & Rescheduling Policy' : '2. Politique d\'annulation et de report'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {lang === 'pt'
                ? 'Para garantir a disponibilidade e a qualidade de atendimento a todos os utentes, solicitamos um aviso prévio de pelo menos 24 horas em caso de desmarcação ou necessidade de reagendamento de uma sessão.'
                : lang === 'en'
                ? 'To ensure availability and service quality for all patients, we request at least 24 hours prior notice for cancellations or rescheduling.'
                : 'Afin d\'assurer un service fluide à l\'ensemble de nos patients, nous demandons un préavis d\'au moins 24 heures en cas d\'annulation.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {lang === 'pt'
                ? 'A desmarcação pode ser efetuada contactando a clínica através do telefone (+351 912 345 678) ou por mensagem de WhatsApp.'
                : lang === 'en'
                ? 'Cancellations can be made by contacting the clinic at (+351 912 345 678) or via WhatsApp.'
                : 'L\'annulation peut être effectuée en appelant la clinique au (+351 912 345 678) ou par message WhatsApp.'}
            </p>
          </div>

          {/* 3. Tarification & Règlement */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? '3. Preços e Faturação' : lang === 'en' ? '3. Pricing & Invoicing' : '3. Tarifs et facturation'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {lang === 'pt'
                ? 'Todos os preços apresentados no website estão expressos em Euros (€) com todas as taxas incluídas quando aplicável. O pagamento é realizado diretamente na clínica no final da sessão (Multibanco, MB WAY ou numerário).'
                : lang === 'en'
                ? 'All prices shown on the website are in Euros (€). Payment is completed directly at the clinic at the end of each session.'
                : 'Tous les tarifs affichés sur le site sont exprimés en Euros (€). Le règlement s\'effectue directement à la clinique.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {lang === 'pt'
                ? 'São emitidas faturas-recibo com número de cédula profissional para efeitos de dedução em IRS e pedido de reembolso junto de seguradoras de saúde ou subsistemas (ADSE, Médis, Multicare, etc.).'
                : lang === 'en'
                ? 'Certified medical invoices with professional license numbers are provided for tax deduction and health insurance reimbursement.'
                : 'Des factures-reçus certifiées sont délivrées pour vos demandes de remboursement auprès de vos mutuelles ou assurances.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
