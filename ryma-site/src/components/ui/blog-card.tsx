'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { IconArrowUpRight, IconClock } from '@tabler/icons-react';
import type { BlogPost, Lang } from '@/data/blog-posts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryLabel(category: string, lang: Lang): string {
  if (category === 'Minceur')
    return lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur';
  if (category === 'Kinésithérapie')
    return lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie';
  return lang === 'pt' ? 'Conselhos' : lang === 'en' ? 'Advice' : 'Conseils';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlogCardProps {
  post: BlogPost;
  lang: Lang;
  readMoreLabel: string;
  readTimeLabel: string;
  variant?: 'hero' | 'secondary' | 'compact';
  delay?: number;
  index?: number;
}

// ─── Hero Card (large, image-dominant) ───────────────────────────────────────

function HeroCard({ post, lang, readTimeLabel, delay = 0 }: BlogCardProps) {
  const title = post.title[lang] ?? post.title.fr;
  const excerpt = post.excerpt[lang] ?? post.excerpt.fr;
  const catLabel = getCategoryLabel(post.category, lang);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link href={`/blog/${post.slug}`} className="block">
        {/* Image */}
        <div className="relative w-full aspect-[3/2] overflow-hidden bg-neutral-100 mb-5">
          <Image
            src={post.coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-60" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9A7428]">
            {catLabel}
          </span>
          <span className="w-px h-3 bg-neutral-300" />
          <span className="flex items-center gap-1 text-[10px] tracking-wide text-neutral-400">
            <IconClock size={10} />
            {post.readingTime}&nbsp;{readTimeLabel}
          </span>
          <span className="w-px h-3 bg-neutral-300" />
          <time
            dateTime={post.publishedAt}
            className="text-[10px] tracking-wide text-neutral-400"
          >
            {new Date(post.publishedAt).toLocaleDateString(
              lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR',
              { day: 'numeric', month: 'long' },
            )}
          </time>
        </div>

        {/* Title */}
        <h3 className="font-serif text-2xl md:text-3xl font-normal text-neutral-900 leading-snug mb-3 group-hover:text-[#9A7428] transition-colors duration-300">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-4 max-w-[520px]">
          {excerpt}
        </p>

        {/* CTA */}
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-neutral-900 border-b border-neutral-900 pb-px group-hover:text-[#9A7428] group-hover:border-[#9A7428] transition-colors duration-300">
          Lire l'article
          <IconArrowUpRight
            size={13}
            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300"
          />
        </span>
      </Link>
    </motion.article>
  );
}

// ─── Secondary Card (horizontal) ─────────────────────────────────────────────

function SecondaryCard({ post, lang, readTimeLabel, delay = 0, index = 0 }: BlogCardProps) {
  const title = post.title[lang] ?? post.title.fr;
  const catLabel = getCategoryLabel(post.category, lang);

  return (
    <motion.article
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link
        href={`/blog/${post.slug}`}
        className={`flex gap-5 items-start ${index > 0 ? 'pt-5 border-t border-neutral-200' : ''}`}
      >
        {/* Thumbnail */}
        <div className="relative w-24 h-20 flex-shrink-0 overflow-hidden bg-neutral-100">
          <Image
            src={post.coverImage}
            alt={title}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col justify-between flex-1 min-w-0 py-0.5">
          <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-[#9A7428] mb-1.5 block">
            {catLabel}
          </span>
          <h4 className="font-serif text-base font-normal text-neutral-900 leading-snug line-clamp-2 group-hover:text-[#9A7428] transition-colors duration-300 mb-2">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400 tracking-wide">
            <IconClock size={9} />
            <span>{post.readingTime}&nbsp;{readTimeLabel}</span>
          </div>
        </div>

        {/* Arrow */}
        <IconArrowUpRight
          size={14}
          className="flex-shrink-0 mt-0.5 text-neutral-300 group-hover:text-[#9A7428] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300"
        />
      </Link>
    </motion.article>
  );
}

// ─── Compact horizontal list card ─────────────────────────────────────────────

function CompactCard({ post, lang, readTimeLabel, delay = 0, index = 0 }: BlogCardProps) {
  const title = post.title[lang] ?? post.title.fr;
  const catLabel = getCategoryLabel(post.category, lang);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link
        href={`/blog/${post.slug}`}
        className={`flex gap-4 items-center py-4 ${index > 0 ? 'border-t border-neutral-100' : ''}`}
      >
        {/* Index number */}
        <span className="font-mono text-xs text-neutral-300 w-6 shrink-0 text-right">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Thumbnail */}
        <div className="relative w-16 h-12 shrink-0 overflow-hidden bg-neutral-100">
          <Image
            src={post.coverImage}
            alt={title}
            fill
            sizes="64px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-semibold tracking-[0.15em] uppercase text-[#9A7428] block mb-1">
            {catLabel}
          </span>
          <h4 className="font-serif text-sm font-normal text-neutral-800 leading-snug line-clamp-2 group-hover:text-[#9A7428] transition-colors duration-300">
            {title}
          </h4>
        </div>

        <IconArrowUpRight
          size={13}
          className="shrink-0 text-neutral-300 group-hover:text-[#9A7428] transition-colors duration-300"
        />
      </Link>
    </motion.article>
  );
}

// ─── Full grid card (for /blog page) ─────────────────────────────────────────

export function BlogCard({ post, lang, readMoreLabel, readTimeLabel, variant = 'secondary', delay = 0, index = 0 }: BlogCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const title = post.title[lang] ?? post.title.fr;
  const excerpt = post.excerpt[lang] ?? post.excerpt.fr;
  const catLabel = getCategoryLabel(post.category, lang);

  if (variant === 'hero') return <HeroCard post={post} lang={lang} readMoreLabel={readMoreLabel} readTimeLabel={readTimeLabel} delay={delay} />;
  if (variant === 'secondary') return <SecondaryCard post={post} lang={lang} readMoreLabel={readMoreLabel} readTimeLabel={readTimeLabel} delay={delay} index={index} />;
  if (variant === 'compact') return <CompactCard post={post} lang={lang} readMoreLabel={readMoreLabel} readTimeLabel={readTimeLabel} delay={delay} index={index} />;

  // Default: full grid card for /blog listing
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group"
    >
      <Link href={`/blog/${post.slug}`} className="block">
        {/* Image */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-neutral-100 mb-4">
          <Image
            src={post.coverImage}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#9A7428]">
            {catLabel}
          </span>
          <span className="w-px h-3 bg-neutral-200" />
          <time dateTime={post.publishedAt} className="text-[10px] text-neutral-400 tracking-wide">
            {new Date(post.publishedAt).toLocaleDateString(
              lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR',
              { day: 'numeric', month: 'long' }
            )}
          </time>
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg font-normal text-neutral-900 leading-snug mb-2 group-hover:text-[#9A7428] transition-colors duration-300">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-3">
          {excerpt}
        </p>

        {/* Read more */}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-neutral-800 border-b border-neutral-800 pb-px group-hover:text-[#9A7428] group-hover:border-[#9A7428] transition-colors duration-300">
          {readMoreLabel}
          <IconArrowUpRight size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
        </span>
      </Link>
    </motion.article>
  );
}
