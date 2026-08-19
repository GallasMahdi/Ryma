'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { TESTIMONIALS, Testimonial } from '@/data/testimonials';
import { SERVICES } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick, playNotificationChime } from '@/lib/sound';
import {
  IconStar,
  IconQuote,
  IconCheck,
  IconShieldCheck,
  IconSparkles,
  IconThumbUp,
  IconPlus,
  IconX,
  IconCalendarEvent,
  IconSend,
  IconBrandGoogle,
  IconFilter,
} from '@tabler/icons-react';

export default function AvisPage() {
  const { lang, t } = useLanguage();
  const [activePole, setActivePole] = useState<'all' | 'kine' | 'minceur' | 'postpartum'>('all');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [userVoted, setUserVoted] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modal form states
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formService, setFormService] = useState('reeducation-posturale');
  const [formComment, setFormComment] = useState('');
  const [formLocation, setFormLocation] = useState('');

  // Filtering reviews
  const filteredReviews = TESTIMONIALS.filter((rev) => {
    if (activePole === 'all') return true;
    if (activePole === 'kine') {
      return ['reeducation-posturale', 'massage-therapeutique'].includes(rev.serviceSlug);
    }
    if (activePole === 'minceur') {
      return ['cavitation', 'cryolipolyse', 'laser-lipo'].includes(rev.serviceSlug);
    }
    if (activePole === 'postpartum') {
      return ['reeducation-post-partum', 'drainage-lymphatique', 'pressotherapie'].includes(rev.serviceSlug);
    }
    return true;
  });

  const handleHelpful = (id: string) => {
    if (userVoted[id]) return;
    playSoftClick();
    setHelpfulCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setUserVoted((prev) => ({ ...prev, [id]: true }));
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) return;
    playNotificationChime();
    setModalSuccess(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setModalSuccess(false);
      setFormName('');
      setFormComment('');
      setFormLocation('');
    }, 2200);
  };

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] select-none">
      
      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-16 overflow-hidden text-center bg-gradient-to-b from-[#FDF9F2] via-[#FAF6EE] to-[#FAFAF8]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 75% 55% at 50% 0%, rgba(245,233,200,0.55) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md border border-[#C49A3C]/35 px-4 py-1.5 rounded-full mb-4 sm:mb-5 shadow-xs">
              <IconSparkles size={14} className="text-[#C49A3C]" />
              <span className="font-mono text-[11px] tracking-[0.24em] text-[#9A7428] uppercase font-bold">
                {lang === 'pt' ? 'Experiência & Opiniões Verificadas' : lang === 'en' ? 'Verified Patient Experiences' : 'Avis & Témoignages Vérifiés'}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold text-[#1A1412] mb-3 sm:mb-4 tracking-tight">
              {lang === 'pt'
                ? 'A Confiança dos Nossos Pacientes'
                : lang === 'en'
                ? 'Clinical Excellence & Patient Trust'
                : 'Les Retours de nos Patients'}
            </h1>

            <p className="text-[#6B6058] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal mb-8">
              {lang === 'pt'
                ? 'Testemunhos autênticos de quem realizou tratamentos de fisioterapia especializada, recuperação postural e remodelação corporal estética na Digital Clínica.'
                : lang === 'en'
                ? 'Authentic feedback from patients who completed specialized physiotherapy, postural recovery, and body contouring protocols with our clinic.'
                : 'Témoignages authentiques de nos patientes et patients suite à leurs soins et programmes sur mesure au sein de notre clinique.'}
            </p>

            {/* Google Business & Overall Score Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 bg-white border border-[#C49A3C]/30 px-5 py-2.5 rounded-2xl shadow-xs w-full sm:w-auto justify-center">
                <div className="flex gap-1 text-[#C49A3C]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <IconStar key={i} size={17} fill="#C49A3C" />
                  ))}
                </div>
                <span className="font-mono text-xl font-bold text-[#C49A3C]">5.0</span>
                <span className="text-xs text-[#8A8078] font-medium border-l border-[#E8E2D8] pl-3">
                  100% {lang === 'pt' ? 'Satisfação' : lang === 'en' ? 'Satisfaction' : 'Satisfaction'}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-[#FAF5EA] border border-[#C49A3C]/40 px-4 py-2.5 rounded-2xl shadow-xs w-full sm:w-auto justify-center">
                <IconShieldCheck size={18} className="text-[#6F8F72]" />
                <span className="text-xs font-bold text-[#8A6A24]">
                  {lang === 'pt' ? 'Google Business Verificado • Lisboa' : lang === 'en' ? 'Verified Google Business • Lisbon' : 'Profil Google Vérifié • Lisbonne'}
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Clinical Satisfaction Dashboard ──────────────────────── */}
      <section className="py-8 sm:py-10 bg-white border-y border-[#C49A3C]/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                label: { pt: 'Alívio da Dor & Postura', en: 'Pain Relief & Posture', fr: 'Soulagement & Posture' },
                pct: 99,
              },
              {
                label: { pt: 'Eficácia Tratamentos Minceur', en: 'Slimming Care Efficacy', fr: 'Efficacité Minceur' },
                pct: 98,
              },
              {
                label: { pt: 'Higiene & Instalações', en: 'Hygiene & Private Suites', fr: 'Hygiène & Cadre' },
                pct: 100,
              },
              {
                label: { pt: 'Rigor & Empatia Clínica', en: 'Care & Clinical Empathy', fr: 'Rigueur & Écoute' },
                pct: 100,
              },
            ].map((metric, i) => (
              <div key={i} className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-2xl border border-[#E8E2D8]">
                <div className="flex justify-between items-center text-xs font-bold text-[#1A1412] mb-2">
                  <span className="truncate">{metric.label[lang] || metric.label.pt}</span>
                  <span className="font-mono text-[#C49A3C]">{metric.pct}%</span>
                </div>
                <div className="w-full bg-[#E8E2D8] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#9A7428] to-[#C49A3C] h-full rounded-full transition-all duration-1000"
                    style={{ width: `${metric.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filter Controls & Leave Review Action ────────────────── */}
      <section className="py-10 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 sm:mb-10">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs">
              <button
                onClick={() => { setActivePole('all'); playSoftClick(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activePole === 'all'
                    ? 'bg-[#C49A3C] text-[#1A1412] font-bold shadow-xs'
                    : 'text-[#6B6058] hover:text-[#1A1412]'
                }`}
              >
                {lang === 'pt' ? 'Todas (8)' : lang === 'en' ? 'All (8)' : 'Tous (8)'}
              </button>
              <button
                onClick={() => { setActivePole('kine'); playSoftClick(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activePole === 'kine'
                    ? 'bg-[#C49A3C] text-[#1A1412] font-bold shadow-xs'
                    : 'text-[#6B6058] hover:text-[#1A1412]'
                }`}
              >
                {lang === 'pt' ? 'Fisioterapia & RPG' : lang === 'en' ? 'Physiotherapy & GPR' : 'Kinésithérapie & RPG'}
              </button>
              <button
                onClick={() => { setActivePole('minceur'); playSoftClick(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activePole === 'minceur'
                    ? 'bg-[#C49A3C] text-[#1A1412] font-bold shadow-xs'
                    : 'text-[#6B6058] hover:text-[#1A1412]'
                }`}
              >
                {lang === 'pt' ? 'Emagrecimento & Criolipólise' : lang === 'en' ? 'Slimming Care' : 'Soins Minceur'}
              </button>
              <button
                onClick={() => { setActivePole('postpartum'); playSoftClick(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activePole === 'postpartum'
                    ? 'bg-[#C49A3C] text-[#1A1412] font-bold shadow-xs'
                    : 'text-[#6B6058] hover:text-[#1A1412]'
                }`}
              >
                {lang === 'pt' ? 'Pós-Parto & Drenagem' : lang === 'en' ? 'Postpartum & Drainage' : 'Post-Partum & Drainage'}
              </button>
            </div>

            {/* Leave Review Button */}
            <button
              onClick={() => { setIsModalOpen(true); playSoftClick(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1A1412] hover:bg-[#2C2420] text-[#E8C97A] text-xs font-bold transition-all shadow-sm border border-[#C49A3C]/30 hover:scale-[1.02]"
            >
              <IconPlus size={15} />
              <span>{lang === 'pt' ? 'Partilhar a Minha Experiência' : lang === 'en' ? 'Leave a Patient Review' : 'Laisser un Avis'}</span>
            </button>
          </div>

          {/* ── Review Cards Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredReviews.map((review, i) => {
              const service = SERVICES.find((s) => s.slug === review.serviceSlug);
              const helpful = (helpfulCounts[review.id] || 0) + 4;
              const hasVoted = userVoted[review.id];

              return (
                <ScrollReveal key={review.id} delay={i * 0.05}>
                  <div className="h-full flex flex-col justify-between bg-white border border-[#E8E2D8] hover:border-[#C49A3C]/50 rounded-3xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-all duration-300">
                    <div>
                      {/* Rating & Service Tag Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5 text-[#C49A3C]">
                            {Array.from({ length: review.rating }).map((_, si) => (
                              <IconStar key={si} size={15} fill="#C49A3C" />
                            ))}
                          </div>
                          <span className="font-mono text-xs font-bold text-[#9A7428]">5.0</span>
                        </div>

                        {service && (
                          <span className="font-mono text-[10px] font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-2.5 py-0.5 rounded-full truncate max-w-[170px]">
                            {service.name[lang] || service.name.pt}
                          </span>
                        )}
                      </div>

                      {/* Comment Body */}
                      <p className="text-xs sm:text-sm text-[#4A433D] leading-relaxed mb-6 font-normal">
                        &ldquo;{review.comment[lang] || review.comment.pt || review.comment.fr}&rdquo;
                      </p>
                    </div>

                    {/* Footer Author Profile & Helpful Vote */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FAF3E0] via-[#F5E9C8] to-[#E8C97A] border border-[#C49A3C]/40 flex items-center justify-center text-[#8A6A24] font-bold text-sm shadow-xs">
                          {review.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif text-sm font-bold text-[#1A1412] flex items-center gap-1.5">
                            <span>{review.name}</span>
                            {review.verified && (
                              <span title="Paciente Verificado">
                                <IconShieldCheck size={15} className="text-[#6F8F72]" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8A8078] font-mono">
                            {review.location} • {review.date}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleHelpful(review.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono transition-all ${
                          hasVoted
                            ? 'bg-[#EBF5EE] text-[#3D7043] font-bold'
                            : 'bg-[#FAF8F5] text-[#8A8078] hover:text-[#1A1412] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        <IconThumbUp size={12} />
                        <span>{helpful}</span>
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Interactive Patient Review Submission Modal ──────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#C49A3C]/30 z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-[#8A8078] hover:text-[#1A1412] hover:bg-[#FAF8F5]"
              >
                <IconX size={18} />
              </button>

              {!modalSuccess ? (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="text-center mb-4">
                    <span className="font-mono text-[10px] tracking-widest uppercase text-[#9A7428] font-bold block mb-1">
                      Digital Clínica • Lisboa
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1412]">
                      {lang === 'pt' ? 'Partilhar Avaliação' : lang === 'en' ? 'Submit Your Review' : 'Votre Avis'}
                    </h3>
                  </div>

                  {/* Rating Selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1.5 text-center">
                      {lang === 'pt' ? 'A Sua Classificação:' : lang === 'en' ? 'Your Rating:' : 'Votre Note :'}
                    </label>
                    <div className="flex justify-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => { setFormRating(star); playSoftClick(); }}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <IconStar
                            size={24}
                            fill={star <= formRating ? '#C49A3C' : 'transparent'}
                            className={star <= formRating ? 'text-[#C49A3C]' : 'text-[#E8E2D8]'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#1A1412] mb-1">
                        {lang === 'pt' ? 'O Seu Nome *' : lang === 'en' ? 'Your Name *' : 'Votre Nom *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ex: Beatriz Lima"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E8E2D8] text-xs text-[#1A1412] focus:border-[#C49A3C] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#1A1412] mb-1">
                        {lang === 'pt' ? 'Localização' : lang === 'en' ? 'City / Location' : 'Ville'}
                      </label>
                      <input
                        type="text"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        placeholder="Ex: Lisboa / Cascais"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E8E2D8] text-xs text-[#1A1412] focus:border-[#C49A3C] outline-none"
                      />
                    </div>
                  </div>

                  {/* Treatment Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#1A1412] mb-1">
                      {lang === 'pt' ? 'Tratamento Realizado' : lang === 'en' ? 'Treatment Received' : 'Soin Réalisé'}
                    </label>
                    <select
                      value={formService}
                      onChange={(e) => setFormService(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8E2D8] text-xs text-[#1A1412] bg-white focus:border-[#C49A3C] outline-none"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name[lang] || s.name.pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#1A1412] mb-1">
                      {lang === 'pt' ? 'O Seu Testemunho *' : lang === 'en' ? 'Your Experience *' : 'Votre Témoignage *'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      placeholder={lang === 'pt' ? 'Descreva os resultados e a sua experiência clínica...' : lang === 'en' ? 'Describe your results and clinical experience...' : 'Décrivez vos résultats...'}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8E2D8] text-xs text-[#1A1412] focus:border-[#C49A3C] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#C49A3C] hover:bg-[#E8C97A] text-[#1A1412] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <IconSend size={15} />
                    <span>{lang === 'pt' ? 'Submeter Avaliação' : lang === 'en' ? 'Submit Review' : 'Envoyer mon avis'}</span>
                  </button>
                </form>
              ) : (
                <div className="text-center py-8">
                  <div className="w-14 h-14 rounded-full bg-[#EBF5EE] text-[#3D7043] flex items-center justify-center mx-auto mb-4">
                    <IconCheck size={28} />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#1A1412] mb-2">
                    {lang === 'pt' ? 'Obrigado pela sua Avaliação!' : lang === 'en' ? 'Thank You for Your Review!' : 'Merci pour votre avis !'}
                  </h3>
                  <p className="text-xs text-[#6B6058]">
                    {lang === 'pt'
                      ? 'O seu testemunho foi registado e será publicado após verificação clínica.'
                      : lang === 'en'
                      ? 'Your feedback has been saved and will appear after clinical verification.'
                      : 'Votre avis a été enregistré avec succès.'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="py-14 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-12 text-center">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#C49A3C]/35 bg-white/95 backdrop-blur-xl p-8 sm:p-12 shadow-[0_12px_40px_rgba(196,154,60,0.12)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A]" />

              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1412] mb-3">
                {lang === 'pt' ? 'Pronta para Começar o Seu Tratamento?' : lang === 'en' ? 'Ready for Your Treatment?' : 'Prête à Vivre l\'Expérience ?'}
              </h2>

              <p className="text-xs sm:text-sm md:text-base text-[#6B6058] max-w-lg mx-auto mb-8 leading-relaxed">
                {lang === 'pt'
                  ? 'Agende a sua consulta inicial de avaliação e descubra o plano personalizado para o seu corpo e postura.'
                  : lang === 'en'
                  ? 'Book your individual assessment consultation and discover your tailored care program.'
                  : 'Réservez votre bilan individuel et découvrez votre programme sur mesure.'}
              </p>

              <Link
                href="/rendez-vous"
                onClick={playSoftClick}
                className="inline-flex items-center justify-center gap-2 bg-[#C49A3C] hover:bg-[#E8C97A] text-[#1A1412] font-bold px-8 py-3.5 rounded-full text-xs sm:text-sm shadow-[0_4px_20px_rgba(196,154,60,0.35)] hover:shadow-[0_6px_28px_rgba(196,154,60,0.55)] hover:-translate-y-0.5 transition-all"
              >
                <IconCalendarEvent size={16} />
                <span>{t.common.bookAppointment}</span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
