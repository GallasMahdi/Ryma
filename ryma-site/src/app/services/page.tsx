'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { SERVICES, ServicePole } from '@/data/services';
import { ServiceCard } from '@/components/ui/ServiceCard';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { playSoftClick } from '@/lib/sound';
import {
  IconStethoscope,
  IconFlame,
  IconSparkles,
  IconSearch,
  IconReceipt2,
  IconCalendarEvent,
  IconShieldCheck,
} from '@tabler/icons-react';

export default function ServicesPage() {
  const { lang, t } = useLanguage();
  const [activePole, setActivePole] = useState<'all' | 'kinesitherapie' | 'minceur'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGoal, setActiveGoal] = useState<string>('all');

  const filteredServices = SERVICES.filter((s) => {
    const matchesPole = activePole === 'all' || s.pole === activePole;
    if (!matchesPole) return false;

    // Search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const name = (s.name[lang] || s.name.pt || s.name.en || s.name.fr || '').toLowerCase();
      const desc = (s.shortDesc[lang] || s.shortDesc.pt || s.shortDesc.en || s.shortDesc.fr || '').toLowerCase();
      if (!name.includes(query) && !desc.includes(query)) return false;
    }

    // Goal tag filter
    if (activeGoal === 'posture') {
      return ['reeducation-posturale', 'massage-therapeutique', 'electrostimulation'].includes(s.slug);
    }
    if (activeGoal === 'slimming') {
      return ['cryolipolyse', 'cavitation', 'radiofrequence', 'laser-lipo'].includes(s.slug);
    }
    if (activeGoal === 'drainage') {
      return ['drainage-lymphatique', 'pressotherapie', 'massage-drainant'].includes(s.slug);
    }
    if (activeGoal === 'postpartum') {
      return ['reeducation-post-partum', 'pressotherapie', 'massage-therapeutique'].includes(s.slug);
    }

    return true;
  });

  const kineCount = SERVICES.filter((s) => s.pole === 'kinesitherapie').length;
  const minceurCount = SERVICES.filter((s) => s.pole === 'minceur').length;

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412] select-none">
      
      {/* ── Minimalist Luxury Hero ─────────────────────────────────── */}
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
                {lang === 'pt' ? 'Catálogo Clínico & Estético' : lang === 'en' ? 'Clinical & Aesthetic Catalog' : 'Catalogue Médical & Minceur'}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold text-[#1A1412] mb-3 sm:mb-4 tracking-tight">
              {lang === 'pt'
                ? '13 Tratamentos de Vanguarda'
                : lang === 'en'
                ? '13 Cutting-Edge Treatments'
                : '13 Soins Spécialisés'}
            </h1>

            <p className="text-[#6B6058] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-normal mb-8">
              {lang === 'pt'
                ? 'Da fisioterapia avançada e RPG ao emagrecimento com criolipólise e radiofrequência multipolar, explore todos os protocolos certificados da Digital Clínica.'
                : lang === 'en'
                ? 'From specialized GPR physiotherapy to advanced non-invasive body contouring, explore all medical protocols offered by Digital Clinic.'
                : 'De la rééducation posturale aux technologies minceur de pointe, découvrez notre gamme complète de protocoles médicaux certifiés.'}
            </p>

            {/* Live Search & Pole Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto">
              
              {/* Segment Switcher */}
              <div className="inline-flex p-1 bg-white border border-[#C49A3C]/30 rounded-full shadow-xs w-full sm:w-auto">
                <button
                  onClick={() => { setActivePole('all'); playSoftClick(); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activePole === 'all'
                      ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                      : 'text-[#6B6058] hover:text-[#1A1412]'
                  }`}
                >
                  {lang === 'pt' ? 'Todos (13)' : lang === 'en' ? 'All (13)' : 'Tous (13)'}
                </button>
                <button
                  onClick={() => { setActivePole('kinesitherapie'); playSoftClick(); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activePole === 'kinesitherapie'
                      ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                      : 'text-[#6B6058] hover:text-[#1A1412]'
                  }`}
                >
                  {lang === 'pt' ? `Fisioterapia (${kineCount})` : lang === 'en' ? `Physio (${kineCount})` : `Kiné (${kineCount})`}
                </button>
                <button
                  onClick={() => { setActivePole('minceur'); playSoftClick(); }}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activePole === 'minceur'
                      ? 'bg-gradient-to-r from-[#C49A3C] to-[#9A7428] text-white shadow-xs'
                      : 'text-[#6B6058] hover:text-[#1A1412]'
                  }`}
                >
                  {lang === 'pt' ? `Minceur (${minceurCount})` : lang === 'en' ? `Slimming (${minceurCount})` : `Minceur (${minceurCount})`}
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-56">
                <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8078]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'pt' ? 'Pesquisar tratamento...' : lang === 'en' ? 'Search treatment...' : 'Rechercher un soin...'}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#E8E2D8] rounded-full text-xs text-[#1A1412] focus:outline-none focus:border-[#C49A3C] transition-colors shadow-xs"
                />
              </div>
            </div>

            {/* Quick Goal Tag Filter */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 max-w-2xl mx-auto">
              {[
                { id: 'all', label: { pt: 'Todos', en: 'All', fr: 'Tous' } },
                { id: 'posture', label: { pt: 'Postura & Coluna', en: 'Posture & Spine', fr: 'Posture & Dos' } },
                { id: 'slimming', label: { pt: 'Gordura & Celulite', en: 'Fat & Cellulite', fr: 'Graisse & Cellulite' } },
                { id: 'drainage', label: { pt: 'Drenagem Linfática', en: 'Lymphatic Drainage', fr: 'Drainage' } },
                { id: 'postpartum', label: { pt: 'Saúde Pós-Parto', en: 'Postpartum Care', fr: 'Soins Post-Partum' } },
              ].map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => { setActiveGoal(goal.id); playSoftClick(); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all border ${
                    activeGoal === goal.id
                      ? 'bg-[#FAF5EA] border-[#C49A3C] text-[#8A6A24] font-bold shadow-xs'
                      : 'bg-white/80 border-[#E8E2D8] text-[#8A8078] hover:text-[#1A1412] hover:bg-white'
                  }`}
                >
                  {goal.label[lang] || goal.label.pt}
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Services Grid Section ─────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-[#FAFAF8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-12">
          
          {filteredServices.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredServices.map((service, i) => (
                  <motion.div
                    key={service.slug}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                  >
                    <ServiceCard service={service} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-16 bg-white border border-[#E8E2D8] rounded-3xl p-8 max-w-md mx-auto shadow-xs">
              <p className="text-sm text-[#8A8078] mb-3">
                {lang === 'pt' ? 'Nenhum tratamento encontrado para a pesquisa.' : lang === 'en' ? 'No treatments found matching your criteria.' : 'Aucun soin trouvé.'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActivePole('all'); setActiveGoal('all'); }}
                className="text-xs font-bold text-[#C49A3C] hover:underline"
              >
                {lang === 'pt' ? 'Limpar filtros' : lang === 'en' ? 'Clear filters' : 'Effacer les filtres'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Healthcare Insurance & ADSE Guidance Card ───────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-12">
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#C49A3C]/35 bg-white/95 backdrop-blur-xl p-6 sm:p-8 text-center shadow-[0_8px_32px_rgba(196,154,60,0.08)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#9A7428] via-[#C49A3C] to-[#E8C97A]" />
              
              <div className="w-12 h-12 rounded-2xl bg-[#FAF5EA] border border-[#C49A3C]/30 text-[#8A6A24] flex items-center justify-center mx-auto mb-4 shadow-xs">
                <IconReceipt2 size={24} />
              </div>

              <span className="font-mono text-xs font-bold tracking-widest text-[#9A7428] uppercase block mb-2">
                {lang === 'pt' ? 'Comparticipações & Seguros de Saúde' : lang === 'en' ? 'Health Insurance & Reimbursement' : 'Mutuelles & Assurances Santé'}
              </span>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1412] mb-3">
                {lang === 'pt'
                  ? 'Faturas com Cédula Profissional Oficial'
                  : lang === 'en'
                  ? 'Official Certified Medical Invoices'
                  : 'Factures avec Numéro d\'Ordre Professionnel'}
              </h3>

              <p className="text-xs sm:text-sm text-[#554C42] leading-relaxed max-w-2xl mx-auto mb-6">
                {lang === 'pt'
                  ? 'Todos os tratamentos de fisioterapia e reabilitação são elegíveis para reembolso no regime livre dos principais seguros e subsistemas de saúde em Portugal (ADSE, Médis, Multicare, AdvanceCare, etc.).'
                  : lang === 'en'
                  ? 'All physiotherapy and rehabilitation sessions are eligible for reimbursement under private health insurance coverage in Portugal (ADSE, Médis, Multicare, AdvanceCare, etc.).'
                  : 'Tous nos actes de kinésithérapie et de rééducation sont éligibles au remboursement auprès de votre mutuelle ou assurance santé.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/rendez-vous"
                  onClick={playSoftClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#C49A3C] hover:bg-[#E8C97A] text-[#1A1412] font-bold px-7 py-3 rounded-full text-xs sm:text-sm shadow-md transition-all"
                >
                  <IconCalendarEvent size={16} />
                  <span>{t.common.bookAppointment}</span>
                </Link>

                <Link
                  href="/tarifs"
                  onClick={playSoftClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1412] font-bold px-7 py-3 rounded-full text-xs sm:text-sm border border-[#E8E2D8] transition-all"
                >
                  <span>{lang === 'pt' ? 'Consultar Preços & Pacotes' : lang === 'en' ? 'View Rates & Packages' : 'Consulter les Tarifs'}</span>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
