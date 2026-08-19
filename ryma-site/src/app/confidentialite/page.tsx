'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconLock, IconCheck, IconArrowLeft, IconDatabase, IconUserCheck, IconShieldCheck } from '@tabler/icons-react';

export default function ConfidentialitePage() {
  const { lang, t } = useLanguage();

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] pt-28 pb-24">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#9A7428] hover:text-[#C49A3C] transition-colors mb-8 bg-[#F5E9C8] border border-[#C49A3C]/30 px-4 py-2 rounded-full"
          >
            <IconArrowLeft size={14} />
            <span>{t.common.backToHome}</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30">
              <IconLock size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {lang === 'pt' ? 'Proteção de Dados & RGPD' : lang === 'en' ? 'Data Protection & GDPR' : 'Protection des Données & RGPD'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {lang === 'pt' ? 'Política de Privacidade' : lang === 'en' ? 'Privacy Policy' : 'Politique de Confidentialité'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {lang === 'pt'
              ? 'A Digital Clínica compromete-se a proteger a privacidade e os dados pessoais dos seus utentes e visitantes, em estrito cumprimento do Regulamento Geral sobre a Proteção de Dados (RGPD — Regulamento UE 2016/679) e da legislação portuguesa de proteção de dados (Lei n.º 58/2019).'
              : lang === 'en'
              ? 'Digital Clinic is committed to protecting the privacy and personal data of its patients and visitors, in full compliance with the General Data Protection Regulation (GDPR — Regulation EU 2016/679) and Portuguese data protection legislation (Law no. 58/2019).'
              : 'La Digital Clínica s\'engage à protéger la vie privée de ses patients et utilisateurs, conformément au Règlement Général sur la Protection des Données (RGPD — Règlement UE 2016/679).'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Dados Pessoais Coletados */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconDatabase className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '1. Dados Pessoais Recolhidos' : lang === 'en' ? '1. Collected Personal Data' : '1. Données personnelles collectées'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {lang === 'pt'
                ? 'Durante o agendamento de consultas ou contacto através do website, são recolhidos exclusivamente os seguintes dados estritamente necessários:'
                : lang === 'en'
                ? 'When booking an appointment or contacting us, only the following strictly necessary data is collected:'
                : 'Lors de la prise de rendez-vous en ligne ou de la prise de contact, les informations suivantes sont collectées :'}
            </p>
            <ul className="space-y-2 text-sm md:text-base text-[#5A4E46] ms-4">
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{lang === 'pt' ? 'Identificação:' : lang === 'en' ? 'Identity:' : 'Identité :'}</strong> {lang === 'pt' ? 'Nome completo' : lang === 'en' ? 'Full name' : 'Nom, Prénom'}</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{lang === 'pt' ? 'Contactos:' : lang === 'en' ? 'Contact details:' : 'Coordonnées :'}</strong> {lang === 'pt' ? 'Número de telemóvel e endereço de e-mail' : lang === 'en' ? 'Phone number and email address' : 'Numéro de téléphone, adresse email'}</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{lang === 'pt' ? 'Detalhes da Consulta:' : lang === 'en' ? 'Appointment details:' : 'Détails du rendez-vous :'}</strong> {lang === 'pt' ? 'Tratamento selecionado, dia/hora pretendidos e notas clínicas opcionais' : lang === 'en' ? 'Selected treatment, appointment date/time, and optional clinical notes' : 'Soin sélectionné, créneau horaire, notes facultatives'}</span>
              </li>
            </ul>
          </div>

          {/* 2. Finalidade do Tratamento */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconUserCheck className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '2. Finalidade e Confidencialidade' : lang === 'en' ? '2. Purpose and Confidentiality' : '2. Utilisation et confidentialité des données'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {lang === 'pt'
                ? 'Os seus dados são tratados exclusivamente para a gestão de agendamentos, confirmação de consultas (por SMS, WhatsApp ou telefone) e prestação de cuidados de saúde personalizados na clínica.'
                : lang === 'en'
                ? 'Your personal data is strictly used for appointment management, booking confirmations (via SMS, WhatsApp, or phone), and clinical care delivery at the clinic.'
                : 'Vos données personnelles sont strictement réservées à la gestion de vos consultations, à la confirmation des rendez-vous et aux soins au cabinet.'}
            </p>
            <p className="text-sm md:text-base font-semibold text-[#9A7428]">
              {lang === 'pt'
                ? 'A Digital Clínica não vende, aluga nem partilha quaisquer dados pessoais com terceiros para fins comerciais sob qualquer pretexto.'
                : lang === 'en'
                ? 'Digital Clinic does not sell, rent, or transfer any personal data to third parties under any circumstances.'
                : 'La Digital Clínica ne vend, ne loue et ne cède aucune donnée personnelle à des tiers.'}
            </p>
          </div>

          {/* 3. Segurança e Direitos dos Utentes */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconShieldCheck className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '3. Segurança e Direitos dos Titulares (RGPD)' : lang === 'en' ? '3. Security & Data Subject Rights (GDPR)' : '3. Sécurité & Droits RGPD'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {lang === 'pt'
                ? 'Todas as comunicações e transmissões de dados são protegidas por encriptação SSL/TLS de alta segurança. Nos termos do RGPD, tem o direito de aceder, retificar, limitar o tratamento, requerer a portabilidade ou a eliminação dos seus dados pessoais a qualquer momento.'
                : lang === 'en'
                ? 'All data communications are secured with SSL/TLS encryption. Under the GDPR, you have the right to access, rectify, restrict processing, request portability, or request deletion of your personal data at any time.'
                : 'Toutes les transmissions de données sont sécurisées par chiffrement SSL / TLS. Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {lang === 'pt'
                ? 'Para exercer qualquer um dos seus direitos ou para esclarecimentos adicionais sobre a privacidade dos seus dados, pode contactar-nos através do e-mail: contacto@digitalclinica.pt. Tem igualmente o direito de apresentar reclamação junto da autoridade de controlo portuguesa: Comissão Nacional de Proteção de Dados (CNPD).'
                : lang === 'en'
                ? 'To exercise your rights, please contact us at: contacto@digitalclinica.pt. You also have the right to lodge a complaint with the Portuguese supervisory authority: CNPD (National Data Protection Commission).'
                : 'Pour exercer vos droits, contactez-nous à : contact@digitalclinica.pt.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
