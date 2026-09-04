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
} from '@tabler/icons-react';
import { Review, ReviewStatus, CreateReviewInput } from '@/types/admin';
import { SERVICES } from '@/data/services';
import { Lang } from '@/lib/i18n';
import { playSoftClick } from '@/lib/sound';

interface ReviewsTabProps {
  lang: Lang;
  onAddToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export const ReviewsTab = React.memo(function ReviewsTab({ lang, onAddToast }: ReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReviewStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form state for adding review manually
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRating, setFormRating] = useState(5);
  const [formService, setFormService] = useState('reeducation-posturale');
  const [formComment, setFormComment] = useState('');
  const [formLocation, setFormLocation] = useState('Lisboa');
  const [formVerified, setFormVerified] = useState(true);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const txt = (pt: string, en: string, fr: string) =>
    lang === 'pt' ? pt : lang === 'en' ? en : fr;

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/reviews', { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar as avaliações.');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (!res.ok) throw new Error('Falha ao atualizar avaliação.');
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data.review } : r))
      );
      onAddToast?.({
        message: txt('Avaliação atualizada com sucesso!', 'Review updated!', 'Avis mis à jour !'),
        type: 'success',
      });
    } catch (err: any) {
      onAddToast?.({
        message: err.message || 'Erro ao atualizar.',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  // Delete Review
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(txt(`Tem a certeza que deseja remover a avaliação de "${name}"?`, `Are you sure you want to delete review by "${name}"?`, `Supprimer l'avis de "${name}" ?`))) {
      return;
    }
    setBusyId(id);
    playSoftClick();
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao remover avaliação.');
      setReviews((prev) => prev.filter((r) => r.id !== id));
      onAddToast?.({
        message: txt('Avaliação removida.', 'Review deleted.', 'Avis supprimé.'),
        type: 'info',
      });
    } catch (err: any) {
      onAddToast?.({
        message: err.message || 'Erro ao remover.',
        type: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  // Create Review Manually
  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) return;

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
        throw new Error(data.error || 'Falha ao guardar.');
      }

      const data = await res.json();
      if (formFeatured && data.review?.id) {
        await handleUpdate(data.review.id, { isFeatured: true });
      }

      await fetchReviews();
      setIsAddModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormComment('');
      setFormRating(5);
      onAddToast?.({
        message: txt('Nova avaliação adicionada com sucesso!', 'Review added!', 'Avis ajouté !'),
        type: 'success',
      });
    } catch (err: any) {
      onAddToast?.({
        message: err.message || 'Erro ao adicionar.',
        type: 'error',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtered reviews
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
      const matchSearch =
        !searchQuery.trim() ||
        r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [reviews, filterStatus, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: reviews.length,
      approved: reviews.filter((r) => r.status === 'APPROVED').length,
      pending: reviews.filter((r) => r.status === 'PENDING').length,
      rejected: reviews.filter((r) => r.status === 'REJECTED').length,
      avgRating:
        reviews.length > 0
          ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
          : '5.0',
    };
  }, [reviews]);

  return (
    <div className="space-y-6">
      {/* ── Top Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              {txt('Total Avaliações', 'Total Reviews', 'Total Avis')}
            </span>
            <span className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#C49A3C]/30 flex items-center justify-center text-[#C49A3C]">
              <IconMessageHeart size={15} />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#0F172A] mt-2">
            {counts.all}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              {txt('Classificação Média', 'Average Rating', 'Note Moyenne')}
            </span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <IconStar size={15} fill="currentColor" />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-2 flex items-center gap-1">
            <span>{counts.avgRating}</span>
            <span className="text-xs text-[#64748B] font-normal">/ 5.0</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              {txt('Aprovadas / No Site', 'Live on Site', 'En Ligne')}
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <IconCheck size={15} />
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-2">
            {counts.approved}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#64748B]">
              {txt('Pendentes', 'Pending', 'En Attente')}
            </span>
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${counts.pending > 0 ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
              <IconFilter size={15} />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${counts.pending > 0 ? 'text-amber-600' : 'text-[#64748B]'}`}>
            {counts.pending}
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Actions ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: txt('Todas', 'All', 'Toutes'), count: counts.all },
            { id: 'APPROVED', label: txt('Aprovadas', 'Approved', 'Approuvées'), count: counts.approved },
            { id: 'PENDING', label: txt('Pendentes', 'Pending', 'En Attente'), count: counts.pending },
            { id: 'REJECTED', label: txt('Rejeitadas', 'Rejected', 'Rejetées'), count: counts.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilterStatus(tab.id as any); playSoftClick(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-[#1A1412] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & New Review Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-64">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={txt('Pesquisar por utente ou texto...', 'Search reviews...', 'Rechercher avis...')}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/30 text-[#0F172A]"
            />
          </div>

          <button
            onClick={() => { setIsAddModalOpen(true); playSoftClick(); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C49A3C] hover:bg-[#B3892B] text-[#0F172A] font-bold text-xs transition-colors shadow-2xs whitespace-nowrap"
          >
            <IconPlus size={15} />
            <span>{txt('Adicionar', 'Add Review', 'Ajouter')}</span>
          </button>

          <button
            onClick={fetchReviews}
            disabled={loading}
            title={txt('Atualizar lista', 'Refresh list', 'Actualiser')}
            className="p-1.5 rounded-xl border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Reviews List ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <IconLoader2 size={28} className="animate-spin text-[#C49A3C] mx-auto mb-2" />
          <p className="text-xs text-[#64748B]">
            {txt('A carregar avaliações...', 'Loading reviews...', 'Chargement des avis...')}
          </p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-red-50 text-red-600 rounded-2xl border border-red-200 text-xs">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0]">
          <IconMessageHeart size={36} className="text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1E293B]">
            {txt('Nenhuma avaliação encontrada.', 'No reviews found.', 'Aucun avis trouvé.')}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {searchQuery
              ? txt('Tente pesquisar por outro termo.', 'Try another search keyword.', 'Essayez un autre mot-clé.')
              : txt('Pode adicionar avaliações manualmente usando o botão acima.', 'You can add reviews manually.', 'Vous pouvez ajouter des avis manuellement.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rev) => {
            const service = SERVICES.find((s) => s.slug === rev.serviceSlug);
            const isBusy = busyId === rev.id;

            return (
              <div
                key={rev.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs flex flex-col justify-between ${
                  rev.status === 'PENDING'
                    ? 'border-amber-300 bg-amber-50/20'
                    : rev.status === 'REJECTED'
                    ? 'border-red-200 opacity-60'
                    : rev.isFeatured
                    ? 'border-[#C49A3C]/60 ring-1 ring-[#C49A3C]/20 shadow-xs'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  {/* Top Bar: Name, Rating, Status Tag */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[#0F172A]">
                          {rev.patientName}
                        </span>
                        {rev.verified && (
                          <span
                            title="Utente Verificado"
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md"
                          >
                            <IconShieldCheck size={11} />
                            <span>Verificado</span>
                          </span>
                        )}
                        {rev.isFeatured && (
                          <span
                            title="Destaque na Homepage"
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#854D0E] bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-md"
                          >
                            <IconSparkles size={11} />
                            <span>Destaque</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#64748B]">
                        <span className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, si) => (
                            <IconStar key={si} size={13} fill="currentColor" />
                          ))}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <IconMapPin size={11} />
                          <span>{rev.location}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {rev.status === 'APPROVED' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {txt('Aprovada', 'Approved', 'Approuvé')}
                        </span>
                      ) : rev.status === 'PENDING' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                          {txt('Pendente', 'Pending', 'En Attente')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                          {txt('Rejeitada', 'Rejected', 'Rejeté')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Service tag */}
                  {service && (
                    <div className="mb-2.5">
                      <span className="text-[10px] font-semibold text-[#C49A3C] bg-[#FAF8F5] border border-[#C49A3C]/30 px-2 py-0.5 rounded-md">
                        {service.name[lang] || service.name.pt}
                      </span>
                    </div>
                  )}

                  {/* Comment Body */}
                  <p className="text-xs text-[#334155] leading-relaxed italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] mb-4">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                {/* Footer Controls & Actions */}
                <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                    <IconCalendar size={11} />
                    <span>{new Date(rev.createdAt).toLocaleDateString('pt-PT')}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Approve / Reject Toggle */}
                    {rev.status !== 'APPROVED' && (
                      <button
                        onClick={() => handleUpdate(rev.id, { status: 'APPROVED' })}
                        disabled={isBusy}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors inline-flex items-center gap-1"
                        title="Aprovar e exibir no website"
                      >
                        <IconCheck size={12} />
                        <span>Aprovar</span>
                      </button>
                    )}

                    {rev.status !== 'REJECTED' && (
                      <button
                        onClick={() => handleUpdate(rev.id, { status: 'REJECTED' })}
                        disabled={isBusy}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                        title="Ocultar do website"
                      >
                        Ocultar
                      </button>
                    )}

                    {/* Toggle Featured */}
                    <button
                      onClick={() => handleUpdate(rev.id, { isFeatured: !rev.isFeatured })}
                      disabled={isBusy}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        rev.isFeatured
                          ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-white border-[#E2E8F0] text-slate-400 hover:text-amber-500'
                      }`}
                      title={rev.isFeatured ? 'Remover destaque' : 'Destacar na Homepage'}
                    >
                      <IconStar size={14} fill={rev.isFeatured ? 'currentColor' : 'none'} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(rev.id, rev.patientName)}
                      disabled={isBusy}
                      className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      title="Eliminar permanentemente"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Review Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E2E8F0] z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
                <h3 className="font-serif font-bold text-lg text-[#0F172A]">
                  {txt('Registar Nova Avaliação', 'Add New Review', 'Nouvel Avis')}
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <IconX size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">
                      {txt('Nome do Utente *', 'Patient Name *', 'Nom du Patient *')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Maria Santos"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">
                      {txt('Localização', 'Location', 'Localisation')}
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Ex: Lisboa, Cascais"
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">
                      {txt('Tratamento / Serviço *', 'Service *', 'Soin *')}
                    </label>
                    <select
                      value={formService}
                      onChange={(e) => setFormService(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/40"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name[lang] || s.name.pt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">
                      {txt('Classificação (1 a 5)', 'Rating (1 to 5)', 'Note (1 à 5)')}
                    </label>
                    <div className="flex items-center gap-1.5 py-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          className="p-1 text-amber-500 hover:scale-110 transition-transform"
                        >
                          <IconStar
                            size={20}
                            fill={star <= formRating ? 'currentColor' : 'none'}
                          />
                        </button>
                      ))}
                      <span className="font-mono font-bold text-sm text-[#0F172A] ml-2">
                        {formRating}.0
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#334155] mb-1">
                    {txt('Testemunho / Comentário *', 'Review Comment *', 'Commentaire *')}
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formComment}
                    onChange={(e) => setFormComment(e.target.value)}
                    placeholder={txt('Descreva a experiência do utente...', 'Write patient feedback...', 'Écrivez le retour du patient...')}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F172A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C49A3C]/40"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C49A3C] accent-[#C49A3C]"
                    />
                    <span className="text-xs text-[#334155]">
                      {txt('Destacar no carrossel da homepage', 'Feature on homepage', 'Mettre en vedette')}
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#64748B] hover:bg-slate-50 font-medium"
                  >
                    {txt('Cancelar', 'Cancel', 'Annuler')}
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#1A1412] hover:bg-[#2C2420] text-[#E8C97A] font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {formSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                    <span>{txt('Publicar Avaliação', 'Publish Review', 'Publier')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
