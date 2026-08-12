'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconScale, IconShieldCheck, IconFileText, IconArrowLeft } from '@tabler/icons-react';

export default function MentionsLegalesPage() {
  const { lang } = useLanguage();

  const isFr = lang === 'fr';

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] pt-28 pb-24">
      <div className="mx-auto max-w-4xl px-6 md:px-12">
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#9A7428] hover:text-[#C49A3C] transition-colors mb-8 bg-[#F5E9C8] border border-[#C49A3C]/30 px-4 py-2 rounded-full"
          >
            <IconArrowLeft size={14} className="rtl-flip" />
            <span>{isFr ? 'Retour à l\'accueil' : 'العودة للرئيسية'}</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-[#F5E9C8] text-[#9A7428] border border-[#C49A3C]/30">
              <IconScale size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {isFr ? 'Information Réglementaire' : 'معلومات تنظيمية'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {isFr ? 'Mentions Légales' : 'الإشعار القانوني'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {isFr
              ? 'Conformément à la législation en vigueur, vous trouverez ci-dessous toutes les informations légales relatives à la publication et à l\'utilisation du site officiel du Cabinet Ryma Ouichka.'
              : 'وفقاً للتشريعات المعمول بها، تجدون أدناه جميع المعلومات القانونية المتعلقة بنشر واستخدام الموقع الرسمي لعيادة ريما ويشكة.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Éditeur du Site */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconFileText className="text-[#9A7428]" size={20} />
              {isFr ? '1. Éditeur du site' : '1. ناشر الموقع'}
            </h2>
            <div className="space-y-2 text-sm md:text-base">
              <p><strong>{isFr ? 'Nom du cabinet :' : 'اسم العيادة:'}</strong> Cabinet Ryma Ouichka — Kinésithérapie & Soins Minceur</p>
              <p><strong>{isFr ? 'Praticienne responsable :' : 'الممارسة المسؤولة:'}</strong> Ryma Ouichka (Kinésithérapeute diplômée d&apos;État)</p>
              <p><strong>{isFr ? 'Adresse du cabinet :' : 'عنوان العيادة:'}</strong> Avenue Habib Bourguiba, Ezzahra 2034, Gouvernorat de Ben Arous, Tunisie</p>
              <p><strong>{isFr ? 'Téléphone :' : 'الهاتف:'}</strong> +216 71 800 123 / +216 20 123 456</p>
              <p><strong>{isFr ? 'Email de contact :' : 'البريد الإلكتروني:'}</strong> contact@ryma-ouichka.tn</p>
              <p><strong>{isFr ? 'Agrément & Statut :' : 'الترخيص والحالة:'}</strong> Exercice professionnel autorisé sous le contrôle des autorités de santé tunisiennes. Prise en charge CNAM agréée.</p>
            </div>
          </div>

          {/* 2. Hébergement du Site */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconShieldCheck className="text-[#9A7428]" size={20} />
              {isFr ? '2. Hébergement du site' : '2. استضافة الموقع'}
            </h2>
            <p className="text-sm md:text-base">
              {isFr
                ? 'Le site est hébergé sur des serveurs sécurisés haute disponibilité bénéficiant de certifications de sécurité avancées et d\'un chiffrement SSL / TLS.'
                : 'يتم استضافة الموقع على خوادم آمنة عالية التوفر تتمتع بشهادات أمان متقدمة وتشفير SSL / TLS.'}
            </p>
          </div>

          {/* 3. Propriété Intellectuelle */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {isFr ? '3. Propriété intellectuelle' : '3. الملكية الفكرية'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {isFr
                ? 'L\'ensemble des éléments figurant sur ce site (textes, visuels, photographies, logos, graphismes, structure de l\'outil d\'anatomie 2D) est protégé par les dispositions du Code du droit d\'auteur tunisien et de la propriété intellectuelle internationale.'
                : 'جميع العناصر المعروضة على هذا الموقع (النصوص، الصور، الشعارات، الرسومات، هيلكة أداة التشريح ثلاثية/ثنائية الأبعاد) محمية بموجب أحكام قانون حقوق المؤلف التونسي والملكية الفكرية الدولية.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {isFr
                ? 'Toute reproduction, représentation, modification ou adaptation sans l\'autorisation écrite préalable du Cabinet Ryma Ouichka est strictement interdite.'
                : 'يُحظر تماماً أي إعادة إنتاج أو تمثيل أو تعديل أو تكييف دون إذن كتابي مسبق من عيادة ريما ويشكة.'}
            </p>
          </div>

          {/* 4. Avertissement Médical */}
          <div className="bg-white border border-[#C49A3C]/40 rounded-2xl p-6 md:p-8 shadow-xs bg-gradient-to-br from-white to-[#FDF9F2]">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 text-[#9A7428]">
              {isFr ? '4. Avertissement médical & Responsabilité' : '4. التحذير الطبي والمسؤولية'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {isFr
                ? 'Les informations et conseils publiés sur ce site (articles de blog, descriptions de soins, bilans posturaux) sont fournis à titre informatif et éducatif.'
                : 'المعلومات والنصائح المنشورة على هذا الموقع (مقالات المدونة، وصف العلاجات، التقييمات) مقدمة لأغراض إعلامية وتثقيفية فقط.'}
            </p>
            <p className="text-sm md:text-base font-medium text-[#1A1412]">
              {isFr
                ? 'Elles ne remplacent en aucun cas un diagnostic ou une consultation médicale directe. Tout traitement fait l\'objet d\'une évaluation préalable en cabinet.'
                : 'لا تستبدل بأي حال من الأحوال التشخيص أو الاستشارة الطبية المباشرة. يخضع كل علاج لتقييم مسبق في العيادة.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
