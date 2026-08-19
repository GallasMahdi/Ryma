'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX,
  IconBrandWhatsapp,
  IconArrowLeft,
  IconChevronRight,
  IconSend,
  IconShieldCheck,
  IconClock,
  IconSparkles,
  IconCalendarEvent,
  IconStethoscope,
  IconFlame,
  IconReceipt2,
  IconChecks,
} from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { playSoftClick, playNotificationChime } from '@/lib/sound';

const WA_NUMBER = '351912345678';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: { pt: string; en: string; fr: string };
  desc: { pt: string; en: string; fr: string };
  answer: { pt: string; en: string; fr: string };
  waText: { pt: string; en: string; fr: string };
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'booking',
    icon: <IconCalendarEvent size={16} className="text-[#C49A3C]" />,
    title: {
      pt: 'Agendar Consulta',
      en: 'Book an Appointment',
      fr: 'Prendre Rendez-vous',
    },
    desc: {
      pt: 'Marcação rápida e disponibilidade',
      en: 'Fast scheduling & real-time slots',
      fr: 'Réservation rapide & créneaux',
    },
    answer: {
      pt: 'Com certeza! Pode escolher o horário diretamente na nossa página de agendamento online ou confirmar agora por WhatsApp com a nossa equipa.',
      en: 'Certainly! You can select your preferred time slot on our online booking wizard or confirm instantly via WhatsApp with our team.',
      fr: 'Avec plaisir ! Vous pouvez réserver votre créneau directement en ligne ou finaliser maintenant avec notre équipe sur WhatsApp.',
    },
    waText: {
      pt: 'Olá! Gostaria de verificar a disponibilidade para agendar uma consulta na Digital Clínica.',
      en: 'Hello! I would like to check availability to schedule an appointment at Digital Clinic.',
      fr: 'Bonjour ! Je souhaite vérifier les disponibilités pour un rendez-vous à la Digital Clínica.',
    },
  },
  {
    id: 'physio',
    icon: <IconStethoscope size={16} className="text-[#9A7428]" />,
    title: {
      pt: 'Fisioterapia & RPG',
      en: 'Physiotherapy & GPR',
      fr: 'Kinésithérapie & RPG',
    },
    desc: {
      pt: 'Coluna, dores, postura e pós-parto',
      en: 'Spine, posture, pain & pelvic rehab',
      fr: 'Dos, posture, rééducation post-partum',
    },
    answer: {
      pt: 'Dispomos de protocolos especializados de Reeducação Postural Global (RPG), reabilitação perineal e tratamento de lesões musculoesqueléticas.',
      en: 'We offer specialized Global Postural Reeducation (GPR), postpartum pelvic floor therapy, and targeted musculoskeletal rehab.',
      fr: 'Nous proposons la Rééducation Posturale Globale (RPG), la rééducation périnéale post-partum et le traitement des douleurs musculo-squelettiques.',
    },
    waText: {
      pt: 'Olá! Tenho interesse numa consulta de Fisioterapia / Reeducação Postural (RPG).',
      en: 'Hello! I am interested in a Physiotherapy / GPR consultation.',
      fr: 'Bonjour ! Je suis intéressé(e) par une séance de Kinésithérapie / RPG.',
    },
  },
  {
    id: 'slimming',
    icon: <IconFlame size={16} className="text-[#C49A3C]" />,
    title: {
      pt: 'Protocolos de Emagrecimento',
      en: 'Body Sculpting Protocols',
      fr: 'Protocoles Minceur',
    },
    desc: {
      pt: 'Criolipólise, cavitação e RF',
      en: 'Cryolipolysis, cavitation & RF',
      fr: 'Cryolipolyse, cavitation & RF',
    },
    answer: {
      pt: 'Utilizamos tecnologias médicas de vanguarda 100% não invasivas para destruição de gordura localizada, firmeza cutânea e eliminação de celulite.',
      en: 'We provide certified 100% non-invasive technologies for localized fat reduction, collagen tightening, and deep cellulite remodeling.',
      fr: 'Nous utilisons des technologies médicales certifiées 100% non invasives pour le déstockage graisseux et le raffermissement cutané.',
    },
    waText: {
      pt: 'Olá! Gostaria de informações sobre os tratamentos de Criolipólise e remodelação corporal.',
      en: 'Hello! I would like details about Cryolipolysis and body sculpting treatments.',
      fr: 'Bonjour ! J\'aimerais des informations sur la Cryolipolyse et les soins minceur.',
    },
  },
  {
    id: 'insurance',
    icon: <IconReceipt2 size={16} className="text-[#6F8F72]" />,
    title: {
      pt: 'Seguros de Saúde & Recibos',
      en: 'Health Insurance & Receipts',
      fr: 'Mutuelles & Remboursements',
    },
    desc: {
      pt: 'Faturas-recibo para ADSE, Médis, etc.',
      en: 'Official medical invoices provided',
      fr: 'Factures conformes pour mutuelles',
    },
    answer: {
      pt: 'Sim! Emitimos fatura-recibo com número de cédula profissional da Ordem dos Fisioterapeutas para efeitos de reembolso no seu seguro ou subsistema.',
      en: 'Yes! We issue certified medical receipts with professional registration number for complete health insurance reimbursements.',
      fr: 'Oui ! Nous délivrons des factures officielles avec numéro d\'ordre pour le remboursement auprès de votre mutuelle ou assurance.',
    },
    waText: {
      pt: 'Olá! Gostaria de confirmar como funcionam os recibos para reembolso de seguro de saúde.',
      en: 'Hello! I would like to clarify how insurance reimbursement receipts are processed.',
      fr: 'Bonjour ! J\'aimerais savoir comment fonctionnent les reçus pour le remboursement de mon assurance.',
    },
  },
];

export function WhatsAppBubble() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'bot' | 'user'; text: string; time: string }[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-reveal widget shortly after load
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedAction(null);
    setIsTyping(false);
  }, []);

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  // Reset/populate initial welcome message
  useEffect(() => {
    if (open) {
      playNotificationChime();
      const initialWelcome =
        lang === 'pt'
          ? '👋 Olá! Bem-vindo(a) à Digital Clínica. Como podemos ajudar o seu bem-estar hoje?'
          : lang === 'en'
          ? '👋 Hello! Welcome to Digital Clinic. How may our clinical concierge assist you today?'
          : '👋 Bonjour ! Bienvenue à la Digital Clínica. Comment pouvons-nous vous aider aujourd\'hui ?';

      setChatMessages([
        {
          sender: 'bot',
          text: initialWelcome,
          time: new Date().toLocaleTimeString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    }
  }, [open, lang]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  const openWhatsAppDirect = (text: string) => {
    playSoftClick();
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleActionClick = (action: QuickAction) => {
    playSoftClick();
    setSelectedAction(action);
    const userMsg = action.title[lang] || action.title.pt;
    const now = new Date().toLocaleTimeString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: now }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botAnswer = action.answer[lang] || action.answer.pt;
      setChatMessages((prev) => [...prev, { sender: 'bot', text: botAnswer, time: now }]);
      playSoftClick();
    }, 450);
  };

  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    openWhatsAppDirect(customMsg.trim());
    setCustomMsg('');
  };

  if (!visible) return null;

  return (
    <div ref={containerRef} className="fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-50 flex flex-col items-end pointer-events-auto">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            className="mb-3.5 w-[calc(100vw-32px)] sm:w-[380px] max-w-[390px] bg-white rounded-3xl shadow-[0_16px_50px_rgba(26,20,18,0.22)] border border-[#C49A3C]/30 overflow-hidden flex flex-col max-h-[560px]"
          >
            {/* ── Top Header ── */}
            <div className="bg-gradient-to-r from-[#075E54] via-[#0E7A6D] to-[#128C7E] p-4 flex items-center justify-between text-white shadow-md shrink-0">
              <div className="flex items-center gap-3">
                {selectedAction && (
                  <button
                    onClick={() => { setSelectedAction(null); playSoftClick(); }}
                    className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                    aria-label="Voltar"
                  >
                    <IconArrowLeft size={17} />
                  </button>
                )}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5E9C8] to-[#E8C97A] flex items-center justify-center font-bold text-[#8A6A24] text-base shadow-sm">
                    D
                  </div>
                  <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full bg-[#25D366] border-2 border-[#075E54]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-semibold text-sm text-white">Digital Clínica</span>
                    <IconShieldCheck size={14} className="text-[#A7E8BD]" />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#A7E8BD] mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#25D366] animate-pulse" />
                    <span>{lang === 'pt' ? 'Atendimento Online • Lisboa' : lang === 'en' ? 'Live Concierge • Lisbon' : 'En ligne • Lisbonne'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { close(); playSoftClick(); }}
                className="text-white/70 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* ── Chat Messages Body ── */}
            <div className="flex-1 overflow-y-auto bg-[#ECE5DD]/70 p-3.5 space-y-3 min-h-[190px] max-h-[260px]">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start items-end gap-1.5'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-0.5">
                      D
                    </div>
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#DCF8C6] text-[#1A1412] rounded-br-xs'
                        : 'bg-white text-[#1A1412] rounded-bl-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8A8078]">
                      <span>{msg.time}</span>
                      {msg.sender === 'user' && <IconChecks size={13} className="text-[#34B7F1]" />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#128C7E] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    D
                  </div>
                  <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8A8078] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8A8078] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#8A8078] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* ── Interactive Action Panel ── */}
            <div className="bg-white border-t border-[#E8E2D8] p-3 shrink-0">
              {selectedAction ? (
                /* Selected Action WhatsApp CTA */
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <button
                    onClick={() => openWhatsAppDirect(selectedAction.waText[lang] || selectedAction.waText.pt)}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5C] active:scale-[0.99] text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl transition-all shadow-md"
                  >
                    <IconBrandWhatsapp size={18} />
                    <span>{lang === 'pt' ? 'Continuar no WhatsApp Oficial' : lang === 'en' ? 'Continue on WhatsApp' : 'Continuer sur WhatsApp'}</span>
                  </button>

                  <button
                    onClick={() => { setSelectedAction(null); playSoftClick(); }}
                    className="w-full text-center text-xs font-semibold text-[#8A8078] hover:text-[#1A1412] py-1"
                  >
                    ← {lang === 'pt' ? 'Ver outros tópicos' : lang === 'en' ? 'Choose another topic' : 'Autres sujets'}
                  </button>
                </motion.div>
              ) : (
                /* Quick Action Shortcuts */
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9A7428] mb-2 px-1">
                    {lang === 'pt' ? 'Ações Rápidas & FAQ' : lang === 'en' ? 'Quick Actions & FAQ' : 'Actions Rapides'}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pe-0.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className="w-full flex items-center justify-between text-left p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFE6] border border-[#E8E2D8]/60 hover:border-[#C49A3C]/40 transition-all duration-150 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="grid place-items-center h-7 w-7 rounded-lg bg-white shadow-xs shrink-0">
                            {action.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#1A1412] truncate group-hover:text-[#9A7428]">
                              {action.title[lang] || action.title.pt}
                            </div>
                            <div className="text-[10px] text-[#8A8078] truncate">
                              {action.desc[lang] || action.desc.pt}
                            </div>
                          </div>
                        </div>
                        <IconChevronRight size={14} className="text-[#A49C94] group-hover:text-[#9A7428] shrink-0 ms-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Custom Message Input Bar ── */}
              <form onSubmit={handleCustomSend} className="mt-2.5 flex items-center gap-1.5">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder={
                    lang === 'pt'
                      ? 'Escreva a sua mensagem...'
                      : lang === 'en'
                      ? 'Type your question...'
                      : 'Écrivez votre message...'
                  }
                  className="flex-1 bg-[#F5F5F5] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs text-[#1A1412] focus:outline-none focus:border-[#25D366] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!customMsg.trim()}
                  className="grid place-items-center h-8 w-8 rounded-xl bg-[#25D366] hover:bg-[#20BD5C] disabled:opacity-40 disabled:hover:bg-[#25D366] text-white transition-all shrink-0"
                  aria-label="Send to WhatsApp"
                >
                  <IconSend size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Floating Button with Micro-Pulse ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          setOpen((v) => !v);
          playSoftClick();
        }}
        className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:from-[#0E7A6D] hover:to-[#20BD5C] text-white shadow-[0_6px_28px_rgba(37,211,102,0.45)] hover:shadow-[0_8px_36px_rgba(37,211,102,0.6)] transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
        aria-label="WhatsApp Concierge"
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IconX size={24} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="wa"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IconBrandWhatsapp size={28} strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Live Pulse Ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#25D366] opacity-30 pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
}
