'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { BLOG_POSTS } from '@/data/blog-posts';
import { BlogCard } from '@/components/ui/blog-card';

// ─── Category config ──────────────────────────────────────────────────────────

type CategoryKey = 'all' | 'Kinésithérapie' | 'Minceur' | 'Conseils';

const TABS: { key: CategoryKey; label: Record<string, string> }[] = [
  { key: 'all',            label: { fr: 'Tout',           pt: 'Tudo',           en: 'All'           } },
  { key: 'Kinésithérapie', label: { fr: 'Kinésithérapie', pt: 'Fisioterapia',   en: 'Physiotherapy' } },
  { key: 'Minceur',        label: { fr: 'Minceur',        pt: 'Emagrecimento',  en: 'Slimming'      } },
  { key: 'Conseils',       label: { fr: 'Conseils',       pt: 'Conselhos',      en: 'Advice'        } },
];

function countFor(key: CategoryKey) {
  if (key === 'all') return BLOG_POSTS.length;
  if (key === 'Conseils') return BLOG_POSTS.filter(p => p.category !== 'Kinésithérapie' && p.category !== 'Minceur').length;
  return BLOG_POSTS.filter(p => p.category === key).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  const { lang, t } = useLanguage();
  const [active, setActive] = useState<CategoryKey>('all');

  const posts = useMemo(() => {
    if (active === 'all') return BLOG_POSTS;
    if (active === 'Conseils') return BLOG_POSTS.filter(p => p.category !== 'Kinésithérapie' && p.category !== 'Minceur');
    return BLOG_POSTS.filter(p => p.category === active);
  }, [active]);

  return (
    <>
      {/* ── Masthead ──────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-10 bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-12">

          {/* Overline */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="block font-mono text-[10px] tracking-[0.22em] uppercase text-neutral-400 mb-4"
          >
            {lang === 'pt' ? 'Blog de Saúde & Fisioterapia'
              : lang === 'en' ? 'Health & Wellness Blog'
              : 'Blog Santé & Bien-être'}
          </motion.span>

          {/* Title + count row */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-5xl md:text-6xl font-normal text-neutral-900 tracking-tight leading-none"
            >
              {lang === 'pt' ? 'Articles' : lang === 'en' ? 'Articles' : 'Articles'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="font-mono text-xs text-neutral-400 tracking-wide pb-1"
            >
              {BLOG_POSTS.length}&nbsp;{lang === 'pt' ? 'publicações' : lang === 'en' ? 'publications' : 'publications'}
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  id={`blog-tab-${tab.key}`}
                  onClick={() => setActive(tab.key)}
                  className={`relative flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-4 whitespace-nowrap transition-colors duration-200 focus-visible:outline-none ${
                    isActive ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                >
                  {/* Underline indicator */}
                  {isActive && (
                    <motion.span
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-px bg-neutral-900"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  {tab.label[lang]}
                  <span
                    className={`text-[9px] tabular-nums transition-colors ${
                      isActive ? 'text-neutral-500' : 'text-neutral-300'
                    }`}
                  >
                    ({countFor(tab.key)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Articles ──────────────────────────────────────────────────────── */}
      <section className="py-16 pb-28 bg-white">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14"
            >
              {posts.map((post, i) => (
                <BlogCard
                  key={post.slug}
                  post={post}
                  lang={lang}
                  readMoreLabel={t.common.readMore}
                  readTimeLabel={t.blog.readTime}
                  delay={i * 0.04}
                  index={i}
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Empty state */}
          {posts.length === 0 && (
            <div className="py-28 text-center">
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-neutral-400">
                {lang === 'pt' ? 'Nenhum artigo nesta categoria'
                  : lang === 'en' ? 'No articles in this category'
                  : 'Aucun article dans cette catégorie'}
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
