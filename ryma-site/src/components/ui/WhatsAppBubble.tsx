'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconBrandWhatsapp, IconArrowLeft, IconChevronRight } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { usePathname } from 'next/navigation';

const WA_NUMBER = '21698123456';

interface FAQ {
  q: string;
  a: string;
  waText: string;
}

const FAQS: { fr: FAQ[]; ar: FAQ[] } = {
  fr: [
    {
      q: 'Comment prendre rendez-vous ?',
      a: "Vous pouvez prendre rendez-vous directement en ligne via notre page Rendez-vous, ou nous contacter par WhatsApp / téléphone. Nous répondons généralement en moins d'une heure.",
      waText: "Bonjour, j'aimerais prendre rendez-vous.",
    },
    {
      q: 'Quels sont vos tarifs ?',
      a: "Nos séances débutent à partir de 45 DT. Des forfaits multi-séances avec remise sont disponibles. Consultez la page Tarifs pour le détail complet.",
      waText: "Bonjour, pouvez-vous m'informer sur vos tarifs ?",
    },
    {
      q: 'Êtes-vous conventionnés CNAM ?',
      a: 'Oui ! Les actes de kinésithérapie prescrits par un médecin sont pris en charge par la CNAM. Pensez à apporter votre ordonnance et votre carte CNAM.',
      waText: "Bonjour, j'ai une question sur la prise en charge CNAM.",
    },
    {
      q: 'Où se trouve le cabinet ?',
      a: "Le cabinet est situé sur l'Avenue Habib Bourguiba à Ezzahra, Gouvernorat de Ben Arous, Tunisie. Parking disponible à proximité.",
      waText: 'Bonjour, comment me rendre au cabinet ?',
    },
    {
      q: 'Quels soins proposez-vous ?',
      a: 'Nous proposons la kinésithérapie, la rééducation post-partum, la cavitation, la radiofréquence, la cryolipolyse, le drainage lymphatique et bien plus. Consultez la page Services.',
      waText: 'Bonjour, je voudrais en savoir plus sur vos soins.',
    },
  ],
  ar: [
    {
      q: 'كيف أحجز موعداً؟',
      a: 'يمكنك حجز موعد مباشرةً عبر صفحة المواعيد، أو التواصل معنا عبر واتساب أو الهاتف. نرد عادةً في أقل من ساعة.',
      waText: 'مرحباً، أود حجز موعد.',
    },
    {
      q: 'ما هي أسعاركم؟',
      a: 'تبدأ جلساتنا من 45 دينار. تتوفر باقات متعددة الجلسات بخصومات. راجع صفحة الأسعار للتفاصيل الكاملة.',
      waText: 'مرحباً، أريد معلومات عن الأسعار.',
    },
    {
      q: 'هل تقبلون تغطية CNAM؟',
      a: 'نعم! أعمال العلاج الطبيعي الموصوفة من طبيب مشمولة بالصندوق الوطني للضمان الصحي. أحضر معك الوصفة الطبية وبطاقة CNAM.',
      waText: 'مرحباً، لدي سؤال حول تغطية CNAM.',
    },
    {
      q: 'أين تقع العيادة؟',
      a: 'تقع العيادة على شارع الحبيب بورقيبة بالزهراء، ولاية بن عروس، تونس. مواقف السيارات متاحة في المجاورة.',
      waText: 'مرحباً، كيف يمكنني الوصول إلى العيادة؟',
    },
    {
      q: 'ما هي العلاجات المتاحة؟',
      a: 'نقدم العلاج الطبيعي، إعادة التأهيل بعد الولادة، التكهيف، الترددات الراديوية، التجميد، الصرف اللمفاوي وغير ذلك الكثير.',
      waText: 'مرحباً، أريد معرفة المزيد عن العلاجات المتاحة.',
    },
  ],
};

export function WhatsAppBubble() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [activeFaq, setActiveFaq] = useState<FAQ | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const isAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (isAdmin) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isAdmin]);

  useEffect(() => {
    setOpen(false);
    setActiveFaq(null);
  }, [pathname]);

  // Scroll chat to bottom when answer appears
  useEffect(() => {
    if (activeFaq && chatRef.current) {
      setTimeout(() => {
        chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
      }, 200);
    }
  }, [activeFaq]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveFaq(null);
  }, []);

  if (isAdmin || !visible) return null;

  const isFr = lang === 'fr';
  const faqs = isFr ? FAQS.fr : FAQS.ar;

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed bottom-6 end-6 z-50 flex flex-col items-end gap-3"
      aria-label="WhatsApp Chat"
    >
      {/* Chat Card */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="wa-card"
            initial={{ opacity: 0, y: 20, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl border border-[#E8E2D8] w-80 overflow-hidden flex flex-col max-h-[520px]"
            role="dialog"
            aria-modal="true"
          >
            {/* ── Header ── */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                {activeFaq && (
                  <button
                    onClick={() => setActiveFaq(null)}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 me-1"
                    aria-label={isFr ? 'Retour' : 'رجوع'}
                  >
                    <IconArrowLeft size={16} />
                  </button>
                )}
                <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0">
                  <span className="font-serif font-bold text-white text-base leading-none">R</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">Ryma Ouichka</p>
                  <p className="text-green-200 text-[11px] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#25D366] rounded-full inline-block animate-pulse" />
                    {isFr ? 'En ligne · Répond vite' : 'متصل · يرد بسرعة'}
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label={isFr ? 'Fermer' : 'إغلاق'}
              >
                <IconX size={16} />
              </button>
            </div>

            {/* ── Chat Body ── */}
            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto bg-[#ECE5DD] px-3 py-4 space-y-3"
            >
              {/* Greeting Bubble */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-1.5"
              >
                <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0 mb-0.5">
                  <span className="text-white text-[9px] font-bold">R</span>
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                  <p className="text-[#1A1412] text-sm leading-relaxed">
                    {isFr
                      ? "👋 Bonjour ! Je suis Ryma. Comment puis-je vous aider aujourd'hui ?"
                      : '👋 مرحباً! أنا ريما. كيف يمكنني مساعدتك اليوم؟'}
                  </p>
                  <span className="text-[10px] text-[#6B6058] block text-end mt-1">
                    {new Date().toLocaleTimeString(isFr ? 'fr-TN' : 'ar-TN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </motion.div>

              {/* User Question Bubble */}
              <AnimatePresence>
                {activeFaq && (
                  <motion.div
                    key="user-q"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-end"
                  >
                    <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-[80%] shadow-sm">
                      <p className="text-[#1A1412] text-sm leading-relaxed">{activeFaq.q}</p>
                      <span className="text-[10px] text-[#6B6058] block text-end mt-1">
                        {new Date().toLocaleTimeString(isFr ? 'fr-TN' : 'ar-TN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Answer Bubble */}
              <AnimatePresence>
                {activeFaq && (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="flex items-end gap-1.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0 mb-0.5">
                      <span className="text-white text-[9px] font-bold">R</span>
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                        <p className="text-[#1A1412] text-sm leading-relaxed">{activeFaq.a}</p>
                        <span className="text-[10px] text-[#6B6058] block text-end mt-1">
                          {new Date().toLocaleTimeString(isFr ? 'fr-TN' : 'ar-TN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {/* WhatsApp CTA */}
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        onClick={() => openWhatsApp(activeFaq.waText)}
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md"
                      >
                        <IconBrandWhatsapp size={16} />
                        {isFr ? 'Continuer sur WhatsApp' : 'المتابعة على واتساب'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── FAQ List / Back Button ── */}
            <div className="bg-white border-t border-[#E8E2D8] px-3 py-3 shrink-0">
              {!activeFaq ? (
                <>
                  <p className="text-[#6B6058] text-[11px] font-mono font-semibold uppercase tracking-wide mb-2 ps-1">
                    {isFr ? 'Questions fréquentes' : 'الأسئلة الشائعة'}
                  </p>
                  <div className="space-y-1.5">
                    {faqs.map((faq, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setActiveFaq(faq)}
                        className="w-full flex items-center justify-between text-start text-sm text-[#1A1412] bg-[#F5F5F5] hover:bg-[#E8F9EE] hover:text-[#128C7E] border border-transparent hover:border-[#25D366]/30 px-3 py-2 rounded-xl transition-all duration-150 group"
                      >
                        <span className="leading-snug">{faq.q}</span>
                        <IconChevronRight
                          size={14}
                          className="text-[#9A9A9A] group-hover:text-[#25D366] shrink-0 ms-2"
                        />
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setActiveFaq(null)}
                  className="w-full text-center text-sm text-[#128C7E] font-semibold py-1.5 hover:underline"
                >
                  ← {isFr ? 'Voir toutes les questions' : 'مشاهدة جميع الأسئلة'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Button ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.15 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          setOpen((v) => !v);
          setActiveFaq(null);
        }}
        className="relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BD5C] text-white shadow-[0_4px_24px_rgba(37,211,102,0.5)] hover:shadow-[0_6px_32px_rgba(37,211,102,0.65)] transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="WhatsApp"
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <IconX size={24} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="wa"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <IconBrandWhatsapp size={28} strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulsing ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366] opacity-30 pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
}
