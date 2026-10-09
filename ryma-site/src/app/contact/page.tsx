'use client';

import { PhoneInput } from '@/components/ui/PhoneInput';
import Script from 'next/script';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconPhone, IconMail, IconMapPin, IconBrandWhatsapp, IconClock, IconCheck } from '@tabler/icons-react';

interface FormData {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState<FormData>({ name: '', phone: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,setError]=useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptchaToken=await getRecaptchaToken('contact');
      const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,recaptchaToken}),signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw Error('delivery');
      setSubmitted(true);
    }catch{
      setError(lang === 'es' ? "No se ha podido enviar su mensaje. Vuelva a intentarlo o llámenos por teléfono." : lang==='pt'?'Não foi possível enviar a mensagem. Tente novamente ou contacte-nos por telefone.':lang==='fr'?"Impossible d’envoyer le message. Réessayez ou contactez-nous par téléphone.":'Your message could not be sent. Please retry or contact us by phone.');
    }finally{setLoading(false);}
  };

  const inputClass = "w-full bg-white border border-[#D4CEBE] text-[#1A1412] placeholder-[#8A8078] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A3C] focus:ring-1 focus:ring-[#C49A3C]/40 transition-colors shadow-sm";

  const contactItems = [
    {
      icon: IconPhone,
      label: {
    es: "Teléfono", fr: 'Téléphone', pt: 'Telefone', en: 'Phone' },
      value: t.common.phone,
      href: `tel:${t.common.phone}`,
    },
    {
      icon: IconBrandWhatsapp,
      label: {
    es: "WhatsApp", fr: 'WhatsApp', pt: 'WhatsApp', en: 'WhatsApp' },
      value: t.common.whatsapp,
      href: `https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`,
    },
    {
      icon: IconMail,
      label: {
    es: "Correo electrónico", fr: 'Email', pt: 'E-mail', en: 'Email' },
      value: t.common.email,
      href: `mailto:${t.common.email}`,
    },
    {
      icon: IconMapPin,
      label: {
    es: "Dirección", fr: 'Adresse', pt: 'Morada', en: 'Address' },
      value: t.common.address,
      href: `https://maps.google.com/?q=${encodeURIComponent(t.common.address)}`,
    },
    {
      icon: IconClock,
      label: {
    es: "Horario de atención", fr: 'Horaires', pt: 'Horário', en: 'Opening Hours' },
      value: t.common.hours,
      href: null,
    },
  ];

  return (
    <>
      {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && <Script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} strategy="lazyOnload" />}
      <section className="relative pt-28 pb-20 overflow-hidden bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="relative mx-auto max-w-5xl px-6 md:px-12 text-center">
          <ScrollReveal>
            <span className="font-mono text-xs tracking-widest text-[#C49A3C] uppercase font-semibold">
              — {t.contact.heroBadge} —
            </span>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mt-4 mb-4">
              {t.contact.heroTitle}
            </h1>
            <p className="text-[#6B6058] max-w-xl mx-auto text-lg leading-relaxed">
              {t.contact.heroSub}
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 pb-28 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Coords */}
            <div className="space-y-8">
              <ScrollReveal delay={0.1}>
                <div className="bg-white border border-[#E8E2D8] rounded-3xl p-8 shadow-sm">
                  <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                    {t.contact.coordsTitle}
                  </h2>
                  <div className="space-y-6">
                    {contactItems.filter(item => item.value).map(({ icon: Icon, label, value, href }, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-[#F5E9C8] border border-[#C49A3C]/30 flex items-center justify-center shrink-0">
                          <Icon size={20} className="text-[#9A7428]" />
                        </div>
                        <div>
                          <div className="font-mono text-xs text-[#8A8078] uppercase tracking-wide mb-1 font-semibold">
                            {label[lang as keyof typeof label] || label.pt || label.fr}
                          </div>
                          {href ? (
                            <a href={href} target={href.startsWith('http') ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="text-base font-semibold text-[#1A1412] hover:text-[#9A7428] transition-colors">
                              {value}
                            </a>
                          ) : (
                            <span className="text-base font-semibold text-[#1A1412]">{value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* Map embed card */}
              {t.common.address && <ScrollReveal delay={0.15}>
                <div
                  className="bg-white border border-[#C49A3C]/20 overflow-hidden rounded-3xl flex items-center justify-center p-8 shadow-sm"
                  style={{ height: '240px', background: 'linear-gradient(135deg, #FDFAF4, #F5E9C8 80%)' }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#C49A3C]/30 flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <IconMapPin size={24} className="text-[#9A7428]" />
                    </div>
                    <p className="text-base font-semibold text-[#1A1412]">{lang === 'es' ? "Mapa interactivo" : lang === 'pt' ? 'Mapa Interativo' : lang === 'en' ? 'Interactive Map' : 'Carte Google Maps'}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(t.common.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-[#9A7428] hover:text-[#C49A3C] transition-colors mt-2 inline-block"
                    >
                      {lang === 'es' ? "Abrir en Google Maps" : lang === 'pt' ? 'Abrir no Google Maps' : lang === 'en' ? 'Open in Google Maps' : 'Ouvrir dans Google Maps'} →
                    </a>
                  </div>
                </div>
              </ScrollReveal>}
            </div>

            {/* Right: Contact Form */}
            <ScrollReveal delay={0.1}>
              <GlassCard hoverEffect={false} className="p-8 md:p-10 border border-[#C49A3C]/20">
                <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-2">
                  {t.contact.formTitle}
                </h2>
                <p className="text-sm text-[#8A8078] mb-8">
                  {t.contact.formSub}
                </p>

                {submitted ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#F5E9C8] border-2 border-[#C49A3C] flex items-center justify-center">
                      <IconCheck size={28} className="text-[#9A7428]" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#1A1412]">
                      {t.contact.successTitle}
                    </h3>
                    <p className="text-[#6B6058] text-sm leading-relaxed">
                      {t.contact.successMsg}
                    </p>
                    <Button href="/rendez-vous" variant="primary">
                      {t.common.bookAppointment}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                          {t.contact.nameLabel} *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          value={form.name}
                          onChange={handleChange}
                          placeholder={lang === 'es' ? "Su nombre" : lang === 'pt' ? 'O seu nome' : lang === 'en' ? 'Your name' : 'Votre nom'}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-phone" className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                          {t.contact.phoneLabel} *
                        </label>
                        <PhoneInput
                          id="contact-phone"
                          lang={lang}
                          name="phone"
                          required
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+351 9XX XXX XXX"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {t.contact.emailLabel} *
                      </label>
                      <input
                        id="contact-email"
                        required
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={lang === 'es' ? "su.correo@ejemplo.com" : lang === 'pt' ? 'seu.email@exemplo.pt' : lang === 'en' ? 'your.email@example.com' : 'votre@email.com'}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {lang === 'es' ? "Asunto" : lang === 'pt' ? 'Assunto' : lang === 'en' ? 'Subject' : 'Sujet'}
                      </label>
                      <select
                        id="contact-subject"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">
                          {lang === 'es' ? "— Seleccione un asunto —" : lang === 'pt' ? '— Selecione o assunto —' : lang === 'en' ? '— Select a subject —' : '— Choisir un sujet —'}
                        </option>
                        <option value="rdv">{lang === 'es' ? "Reservar cita" : lang === 'pt' ? 'Marcação de Consulta' : lang === 'en' ? 'Book Appointment' : 'Prise de rendez-vous'}</option>
                        <option value="info">{lang === 'es' ? "Solicitud de información" : lang === 'pt' ? 'Pedido de Informação' : lang === 'en' ? 'Information Request' : 'Demande d\'information'}</option>
                        <option value="devis">{lang === 'es' ? "Precios de los bonos" : lang === 'pt' ? 'Orçamento de Pacotes' : lang === 'en' ? 'Package Pricing' : 'Demande de devis'}</option>
                        <option value="other">{lang === 'es' ? "Otro" : lang === 'pt' ? 'Outro Assunto' : lang === 'en' ? 'Other' : 'Autre'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {t.contact.messageLabel} *
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        value={form.message}
                        onChange={handleChange}
                        rows={4}
                        placeholder={lang === 'es' ? "Su mensaje..." : lang === 'pt' ? 'A sua mensagem...' : lang === 'en' ? 'Your message...' : 'Votre message...'}
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full justify-center py-3.5 text-sm font-semibold"
                      disabled={loading}
                    >
                      {loading
                        ? '...'
                        : t.contact.sendBtn}
                    </Button>
                  </form>
                )}
              </GlassCard>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
