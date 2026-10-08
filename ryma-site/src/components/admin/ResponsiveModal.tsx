'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
  lang?: 'fr' | 'en' | 'pt';
}

const MAX_WIDTH_CLASSES = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-md',
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
};

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  lang = 'pt',
}: ResponsiveModalProps) {
  const box=useRef<HTMLDivElement>(null);
  const overlay=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  closeRef.current=onClose;
  const dirty=useRef(false);
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const titleId=useId();
  const keepButton=useRef<HTMLButtonElement>(null);
  const t=(fr:string,en:string,pt:string)=>lang==='fr'?fr:lang==='en'?en:pt;
  const requestClose=()=>dirty.current?setConfirmDiscard(true):closeRef.current();
  useEffect(() => {
    if (!isOpen) return;
    dirty.current=false;
    setConfirmDiscard(false);
    const previous=document.activeElement as HTMLElement|null;
    const siblings=Array.from(document.body.children).filter((node):node is HTMLElement=>node instanceof HTMLElement && node!==overlay.current && !node.contains(overlay.current));
    const priorInert=siblings.map(node=>node.inert);
    siblings.forEach(node=>{node.inert=true;});
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusRoot=()=>box.current?.querySelector<HTMLElement>('[role="alertdialog"]')??box.current;
    const focusable=()=>Array.from((focusRoot()?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')??[])).filter(node=>node.getClientRects().length>0 && !node.closest('[inert]'));
    (focusable()[0]??box.current)?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();e.stopPropagation();
        if(dirty.current)setConfirmDiscard(true);else closeRef.current();
      }
      if (e.key==='Tab') {
        const nodes=focusable(),first=nodes[0],last=nodes.at(-1);
        if(!first){e.preventDefault();box.current?.focus();return;}
        if(e.shiftKey && (document.activeElement===first || !focusRoot()?.contains(document.activeElement))){e.preventDefault();last?.focus();}
        else if(!e.shiftKey && (document.activeElement===last || !focusRoot()?.contains(document.activeElement))){e.preventDefault();first.focus();}
      }
    };
    const retainFocus=(e:FocusEvent)=>{if(!focusRoot()?.contains(e.target as Node))(focusable()[0]??box.current)?.focus();};
    const beforeUnload=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('keydown', handleKeyDown,true);
    document.addEventListener('focusin',retainFocus);
    window.addEventListener('beforeunload',beforeUnload);
    return () => {
      window.removeEventListener('keydown', handleKeyDown,true);document.removeEventListener('focusin',retainFocus);window.removeEventListener('beforeunload',beforeUnload);
      siblings.forEach((node,i)=>{node.inert=priorInert[i];});document.body.style.overflow=overflow;
      if(previous?.isConnected)previous.focus();
    };
  }, [isOpen]);
  useEffect(()=>{if(!isOpen)return;if(confirmDiscard)keepButton.current?.focus();else box.current?.querySelector<HTMLElement>('input,textarea,select,button')?.focus();},[confirmDiscard,isOpen]);

  if(typeof document==='undefined')return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[99999] flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 font-sans"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={requestClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-0 touch-none"
            aria-hidden="true"
          />

          {/* Modal / Bottom Sheet Box */}
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onChangeCapture={()=>{dirty.current=true;}}
            onInputCapture={()=>{dirty.current=true;}}
            onClickCapture={event=>{
              if ((event.target as HTMLElement).closest('[data-modal-dismiss]')) {
                event.preventDefault();event.stopPropagation();requestClose();
              }
            }}
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative z-10 w-full ${MAX_WIDTH_CLASSES[maxWidth]} bg-white border border-[#E2E8F0] rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden overscroll-contain`}
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-full flex justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-10 h-1 rounded-full bg-[#E2E8F0]" />
            </div>

            {/* Header */}
            <div className="px-5 py-3.5 md:px-6 md:py-4 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0 pr-2">
                <h3 id={titleId} className="font-semibold text-base md:text-lg text-[#0F172A] truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#64748B] mt-0.5 truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={requestClose}
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0 touch-target flex items-center justify-center"
                  aria-label={t('Fermer','Close','Fechar')}
                >
                  <IconX size={18} />
                </button>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div inert={confirmDiscard} className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
              {children}
            </div>
            {confirmDiscard && <div role="alertdialog" aria-modal="true" aria-label={t('Abandonner les modifications ?','Discard changes?','Descartar alterações?')} className="p-5 border-t bg-white space-y-3">
              <p>{t('Les modifications ne sont pas enregistrées.','Your changes have not been saved.','As alterações não foram guardadas.')}</p>
              <div className="flex gap-3">
                <button ref={keepButton} type="button" onClick={()=>setConfirmDiscard(false)} className="border rounded-lg px-3 py-2">{t('Continuer la saisie','Keep editing','Continuar a editar')}</button>
                <button type="button" onClick={()=>{dirty.current=false;setConfirmDiscard(false);closeRef.current();}} className="border rounded-lg px-3 py-2">{t('Abandonner','Discard','Descartar')}</button>
              </div>
            </div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,document.body
  );
}
