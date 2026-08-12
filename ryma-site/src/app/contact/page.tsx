'use client';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate form submission
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  const inputClass = "w-full bg-white border border-[#D4CEBE] text-[#1A1412] placeholder-[#8A8078] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#C49A3C] focus:ring-1 focus:ring-[#C49A3C]/40 transition-colors shadow-sm";

  const contactItems = [
    {
      icon: IconPhone,
      label: { fr: 'Téléphone', ar: 'الهاتف' },
      value: t.common.phone,
      href: `tel:${t.common.phone}`,
    },
    {
      icon: IconBrandWhatsapp,
      label: { fr: 'WhatsApp', ar: 'واتساب' },
      value: t.common.whatsapp,
      href: `https://wa.me/${t.common.whatsapp.replace(/[^0-9]/g, '')}`,
    },
    {
      icon: IconMail,
      label: { fr: 'Email', ar: 'البريد الإلكتروني' },
      value: t.common.email,
      href: `mailto:${t.common.email}`,
    },
    {
      icon: IconMapPin,
      label: { fr: 'Adresse', ar: 'العنوان' },
      value: t.common.address,
      href: 'https://maps.google.com/?q=Ezzahra+Tunisie',
    },
    {
      icon: IconClock,
      label: { fr: 'Horaires', ar: 'أوقات العمل' },
      value: t.common.hours,
      href: null,
    },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-14 overflow-hidden text-center bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)' }} />
        <div className="relative mx-auto max-w-3xl px-6 md:px-12">
          <ScrollReveal>
            <Badge variant="gold" className="mb-4">
              {lang === 'fr' ? 'Nous Contacter' : 'اتصل بنا'}
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'fr' ? 'Contactez-nous' : 'تواصل معنا'}
            </h1>
            <p className="text-[#6B6058] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {lang === 'fr'
                ? 'Posez vos questions, demandez des informations ou prenez rendez-vous directement via le formulaire.'
                : 'اطرحي أسئلتك أو اطلبي معلومات أو احجزي موعداً مباشرة عبر النموذج.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Contact info + Map */}
            <div className="space-y-6">
              <ScrollReveal>
                <GlassCard hoverEffect={false}>
                  <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                    {lang === 'fr' ? 'Informations de contact' : 'معلومات الاتصال'}
                  </h2>
                  <div className="space-y-5">
                    {contactItems.map(({ icon: Icon, label, value, href }, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#F5E9C8] border border-[#C49A3C]/30 flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-[#9A7428]" />
                        </div>
                        <div>
                          <div className="font-mono text-xs text-[#8A8078] uppercase tracking-wide mb-0.5 font-medium">
                            {label[lang]}
                          </div>
                          {href ? (
                            <a href={href} target={href.startsWith('http') ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-[#1A1412] hover:text-[#9A7428] transition-colors">
                              {value}
                            </a>
                          ) : (
                            <span className="text-sm font-semibold text-[#1A1412]">{value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </ScrollReveal>

              {/* Map embed placeholder */}
              <ScrollReveal delay={0.1}>
                <div
                  className="bg-white border border-[#C49A3C]/20 overflow-hidden rounded-2xl flex items-center justify-center p-8 shadow-sm"
                  style={{ height: '260px', background: 'linear-gradient(135deg, #FDFAF4, #F5E9C8 80%)' }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-white border border-[#C49A3C]/30 flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <IconMapPin size={24} className="text-[#9A7428]" />
                    </div>
                    <p className="text-sm font-semibold text-[#1A1412]">{lang === 'fr' ? 'Carte Google Maps' : 'خريطة جوجل'}</p>
                    <a
                      href="https://maps.google.com/?q=Ezzahra+Tunisie"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-[#9A7428] hover:text-[#C49A3C] transition-colors mt-2 inline-block"
                    >
                      {lang === 'fr' ? 'Ouvrir dans Google Maps' : 'فتح في خرائط جوجل'} →
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right: Contact Form */}
            <ScrollReveal delay={0.1}>
              <GlassCard hoverEffect={false}>
                <h2 className="font-serif text-2xl font-bold text-[#1A1412] mb-6">
                  {lang === 'fr' ? 'Envoyez-nous un message' : 'أرسلي لنا رسالة'}
                </h2>

                {submitted ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#F5E9C8] border-2 border-[#C49A3C] flex items-center justify-center">
                      <IconCheck size={28} className="text-[#9A7428]" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#1A1412]">
                      {lang === 'fr' ? 'Message envoyé !' : 'تم إرسال الرسالة!'}
                    </h3>
                    <p className="text-[#6B6058] text-sm leading-relaxed">
                      {lang === 'fr'
                        ? 'Nous vous répondrons dans les 24 heures. Pour un rendez-vous rapide, contactez-nous sur WhatsApp.'
                        : 'سنرد عليك في غضون 24 ساعة. للحجز السريع، تواصلي معنا على واتساب.'}
                    </p>
                    <Button href="/rendez-vous" variant="primary">
                      {t.common.bookAppointment}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                          {lang === 'fr' ? 'Nom & Prénom' : 'الاسم واللقب'} *
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          name="name"
                          required
                          value={form.name}
                          onChange={handleChange}
                          placeholder={lang === 'fr' ? 'Votre nom' : 'اسمك'}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                          {lang === 'fr' ? 'Téléphone' : 'الهاتف'} *
                        </label>
                        <input
                          id="contact-phone"
                          type="tel"
                          name="phone"
                          required
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+216 XX XXX XXX"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {lang === 'fr' ? 'Email' : 'البريد الإلكتروني'}
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={lang === 'fr' ? 'votre@email.com' : 'بريدك@email.com'}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {lang === 'fr' ? 'Sujet' : 'الموضوع'}
                      </label>
                      <select
                        id="contact-subject"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="">
                          {lang === 'fr' ? '— Choisir un sujet —' : '— اختر موضوعاً —'}
                        </option>
                        <option value="rdv">{lang === 'fr' ? 'Prise de rendez-vous' : 'حجز موعد'}</option>
                        <option value="info">{lang === 'fr' ? 'Demande d\'information' : 'طلب معلومات'}</option>
                        <option value="devis">{lang === 'fr' ? 'Demande de devis' : 'طلب عرض سعر'}</option>
                        <option value="other">{lang === 'fr' ? 'Autre' : 'أخرى'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#8A8078] uppercase tracking-wide block mb-1.5 font-medium">
                        {lang === 'fr' ? 'Message' : 'الرسالة'} *
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        value={form.message}
                        onChange={handleChange}
                        rows={4}
                        placeholder={lang === 'fr' ? 'Votre message...' : 'رسالتك...'}
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
                        ? (lang === 'fr' ? 'Envoi en cours...' : 'جارٍ الإرسال...')
                        : (lang === 'fr' ? 'Envoyer le Message' : 'إرسال الرسالة')}
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
