'use client';
import { legacyText } from '@/data/translations/legacy-es';

import { getLocalizedText } from '@/data/services';
import { useServices } from '@/components/ServiceCatalogProvider';
import { PractitionerSelect } from '@/components/booking/PractitionerSelect';

import { PhoneInput } from '@/components/ui/PhoneInput';

import React, { useEffect, useState } from 'react';


import { Lang } from '@/lib/i18n';
import { ResponsiveModal } from './ResponsiveModal';
import { IconAlertCircle } from '@tabler/icons-react';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
  newForm: {
    practitionerId: string;
    patientName: string;
    phone: string;
    email: string;
    service: string;
    date: string;
    startTime: string;
    notes: string;
  };
  setNewForm: React.Dispatch<
    React.SetStateAction<{
      practitionerId: string;
    patientName: string;
      phone: string;
      email: string;
      service: string;
      date: string;
      startTime: string;
      notes: string;
    }>
  >;
  addingError: string | null;
  addingLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddAppointmentModal = React.memo(function AddAppointmentModal({
  isOpen,
  onClose,
  lang,
  newForm,
  setNewForm,
  addingError,
  addingLoading,
  onSubmit,
}: AddAppointmentModalProps) {
  const SERVICES = useServices();
  const txt = (fr: string, en: string, pt: string, es: string) =>
    lang === 'es' ? es : lang === 'fr' ? fr : lang === 'en' ? en : pt;

  const [availableTimes,setAvailableTimes]=useState<string[]>([]);
  const [slotsLoading,setSlotsLoading]=useState(false);
  const [slotsError,setSlotsError]=useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!isOpen||!newForm.date){setAvailableTimes([]);return;}
    const controller=new AbortController();setSlotsLoading(true);setSlotsError(false);setAvailableTimes([]);
    const query=new URLSearchParams({date:newForm.date,service:newForm.service,practitionerId:newForm.practitionerId});
    fetch('/api/admin/slots?'+query,{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{
      if(controller.signal.aborted)return;
      const times=data.slots.filter((s:{available:boolean})=>s.available).map((s:{time:string})=>s.time);setAvailableTimes(times);
      setNewForm(p=>({...p,startTime:times.includes(p.startTime)?p.startTime:times[0]||''}));
    }).catch(()=>{if(!controller.signal.aborted)setSlotsError(true);}).finally(()=>{if(!controller.signal.aborted)setSlotsLoading(false);});
    return()=>controller.abort();
  },[isOpen,newForm.date,newForm.service,newForm.practitionerId,retry,setNewForm]);
  return (
    <ResponsiveModal
        lang={lang}
      isOpen={isOpen}
      onClose={onClose}
      title={txt('Nouveau Rendez-vous', 'Create Appointment', 'Marcar Nova Consulta', "Crear cita")}
      subtitle={txt('Enregistrement rapide d’une consultation', 'Quick booking form', 'Formulário de marcação rápida', "Formulario de reserva rápida")}
      maxWidth="md"
    >
      {addingError && (
        <div className="mb-4 p-3.5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#991B1B] text-xs font-medium flex items-center gap-2">
          <IconAlertCircle size={16} />
          <span>{addingError}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3.5 font-sans text-xs">
        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Nom du Patient *', 'Patient Name *', 'Nome do Utente *', "Nombre del paciente *")}
          </label>
          <input
            type="text"
            required
            value={newForm.patientName}
            onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,patientName:value}));}}
            placeholder={txt('Ex: Sophie Bernard', 'E.g. John Doe', 'Ex: Maria Silva', "P. ej., Juan García")}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>

        <PractitionerSelect admin lang={lang} value={newForm.practitionerId} service={newForm.service} onChange={value => setNewForm(p => ({...p,practitionerId:value}))} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="appointment-phone" className="font-medium text-[#475569] block mb-1">
              {txt('Téléphone *', 'Phone *', 'Telefone *', "Teléfono *")}
            </label>
            <PhoneInput
              id="appointment-phone"
              lang={lang}
              required
              value={newForm.phone}
              onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,phone:value}));}}
              placeholder="+351 912 345 678"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Email', 'Email', 'Email', "Correo electrónico")}
            </label>
            <input
              type="email"
              value={newForm.email}
              onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,email:value}));}}
              placeholder={legacyText("patient@email.com", lang)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Soin / Prestation *', 'Treatment / Service *', 'Tratamento *', "Tratamiento / servicio *")}
          </label>
          <select
            value={newForm.service}
            onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,service:value}));}}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors font-sans"
          >
            <option value="">{lang === 'es' ? "Elija un tratamiento" : lang==='pt'?'Escolha um tratamento':lang==='fr'?'Choisissez un soin':'Choose a treatment'}</option>{SERVICES.map(s => (
              <option key={s.slug} value={s.slug}>
                {getLocalizedText(s.name,lang)} ({s.price} €)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Date *', 'Date *', 'Data *', "Fecha *")}
            </label>
            <input
              type="date"
              required
              value={newForm.date}
              onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,date:value}));}}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <label className="font-medium text-[#475569] block mb-1">
              {txt('Horaire *', 'Time Slot *', 'Horário *', "Horario *")}
            </label>
            <select
              value={newForm.startTime}
              onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,startTime:value}));}}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors font-sans"
            >
              <option value="">{slotsLoading ? txt('Chargement…','Loading…','A carregar…', "Cargando…") : txt('Choisir un horaire','Choose a time','Escolha um horário', "Elija una hora")}</option>
              {availableTimes.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-medium text-[#475569] block mb-1">
            {txt('Notes / Remarques', 'Notes / Remarks', 'Notas / Observações', "Notas / observaciones")}
          </label>
          <textarea
            rows={2}
            value={newForm.notes}
            onChange={e => {const value=e.currentTarget.value;setNewForm(p => ({...p,notes:value}));}}
            placeholder={txt('Précisions sur la consultation...', 'Optional details...', 'Detalhes opcionais...', "Detalles opcionales...")}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-xl p-3 focus:outline-none focus:border-[#2563EB] transition-colors resize-none"
          />
        </div>

        {slotsError && <button type="button" className="text-red-700 underline" onClick={()=>setRetry(n=>n+1)}>{txt('Réessayer le chargement des horaires','Retry loading availability','Tentar carregar horários novamente', "Volver a cargar la disponibilidad")}</button>}
        {!slotsLoading&&!slotsError&&newForm.date&&!availableTimes.length&&<p role="status">{txt('Aucun horaire disponible. Choisissez une autre date.','No available times. Choose another date.','Sem horários disponíveis. Escolha outra data.', "No hay horas disponibles. Elija otra fecha.")}</p>}
        <div className="pt-3 flex justify-end gap-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            data-modal-dismiss
            className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] font-medium transition-colors"
          >
            {txt('Annuler', 'Cancel', 'Cancelar', "Cancelar")}
          </button>
          <button
            type="submit"
            disabled={addingLoading || slotsLoading || slotsError || !availableTimes.includes(newForm.startTime)}
            className="px-5 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium disabled:opacity-50 transition-colors shadow-xs touch-target"
          >
            {addingLoading
              ? txt('Création...', 'Creating...', 'A criar...', "Creando...")
              : txt('Valider le Rendez-vous', 'Confirm Appointment', 'Confirmar Consulta', "Confirmar cita")}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
});
