'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconStar,
  IconCheck,
  IconX,
  IconTrash,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconPlus,
  IconRefresh,
  IconLoader2,
  IconMessageHeart,
  IconQuote,
  IconMapPin,
  IconCalendar,
  IconFilter,
  IconLayoutGrid,
  IconList,
  IconCopy,
  IconAward,
  IconChevronDown,
  IconChevronUp,
  IconThumbUp,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { Review, ReviewStatus } from '@/types/admin';
import { SERVICES } from '@/data/services';
import { Lang } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';
import { ResponsiveModal } from './ResponsiveModal';

interface ReviewsTabProps {
  lang: Lang;
  onAddToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  setConfirmDialog?: (dlg: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null) => void;
}

type SortOption = 'recent' | 'oldest' | 'rating_desc' | 'rating_asc';
type FilterStatusOption = ReviewStatus | 'ALL' | 'FEATURED';

export const ReviewsTab = React.memo(function ReviewsTab({ lang, onAddToast, setConfirmDialog }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [filterStatus, setFilterStatus] = useState<FilterStatusOption>('ALL');
  const [filterRating, setFilterRating] = useState<number | 'ALL'>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showRatingBreakdown, setShowRatingBreakdown] = useState(false);

  // Action states
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [localConfirm, setLocalConfirm] = useState<{
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Close local confirm dialog on Escape key
  useEffect(() => {
    if (!localConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLocalConfirm(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localConfirm]);

  // Modal Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState<number | null>(null);
  const [formService, setFormService] = useState(SERVICES[0]?.slug || 'kinesitherapie-generale');
  const [formComment, setFormComment] = useState('');
  const [formLocation, setFormLocation] = useState('Lisboa');
  const [formStatus, setFormStatus] = useState<ReviewStatus>('APPROVED');
  const [formVerified, setFormVerified] = useState(true);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const txt = useCallback(
    (pt: string, en: string, fr: string) => {
      if (lang === 'fr') return fr;
      if (lang === 'en') return en;
      return pt;
    },
    [lang]
  );

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      if (!res.ok) throw new Error(txt('Falha ao carregar as avaliações.', 'Failed to load reviews.', 'Échec du chargement des avis.'));
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      setError(err.message || txt('Erro inesperado.', 'Unexpected error.', 'Erreur inattendue.'));
    } finally {
      setLoading(false);
    }
  }, [txt]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Update Status / Verified / Featured
  const handleUpdate = async (
    id: string,
    updates: { status?: ReviewStatus; verified?: boolean; isFeatured?: boolean }
  ) => {
    setBusyId(id);
    playSoftClick();
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error(txt('Falha ao atualizar avaliação.', 'Failed to update review.', 'Échec de la mise à jour de l\'avis.'));
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data.review } : r))
      );
      onAddToast?.({
        message: txt('Avaliação atualizada com sucesso!', 'Review updated successfully!', 'Avis mis à jour avec succès !'),
        type: 'success',
      });
    } catch (err: any) {
      onAddToast?.({
        message: err.message || txt('Erro ao atualizar.', 'Error updating.', 'Erreur lors de la mise à jour.'),
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  // Delete Review
  const handleDelete = (id: string, name: string) => {
    playSoftClick();
    const title = txt(
      `Tem a certeza que deseja remover permanentemente a avaliação de "${name}"?`,
      `Are you sure you want to permanently delete the review by "${name}"?`,
      `Êtes-vous sûr de vouloir supprimer définitivement l'avis de "${name}" ?`
    );
    const description = txt(
      'Esta ação não pode ser revertida e removerá este testemunho do website.',
      'This action cannot be undone and will permanently remove this review from your website.',
      'Cette action est irréversible et supprimera cet avis de votre site web.'
    );
    const confirmText = txt('Eliminar', 'Delete', 'Supprimer');
    const cancelText = txt('Cancelar', 'Cancel', 'Annuler');

    const executeDelete = async () => {
      setBusyId(id);
      playSoftClick();
      try {
        const res = await fetch(`/api/admin/reviews?id=${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(txt('Falha ao remover avaliação.', 'Failed to delete review.', 'Échec de la suppression de l\'avis.'));
        setReviews((prev) => prev.filter((r) => r.id !== id));
        onAddToast?.({
          message: txt('Avaliação removida.', 'Review deleted.', 'Avis supprimé.'),
          type: 'info',
        });
      } catch (err: any) {
        onAddToast?.({
          message: err.message || txt('Erro ao remover.', 'Error deleting.', 'Erreur de suppression.'),
          type: 'error',
        });
      } finally {
        setBusyId(null);
      }
    };

    if (setConfirmDialog) {
      setConfirmDialog({
        title,
        description,
        confirmText,
        cancelText,
        onConfirm: executeDelete,
      });
    } else {
      setLocalConfirm({
        title,
        description,
        confirmText,
        cancelText,
        onConfirm: executeDelete,
      });
    }
  };

  // Copy Testimonial Quote for Marketing / Social
  const handleCopyQuote = (rev: Review) => {
    playSoftClick();
    const formatted = `“${rev.comment}”\n— ${rev.patientName}, ${rev.rating}★ (${rev.location})`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(rev.id);
    setTimeout(() => setCopiedId(null), 2000);
    onAddToast?.({
      message: txt('Testemunho copiado para a área de transferência!', 'Testimonial copied to clipboard!', 'Témoignage copié dans le presse-papiers !'),
      type: 'success',
    });
  };

  // Create Review Manually
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) return;

    if (formComment.trim().length < 5) {
      playSoftClick();
      const title = txt('Atenção', 'Attention', 'Attention');
      const description = txt(
        'Por favor, partilhe um comentário com pelo menos 5 caracteres.',
        'Please share a comment with at least 5 characters.',
        'Veuillez partager un commentaire d\'au moins 5 caractères.'
      );
      if (setConfirmDialog) {
        setConfirmDialog({
          title,
          description,
          confirmText: txt('Entendido', 'Understood', 'Compris'),
          onConfirm: () => {},
        });
      } else {
        setLocalConfirm({
          title,
          description,
          confirmText: txt('Entendido', 'Understood', 'Compris'),
          onConfirm: () => {},
        });
      }
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: formName.trim(),
          patientEmail: formEmail.trim() || null,
          rating: formRating,
          serviceSlug: formService,
          comment: formComment.trim(),
          location: formLocation.trim() || 'Lisboa',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || txt('Falha ao guardar.', 'Failed to save.', 'Échec de l\'enregistrement.');
        if (setConfirmDialog) {
          setConfirmDialog({
            title: txt('Atenção', 'Attention', 'Attention'),
            description: errMsg,
            confirmText: txt('Entendido', 'Understood', 'Compris'),
            onConfirm: () => {},
          });
          return;
        } else {
          throw new Error(errMsg);
        }
      }

      const data = await res.json();
      if (data.review?.id) {
        // Apply admin-specific initial overrides (status, verified, featured)
        await fetch('/api/admin/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.review.id,
            status: formStatus,
            verified: formVerified,
            isFeatured: formFeatured,
          }),
        });
      }

      await fetchReviews();
      setIsAddModalOpen(false);
      // Reset form
      setFormName('');
      setFormEmail('');
      setFormComment('');
      setFormRating(5);
      setFormStatus('APPROVED');
      setFormVerified(true);
      setFormFeatured(false);

      onAddToast?.({
        message: txt('Nova apreciação registada e publicada com sucesso!', 'New review recorded successfully!', 'Nouvel avis enregistré et publié avec succès !'),
        type: 'success',
      });
    } catch (err: any) {
      onAddToast?.({
        message: err.message || txt('Erro ao adicionar.', 'Error adding review.', 'Erreur lors de l\'ajout.'),
        type: 'error',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Metrics and Breakdown
  const metrics = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.status === 'APPROVED').length;
    const pending = reviews.filter((r) => r.status === 'PENDING').length;
    const rejected = reviews.filter((r) => r.status === 'REJECTED').length;
    const featured = reviews.filter((r) => r.isFeatured).length;

    const avgRating =
      total > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1)
        : '5.0';

    const highRatings = reviews.filter((r) => r.rating >= 4).length;
    const satisfactionRate = total > 0 ? Math.round((highRatings / total) * 100) : 100;

    // Distribution by star count
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const clamped = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      starCounts[clamped] = (starCounts[clamped] || 0) + 1;
    });

    return {
      total,
      approved,
      pending,
      rejected,
      featured,
      avgRating,
      satisfactionRate,
      starCounts,
    };
  }, [reviews]);

  // Filtered and Sorted reviews
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        // Status & Featured tab filter
        if (filterStatus === 'FEATURED') {
          if (!r.isFeatured) return false;
        } else if (filterStatus !== 'ALL') {
          if (r.status !== filterStatus) return false;
        }

        // Rating filter
        if (filterRating !== 'ALL') {
          if (filterRating === 3) {
            if (r.rating > 3) return false; // ≤ 3 stars
          } else if (r.rating !== filterRating) {
            return false;
          }
        }

        // Service filter
        if (filterService !== 'ALL' && r.serviceSlug !== filterService) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const serviceObj = SERVICES.find((s) => s.slug === r.serviceSlug);
          const serviceName = serviceObj ? (serviceObj.name[lang] || serviceObj.name.pt || '').toLowerCase() : '';
          const match =
            r.patientName.toLowerCase().includes(q) ||
            r.comment.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q) ||
            serviceName.includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'rating_desc') {
          return b.rating - a.rating;
        }
        if (sortBy === 'rating_asc') {
          return a.rating - b.rating;
        }
        return 0;
      });
  }, [reviews, filterStatus, filterRating, filterService, searchQuery, sortBy, lang]);

  // Dynamic label for the star rating picker
  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5:
        return txt('Excelente • Experiência Excecional', 'Excellent • Exceptional Experience', 'Excellent • Expérience Exceptionnelle');
      case 4:
        return txt('Muito Bom • Elevada Satisfação', 'Very Good • High Satisfaction', 'Très Bien • Grande Satisfaction');
      case 3:
        return txt('Bom • Atendimento Positivo', 'Good • Positive Care', 'Bien • Soin Positif');
      case 2:
        return txt('Razoável • Com Observações', 'Fair • With Remarks', 'Passable • Avec Remarques');
      case 1:
        return txt('Insatisfatório • Requer Atenção', 'Poor • Requires Attention', 'Insatisfaisant • Requiert Attention');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. Luxury Header Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A1412] via-[#241C18] to-[#120D0B] p-6 sm:p-7 text-white shadow-xl border border-[#C49A3C]/20">
        {/* Subtle Luxury Gold Background Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C49A3C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-4 right-8 opacity-5 text-white pointer-events-none">
          <IconQuote size={160} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C49A3C]/15 border border-[#C49A3C]/30 text-[#E8C97A] text-[11px] font-semibold tracking-wide uppercase">
              <IconAward size={13} className="text-[#E8C97A]" />
              <span>{txt('Gestão de Reputação & Excelência', 'Reputation & Excellence Management', 'Gestion de Réputation & Excellence')}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight leading-tight">
              {txt('Apreciações & Testemunhos Clínicos', 'Clinical Reviews & Patient Voice', 'Avis & Témoignages Cliniques')}
            </h2>

            <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
              {txt(
                'Curadoria de satisfação dos utentes, moderação de feedback em tempo real e gestão do carrossel em destaque na homepage.',
                'Curate patient satisfaction, moderate live clinical feedback and spotlight featured testimonials on the homepage.',
                'Gérez la satisfaction des patients, modérez les retours cliniques et mettez en avant les témoignages sur la page d’accueil.'
              )}
            </p>
          </div>

          {/* Right Action & Trust Banner */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Trust Pill */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-inner">
              <div className="text-center pr-3 border-r border-white/15">
                <div className="text-lg sm:text-xl font-bold font-mono text-[#E8C97A] leading-none">
                  {metrics.avgRating}
                </div>
                <div className="text-[10px] text-stone-400 font-medium mt-0.5">
                  / 5.0
                </div>
              </div>
              <div>
                <div className="flex items-center gap-0.5 text-[#F59E0B]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconStar key={i} size={13} fill="currentColor" />
                  ))}
                </div>
                <div className="text-[10px] text-stone-300 font-medium mt-0.5 flex items-center gap-1">
                  <IconThumbUp size={11} className="text-[#E8C97A]" />
                  <span>{metrics.satisfactionRate}% {txt('Recomendação', 'Satisfaction', 'Satisfaction')}</span>
                </div>
              </div>
            </div>

            {/* Add Review Button */}
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(true);
                playSoftClick();
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#C49A3C] to-[#D4AF37] hover:from-[#B3892B] hover:to-[#C49A3C] active:scale-[0.98] text-[#1A1412] font-bold text-xs tracking-wide transition-all shadow-md hover:shadow-lg flex items-center gap-2 touch-target"
            >
              <IconPlus size={16} strokeWidth={2.5} />
              <span>{txt('Registar Avaliação', 'New Review', 'Ajouter un Avis')}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchReviews}
              disabled={loading}
              title={txt('Atualizar lista', 'Refresh reviews', 'Actualiser les avis')}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-stone-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Sleek Minimalist Luxury Metric Cards ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Overall Rating */}
        <div
          onClick={() => {
            setShowRatingBreakdown((prev) => !prev);
            playSoftClick();
          }}
          className="group cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] hover:border-[#C49A3C]/50 transition-all shadow-2xs hover:shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              {txt('Classificação Global', 'Overall Rating', 'Note Globale')}
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-105">
              <IconStar size={16} fill="currentColor" />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#0F172A]">
              {metrics.avgRating}
            </span>
            <span className="text-xs text-[#94A3B8] font-medium">/ 5.0</span>
            <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {metrics.satisfactionRate}% {txt('Positivas', 'Positive', 'Positifs')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B]">
            <span>{metrics.total} {txt('avaliações totais', 'total reviews', 'avis totaux')}</span>
            <span className="text-[#C49A3C] font-semibold flex items-center gap-0.5">
              {showRatingBreakdown ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
              <span>{txt('Distribuição', 'Breakdown', 'Détails')}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Live on Site */}
        <div
          onClick={() => {
            setFilterStatus('APPROVED');
            playSoftClick();
          }}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] hover:border-emerald-300 transition-all shadow-2xs hover:shadow-xs relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              {txt('Publicadas no Website', 'Live on Website', 'En Ligne')}
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
              <IconShieldCheck size={16} />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700">
              {metrics.approved}
            </span>
            <span className="text-xs text-[#64748B]">
              ({metrics.total > 0 ? Math.round((metrics.approved / metrics.total) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span>{txt('Visíveis para visitantes', 'Visible to public', 'Visibles au public')}</span>
          </div>
        </div>

        {/* Card 3: Pending Moderation */}
        <div
          onClick={() => {
            setFilterStatus('PENDING');
            playSoftClick();
          }}
          className={`cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-2xs hover:shadow-xs relative ${
            metrics.pending > 0
              ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
              : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              {txt('Aguardam Moderação', 'Pending Review', 'En Attente')}
            </span>
            <span
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                metrics.pending > 0
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                  : 'bg-slate-50 text-[#94A3B8] border border-[#E2E8F0]'
              }`}
            >
              <IconFilter size={16} />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-bold font-mono ${
                metrics.pending > 0 ? 'text-amber-600' : 'text-[#64748B]'
              }`}
            >
              {metrics.pending}
            </span>
            {metrics.pending > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                {txt('Ação necessária', 'Action required', 'Action requise')}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-[#64748B]">
            {metrics.pending > 0
              ? txt('Requer aprovação prévia', 'Requires admin review', 'Modération requise')
              : txt('Todas as análises em dia ✓', 'All caught up ✓', 'Tout est à jour ✓')}
          </div>
        </div>

        {/* Card 4: Featured Testimonials */}
        <div
          onClick={() => {
            setFilterStatus('FEATURED');
            playSoftClick();
          }}
          className="cursor-pointer bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] hover:border-[#C49A3C]/60 transition-all shadow-2xs hover:shadow-xs relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">
              {txt('Destaque Homepage', 'Featured Testimonials', 'En Vedette')}
            </span>
            <span className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#C49A3C]/30 flex items-center justify-center text-[#C49A3C]">
              <IconSparkles size={16} />
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#0F172A]">
              {metrics.featured}
            </span>
            <span className="text-[10px] font-bold text-[#854D0E] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {txt('Carrossel Ativo', 'Active Carousel', 'Carrousel Actif')}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#64748B]">
            {txt('Apresentadas na página inicial', 'Displayed on landing page', 'Sur la page d’accueil')}
          </div>
        </div>
      </div>

      {/* ── 3. Interactive Star Distribution Breakdown (Expandable Drawer) ── */}
      <AnimatePresence>
        {showRatingBreakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0F172A]">
                    {txt('Distribuição das Avaliações por Estrelas', 'Rating Distribution Breakdown', 'Détail des Évaluations par Étoiles')}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    ({txt('Clique numa barra para filtrar', 'Click a row to filter', 'Cliquez pour filtrer')})
                  </span>
                </div>
                {filterRating !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFilterRating('ALL')}
                    className="text-[11px] font-semibold text-[#C49A3C] hover:underline"
                  >
                    {txt('Limpar filtro de estrelas', 'Clear star filter', 'Effacer le filtre')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-1">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = metrics.starCounts[star] || 0;
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                  const isSelected = filterRating === star;

                  return (
                    <div
                      key={star}
                      onClick={() => {
                        setFilterRating((prev) => (prev === star ? 'ALL' : star));
                        playSoftClick();
                      }}
                      className={`cursor-pointer p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#1A1412] text-white border-[#1A1412] shadow-xs'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] text-[#334155]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
                        <span className="flex items-center gap-1 text-amber-500">
                          <span>{star}</span>
                          <IconStar size={13} fill="currentColor" />
                        </span>
                        <span className={`font-mono ${isSelected ? 'text-white' : 'text-[#0F172A]'}`}>
                          {count}
                        </span>
                      </div>

                      <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-[#C49A3C] h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-1 text-[10px] text-right font-mono opacity-75">
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. Advanced Minimalist Filter & Controls Bar ──────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Tabs Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl overflow-x-auto select-none shrink-0">
            {[
              { id: 'ALL', label: txt('Todas', 'All', 'Toutes'), count: metrics.total },
              { id: 'APPROVED', label: txt('Publicadas', 'Live', 'En Ligne'), count: metrics.approved },
              { id: 'PENDING', label: txt('Pendentes', 'Pending', 'En Attente'), count: metrics.pending },
              { id: 'FEATURED', label: txt('Destaques', 'Featured', 'Vedettes'), count: metrics.featured },
              { id: 'REJECTED', label: txt('Ocultadas', 'Hidden', 'Masquées'), count: metrics.rejected },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterStatus(tab.id as FilterStatusOption);
                    playSoftClick();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.id === 'PENDING' && tab.count > 0
                        ? 'bg-amber-200 text-amber-900 font-bold'
                        : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={txt(
                'Pesquisar por utente, texto, serviço ou localização...',
                'Search reviews by patient, quote, service or city...',
                'Rechercher par patient, texte, soin ou ville...'
              )}
              className="w-full pl-9 pr-8 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/30 text-[#0F172A] placeholder:text-[#94A3B8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <IconX size={14} />
              </button>
            )}
          </div>

          {/* Secondary Controls: View mode, sort */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:border-[#0F172A]"
            >
              <option value="recent">{txt('Mais Recentes', 'Most Recent', 'Plus Récents')}</option>
              <option value="oldest">{txt('Mais Antigas', 'Oldest', 'Plus Anciens')}</option>
              <option value="rating_desc">{txt('Melhor Nota (5★ → 1★)', 'Highest Rating', 'Meilleure Note')}</option>
              <option value="rating_asc">{txt('Menor Nota (1★ → 5★)', 'Lowest Rating', 'Note la Plus Basse')}</option>
            </select>

            {/* Layout Toggle (Grid vs Table) */}
            <div className="flex items-center p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title={txt('Vista em grelha de cartões', 'Grid view', 'Vue grille')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#0F172A] shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <IconLayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title={txt('Vista compacta em lista', 'Table view', 'Vue liste')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0F172A] shadow-2xs font-bold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <IconList size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Row: Service and Star filter quick chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-[#64748B]">
              {txt('Filtrar Tratamento:', 'Filter Treatment:', 'Filtrer Soin :')}
            </span>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="text-xs bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-[#0F172A]"
            >
              <option value="ALL">{txt('Todos os Tratamentos', 'All Treatments', 'Tous les Soins')}</option>
              {SERVICES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name[lang] || s.name.pt || s.name.fr}
                </option>
              ))}
            </select>

            {/* Star Rating Quick Filter */}
            <span className="text-[11px] font-semibold text-[#64748B] ml-2">
              {txt('Estrelas:', 'Stars:', 'Étoiles :')}
            </span>
            <div className="flex items-center gap-1">
              {[
                { val: 'ALL', label: txt('Todas', 'All', 'Toutes') },
                { val: 5, label: '5 ★' },
                { val: 4, label: '4 ★' },
                { val: 3, label: '≤ 3 ★' },
              ].map((pill) => (
                <button
                  key={String(pill.val)}
                  type="button"
                  onClick={() => {
                    setFilterRating(pill.val as any);
                    playSoftClick();
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                    filterRating === pill.val
                      ? 'bg-[#C49A3C] text-white font-bold'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[#64748B]">
            {txt('A apresentar', 'Showing', 'Affichage de')}{' '}
            <strong className="text-[#0F172A] font-mono">{filteredReviews.length}</strong>{' '}
            {txt('de', 'of', 'sur')}{' '}
            <span className="font-mono">{reviews.length}</span> {txt('avaliações', 'reviews', 'avis')}
          </div>
        </div>
      </div>

      {/* ── 5. Main Content: Reviews Grid / Table ─────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="relative w-12 h-12 mx-auto">
            <div className="w-12 h-12 rounded-full border-2 border-[#E2E8F0] border-t-[#C49A3C] animate-spin" />
            <IconMessageHeart size={20} className="absolute inset-0 m-auto text-[#C49A3C]" />
          </div>
          <p className="text-xs font-semibold text-[#64748B]">
            {txt('A carregar base de dados de avaliações...', 'Loading reviews database...', 'Chargement des avis cliniques...')}
          </p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-50 text-rose-800 rounded-3xl border border-rose-200 text-xs font-medium">
          {error}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF8F5] border border-[#C49A3C]/20 flex items-center justify-center text-[#C49A3C] mx-auto">
            <IconMessageHeart size={30} />
          </div>
          <h3 className="text-sm font-serif font-bold text-[#0F172A]">
            {txt('Nenhuma avaliação encontrada', 'No reviews found', 'Aucun avis trouvé')}
          </h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
            {searchQuery || filterRating !== 'ALL' || filterStatus !== 'ALL' || filterService !== 'ALL'
              ? txt(
                  'Nenhum testemunho corresponde aos filtros ativos. Tente redefinir os critérios de pesquisa.',
                  'No reviews match your selected filters. Try clearing your search parameters.',
                  'Aucun avis ne correspond à vos filtres. Essayez de réinitialiser la recherche.'
                )
              : txt(
                  'Ainda não existem testemunhos registados. Registe a primeira avaliação de um utente com o botão acima.',
                  'No patient reviews recorded yet. Add your first clinical review using the button above.',
                  'Aucun avis enregistré pour l’instant. Ajoutez un premier retour patient avec le bouton ci-dessus.'
                )}
          </p>
          {(searchQuery || filterRating !== 'ALL' || filterStatus !== 'ALL' || filterService !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterRating('ALL');
                setFilterStatus('ALL');
                setFilterService('ALL');
              }}
              className="text-xs font-bold text-[#C49A3C] hover:underline pt-1"
            >
              {txt('Limpar todos os filtros', 'Reset all filters', 'Réinitialiser les filtres')}
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* ── Grid View: Luxury Testimonial Cards ────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => {
            const service = SERVICES.find((s) => s.slug === rev.serviceSlug);
            const isBusy = busyId === rev.id;
            const isCopied = copiedId === rev.id;

            // Generate monogram initials
            const initials = rev.patientName
              .split(' ')
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={rev.id}
                className={`group bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between relative overflow-hidden ${
                  rev.status === 'PENDING'
                    ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-200/50'
                    : rev.status === 'REJECTED'
                    ? 'border-red-200 bg-slate-50/50 opacity-60'
                    : rev.isFeatured
                    ? 'border-[#C49A3C]/50 ring-1 ring-[#C49A3C]/20 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-[#C49A3C]/40'
                }`}
              >
                {/* Decorative Background Quote Watermark */}
                <IconQuote
                  size={90}
                  className="absolute -top-3 -right-3 text-[#F5EEDB] pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity"
                />

                <div className="relative z-10 space-y-3.5">
                  {/* Top Bar: Avatar, Patient, Badges, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Luxury Monogram Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1A1412] to-[#2E231D] text-[#E8C97A] font-serif font-bold text-xs flex items-center justify-center border border-[#C49A3C]/30 shadow-2xs shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-serif font-bold text-sm text-[#0F172A] tracking-tight truncate">
                            {rev.patientName}
                          </h4>
                          {rev.verified && (
                            <span
                              title={txt('Utente Verificado pela Clínica', 'Verified Clinic Patient', 'Patient Vérifié')}
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0"
                            >
                              <IconShieldCheck size={11} className="text-emerald-600" />
                              <span>{txt('Verificado', 'Verified', 'Vérifié')}</span>
                            </span>
                          )}
                          {rev.isFeatured && (
                            <span
                              title={txt('Destaque na Homepage', 'Featured on Homepage', 'En Vedette')}
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#854D0E] bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md shrink-0"
                            >
                              <IconSparkles size={11} className="text-[#C49A3C]" />
                              <span>{txt('Destaque', 'Featured', 'Vedette')}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                          <span className="flex items-center gap-1">
                            <IconMapPin size={11} className="text-[#94A3B8]" />
                            <span>{rev.location}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <IconCalendar size={11} className="text-[#94A3B8]" />
                            <span>{new Date(rev.createdAt).toLocaleDateString('pt-PT')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {rev.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <IconCheck size={11} strokeWidth={2.5} />
                          <span>{txt('Publicada', 'Live', 'Publié')}</span>
                        </span>
                      ) : rev.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <span>{txt('Pendente', 'Pending', 'En Attente')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                          <IconX size={11} strokeWidth={2.5} />
                          <span>{txt('Ocultada', 'Hidden', 'Masqué')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating & Service Chip */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <IconStar
                            key={i}
                            size={14}
                            fill={i < rev.rating ? 'currentColor' : 'none'}
                            className={i < rev.rating ? 'text-amber-500' : 'text-slate-200'}
                          />
                        ))}
                      </div>
                      <span className="font-mono font-bold text-xs text-[#0F172A]">
                        {rev.rating}.0
                      </span>
                    </div>

                    {service && (
                      <span className="text-[10px] font-semibold text-[#8C6B1F] bg-[#FAF8F5] border border-[#E8DCC4] px-2 py-0.5 rounded-lg truncate max-w-[200px]">
                        {service.name[lang] || service.name.pt}
                      </span>
                    )}
                  </div>

                  {/* Testimonial Quote */}
                  <div className="relative pl-3.5 border-l-2 border-[#C49A3C]/40 py-1 bg-[#FDFBF7]/60 rounded-r-xl">
                    <p className="text-xs text-[#334155] leading-relaxed italic font-normal">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Footer Controls & Moderation Actions */}
                <div className="pt-3 mt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                  {/* Verified toggle indicator */}
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleUpdate(rev.id, { verified: !rev.verified })}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                      rev.verified
                        ? 'text-emerald-700 hover:text-emerald-800'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title={txt(
                      rev.verified ? 'Clique para remover verificação' : 'Clique para verificar utente',
                      rev.verified ? 'Click to unverify patient' : 'Click to verify patient',
                      rev.verified ? 'Cliquer pour retirer la vérification' : 'Cliquer pour vérifier le patient'
                    )}
                  >
                    <IconShieldCheck size={14} />
                    <span>{rev.verified ? txt('Verificado', 'Verified', 'Vérifié') : txt('Não verificado', 'Unverified', 'Non vérifié')}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Approve button */}
                    {rev.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdate(rev.id, { status: 'APPROVED' })}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-2xs inline-flex items-center gap-1"
                        title={txt('Aprovar e publicar no website', 'Approve and publish', 'Approuver et publier')}
                      >
                        <IconCheck size={12} strokeWidth={2.5} />
                        <span>{txt('Publicar', 'Publish', 'Publier')}</span>
                      </button>
                    )}

                    {/* Reject / Hide button */}
                    {rev.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdate(rev.id, { status: 'REJECTED' })}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        title={txt('Ocultar do website', 'Hide from site', 'Masquer')}
                      >
                        {txt('Ocultar', 'Hide', 'Masquer')}
                      </button>
                    )}

                    {/* Toggle Featured Star */}
                    <button
                      type="button"
                      onClick={() => handleUpdate(rev.id, { isFeatured: !rev.isFeatured })}
                      disabled={isBusy}
                      className={`p-1.5 rounded-xl border transition-all ${
                        rev.isFeatured
                          ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-2xs'
                          : 'bg-white border-[#E2E8F0] text-slate-400 hover:text-amber-500 hover:border-amber-300'
                      }`}
                      title={
                        rev.isFeatured
                          ? txt('Remover da homepage', 'Remove from homepage', 'Retirer de la page d’accueil')
                          : txt('Destacar na homepage', 'Feature on homepage', 'Mettre en vedette')
                      }
                    >
                      <IconStar size={14} fill={rev.isFeatured ? 'currentColor' : 'none'} />
                    </button>

                    {/* Copy Quote Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyQuote(rev)}
                      className="p-1.5 rounded-xl border border-[#E2E8F0] text-slate-500 hover:text-[#0F172A] hover:bg-slate-50 transition-colors"
                      title={txt('Copiar citação para partilha', 'Copy quote', 'Copier la citation')}
                    >
                      {isCopied ? <IconCheck size={14} className="text-emerald-600" /> : <IconCopy size={14} />}
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(rev.id, rev.patientName)}
                      disabled={isBusy}
                      className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors"
                      title={txt('Eliminar avaliação permanentemente', 'Delete review', 'Supprimer')}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View: Compact Moderation Layout ──────────────────────── */
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">{txt('Utente & Local', 'Patient & Location', 'Patient & Lieu')}</th>
                  <th className="py-3 px-4">{txt('Tratamento', 'Treatment', 'Soin')}</th>
                  <th className="py-3 px-4">{txt('Nota', 'Rating', 'Note')}</th>
                  <th className="py-3 px-4">{txt('Testemunho', 'Quote', 'Témoignage')}</th>
                  <th className="py-3 px-4">{txt('Estado', 'Status', 'Statut')}</th>
                  <th className="py-3 px-4 text-center">{txt('Destaque', 'Featured', 'Vedette')}</th>
                  <th className="py-3 px-4 text-right">{txt('Ações', 'Actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredReviews.map((rev) => {
                  const service = SERVICES.find((s) => s.slug === rev.serviceSlug);
                  const isBusy = busyId === rev.id;

                  return (
                    <tr key={rev.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-serif font-bold text-xs text-[#0F172A]">{rev.patientName}</div>
                        <div className="text-[11px] text-[#94A3B8]">{rev.location}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#64748B]">
                        {service ? service.name[lang] || service.name.pt : rev.serviceSlug}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-amber-500 font-bold font-mono">
                          <IconStar size={13} fill="currentColor" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-[11px] text-[#334155] italic truncate" title={rev.comment}>
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rev.status === 'APPROVED' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {txt('Publicada', 'Live', 'Publié')}
                          </span>
                        ) : rev.status === 'PENDING' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {txt('Pendente', 'Pending', 'En Attente')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            {txt('Ocultada', 'Hidden', 'Masqué')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleUpdate(rev.id, { isFeatured: !rev.isFeatured })}
                          disabled={isBusy}
                          className={`p-1 rounded-lg transition-colors ${
                            rev.isFeatured ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'
                          }`}
                        >
                          <IconStar size={15} fill={rev.isFeatured ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {rev.status !== 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdate(rev.id, { status: 'APPROVED' })}
                              disabled={isBusy}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700"
                            >
                              {txt('Aprovar', 'Approve', 'Approuver')}
                            </button>
                          )}
                          {rev.status !== 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdate(rev.id, { status: 'REJECTED' })}
                              disabled={isBusy}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] hover:bg-slate-200"
                            >
                              {txt('Ocultar', 'Hide', 'Masquer')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(rev.id, rev.patientName)}
                            disabled={isBusy}
                            className="p-1 rounded-md text-rose-500 hover:bg-rose-50"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. Add Review Modal (using unified ResponsiveModal) ───────────── */}
      <ResponsiveModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={txt('Registar Nova Avaliação Clínica', 'Add New Clinical Review', 'Enregistrer un Nouvel Avis')}
        subtitle={txt(
          'Adicione feedback autêntico de utentes com curadoria de classificação e estado',
          'Add genuine patient review with tailored rating and homepage placement',
          'Ajoutez un témoignage patient avec note et statut de publication'
        )}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateReview} className="space-y-4 text-xs font-sans">
          {/* Interactive Star Rating Picker */}
          <div className="bg-[#FAF8F5] border border-[#E8DCC4] rounded-2xl p-4 text-center space-y-2">
            <label className="block font-bold text-xs text-[#1A1412] uppercase tracking-wider">
              {txt('Classificação do Utente', 'Patient Rating', 'Note du Patient')}
            </label>

            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const currentRating = formHoverRating ?? formRating;
                const isFilled = star <= currentRating;

                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setFormHoverRating(star)}
                    onMouseLeave={() => setFormHoverRating(null)}
                    onClick={() => {
                      setFormRating(star);
                      playSoftClick();
                    }}
                    className="p-1.5 transition-transform hover:scale-125 active:scale-95 touch-target"
                  >
                    <IconStar
                      size={28}
                      fill={isFilled ? 'currentColor' : 'none'}
                      className={isFilled ? 'text-amber-500' : 'text-slate-300'}
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-semibold text-[#8C6B1F] min-h-[18px]">
              {getRatingLabel(formHoverRating ?? formRating)}
            </p>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#334155] mb-1">
                {txt('Nome do Utente *', 'Patient Name *', 'Nom du Patient *')}
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Ana Rodrigues"
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#334155] mb-1">
                {txt('Localização', 'Location', 'Localisation')}
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ex: Lisboa, Oeiras, Cascais"
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          {/* Service Selector & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#334155] mb-1">
                {txt('Tratamento / Especialidade *', 'Service *', 'Soin *')}
              </label>
              <select
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              >
                {SERVICES.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name[lang] || s.name.pt || s.name.fr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#334155] mb-1">
                {txt('Email do Utente (Opcional)', 'Email (Optional)', 'Email (Optionnel)')}
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="utente@exemplo.pt"
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>
          </div>

          {/* Testimonial Quote Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#334155]">
                {txt('Testemunho / Depoimento do Utente *', 'Review Feedback *', 'Commentaire *')}
              </label>
              <span className="text-[10px] text-[#94A3B8]">
                {formComment.length} / 1000
              </span>
            </div>
            <textarea
              rows={4}
              required
              maxLength={1000}
              value={formComment}
              onChange={(e) => setFormComment(e.target.value)}
              placeholder={txt(
                'Descreva a experiência do utente, recuperação clínica ou elogio ao atendimento...',
                'Write patient feedback or testimonial quote...',
                'Décrivez le retour d’expérience du patient...'
              )}
              className="w-full px-3 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#0F172A] leading-relaxed"
            />
          </div>

          {/* Publication Toggles */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 space-y-2.5">
            {/* Direct Approval */}
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div>
                <span className="font-bold text-[#0F172A] block">
                  {txt('Publicar Imediatamente no Website', 'Publish Live on Website', 'Publier Immédiatement')}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  {txt('Ficará visível de imediato para todos os visitantes', 'Visible right away to prospective patients', 'Visible immédiatement aux visiteurs')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formStatus === 'APPROVED'}
                onChange={(e) => setFormStatus(e.target.checked ? 'APPROVED' : 'PENDING')}
                className="w-4 h-4 rounded text-[#0F172A] accent-[#0F172A]"
              />
            </label>

            {/* Verified Patient Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none pt-2 border-t border-[#E2E8F0]">
              <div>
                <span className="font-bold text-[#0F172A] block">
                  {txt('Marcar como Utente Verificado', 'Mark as Verified Patient', 'Marquer Patient Vérifié')}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  {txt('Adiciona selo de autenticidade clínica ao testemunho', 'Adds green clinic verification shield', 'Ajoute un badge d’authenticité')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formVerified}
                onChange={(e) => setFormVerified(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
            </label>

            {/* Homepage Featured Toggle */}
            <label className="flex items-center justify-between cursor-pointer select-none pt-2 border-t border-[#E2E8F0]">
              <div>
                <span className="font-bold text-[#0F172A] block">
                  {txt('Destacar no Carrossel da Homepage', 'Spotlight on Homepage', 'Mettre en Vedette sur l’Accueil')}
                </span>
                <span className="text-[11px] text-[#64748B]">
                  {txt('Exibição prioritária nos testemunhos da página principal', 'Featured in the hero feedback carousel', 'Mise en avant prioritaire')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={formFeatured}
                onChange={(e) => setFormFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-[#C49A3C] accent-[#C49A3C]"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              {txt('Cancelar', 'Cancel', 'Annuler')}
            </button>

            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1A1412] to-[#2B211B] hover:from-[#2B211B] hover:to-[#1A1412] text-[#E8C97A] font-bold text-xs border border-[#C49A3C]/30 shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {formSubmitting ? (
                <>
                  <IconLoader2 size={15} className="animate-spin text-[#E8C97A]" />
                  <span>{txt('A gravar...', 'Saving...', 'Enregistrement...')}</span>
                </>
              ) : (
                <>
                  <IconSparkles size={15} className="text-[#E8C97A]" />
                  <span>{txt('Gravar & Publicar Avaliação', 'Save & Publish Review', 'Enregistrer & Publier')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* ── 7. Delete Confirmation Dialog Fallback ───────────────────────── */}
      <AnimatePresence>
        {!setConfirmDialog && localConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setLocalConfirm(null)}
            className="fixed inset-0 z-[999998] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
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
                  {localConfirm.title}
                </h3>
                {localConfirm.description && (
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {localConfirm.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setLocalConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors touch-target"
                >
                  {localConfirm.cancelText || txt('Cancelar', 'Cancel', 'Annuler')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = localConfirm.onConfirm;
                    setLocalConfirm(null);
                    action();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-semibold shadow-xs transition-colors touch-target"
                >
                  {localConfirm.confirmText || txt('Eliminar', 'Delete', 'Supprimer')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
