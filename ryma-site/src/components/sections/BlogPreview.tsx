'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { BLOG_POSTS } from '@/data/blog-posts';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { IconArrowRight, IconClock } from '@tabler/icons-react';
import Image from 'next/image';

export function BlogPreview() {
  const { lang, t } = useLanguage();
  const posts = BLOG_POSTS.slice(0, 3);

  return (
    <section className="relative py-24 md:py-36 bg-[#FAFAF8]">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <ScrollReveal className="flex items-end justify-between gap-6 mb-12 flex-wrap">
          <div>
            <span className="font-mono text-xs tracking-widest text-[#9A7428] uppercase font-semibold block mb-3">
              — {lang === 'pt' ? 'Blog de Saúde e Bem-Estar' : lang === 'en' ? 'Health & Wellness Blog' : 'Blog Santé & Bien-être'} —
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#1A1412]">
              {lang === 'pt' ? 'Artigos Mais Recentes' : lang === 'en' ? 'Latest Articles' : 'Nos Derniers Articles'}
            </h2>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#9A7428] hover:text-[#C49A3C] transition-colors shrink-0 bg-[#F5E9C8] border border-[#C49A3C]/30 px-4 py-2 rounded-full"
          >
            <span>{lang === 'pt' ? 'Todos os artigos' : lang === 'en' ? 'All articles' : 'Tous les articles'}</span>
            <IconArrowRight size={14} />
          </Link>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <ScrollReveal key={post.slug} delay={i * 0.1}>
              <Link href={`/blog/${post.slug}`} className="group block h-full">
                <div className="bg-white border border-[#E8E2D8] rounded-2xl h-full flex flex-col overflow-hidden shadow-sm hover:border-[#C49A3C]/50 hover:shadow-[0_8px_30px_rgba(196,154,60,0.14)] hover:-translate-y-1 transition-all duration-300">
                  {/* Advanced Luxury Photo Container with Glassmorphic Zoom */}
                  <div className="aspect-[16/10] w-full flex-shrink-0 relative overflow-hidden rounded-t-2xl bg-slate-900">
                    <Image
                      src={post.coverImage}
                      alt={post.title[lang] || post.title.pt || post.title.en || post.title.fr}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

                    {/* Category Badge */}
                    <span className="absolute start-3 top-3 font-mono text-[10px] font-bold text-blue-700 tracking-wider uppercase backdrop-blur-md bg-white/95 px-3 py-1 rounded-full border border-blue-200/80 shadow-sm">
                      {post.category === 'Minceur' ? (lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur') : post.category === 'Kinésithérapie' ? (lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie') : (lang === 'pt' ? 'Conselhos' : lang === 'en' ? 'Advice' : 'Conseils')}
                    </span>

                    {/* Reading Time Badge */}
                    <span className="absolute end-3 top-3 flex items-center gap-1 font-mono text-[10px] font-semibold text-white backdrop-blur-md bg-slate-900/75 px-2.5 py-1 rounded-full border border-white/20">
                      <IconClock size={11} className="text-blue-400" />
                      {post.readingTime} {t.blog.readTime}
                    </span>
                  </div>

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="gold">
                        {post.category === 'Minceur' ? (lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur') : post.category === 'Kinésithérapie' ? (lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie') : (lang === 'pt' ? 'Conselhos' : lang === 'en' ? 'Advice' : 'Conseils')}
                      </Badge>
                      <span className="flex items-center gap-1 font-mono text-xs text-[#8A8078]">
                        <IconClock size={12} className="text-[#C49A3C]" />
                        {post.readingTime} {t.blog.readTime}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors mb-3 leading-snug flex-1">
                      {post.title[lang] || post.title.pt || post.title.en || post.title.fr}
                    </h3>

                    <p className="text-sm text-[#6B6058] line-clamp-2 mb-5 leading-relaxed">
                      {post.excerpt[lang] || post.excerpt.pt || post.excerpt.en || post.excerpt.fr}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                      <span className="font-mono text-xs text-[#8A8078]">
                        {new Date(post.publishedAt).toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                      <span className="text-xs font-semibold text-[#9A7428] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform inline-flex items-center gap-1 bg-[#F5E9C8] px-2.5 py-1 rounded-full">
                        {t.common.readMore}
                        <IconArrowRight size={12} className="rtl-flip" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
