'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconScale, IconShieldCheck, IconFileText, IconArrowLeft } from '@tabler/icons-react';

export default function MentionsLegalesPage() {
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
              <IconScale size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {lang === 'pt' ? 'Informação Regulamentar' : lang === 'en' ? 'Regulatory Compliance' : 'Information Réglementaire'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {lang === 'pt' ? 'Aviso Legal' : lang === 'en' ? 'Legal Notice' : 'Mentions Légales'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {lang === 'pt'
              ? 'Em conformidade com a legislação aplicável, encontra abaixo todas as informações legais relativas à utilização do website oficial da Digital Clínica.'
              : lang === 'en'
              ? 'In accordance with current regulations, below is the legal information regarding the publication and use of Digital Clinic official website.'
              : 'Conformément à la législation en vigueur, vous trouverez ci-dessous toutes les informations légales relatives à la publication et à l\'utilisation du site officiel de la Digital Clínica.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Éditeur du Site */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconFileText className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '1. Identificação e Entidade' : lang === 'en' ? '1. Website Publisher' : '1. Éditeur du site'}
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p><strong>{lang === 'pt' ? 'Nome da Clínica :' : lang === 'en' ? 'Practice Name :' : 'Nom du cabinet :'}</strong> Digital Clínica — Fisioterapia & Estética Avançada</p>
              <p><strong>{lang === 'pt' ? 'Profissional Responsável :' : lang === 'en' ? 'Licensed Practitioner :' : 'Praticienne responsable :'}</strong> Digital Clínica (Equipa de Fisioterapeutas Licenciados)</p>
              <p><strong>{lang === 'pt' ? 'Morada da Clínica :' : lang === 'en' ? 'Clinic Address :' : 'Adresse du cabinet :'}</strong> Lisboa, Portugal</p>
              <p><strong>{lang === 'pt' ? 'Telefone :' : lang === 'en' ? 'Phone :' : 'Téléphone :'}</strong> {t.common.phone}</p>
              <p><strong>{lang === 'pt' ? 'E-mail :' : lang === 'en' ? 'Email :' : 'Email de contact :'}</strong> {t.common.email}</p>
              <p><strong>{lang === 'pt' ? 'Estatuto & Recibos :' : lang === 'en' ? 'Licensing & Insurance :' : 'Agrément & Statut :'}</strong> Exercício profissional licenciado pelas autoridades de saúde competentes. Recibos elegíveis para comparticipação e seguros de saúde.</p>
            </div>
          </div>

          {/* 2. Hébergement du Site */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconShieldCheck className="text-[#9A7428]" size={20} />
              {lang === 'pt' ? '2. Alojamento e Segurança' : lang === 'en' ? '2. Hosting & Security' : '2. Hébergement du site'}
            </h2>
            <p className="text-sm md:text-base">
              {lang === 'pt'
                ? 'Este website encontra-se alojado em servidores seguros de alta disponibilidade com certificação avançada de proteção de dados e encriptação SSL / TLS.'
                : lang === 'en'
                ? 'This site is hosted on high-availability secure servers featuring advanced security standards and SSL/TLS encryption.'
                : 'Le site est hébergé sur des serveurs sécurisés haute disponibilité bénéficiant de certifications de sécurité avancées et d\'un chiffrement SSL / TLS.'}
            </p>
          </div>

          {/* 3. Propriété Intellectuelle */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? '3. Propriedade Intelectual' : lang === 'en' ? '3. Intellectual Property' : '3. Propriété intellectuelle'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {lang === 'pt'
                ? 'Todos os elementos integrados neste website (textos, imagens, grafismos, logotipo, estrutura do visualizador anatómico) estão protegidos pela legislação de direitos de autor e propriedade intelectual.'
                : lang === 'en'
                ? 'All materials on this website (text, photos, logos, graphics, anatomical viewer engine) are protected by applicable intellectual property and copyright laws.'
                : 'L\'ensemble des éléments figurant sur ce site (textes, visuels, photographies, logos, graphismes, structure de l\'outil d\'anatomie 2D) est protégé par les dispositions du Code du droit d\'auteur et de la propriété intellectuelle internationale.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {lang === 'pt'
                ? 'Qualquer reprodução, adaptação ou utilização não autorizada por escrito é estritamente proibida.'
                : lang === 'en'
                ? 'Any reproduction or distribution without prior written consent from Digital Clinic is strictly prohibited.'
                : 'Toute reproduction, représentation, modification ou adaptation sans l\'autorisation écrite préalable de la Digital Clínica est strictement interdite.'}
            </p>
          </div>

          {/* 4. Avertissement Médical */}
          <div className="bg-white border border-[#C49A3C]/40 rounded-2xl p-6 md:p-8 shadow-xs bg-gradient-to-br from-white to-[#FDF9F2]">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 text-[#9A7428]">
              {lang === 'pt' ? '4. Aviso Médico & Responsabilidade' : lang === 'en' ? '4. Medical Disclaimer' : '4. Avertissement médical & Responsabilité'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {lang === 'pt'
                ? 'As informações e orientações prestadas neste website têm caráter puramente informativo e pedagógico.'
                : lang === 'en'
                ? 'The health and treatment details provided on this website are for general informational and educational purposes only.'
                : 'Les informations et conseils publiés sur ce site (articles de blog, descriptions de soins, bilans posturaux) sont fournis à titre informatif et éducatif.'}
            </p>
            <p className="text-sm md:text-base font-medium text-[#1A1412]">
              {lang === 'pt'
                ? 'Não substituem, em caso algum, um diagnóstico ou consulta médica presencial. Todos os tratamentos dependem de uma avaliação prévia em clínica.'
                : lang === 'en'
                ? 'They do not constitute medical advice or replace a formal clinical evaluation by a qualified doctor.'
                : 'Elles ne remplacent en aucun cas un diagnostic ou une consultation médicale directe. Tout traitement fait l\'objet d\'une évaluation préalable en cabinet.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
