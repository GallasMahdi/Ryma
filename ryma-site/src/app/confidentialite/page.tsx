'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { IconLock, IconCheck, IconArrowLeft, IconDatabase, IconUserCheck } from '@tabler/icons-react';

export default function ConfidentialitePage() {
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
              <IconLock size={24} />
            </div>
            <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase">
              {isFr ? 'Protection des Données' : 'حماية البيانات الشخصية'}
            </span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6">
            {isFr ? 'Politique de Confidentialité' : 'سياسة الخصوصية'}
          </h1>
          <p className="text-[#6B6058] text-lg mb-10 leading-relaxed border-b border-[#E8E2D8] pb-6">
            {isFr
              ? 'Le Cabinet Ryma Ouichka s\'engage à protéger la vie privée de ses patients et utilisateurs. Cette politique détaille la collecte, le traitement et la sécurité de vos données personnelles.'
              : 'تلتزم عيادة ريما ويشكة بحماية الخصوصية الشخصية لمرضاها ومستخدميها. توضح هذه السياسة تفاصيل جمع ومعالجة وأمان بياناتك الشخصية.'}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="space-y-8 text-[#3A322C] leading-relaxed">
          {/* 1. Collecte des Données */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconDatabase className="text-[#9A7428]" size={20} />
              {isFr ? '1. Données personnelles collectées' : '1. البيانات الشخصية المجمعة'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {isFr
                ? 'Lors de la prise de rendez-vous en ligne ou de la prise de contact, les informations suivantes sont collectées :'
                : 'عند حجز موعد عبر الإنترنت أو التواصل، يتم جمع المعلومات التالية:'}
            </p>
            <ul className="space-y-2 text-sm md:text-base text-[#5A4E46] ms-4">
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{isFr ? 'Identité :' : 'الهوية:'}</strong> {isFr ? 'Nom, Prénom' : 'الاسم واللقب'}</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{isFr ? 'Coordonnées :' : 'معلومات الاتصال:'}</strong> {isFr ? 'Numéro de téléphone, adresse email' : 'رقم الهاتف، البريد الإلكتروني'}</span>
              </li>
              <li className="flex items-start gap-2">
                <IconCheck size={18} className="text-[#9A7428] shrink-0 mt-0.5" />
                <span><strong>{isFr ? 'Détails du rendez-vous :' : 'تفاصيل الموعد:'}</strong> {isFr ? 'Soin sélectionné, créneau horaire, notes facultatives' : 'العلاج التنسيقي المحدد، الوقت المفضل، ملاحظات اختيارية'}</span>
              </li>
            </ul>
          </div>

          {/* 2. Finalité du Traitement */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-2">
              <IconUserCheck className="text-[#9A7428]" size={20} />
              {isFr ? '2. Utilisation et confidentialité des données' : '2. استخدام وسرية البيانات'}
            </h2>
            <p className="text-sm md:text-base mb-3">
              {isFr
                ? 'Vos données personnelles sont strictement réservées à la gestion de vos consultations, à la confirmation des rendez-vous par SMS / WhatsApp et à l\'organisation des soins au cabinet.'
                : 'بياناتك الشخصية مخصصة حصرياً لإدارة استشاراتك، وتأكيد المواعيد عبر الرسائل/واتساب وتنظيم العلاج بالعيادة.'}
            </p>
            <p className="text-sm md:text-base font-semibold text-[#9A7428]">
              {isFr
                ? 'Le Cabinet Ryma Ouichka ne vend, ne loue et ne cède aucune donnée personnelle à des tiers sous aucun prétexte.'
                : 'لا تقوم عيادة ريما ويشكة بيع أو تأجير أو نقل أي بيانات شخصية لأطراف ثالثة تحت أي ظرف.'}
            </p>
          </div>

          {/* 3. Sécurité & Droits des Patients */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {isFr ? '3. Sécurité & Droits d\'accès et de rectification' : '3. الأمان وحقوق الوصول والتصحيح'}
            </h2>
            <p className="text-sm md:text-base mb-4">
              {isFr
                ? 'Toutes les transmissions de données sont sécurisées par chiffrement SSL / TLS. Conformément à la législation tunisienne sur la protection des données personnelles (Loi n° 2004-63 du 27 juillet 2004 - INPDP), vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données.'
                : 'جميع عمليات نقل البيانات مؤمنة بتشفير SSL / TLS. وفقاً للتشريعات التونسية لحماية المعطيات الشخصية (القانون عدد 63 لسنة 2004 - الهيئة الوطنية لحماية المعطيات الشخصية)، لديك الحق في الوصول إلى بياناتك وتصحيحها وحذفها.'}
            </p>
            <p className="text-sm md:text-base text-[#6B6058]">
              {isFr
                ? 'Pour exercer ce droit, vous pouvez nous contacter à tout moment par email à contact@ryma-ouichka.tn ou par téléphone au +216 71 800 123.'
                : 'لممارسة هذا الحق، يمكنك الاتصال بنا في أي وقت عبر البريد الإلكتروني contact@ryma-ouichka.tn أو الهاتف +216 71 800 123.'}
            </p>
          </div>

          {/* 4. Conservation des Données Médicales & Législation INPDP */}
          <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 md:p-8 shadow-xs">
            <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-4">
              {isFr ? '4. Durée de conservation & Dossier Médical (INPDP)' : '4. مدة الحفظ والملف الطبي (الهيئة الوطنية)'}
            </h2>
            <p className="text-sm md:text-base mb-3 text-[#5A4E46]">
              {isFr
                ? 'Les dossiers de soins kinesithérapeutiques et notes de séances sont conservés conformément aux obligations légales de déontologie médicale et aux dispositions de l\'INPDP. Les données relatives aux rendez-vous non honorés sont archivées ou anonymisées sous un délai de 24 mois.'
                : 'يتم الاحتفاظ بملفات العلاج الطبيعي وملاحظات الجلسات وفقاً للالتزامات القانونية والأخلاقية الطبية وأحكام الهيئة الوطنية. يتم أرشفة أو إخفاء هوية البيانات المتعلقة بالمواعيد غير المنفذة في غضون 24 شهراً.'}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
