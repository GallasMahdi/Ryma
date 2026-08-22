'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lang } from '@/lib/i18n';
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
  isLiveConnected = true,
}: ClinicHelpdeskDrawerProps) {
  const [selectedTab, setSelectedTab] = useState<'emergency' | 'diagnostic' | 'cheatsheet'>('emergency');
  const [issueDescription, setIssueDescription] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    return {
      portal: 'Digital Clínica Admin Portal',
      version: 'v2.4',
      environment: process.env.NODE_ENV || 'production',
      activeTab,
      sseLiveSync: isLiveConnected ? 'CONNECTED' : 'DISCONNECTED',
      timestamp: new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
      screenResolution: clientDiag.screen,
      browser: clientDiag.userAgent,
      networkStatus: clientDiag.online ? 'ONLINE' : 'OFFLINE',
      issueNotes: issueDescription.trim() || 'N/A',
    };
  }, [activeTab, isLiveConnected, clientDiag, issueDescription]);

  const handleSendDiagnosticViaWhatsApp = () => {
    const reportText = `🚨 *[RELATÓRIO DE SUPORTE - DIGITAL CLÍNICA]*\n` +
      `📅 *Data/Hora:* ${fullDiagnosticReport.timestamp}\n` +
      `📌 *Módulo Ativo:* ${fullDiagnosticReport.activeTab}\n` +
      `⚡ *Sync Real-Time:* ${fullDiagnosticReport.sseLiveSync}\n` +
      `💻 *Ecrã:* ${fullDiagnosticReport.screenResolution}\n` +
      `📝 *Descrição do Problema:* ${issueDescription.trim() || 'Verificação técnica geral'}\n\n` +
      `_Enviado via Helpdesk Interno Digital Clínica_`;

    const url = `https://wa.me/351912000000?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex justify-end font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Slide-over Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-md bg-white h-full shadow-2xl border-s border-[#E2E8F0] z-10 flex flex-col justify-between overflow-hidden"
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
                  {lang === 'fr'
                    ? 'Centre d’Assistance & Support'
                    : lang === 'en'
                      ? 'Clinic Helpdesk & Support'
                      : 'Suporte Técnico & Helpdesk'}
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                {lang === 'fr'
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
          <button
            type="button"
            onClick={() => setSelectedTab('emergency')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'emergency'
                ? 'border-[#0F172A] text-[#0F172A] font-semibold bg-white rounded-t-lg'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <IconPhone size={15} />
            <span>{lang === 'fr' ? 'Contact Direct' : lang === 'en' ? 'Direct Channels' : 'Contacto Direto'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('diagnostic')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'diagnostic'
                ? 'border-[#0F172A] text-[#0F172A] font-semibold bg-white rounded-t-lg'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <IconBug size={15} />
            <span>{lang === 'fr' ? 'Diagnostic' : lang === 'en' ? 'Diagnostic' : 'Diagnóstico'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('cheatsheet')}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              selectedTab === 'cheatsheet'
                ? 'border-[#0F172A] text-[#0F172A] font-semibold bg-white rounded-t-lg'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <IconWifi size={15} />
            <span>{lang === 'fr' ? 'Aide-Mémoire' : lang === 'en' ? 'Cheatsheet' : 'Recepção'}</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#334155]">
          {/* TAB 1: EMERGENCY CONTACTS */}
          {selectedTab === 'emergency' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B]">
                <div className="font-semibold text-xs flex items-center gap-1.5 mb-1">
                  <span>🚨</span>
                  <span>
                    {lang === 'fr'
                      ? 'Ligne Directe pour Urgences Techniques'
                      : lang === 'en'
                        ? 'Emergency Tech Support Line'
                        : 'Linha Direta de Emergência Técnica'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#B91C1C]">
                  {lang === 'fr'
                    ? 'En cas d’interruption de service pendant une consultation, contactez immédiatement le responsable technique.'
                    : lang === 'en'
                      ? 'In case of technical interruption during patient hours, contact the technical lead immediately.'
                      : 'Caso ocorra uma falha técnica durante o atendimento, contacte imediatamente a equipa de suporte.'}
                </p>
              </div>

              {/* Action Cards */}
              <div className="space-y-2.5">
                {/* WhatsApp Support Direct */}
                <a
                  href={`https://wa.me/351912000000?text=${encodeURIComponent(
                    '[SOS CLÍNICA] Preciso de suporte urgente no Portal Digital Clínica'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3.5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] hover:bg-[#DCFCE7] transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                      <IconBrandWhatsapp size={22} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#166534]">
                        WhatsApp Direto — Suporte IT
                      </div>
                      <div className="text-[11px] text-[#15803D] font-mono">
                        +351 912 000 000 (Tempo resposta: &lt; 5 min)
                      </div>
                    </div>
                  </div>
                  <IconExternalLink size={16} className="text-[#166534] opacity-70 group-hover:opacity-100" />
                </a>

                {/* Phone Call */}
                <a
                  href="tel:+351912000000"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                      <IconPhone size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#0F172A]">
                        {lang === 'fr' ? 'Appel Téléphonique Direct' : lang === 'en' ? 'Direct Telephone Line' : 'Chamada Telefónica Direta'}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        +351 912 000 000
                      </div>
                    </div>
                  </div>
                  <IconExternalLink size={16} className="text-[#64748B] opacity-70 group-hover:opacity-100" />
                </a>

                {/* Email */}
                <a
                  href="mailto:support@digitalclinica.pt?subject=Suporte%20Portal%20Digital%20Cl%C3%ADnica"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] text-[#475569] flex items-center justify-center shrink-0">
                      <IconMail size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#0F172A]">
                        Email do Administrador
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        support@digitalclinica.pt
                      </div>
                    </div>
                  </div>
                  <IconExternalLink size={16} className="text-[#64748B] opacity-70 group-hover:opacity-100" />
                </a>
              </div>

              {/* Status Box */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">{lang === 'fr' ? 'État des Serveurs' : lang === 'en' ? 'Server Cluster' : 'Servidor Central'}:</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#166534]">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    Lisboa DC-01 (100% Operacional)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">SSE Live Sync:</span>
                  <span className={`font-semibold ${isLiveConnected ? 'text-[#166534]' : 'text-[#DC2626]'}`}>
                    {isLiveConnected ? 'Ativo & Sincronizado' : 'Reconectando...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSTIC & ISSUE REPORTER */}
          {selectedTab === 'diagnostic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-1.5">
                  {lang === 'fr' ? 'Description du Problème' : lang === 'en' ? 'Describe the Issue' : 'Descreva o Problema'}
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    lang === 'fr'
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
                  {lang === 'fr' ? 'Données Techniques Collectées' : lang === 'en' ? 'Captured Diagnostics' : 'Diagnóstico Automático do Sistema'}
                </label>
                <div className="p-3.5 rounded-xl bg-[#0F172A] text-slate-200 font-mono text-[11px] space-y-1.5 overflow-x-auto shadow-inner">
                  <div><span className="text-slate-400">Portal:</span> Digital Clínica v2.4</div>
                  <div><span className="text-slate-400">Módulo:</span> {fullDiagnosticReport.activeTab}</div>
                  <div><span className="text-slate-400">Sync:</span> {fullDiagnosticReport.sseLiveSync}</div>
                  <div><span className="text-slate-400">Ecrã:</span> {fullDiagnosticReport.screenResolution}</div>
                  <div><span className="text-slate-400">Hora:</span> {fullDiagnosticReport.timestamp}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendDiagnosticViaWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <IconBrandWhatsapp size={16} />
                  <span>
                    {lang === 'fr' ? 'Envoyer Rapport au Suporte' : lang === 'en' ? 'Send Diagnostic via WhatsApp' : 'Enviar Diagnóstico por WhatsApp'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(fullDiagnosticReport, null, 2), 'diag_json')}
                  className="w-full py-2 px-4 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'diag_json' ? <IconCheck size={15} className="text-[#22C55E]" /> : <IconCopy size={15} />}
                  <span>{copiedKey === 'diag_json' ? 'Copiado para a área de transferência !' : 'Copiar Relatório Completo (JSON)'}</span>
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
                  <span>{lang === 'fr' ? 'Réseaux Wi-Fi Clinique' : lang === 'en' ? 'Clinic Wi-Fi Networks' : 'Redes Wi-Fi da Clínica'}</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-[#0F172A]">DigitalClinica_Private (Equipa)</div>
                      <div className="text-[11px] text-[#64748B] font-mono">Pass: ClinicaRyma2026!</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('ClinicaRyma2026!', 'wifi_priv')}
                      className="p-1.5 rounded-md hover:bg-white text-[#64748B] hover:text-[#0F172A] transition-colors border border-transparent hover:border-[#CBD5E1]"
                      title="Copiar Palavra-passe"
                    >
                      {copiedKey === 'wifi_priv' ? <IconCheck size={14} className="text-[#22C55E]" /> : <IconCopy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium text-[#0F172A]">DigitalClinica_Guests (Utentes)</div>
                      <div className="text-[11px] text-[#64748B] font-mono">Pass: SaudeLisboa2026</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('SaudeLisboa2026', 'wifi_guest')}
                      className="p-1.5 rounded-md hover:bg-white text-[#64748B] hover:text-[#0F172A] transition-colors border border-transparent hover:border-[#CBD5E1]"
                      title="Copiar Palavra-passe"
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
                  <span>Terminal TPA / Multibanco (Fecho Diário)</span>
                </div>
                <ol className="text-xs text-[#475569] space-y-1.5 list-decimal pl-4">
                  <li>Pressionar a tecla <strong>AMARELA</strong> no terminal TPA.</li>
                  <li>Digitar o código de menu <strong>9</strong> (Fecho do Dia / Totais).</li>
                  <li>Confirmar com a tecla <strong>VERDE</strong>.</li>
                  <li>Guardar o talão emitido junto dos recibos diários da clínica.</li>
                </ol>
              </div>

              {/* Standard Policies */}
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-xs text-[#0F172A]">
                  <IconFileText size={16} className="text-[#C49A3C]" />
                  <span>Política de Cancelamentos</span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Os cancelamentos de consultas devem ser comunicados com um mínimo de <strong>24 horas</strong> de antecedência para permitir a libertação do horário a outros utentes na lista de espera.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center text-xs text-[#64748B] shrink-0">
          Digital Clínica • Suporte Técnico Central Lisboa
        </div>
      </motion.div>
    </div>
  );
}
