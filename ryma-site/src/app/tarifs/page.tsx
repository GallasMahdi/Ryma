'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n';
import { SERVICES } from '@/data/services';
import { PRICING_PACKAGES } from '@/data/pricing';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconCheck, IconStar } from '@tabler/icons-react';

export default function TarifsPage() {
  const { lang, t } = useLanguage();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative pt-28 pb-14 overflow-hidden text-center bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)' }} />
        <div className="relative mx-auto max-w-3xl px-6 md:px-12">
          <ScrollReveal>
            <Badge variant="gold" className="mb-4">
              {lang === 'pt' ? 'Preços & Pacotes' : lang === 'en' ? 'Pricing & Packages' : 'Tarifs & Forfaits'}
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? 'Os Nossos Valores' : lang === 'en' ? 'Our Rates' : 'Nos Tarifs'}
            </h1>
            <p className="text-[#6B6058] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {lang === 'pt'
                ? 'Preços por sessão individual ou pacotes promocionais para programas completos. Comparticipação médica e recibos de seguro disponíveis.'
                : lang === 'en'
                ? 'Single session rates or cost-effective packages for full programs. Health insurance receipts and CNAM coverage supported.'
                : 'Tarifs à la séance ou forfaits économiques pour un programme complet. Prise en charge CNAM sur les soins kinésithérapeutiques avec prescription médicale.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────────── */}
      <section className="py-12 bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <ScrollReveal className="mb-10 text-center md:text-start">
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-semibold">
              {lang === 'pt' ? '— Os Nossos Pacotes Recomendados —' : lang === 'en' ? '— Our Recommended Packages —' : '— Nos Forfaits Recommandés —'}
            </span>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PRICING_PACKAGES.map((pkg, i) => (
              <ScrollReveal key={pkg.id} delay={i * 0.08}>
                <div className={`relative h-full flex flex-col bg-white p-6 md:p-8 rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(196,154,60,0.14)] ${pkg.popular ? 'border-2 border-[#C49A3C]' : 'border border-[#E8E2D8] hover:border-[#C49A3C]/50'}`}>
                  {pkg.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C49A3C] via-[#E8C97A] to-[#9A7428] text-[#1A1412] text-[11px] font-bold font-mono px-4 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                      <IconStar size={12} fill="currentColor" className="text-[#1A1412]" />
                      {pkg.badge?.[lang] || pkg.badge?.pt || pkg.badge?.fr}
                    </div>
                  )}
                  {!pkg.popular && pkg.badge && (
                    <Badge variant="gold" className="mb-4 self-start">{pkg.badge[lang] || pkg.badge?.pt || pkg.badge?.fr}</Badge>
                  )}

                  <h3 className="font-serif text-xl md:text-2xl font-bold text-[#1A1412] mb-3 mt-2">
                    {pkg.name[lang] || pkg.name?.pt || pkg.name?.fr}
                  </h3>
                  <p className="text-sm text-[#6B6058] mb-6 leading-relaxed">
                    {pkg.description[lang] || pkg.description?.pt || pkg.description?.fr}
                  </p>

                  <div className="flex items-end gap-2 mb-2">
                    <span className="font-mono text-4xl font-bold text-[#C49A3C]">{pkg.price}</span>
                    <span className="font-mono text-sm font-medium text-[#8A8078] mb-1">{t.common.currency}</span>
                  </div>
                  {pkg.originalPrice && (
                    <span className="font-mono text-sm font-medium text-[#8A8078] line-through mb-1 block">
                      {pkg.originalPrice} {t.common.currency}
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold text-[#9A7428] bg-[#F5E9C8] px-2.5 py-1 rounded-full inline-block mb-6">
                    {pkg.sessions} {lang === 'pt' ? 'sessões incluídas' : lang === 'en' ? 'sessions included' : 'séances incluses'}
                  </span>

                  <ul className="space-y-3 mb-8 flex-1">
                    {(pkg.features[lang] || pkg.features.pt || pkg.features.fr).map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm text-[#332D28]">
                        <IconCheck size={16} className="text-[#C49A3C] mt-0.5 shrink-0" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    href="/rendez-vous"
                    variant={pkg.popular ? 'primary' : 'outline'}
                    className="w-full justify-center py-3"
                  >
                    {t.common.bookAppointment}
                  </Button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Individual Prices Table ────────────────────── */}
      <section className="py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-4xl px-6 md:px-12">
          <ScrollReveal className="mb-10 text-center">
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-semibold">
              {lang === 'pt' ? '— Preços por Sessão Individual —' : lang === 'en' ? '— Single Session Rates —' : '— Tarifs à la séance —'}
            </span>
          </ScrollReveal>

          {/* Kiné */}
          <ScrollReveal className="mb-6">
            <h3 className="font-serif text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-3">
              <span className="w-8 h-px bg-[#C49A3C]/30 inline-block"></span>
              {lang === 'pt' ? 'Fisioterapêutica' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie'}
            </h3>
          </ScrollReveal>
          <div className="space-y-3 mb-12">
            {SERVICES.filter((s) => s.pole === 'kinesitherapie').map((service, i) => (
              <ScrollReveal key={service.slug} delay={i * 0.04}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#E8E2D8] px-6 py-4.5 rounded-xl hover:border-[#C49A3C]/50 hover:shadow-sm transition-all duration-200 gap-3">
                  <div>
                    <span className="font-semibold text-[#1A1412] text-[15px]">{service.name[lang] || service.name.pt || service.name.fr}</span>
                    <span className="font-mono text-xs font-medium text-[#8A8078] ms-3 bg-[#FAF6EE] px-2 py-0.5 rounded-md">{service.duration}</span>
                  </div>
                  <span className="font-mono text-lg font-bold text-[#C49A3C]">{service.price} {t.common.currency}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Minceur */}
          <ScrollReveal className="mb-6">
            <h3 className="font-serif text-2xl font-bold text-[#1A1412] mb-4 flex items-center gap-3">
              <span className="w-8 h-px bg-[#C49A3C]/30 inline-block"></span>
              {lang === 'pt' ? 'Estética Corporal & Minceur' : lang === 'en' ? 'Slimming & Body Contouring' : 'Soins Minceur'}
            </h3>
          </ScrollReveal>
          <div className="space-y-3">
            {SERVICES.filter((s) => s.pole === 'minceur').map((service, i) => (
              <ScrollReveal key={service.slug} delay={i * 0.04}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-[#E8E2D8] px-6 py-4.5 rounded-xl hover:border-[#C49A3C]/50 hover:shadow-sm transition-all duration-200 gap-3">
                  <div>
                    <span className="font-semibold text-[#1A1412] text-[15px]">{service.name[lang] || service.name.pt || service.name.fr}</span>
                    <span className="font-mono text-xs font-medium text-[#8A8078] ms-3 bg-[#FAF6EE] px-2 py-0.5 rounded-md">{service.duration}</span>
                  </div>
                  <span className="font-mono text-lg font-bold text-[#C49A3C]">{service.price} {t.common.currency}</span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CNAM Note ────────────────────────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-6 md:px-12">
          <ScrollReveal>
            <div className="bg-white border border-[#C49A3C]/30 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#C49A3C] to-[#E8C97A]"></div>
              
              <span className="font-mono text-xs font-bold tracking-widest text-[#9A7428] uppercase block mb-4">
                ℹ️ {lang === 'pt' ? 'Comparticipação & Seguros de Saúde' : lang === 'en' ? 'Insurance Coverage & CNAM' : 'Prise en charge CNAM'}
              </span>
              <p className="text-[#6B6058] text-[15px] leading-relaxed max-w-2xl mx-auto">
                {lang === 'pt'
                  ? 'As sessões de fisioterapia prescritas por um médico são elegíveis para comparticipação e reembolso através de recibos de seguro de saúde ou convenção CNAM. Apresente a sua prescrição médica na primeira consulta.'
                  : lang === 'en'
                  ? 'Physiotherapy sessions prescribed by a medical doctor are eligible for health insurance reimbursement and CNAM coverage. Please bring your medical prescription to your first visit.'
                  : 'Les séances de kinésithérapie réalisées sur prescription médicale peuvent être remboursées par la CNAM (Caisse Nationale d\'Assurance Maladie en Tunisie). Apportez votre ordonnance médicale lors de votre première séance.'}
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
