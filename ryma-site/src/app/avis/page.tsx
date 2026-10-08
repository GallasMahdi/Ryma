'use client';
import { getLocalizedText } from '@/data/services';
import { useServices } from '@/components/ServiceCatalogProvider';

import { EditorialPageHeader } from '@/components/layout/EditorialPageHeader';
import headerStyles from '@/components/layout/EditorialPageHeader.module.css';
import { EDITORIAL_PAGES } from '@/data/editorial-pages';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { usePublicReviews } from '@/lib/usePublicReviews';

import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick, playNotificationChime } from '@/lib/sound';
import {
  IconStar,
  IconCheck,
  IconShieldCheck,
  IconThumbUp,
  IconPlus,
  IconX,
  IconCalendarEvent,
  IconSend,
  IconLoader2,
  IconAlertTriangle,
} from '@tabler/icons-react';

export default function AvisPage() {
  const SERVICES = useServices();
  const { lang, t } = useLanguage();
  const [activePole, setActivePole] = useState<'all' | 'kine' | 'minceur' | 'postpartum'>('all');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});
  const [userVoted, setUserVoted] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);

  // Alert Dialog state matching dashboard styling
  const [alertDialog, setAlertDialog] = useState<{
    title: string;
    description: string;
    confirmText?: string;
  } | null>(null);

  // Close alert dialog on Escape key
  useEffect(() => {
    if (!alertDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAlertDialog(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertDialog]);

  // Modal form states
  const [formName, setFormName] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formService, setFormService] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { reviews: reviewsList, loading: loadingReviews, error: reviewsError, refresh: fetchLiveReviews } = usePublicReviews();

  // Filtering reviews
  const filteredReviews = reviewsList.filter((rev) => {
    if (activePole === 'all') return true;
    if (activePole === 'kine') {
      return SERVICES.find(s=>s.slug===rev.serviceSlug)?.pole==='kinesitherapie';
    }
    if (activePole === 'minceur') {
      return SERVICES.find(s=>s.slug===rev.serviceSlug)?.pole==='minceur';
    }
    if (activePole === 'postpartum') {
      return SERVICES.find(s=>s.slug===rev.serviceSlug)?.careGoals?.some(g=>g==='postpartum'||g==='drainage');
    }
    return true;
  });

  const handleHelpful = (id: string) => {
    if (userVoted[id]) return;
    playSoftClick();
    setHelpfulCounts((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
    setUserVoted((prev) => ({ ...prev, [id]: true }));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingReview) return;
    if (!formName.trim()) {
      playSoftClick();
      setAlertDialog({
        title: lang === 'pt' ? 'Nome Obrigatório' : lang === 'en' ? 'Name Required' : 'Nom Requis',
        description: lang === 'pt'
          ? 'Por favor, indique o seu nome antes de submeter a sua avaliação.'
          : lang === 'en'
          ? 'Please enter your name before submitting your review.'
          : 'Veuillez saisir votre nom avant de soumettre votre avis.',
      });
      return;
    }

    if (!formComment.trim() || formComment.trim().length < 5) {
      playSoftClick();
      setAlertDialog({
        title: lang === 'pt' ? 'Atenção' : lang === 'en' ? 'Attention' : 'Attention',
        description: lang === 'pt'
          ? 'Por favor, partilhe um comentário com pelo menos 5 caracteres.'
          : lang === 'en'
          ? 'Please share a comment with at least 5 characters.'
          : 'Veuillez partager un commentaire d\'au moins 5 caractères.',
        confirmText: lang === 'pt' ? 'Entendido' : lang === 'en' ? 'Understood' : 'Compris',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: formName.trim(),
          rating: formRating,
          serviceSlug: formService,
          comment: formComment.trim(),
          location: formLocation.trim() || 'Lisboa',
        }),
      });

      if (res.ok) {
        playNotificationChime();
        setModalSuccess(true);
        await fetchLiveReviews();
        setTimeout(() => {
          setIsModalOpen(false);
          setModalSuccess(false);
          setFormName('');
          setFormComment('');
          setFormLocation('');
        }, 2200);
      } else {
        const data = await res.json().catch(() => ({}));
        playSoftClick();
        setAlertDialog({
          title: lang === 'pt' ? 'Atenção' : lang === 'en' ? 'Attention' : 'Attention',
          description: data.error || (
            lang === 'pt'
              ? 'Por favor, partilhe um comentário com pelo menos 5 caracteres.'
              : lang === 'en'
              ? 'Please share a comment with at least 5 characters.'
              : 'Veuillez partager un commentaire d\'au moins 5 caractères.'
          ),
          confirmText: lang === 'pt' ? 'Entendido' : lang === 'en' ? 'Understood' : 'Compris',
        });
      }
    } catch {
      playSoftClick();
      setAlertDialog({
        title: lang === 'pt' ? 'Erro de Ligação' : lang === 'en' ? 'Connection Error' : 'Erreur de Connexion',
        description: lang === 'pt'
          ? 'Ocorreu um erro ao enviar a sua avaliação. Por favor, verifique a sua ligação e tente novamente.'
          : lang === 'en'
          ? 'An error occurred while submitting your review. Please check your connection and try again.'
          : 'Une erreur est survenue lors de l\'envoi de votre avis. Veuillez réessayer.',
        confirmText: lang === 'pt' ? 'Fechar' : lang === 'en' ? 'Close' : 'Fermer',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const intro = EDITORIAL_PAGES.reviews[lang];
  const averageRating = reviewsList.length ? reviewsList.reduce((total, review) => total + Number(review.rating || 0), 0) / reviewsList.length : 0;
  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412]">
      <EditorialPageHeader
        eyebrow={intro.eyebrow} title={intro.title} emphasis={intro.emphasis} description={intro.description}
        aside={<><span className={headerStyles.asideLabel}>{intro.asideLabel}</span><p className={headerStyles.price}>{averageRating.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small>/ 5</small></p><div className={headerStyles.stars} aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <IconStar key={star} size={15} fill={star <= Math.round(averageRating) ? 'currentColor' : 'none'} />)}</div><p className={headerStyles.asideText}>{reviewsList.length} {intro.countLabel}</p></>}
      >
        <div className={headerStyles.actions}>
          <a href="#patient-reviews" className={headerStyles.primary}>{intro.action}<span aria-hidden="true">↓</span></a>
          <button type="button" className={headerStyles.secondary} onClick={() => { setIsModalOpen(true); playSoftClick(); }}>{intro.secondary}</button>
        </div>
        <p className={headerStyles.footnote}>{intro.note}</p>
      </EditorialPageHeader>

      {/* ── Filter Controls & Leave Review Action ────────────────── */}
      <section id="patient-reviews" className="scroll-mt-28 py-10 sm:py-16 bg-[#FAFAF8]">
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
                {lang === 'pt' ? `Todas (${reviewsList.length})` : lang === 'en' ? `All (${reviewsList.length})` : `Tous (${reviewsList.length})`}
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
          {loadingReviews ? (
            <p role="status" className="py-10 text-center text-sm text-[#6B6058]">
              {lang === 'pt' ? 'A carregar avaliações…' : lang === 'en' ? 'Loading reviews…' : 'Chargement des avis…'}
            </p>
          ) : reviewsList.length === 0 && (
            <div className="py-10 text-center text-sm text-[#6B6058] space-y-3">
              <p>{reviewsError
                ? (lang === 'pt' ? 'Não foi possível carregar as avaliações.' : lang === 'en' ? 'Reviews could not be loaded.' : 'Impossible de charger les avis.')
                : (lang === 'pt' ? 'Ainda não existem avaliações publicadas. Partilhe a sua experiência.' : lang === 'en' ? 'No reviews have been published yet. Share your experience.' : 'Aucun avis publié pour le moment. Partagez votre expérience.')}</p>
              {reviewsError && <button type="button" onClick={() => void fetchLiveReviews()} className="underline underline-offset-4">
                {lang === 'pt' ? 'Tentar novamente' : lang === 'en' ? 'Try again' : 'Réessayer'}
              </button>}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {filteredReviews.map((review, i) => {
              const service = SERVICES.find((s) => s.slug === review.serviceSlug);
              const helpful = (helpfulCounts[review.id] || 0) + 4;
              const hasVoted = userVoted[review.id];
              const authorName = review.patientName || 'Utente';
              const dateDisplay = review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-PT') : '';
              const commentText = review.comment;

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
                          <span className="font-mono text-xs font-bold text-[#9A7428]">{review.rating}.0</span>
                        </div>

                        {service && (
                          <span className="font-mono text-[10px] font-bold text-[#8A6A24] bg-[#FAF5EA] border border-[#C49A3C]/25 px-2.5 py-0.5 rounded-full truncate max-w-[170px]">
                            {getLocalizedText(service.name,lang)}
                          </span>
                        )}
                      </div>

                      {/* Comment Body */}
                      <p className="text-xs sm:text-sm text-[#4A433D] leading-relaxed mb-6 font-normal">
                        &ldquo;{commentText}&rdquo;
                      </p>
                    </div>

                    {/* Footer Author Profile & Helpful Vote */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FAF3E0] via-[#F5E9C8] to-[#E8C97A] border border-[#C49A3C]/40 flex items-center justify-center text-[#8A6A24] font-bold text-sm shadow-xs">
                          {authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-serif text-sm font-bold text-[#1A1412] flex items-center gap-1.5">
                            <span>{authorName}</span>
                            {review.verified && (
                              <span title="Paciente Verificado">
                                <IconShieldCheck size={15} className="text-[#6F8F72]" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8A8078] font-mono">
                            {review.location} {dateDisplay ? `• ${dateDisplay}` : ''}
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
                      required
                      value={formService}
                      onChange={(e) => setFormService(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8E2D8] text-xs text-[#1A1412] bg-white focus:border-[#C49A3C] outline-none"
                    >
                      <option value="">{lang==='pt'?'Escolha um tratamento':lang==='fr'?'Choisissez un soin':'Choose a treatment'}</option>{SERVICES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {getLocalizedText(s.name,lang)}
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
                    <div className="flex justify-between items-center mt-1 text-[10px] text-[#8A8078]">
                      <span>{lang === 'pt' ? 'Mínimo 5 caracteres' : lang === 'en' ? 'Minimum 5 characters' : 'Minimum 5 caractères'}</span>
                      <span className={formComment.trim().length > 0 && formComment.trim().length < 5 ? 'text-rose-600 font-semibold' : ''}>
                        {formComment.trim().length} / 5+
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-3 rounded-xl bg-[#C49A3C] hover:bg-[#E8C97A] text-[#1A1412] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {submittingReview ? <IconLoader2 size={15} className="animate-spin" /> : <IconSend size={15} />}
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
                      ? 'O seu testemunho foi recebido e será publicado após aprovação da clínica. Obrigado!'
                      : lang === 'en'
                      ? 'Your review has been received and will be published after approval by the clinic. Thank you!'
                      : 'Votre avis a été reçu et sera publié après validation par la clinique. Merci !'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Dialog matching dashboard style ── */}
      <AnimatePresence>
        {alertDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => { playSoftClick(); setAlertDialog(null); }}
            className="fixed inset-0 z-[999999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#E2E8F0] p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl text-center font-sans"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] flex items-center justify-center mx-auto shadow-xs">
                <IconAlertTriangle size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base text-[#0F172A] leading-snug">
                  {alertDialog.title}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {alertDialog.description}
                </p>
              </div>
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => { playSoftClick(); setAlertDialog(null); }}
                  className="px-6 py-2.5 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-xs transition-colors touch-target"
                >
                  {alertDialog.confirmText || (lang === 'fr' ? 'Compris' : lang === 'en' ? 'Understood' : 'Entendido')}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
