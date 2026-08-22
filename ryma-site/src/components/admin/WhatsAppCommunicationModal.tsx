'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import { Appointment, getServiceName } from '@/types/admin';
import { validateAndNormalizePhone } from '@/lib/phone';
import {
  IconBrandWhatsapp,
  IconX,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconCalendarEvent,
  IconSparkles,
  IconUser,
  IconClock,
  IconStethoscope,
  IconHeartbeat,
  IconDeviceFloppy,
} from '@tabler/icons-react';

export interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  patientName?: string;
  patientPhone?: string;
  serviceName?: string;
  dateStr?: string;
  timeStr?: string;
  lang: Lang;
}

export function WhatsAppCommunicationModal({
  isOpen,
  onClose,
  appointment,
  patientName: customName,
  patientPhone: customPhone,
  serviceName: customService,
  dateStr: customDate,
  timeStr: customTime,
  lang,
}: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string>('reminder');

  const name = customName || appointment?.patientName || 'Estimado(a) Utente';
  const rawPhone = customPhone || appointment?.phone || '';
  const service = customService || (appointment ? getServiceName(appointment.service, lang) : 'Consulta Clínica');
  const date = customDate || appointment?.date || '';
  const time = customTime || appointment?.startTime || '';

  // Clean phone for wa.me link (E.164 without '+')
  const phoneValidation = useMemo(() => validateAndNormalizePhone(rawPhone), [rawPhone]);
  const cleanPhoneForWa = useMemo(() => {
    if (!phoneValidation.isValid) return '';
    return phoneValidation.normalized.replace('+', '');
  }, [phoneValidation]);

  // Formatted date for human readability
  const formattedHumanDate = useMemo(() => {
    if (!date) return '';
    try {
      const parts = date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-GB' : 'pt-PT', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
        });
      }
      return date;
    } catch {
      return date;
    }
  }, [date, lang]);

  // Pre-configured localized templates
  const templates = useMemo(() => {
    if (lang === 'fr') {
      return [
        {
          id: 'reminder',
          title: '📅 Rappel de Rendez-vous',
          text: `Bonjour ${name},\n\nNous vous confirmons votre séance de ${service} prévue le ${formattedHumanDate || date} à ${time} à Digital Clínica Lisboa.\n\n📍 Adresse : Lisboa, Portugal\nℹ️ En cas d'empêchement, merci de nous prévenir 24h à l'avance.\n\nÀ très bientôt !`,
        },
        {
          id: 'confirmation',
          title: '✅ Confirmation Immédiate',
          text: `Bonjour ${name},\n\nVotre réservation pour ${service} le ${formattedHumanDate || date} à ${time} a été confirmée avec succès.\n\nNous nous réjouissons de vous accueillir à Digital Clínica Lisboa.\n\nExcellente journée !`,
        },
        {
          id: 'aftercare_kine',
          title: '🏃‍♂️ Conseils Post-Kinésithérapie',
          text: `Bonjour ${name},\n\nNous espérons que vous vous sentez bien après votre séance de ${service}.\n\n💡 Conseils de récupération :\n• Hydratez-vous bien tout au long de la journée\n• Appliquez du froid/chaud selon les recommandations du praticien\n• Effectuez les exercices doux recommandés\n\nN'hésitez pas à nous contacter si besoin.`,
        },
        {
          id: 'aftercare_slimming',
          title: '✨ Conseils Post-Soin Esthétique',
          text: `Bonjour ${name},\n\nMerci pour votre visite aujourd'hui pour votre soin ${service} !\n\n💧 Pour optimiser vos résultats :\n• Buvez au moins 1,5L d'eau aujourd'hui pour favoriser le drainage\n• Privilégiez une alimentation légère ce soir\n\nÀ très bientôt à Digital Clínica !`,
        },
        {
          id: 'custom',
          title: '✍️ Message Personnalisé',
          text: `Bonjour ${name},\n\nConcernant votre rendez-vous à Digital Clínica :\n\n`,
        },
      ];
    }

    if (lang === 'en') {
      return [
        {
          id: 'reminder',
          title: '📅 Appointment Reminder',
          text: `Hello ${name},\n\nThis is a friendly reminder of your upcoming ${service} appointment on ${formattedHumanDate || date} at ${time} at Digital Clínica Lisbon.\n\n📍 Location: Lisbon, Portugal\nℹ️ If you need to reschedule, please notify us at least 24h in advance.\n\nSee you soon!`,
        },
        {
          id: 'confirmation',
          title: '✅ Booking Confirmation',
          text: `Hello ${name},\n\nYour appointment for ${service} on ${formattedHumanDate || date} at ${time} has been successfully confirmed.\n\nWe look forward to welcoming you at Digital Clínica Lisbon!`,
        },
        {
          id: 'aftercare_kine',
          title: '🏃‍♂️ Physiotherapy Post-Care',
          text: `Hello ${name},\n\nWe hope you are feeling well after your ${service} session!\n\n💡 Recovery advice:\n• Keep well hydrated\n• Apply heat/cold as instructed by your practitioner\n• Perform gentle recommended stretches\n\nFeel free to reach out if you have any questions.`,
        },
        {
          id: 'aftercare_slimming',
          title: '✨ Aesthetics & Slimming Post-Care',
          text: `Hello ${name},\n\nThank you for visiting Digital Clínica today for your ${service} treatment!\n\n💧 To maximize results:\n• Drink plenty of water (1.5L+) to assist drainage\n• Keep your meals light and balanced today\n\nHave a wonderful day!`,
        },
        {
          id: 'custom',
          title: '✍️ Custom Note',
          text: `Hello ${name},\n\nRegarding your visit to Digital Clínica:\n\n`,
        },
      ];
    }

    // Default: Portuguese
    return [
      {
        id: 'reminder',
        title: '📅 Lembrete de Consulta',
        text: `Olá ${name},\n\nConfirmamos a sua consulta de ${service} agendada para ${formattedHumanDate || date} às ${time} na Digital Clínica Lisboa.\n\n📍 Localização: Lisboa, Portugal\nℹ️ Caso necessite de alterar, por favor avise-nos com 24h de antecedência.\n\nAté breve!`,
      },
      {
        id: 'confirmation',
        title: '✅ Confirmação Imediata',
        text: `Olá ${name},\n\nA sua marcação para ${service} no dia ${formattedHumanDate || date} às ${time} foi confirmada com sucesso na Digital Clínica Lisboa.\n\nEstamos à sua espera!`,
      },
      {
        id: 'aftercare_kine',
        title: '🏃‍♂️ Recomendações Fisioterapia',
        text: `Olá ${name},\n\nEsperamos que se sinta melhor após a sua sessão de ${service}!\n\n💡 Recomendações pós-tratamento:\n• Mantenha uma boa hidratação ao longo do dia\n• Aplique gelo/calor conforme orientado pelo especialista\n• Realize os alongamentos suaves indicados\n\nQualquer dúvida, estamos ao seu dispor.`,
      },
      {
        id: 'aftercare_slimming',
        title: '✨ Recomendações Estética & Drenagem',
        text: `Olá ${name},\n\nObrigado pela sua visita à Digital Clínica hoje para a sessão de ${service}!\n\n💧 Para maximizar os resultados:\n• Beba bastante água (mínimo 1,5L) para estimular a drenagem linfática\n• Evite refeições pesadas durante o dia de hoje\n\nTenha um excelente dia!`,
      },
      {
        id: 'custom',
        title: '✍️ Mensagem Livre',
        text: `Olá ${name},\n\nEm relação à sua consulta na Digital Clínica:\n\n`,
      },
    ];
  }, [lang, name, service, date, time, formattedHumanDate]);

  // Current message content
  const [customMessage, setCustomMessage] = useState<string>('');

  // Sync custom message when template changes or modal opens
  React.useEffect(() => {
    const found = templates.find((t) => t.id === activeTemplate);
    if (found) {
      setCustomMessage(found.text);
    }
  }, [activeTemplate, templates]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!cleanPhoneForWa) return;
    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${cleanPhoneForWa}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <IconBrandWhatsapp size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-white">
                  {lang === 'fr'
                    ? 'Centre de Communication WhatsApp'
                    : lang === 'en'
                      ? 'WhatsApp Communication Hub'
                      : 'Central de Comunicação WhatsApp'}
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] font-bold border border-[#25D366]/30">
                  1-Click Direct
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {name} • <span className="font-mono text-slate-200">{phoneValidation.formatted || rawPhone || 'Sem telefone'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#334155]">
          {/* Patient / Appointment Context Banner */}
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-semibold">{lang === 'fr' ? 'Patient' : lang === 'en' ? 'Patient' : 'Utente'}</div>
              <div className="font-medium text-[#0F172A] truncate">{name}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-semibold">{lang === 'fr' ? 'Prestation' : lang === 'en' ? 'Service' : 'Serviço'}</div>
              <div className="font-medium text-[#0F172A] truncate">{service}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-semibold">{lang === 'fr' ? 'Date' : lang === 'en' ? 'Date' : 'Data'}</div>
              <div className="font-medium text-[#0F172A]">{date || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[#64748B] font-semibold">{lang === 'fr' ? 'Heure' : lang === 'en' ? 'Time' : 'Horário'}</div>
              <div className="font-medium text-[#0F172A]">{time || 'N/A'}</div>
            </div>
          </div>

          {/* Template Selector Pills */}
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2">
              {lang === 'fr' ? 'Modèles Préconfigurés' : lang === 'en' ? 'Quick Message Templates' : 'Modelos de Mensagem'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setActiveTemplate(tpl.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTemplate === tpl.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white border border-[#CBD5E1] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Editable WhatsApp Bubble Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider">
                {lang === 'fr' ? 'Aperçu & Personnalisation' : lang === 'en' ? 'Message Preview & Customization' : 'Pré-visualização e Edição'}
              </label>
              <span className="text-[11px] text-[#94A3B8]">
                {customMessage.length} caracteres
              </span>
            </div>

            <div className="relative rounded-2xl bg-[#EFEAE2] p-3.5 border border-[#D9D2C7] shadow-inner">
              <div className="bg-[#E7FFDB] text-[#111B21] rounded-2xl rounded-tl-xs p-3.5 shadow-xs border border-[#D2E7C6] text-xs sm:text-sm font-sans leading-relaxed relative">
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-transparent resize-y border-none focus:outline-none text-[#111B21] font-sans text-xs sm:text-sm leading-relaxed"
                  placeholder="Escreva a sua mensagem..."
                />
                <div className="text-[10px] text-[#667781] text-right mt-1 font-mono">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>
          </div>

          {/* Validation warning if phone is missing/invalid */}
          {!phoneValidation.isValid && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>
                {lang === 'fr'
                  ? 'Le numéro de téléphone du patient semble incomplet. Vous pouvez quand même copier le texte.'
                  : lang === 'en'
                    ? 'Patient phone number is missing or invalid. You can still copy the message text.'
                    : 'O número de telefone é inválido ou não foi preenchido. Pode ainda copiar o texto da mensagem.'}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#CBD5E1] bg-white text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {copied ? <IconCheck size={16} className="text-[#22C55E]" /> : <IconCopy size={16} />}
            <span>{copied ? (lang === 'fr' ? 'Copié !' : lang === 'en' ? 'Copied!' : 'Copiado!') : (lang === 'fr' ? 'Copier le texte' : lang === 'en' ? 'Copy Text' : 'Copiar Mensagem')}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              {lang === 'fr' ? 'Annuler' : lang === 'en' ? 'Cancel' : 'Cancelar'}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={!cleanPhoneForWa}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconBrandWhatsapp size={18} />
              <span>
                {lang === 'fr'
                  ? 'Ouvrir dans WhatsApp'
                  : lang === 'en'
                    ? 'Launch WhatsApp'
                    : 'Abrir no WhatsApp'}
              </span>
              <IconExternalLink size={14} className="opacity-80" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
