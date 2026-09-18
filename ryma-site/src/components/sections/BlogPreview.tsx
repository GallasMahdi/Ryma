'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { BLOG_POSTS } from '@/data/blog-posts';
import { BlogCard } from '@/components/ui/blog-card';
import { IconArrowRight } from '@tabler/icons-react';

export function BlogPreview() {
  const { lang, t } = useLanguage();
  const [hero, ...secondary] = BLOG_POSTS.slice(0, 3);

  const sectionLabel =
    lang === 'pt' ? 'Blog de Saúde & Bem-Estar'
    : lang === 'en' ? 'Health & Wellness Blog'
    : 'Blog Santé & Bien-être';

  const headingText =
    lang === 'pt' ? 'Artigos Recentes'
    : lang === 'en' ? 'Latest Articles'
    : 'Derniers Articles';

  const allArticles =
    lang === 'pt' ? 'Todos os artigos'
    : lang === 'en' ? 'All articles'
    : 'Tous les articles';

  return (
    <section className="py-24 md:py-36 bg-white border-t border-neutral-100">
      <div className="mx-auto max-w-7xl px-6 md:px-12">

        {/* ── Section header — editorial masthead style ──────────────────── */}
        <div className="flex items-end justify-between mb-12 pb-5 border-b border-neutral-900">
          <div>
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="block font-mono text-[10px] tracking-[0.22em] uppercase text-neutral-400 mb-2"
            >
              {sectionLabel}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl md:text-5xl font-normal text-neutral-900 tracking-tight"
            >
              {headingText}
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase text-neutral-500 hover:text-neutral-900 transition-colors duration-300"
            >
              {allArticles}
              <IconArrowRight
                size={12}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </Link>
          </motion.div>
        </div>

        {/* ── Magazine grid: hero left + secondary list right ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-0 lg:gap-16">

          {/* Hero article */}
          {hero && (
            <BlogCard
              post={hero}
              lang={lang}
              readMoreLabel={t.common.readMore}
              readTimeLabel={t.blog.readTime}
              variant="hero"
              delay={0.1}
            />
          )}

          {/* Vertical divider */}
          <div className="hidden lg:block w-px bg-neutral-200 self-stretch" />

          {/* Secondary articles */}
          <div className="lg:w-72 flex flex-col justify-center mt-10 lg:mt-0">
            {/* Sub-header */}
            <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-neutral-400 mb-5 pb-3 border-b border-neutral-200">
              {lang === 'pt' ? 'Mais artigos' : lang === 'en' ? 'More articles' : 'Plus d\'articles'}
            </p>
            <div className="flex flex-col">
              {secondary.map((post, i) => (
                <BlogCard
                  key={post.slug}
                  post={post}
                  lang={lang}
                  readMoreLabel={t.common.readMore}
                  readTimeLabel={t.blog.readTime}
                  variant="secondary"
                  delay={0.15 + i * 0.1}
                  index={i}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
