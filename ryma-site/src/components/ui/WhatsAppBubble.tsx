'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconBrandWhatsapp, IconArrowLeft, IconChevronRight } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { usePathname } from 'next/navigation';

const WA_NUMBER = '351912345678';

interface FAQ {
  q: string;
  a: string;
  waText: string;
}

const FAQS: Record<'fr' | 'pt' | 'en', FAQ[]> = {
  fr: [
    {
      q: 'Comment prendre rendez-vous ?',
      a: 'Vous pouvez réserver directement via la page Rendez-vous, ou nous contacter sur WhatsApp ou par téléphone. Nous répondons en moins d\'une heure.',
      waText: 'Bonjour, je souhaite réserver un rendez-vous.',
    },
    {
      q: 'Quels sont vos tarifs ?',
      a: 'Nos soins débutent à partir de 45 €. Des forfaits avantageux sont disponibles. Consultez la page Tarifs pour plus de détails.',
      waText: 'Bonjour, je souhaiterais des informations sur vos tarifs.',
    },
    {
      q: 'Délivrez-vous des reçus pour les mutuelles / assurances ?',
      a: 'Oui ! Nous délivrons des factures-reçus certifiées avec numéro d\'ordre professionnel pour le remboursement par vos assurances santé et mutuelles.',
      waText: 'Bonjour, j\'ai une question concernant les reçus pour mon assurance santé.',
    },
    {
      q: 'Où se situe la clinique ?',
      a: 'La clinique est située Avenida da Liberdade à Lisbonne, Portugal. Facilement accessible avec stationnement et transports à proximité.',
      waText: 'Bonjour, comment me rendre à la clinique ?',
    },
    {
      q: 'Quels soins proposez-vous ?',
      a: 'Nous proposons la kinésithérapie, la rééducation post-partum, la cavitation, la radiofréquence, la cryolipolyse, le drainage lymphatique et bien plus.',
      waText: 'Bonjour, je voudrais en savoir plus sur vos soins.',
    },
  ],
  pt: [
    {
      q: 'Como posso agendar uma consulta?',
      a: 'Pode agendar diretamente na página de Agendamento, ou contactar-nos via WhatsApp ou telefone. Respondemos habitualmente em menos de 1 hora.',
      waText: 'Olá, gostaria de agendar uma consulta.',
    },
    {
      q: 'Quais são os valores dos tratamentos?',
      a: 'Os nossos tratamentos começam a partir de 45 €. Dispomos de pacotes com descontos especiais na página de Preços.',
      waText: 'Olá, gostaria de obter informações sobre os valores dos tratamentos.',
    },
    {
      q: 'Passam recibos para seguros de saúde e ADSE?',
      a: 'Sim! Emitimos fatura-recibo com número de cédula profissional da Ordem dos Fisioterapeutas para efeitos de reembolso junto do seu seguro de saúde ou subsistema (ADSE, Médis, Multicare, AdvanceCare, etc.).',
      waText: 'Olá, gostaria de saber informações sobre recibos para o meu seguro de saúde.',
    },
    {
      q: 'Onde fica localizada a clínica?',
      a: 'A clínica está situada na Avenida da Liberdade em Lisboa, com fácil acesso por transportes públicos e estacionamento próximo.',
      waText: 'Olá, gostaria de saber a localização exata da clínica.',
    },
    {
      q: 'Quais os tratamentos disponíveis?',
      a: 'Oferecemos Fisioterapia, Reabilitação Pós-Parto, Drenagem Linfática, Criolipólise, Cavitação Ultrassónica, Radiofrequência e muito mais.',
      waText: 'Olá, gostaria de saber mais sobre os tratamentos disponíveis.',
    },
  ],
  en: [
    {
      q: 'How can I book an appointment?',
      a: 'You can book directly on our Appointment page, or send us a message on WhatsApp or phone. We usually reply in under an hour.',
      waText: 'Hello, I would like to book an appointment.',
    },
    {
      q: 'What are your treatment rates?',
      a: 'Treatments start from our base rates with package discounts available. Check our Pricing page for full details.',
      waText: 'Hello, I would like information regarding pricing.',
    },
    {
      q: 'Do you provide insurance receipts?',
      a: 'Yes! Certified medical receipts and physiotherapy reports are provided for health insurance reimbursements.',
      waText: 'Hello, I have a question about insurance coverage and receipts.',
    },
    {
      q: 'Where is the clinic located?',
      a: 'The clinic is conveniently located with nearby parking. You can find directions on our Contact page map.',
      waText: 'Hello, how do I get to the clinic?',
    },
    {
      q: 'What treatments do you offer?',
      a: 'We offer Physiotherapy, Postpartum Rehab, Lymphatic Drainage, Cryolipolysis, Ultrasound Cavitation, Radiofrequency, and more.',
      waText: 'Hello, I would like to learn more about your treatments.',
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

  const activeLangKey = lang === 'pt' ? 'pt' : lang === 'en' ? 'en' : 'fr';
  const faqs = FAQS[activeLangKey];

  const close = useCallback(() => {
    setOpen(false);
    setActiveFaq(null);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        // Leave open unless clicked outside
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  if (!visible) return null;

  const openWhatsApp = (text: string) => {
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 end-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="mb-4 w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.22)] border border-[#E8E2D8] overflow-hidden flex flex-col max-h-[520px]"
          >
            {/* Header */}
            <div className="bg-[#075E54] p-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                {activeFaq && (
                  <button
                    onClick={() => setActiveFaq(null)}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 me-1"
                    aria-label={lang === 'pt' ? 'Voltar' : lang === 'en' ? 'Back' : 'Retour'}
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
                    {lang === 'pt' ? 'Online · Responde rápido' : lang === 'en' ? 'Online · Fast reply' : 'En ligne · Répond vite'}
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label={lang === 'pt' ? 'Fechar' : lang === 'en' ? 'Close' : 'Fermer'}
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Chat Body */}
            <div
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
                    {lang === 'pt'
                      ? '👋 Olá! Sou a Dra. Ryma. Como posso ajudar hoje?'
                      : lang === 'en'
                      ? '👋 Hello! I am Dr. Ryma. How can I help you today?'
                      : "👋 Bonjour ! Je suis Ryma. Comment puis-je vous aider aujourd'hui ?"}
                  </p>
                  <span className="text-[10px] text-[#6B6058] block text-end mt-1">
                    {new Date().toLocaleTimeString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
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
                    transition={{ delay: 0.2 }}
                    className="flex items-end gap-1.5"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0 mb-0.5">
                      <span className="text-white text-[9px] font-bold">R</span>
                    </div>
                    <div className="max-w-[85%] space-y-2">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                        <p className="text-[#1A1412] text-sm leading-relaxed">{activeFaq.a}</p>
                      </div>
                      {/* WhatsApp CTA */}
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        onClick={() => openWhatsApp(activeFaq.waText)}
                        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md"
                      >
                        <IconBrandWhatsapp size={16} />
                        {lang === 'pt' ? 'Continuar no WhatsApp' : lang === 'en' ? 'Continue on WhatsApp' : 'Continuer sur WhatsApp'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ List / Back Button */}
            <div className="bg-white border-t border-[#E8E2D8] px-3 py-3 shrink-0">
              {!activeFaq ? (
                <>
                  <p className="text-[#6B6058] text-[11px] font-mono font-semibold uppercase tracking-wide mb-2 ps-1">
                    {lang === 'pt' ? 'Perguntas Frequentes' : lang === 'en' ? 'Frequently Asked Questions' : 'Questions fréquentes'}
                  </p>
                  <div className="space-y-1.5">
                    {faqs.map((faq, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
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
                  ← {lang === 'pt' ? 'Ver todas as perguntas' : lang === 'en' ? 'View all questions' : 'Voir toutes les questions'}
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
