'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconFileCheck, IconCalendarEvent, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';

export default function ConditionsUtilisationPage() {
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
              <IconFileCheck size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {isFr ? 'Conditions de Service' : 'شروط الخدمة والاستخدام'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {isFr ? 'Conditions Générales d\'Utilisation' : 'شروط الاستخدام العامة'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {isFr
              ? 'Bienvenue sur le site du Cabinet Ryma Ouichka. L\'utilisation de ce site et des services de réservation en ligne implique l\'acceptation pleine et entière des présentes conditions.'
              : 'مرحباً بكم في موقع عيادة ريما ويشكة. تقتضي استخدام هذا الموقع وخدمات الحجز عبر الإنترنت القبول الكامل لهذه الشروط.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Modalités de Réservation */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconCalendarEvent className="text-[#9A7428]" size={20} />
              {isFr ? '1. Prise de rendez-vous & Engagements' : '1. حجز المواعيد والالتزامات'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {isFr
                ? 'Le service de réservation en ligne permet aux patients de sélectionner un soin et un créneau horaire disponible. La confirmation finale du rendez-vous est adressée au patient via SMS / WhatsApp ou téléphone.'
                : 'تتيح خدمة الحجز عبر الإنترنت للمرضى اختيار العلاج والموعد المتاح. يتم إرسال التأكيد النهائي للموعد عبر الرسائل القصيرة/واتساب أو الهاتف.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {isFr
                ? 'Tout rendez-vous réservé engage le patient à se présenter à l\'heure convenue au cabinet situé à Ezzahra, Tunisie.'
                : 'يلتزم المريض بالذود والحضور في الوقت المحدد بالعيادة في الزهراء، تونس.'}
            </p>
          </div>

          {/* 2. Annulation & Report */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconAlertCircle className="text-[#9A7428]" size={20} />
              {isFr ? '2. Politique d\'annulation et de report' : '2. سياسة الإلغاء والتأجيل'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {isFr
                ? 'Afin d\'assurer un service fluide à l\'ensemble de nos patients, nous demandons un préavis d\'au moins 24 heures en cas d\'annulation ou de report d\'un rendez-vous.'
                : 'لضمان خدمة سلسة لجميع مرضانا، يرجى تقديم إشعار مسبق قبل 24 ساعة على الأقل في حالة إلغاء أو تأجيل الموعد.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {isFr
                ? 'L\'annulation peut être effectuée en appelant directement le cabinet au +216 71 800 123 ou par message WhatsApp.'
                : 'يمكن إجراء الإلغاء عبر الاتصال المباشر بالعيادة على 71800123 216+ أو عبر رسالة واتساب.'}
            </p>
          </div>

          {/* 3. Tarification & Règlement */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {isFr ? '3. Tarifs et prise en charge' : '3. الأسعار والتغطية'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {isFr
                ? 'Tous les tarifs affichés sur le site sont exprimés en Dinars Tunisiens (TND) et sont applicables au cabinet.'
                : 'جميع الأسعار المعروضة على الموقع مبيّنة بالدينار التونسي (TND) ومطبقة في العيادة.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {isFr
                ? 'Les actes de kinésithérapie prescrits font l\'objet d\'une prise en charge selon la réglementation de la CNAM (Caisse Nationale d\'Assurance Maladie).'
                : 'تخضع أعمال العلاج الطبيعي الموصوفة للتغطية وفقاً لأنظمة الصندوق الوطني للضمان الصحي (CNAM).'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
