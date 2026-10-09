'use client';
import { legacyText } from '@/data/translations/legacy-es';


import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
import {
  IconX,
  IconLifebuoy,
  IconBrandWhatsapp,
  IconPhone,
  IconMail,
  IconWifi,
  IconCreditCard,
  IconFileText,
  IconCopy,
  IconCheck,
  IconBug,
  IconServer,
  IconSend,
  IconExternalLink,
  IconSparkles,
  IconDeviceLaptop,
  IconClock,
  IconShieldLock,
} from '@tabler/icons-react';

export interface ClinicHelpdeskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  activeTab?: string;
  isLiveConnected?: boolean;
}

export function ClinicHelpdeskDrawer({
  isOpen,
  onClose,
  lang,
  activeTab = 'dashboard',
  isLiveConnected = false,
}: ClinicHelpdeskDrawerProps) {
  const [selectedTab, setSelectedTab] = useState<'emergency' | 'diagnostic' | 'cheatsheet'>('emergency');
  const [issueDescription, setIssueDescription] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const txt = (fr: string, en: string, pt: string, es: string) => {
    if (lang === 'es') return es;
    if (lang === 'fr') return fr;
    if (lang === 'en') return en;
    return pt;
  };

  // Auto diagnostic details
  const [clientDiag, setClientDiag] = useState<{
    userAgent: string;
    screen: string;
    time: string;
    online: boolean;
  }>({
    userAgent: '',
    screen: '',
    time: '',
    online: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== 'undefined') {
      setClientDiag({
        userAgent: navigator.userAgent,
        screen: `${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})`,
        time: new Date().toISOString(),
        online: navigator.onLine,
      });
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Full technical diagnostic payload
  const fullDiagnosticReport = useMemo(() => {
    if (!isOpen) {
      return {
        activeTab: '',
        sseLiveSync: '',
        timestamp: '',
        screenResolution: '',
        browser: '',
        networkStatus: '',
        issueNotes: '',
      };
    }
    return {
      portal: 'Digital Clínica Admin Portal',
      version: process.env.NEXT_PUBLIC_RELEASE_SHA || 'unavailable',
      environment: process.env.NODE_ENV || 'production',
      activeTab,
      sseLiveSync: isLiveConnected ? 'CONNECTED (REAL-TIME ACTIVE)' : 'DISCONNECTED (FALLBACK MODE)',
      timestamp: new Date().toLocaleString(lang === 'es' ? 'es-ES' : 'pt-PT', { timeZone: 'Europe/Lisbon' }),
      screenResolution: clientDiag.screen,
      browser: clientDiag.userAgent,
      networkStatus: clientDiag.online ? 'ONLINE' : 'OFFLINE',
      issueNotes: issueDescription.trim() || 'N/A',
    };
  }, [isOpen, activeTab, isLiveConnected, clientDiag, issueDescription]);

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
  const handleSendDiagnosticViaWhatsApp = () => {
    if (!supportPhone) return;
    const reportText = `🚨 *[RELATÓRIO DE SUPORTE - DIGITAL CLÍNICA]*\n` +
      `📅 *Data/Hora:* ${fullDiagnosticReport.timestamp}\n` +
      `📌 *Módulo Ativo:* ${fullDiagnosticReport.activeTab}\n` +
      `⚡ *Sync Real-Time:* ${fullDiagnosticReport.sseLiveSync}\n` +
      `💻 *Ecrã:* ${fullDiagnosticReport.screenResolution}\n` +
      `📝 *Descrição do Problema:* ${issueDescription.trim() || 'Verificação técnica geral'}\n\n` +
      `_Enviado via Helpdesk Interno Digital Clínica_`;

    const url = `https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex justify-end font-sans"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs touch-none"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl border-s border-[#E2E8F0] z-10 flex flex-col justify-between overflow-hidden overscroll-contain"
          >
        {/* Drawer Header */}
        <div className="p-5 bg-[#0F172A] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#C49A3C] to-[#E8C97A] text-[#1A1412] flex items-center justify-center shadow-xs">
              <IconLifebuoy size={22} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base text-white">
                  {lang === 'es' ? "Centro de asistencia de la clínica" : lang === 'fr'
                    ? 'Centre d’Assistance & Support'
                    : lang === 'en'
                      ? 'Clinic Helpdesk & Support'
                      : 'Suporte Técnico & Helpdesk'}
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                {lang === 'es' ? "Asistencia urgente y guía de la clínica" : lang === 'fr'
                  ? 'Assistance urgente & documentation interne'
                  : lang === 'en'
                    ? 'Emergency assistance & clinic cheatsheet'
                    : 'Assistência imediata e procedimentos da clínica'}
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

        {/* Drawer Navigation Tabs */}
        <div className="flex items-center border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 pt-2 shrink-0">
          {[
            { id: 'emergency', icon: IconPhone, label: lang === 'es' ? "Canales directos" : lang === 'fr' ? 'Contact Direct' : lang === 'en' ? 'Direct Channels' : 'Contacto Direto' },
            { id: 'diagnostic', icon: IconBug, label: lang === 'es' ? "Diagnóstico" : lang === 'fr' ? 'Diagnostic' : lang === 'en' ? 'Diagnostic' : 'Diagnóstico' },
            { id: 'cheatsheet', icon: IconWifi, label: lang === 'es' ? "Guía rápida" : lang === 'fr' ? 'Aide-Mémoire' : lang === 'en' ? 'Cheatsheet' : 'Recepção' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playSoftClick();
                  setSelectedTab(tab.id as typeof selectedTab);
                }}
                className={`relative flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 z-10 touch-manipulation ${
                  isSelected
                    ? 'text-[#0F172A] font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeHelpdeskTabIndicator"
                    className="absolute inset-0 bg-white rounded-t-lg border-t-2 border-x border-[#E2E8F0] border-t-[#0F172A] shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <Icon size={15} className={isSelected ? 'text-[#0F172A]' : 'text-[#64748B]'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#334155]">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              {selectedTab === 'emergency' && <div className="space-y-4 text-sm">
                <p>{txt('Contactez votre administrateur pour une assistance technique.', 'Contact your administrator for technical support.', 'Contacte o seu administrador para suporte técnico.', "Contacte con su administrador para obtener asistencia técnica.")}</p>
                {supportPhone && <a className="block underline" href={`tel:${supportPhone}`}>{supportPhone}</a>}
                {supportEmail && <a className="block underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>}
                <p>SSE: {isLiveConnected ? txt('Connecté', 'Connected', 'Ligado', "Conectado") : txt('Déconnecté', 'Disconnected', 'Desligado', "Desconectado")}</p>
              </div>}

          {/* TAB 2: DIAGNOSTIC & ISSUE REPORTER */}
          {selectedTab === 'diagnostic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  {lang === 'es' ? "Describa el problema" : lang === 'fr' ? 'Description du Problème' : lang === 'en' ? 'Describe the Issue' : 'Descreva o Problema'}
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    lang === 'es' ? "P. ej.: Problema al imprimir el recibo de la cita de las 15:00..." : lang === 'fr'
                      ? 'Ex: Erreur lors de l’impression du reçu fiscal...'
                      : lang === 'en'
                        ? 'Ex: Issue printing receipt on slot 15:00...'
                        : 'Ex: Erro ao emitir recibo ou fechar horário...'
                  }
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs sm:text-sm text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
                />
              </div>

              {/* Auto Captured Tech Specs */}
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  {lang === 'es' ? "Diagnóstico recopilado" : lang === 'fr' ? 'Données Techniques Collectées' : lang === 'en' ? 'Captured Diagnostics' : 'Diagnóstico Automático do Sistema'}
                </label>
                <div className="p-3.5 rounded-xl bg-[#0F172A] text-slate-200 font-mono text-[11px] space-y-1.5 overflow-x-auto shadow-inner">
                  <div><span className="text-slate-400">Portal:</span> Digital Clínica</div>
                  <div><span className="text-slate-400">{legacyText("Módulo:", lang)}</span> {fullDiagnosticReport.activeTab}</div>
                  <div><span className="text-slate-400">{legacyText("Sync:", lang)}</span> {fullDiagnosticReport.sseLiveSync}</div>
                  <div><span className="text-slate-400">{legacyText("Ecrã:", lang)}</span> {fullDiagnosticReport.screenResolution}</div>
                  <div><span className="text-slate-400">Hora:</span> {fullDiagnosticReport.timestamp}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendDiagnosticViaWhatsApp}
                  disabled={!supportPhone}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <IconBrandWhatsapp size={16} />
                  <span>
                    {lang === 'es' ? "Enviar diagnóstico por WhatsApp" : lang === 'fr' ? 'Envoyer Rapport au Suporte' : lang === 'en' ? 'Send Diagnostic via WhatsApp' : 'Enviar Diagnóstico por WhatsApp'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(fullDiagnosticReport, null, 2), 'diag_json')}
                  className="w-full py-2 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'diag_json' ? <IconCheck size={15} className="text-[#22C55E]" /> : <IconCopy size={15} />}
                  <span>
                    {copiedKey === 'diag_json'
                      ? txt('Copié dans le presse-papiers !', 'Copied to clipboard!', 'Copiado para a área de transferência!', "¡Copiado al portapapeles!")
                      : txt('Copier Rapport Complet (JSON)', 'Copy Full Report (JSON)', 'Copiar Relatório Completo (JSON)', "Copiar informe completo (JSON)")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: RECEPTION CHEATSHEET */}
          {selectedTab === 'cheatsheet' && (
            <div className="space-y-4">
              {/* Wi-Fi Credentials */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#0F172A]">
                  <IconWifi size={16} className="text-[#C49A3C]" />
                  <span>{lang === 'es' ? "Redes wifi de la clínica" : lang === 'fr' ? 'Réseaux Wi-Fi Clinique' : lang === 'en' ? 'Clinic Wi-Fi Networks' : 'Redes Wi-Fi da Clínica'}</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-[#0F172A]">{legacyText("DigitalClinica_Private (Equipa)", lang)}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">Pass: ClinicaRyma2026!</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('ClinicaRyma2026!', 'wifi_priv')}
                      className="p-1.5 rounded-md hover:bg-white text-[#64748B] hover:text-[#0F172A] transition-colors border border-transparent hover:border-[#CBD5E1]"
                      title={legacyText("Copiar Palavra-passe", lang)}
                    >
                      {copiedKey === 'wifi_priv' ? <IconCheck size={14} className="text-[#22C55E]" /> : <IconCopy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-[#0F172A]">{legacyText("DigitalClinica_Guests (Utentes)", lang)}</div>
                      <div className="text-[11px] text-[#64748B] font-mono">Pass: SaudeLisboa2026</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('SaudeLisboa2026', 'wifi_guest')}
                      className="p-1.5 rounded-md hover:bg-white text-[#64748B] hover:text-[#0F172A] transition-colors border border-transparent hover:border-[#CBD5E1]"
                      title={legacyText("Copiar Palavra-passe", lang)}
                    >
                      {copiedKey === 'wifi_guest' ? <IconCheck size={14} className="text-[#22C55E]" /> : <IconCopy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* POS / Multibanco Settlement Cheatsheet */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#0F172A]">
                  <IconCreditCard size={16} className="text-[#C49A3C]" />
                  <span>{txt('Terminal TPA / Carte Bancaire (Clôture)', 'POS / Card Terminal (Daily Close)', 'Terminal TPA / Multibanco (Fecho Diário)', "TPV / terminal de tarjetas (cierre diario)")}</span>
                </div>
                <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
                  <li>{txt('Appuyer sur la touche JAUNE sur le terminal TPA.', 'Press the YELLOW key on the card terminal.', 'Pressionar a tecla AMARELA no terminal TPA.', "Pulse la tecla AMARILLA del terminal de tarjetas.")}</li>
                  <li>{txt('Entrer le code de menu 9 (Clôture du Jour / Totaux).', 'Enter menu code 9 (Day Close / Totals).', 'Digitar o código de menu 9 (Fecho do Dia / Totais).', "Introduzca el código de menú 9 (cierre del día / totales).")}</li>
                  <li>{txt('Confirmer avec la touche VERTE.', 'Confirm with the GREEN key.', 'Confirmar com a tecla VERDE.', "Confirme con la tecla VERDE.")}</li>
                  <li>{txt('Conserver le ticket imprimé avec les reçus journaliers de la clinique.', 'Keep printed receipt with daily clinic records.', 'Guardar o talão emitido junto dos recibos diários da clínica.', "Guarde el recibo impreso junto con los registros diarios de la clínica.")}</li>
                </ol>
              </div>

              {/* Standard Policies */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#0F172A]">
                  <IconFileText size={16} className="text-[#C49A3C]" />
                  <span>{txt('Politique d’Annulation', 'Cancellation Policy', 'Política de Cancelamentos', "Política de cancelación")}</span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {txt(
                    'Les annulations de rendez-vous doivent être communiquées au moins 24 heures à l’avance pour permettre de libérer le créneau aux patients en attente.',
                    'Appointment cancellations must be communicated at least 24 hours in advance to release the slot for waiting patients.',
                    'Os cancelamentos de consultas devem ser comunicados com um mínimo de 24 horas de antecedência para permitir a libertação do horário a outros utentes na lista de espera.', "Las cancelaciones deben comunicarse con al menos 24 horas de antelación para liberar el horario para los pacientes en espera."
                  )}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-xs text-[#64748B] shrink-0">{legacyText("Digital Clínica • Suporte Técnico Central Lisboa", lang)}</div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
