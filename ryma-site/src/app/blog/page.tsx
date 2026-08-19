'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { BLOG_POSTS } from '@/data/blog-posts';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { IconClock, IconArrowRight } from '@tabler/icons-react';
import Image from 'next/image';

export default function BlogPage() {
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
              {lang === 'pt' ? 'Blog de Saúde & Fisioterapia' : lang === 'en' ? 'Health & Wellness Blog' : 'Blog Santé & Bien-être'}
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1412] mb-4">
              {lang === 'pt' ? 'Artigos & Conselhos Clínicos' : lang === 'en' ? 'Articles & Clinical Advice' : 'Articles & Conseils'}
            </h1>
            <p className="text-[#6B6058] text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {lang === 'pt'
                ? 'Informações médicas, conselhos práticos e atualidades de saúde pela equipa da Digital Clínica em Lisboa.'
                : lang === 'en'
                ? 'Clinical insights, wellness guides, and health advice by Digital Clinic in Lisbon.'
                : 'Informations médicales, conseils pratiques et actualités santé par l\'équipe de la Digital Clínica à Lisbonne.'}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Articles Grid ─────────────────────────────── */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <ScrollReveal key={post.slug} delay={i * 0.06}>
                <Link href={`/blog/${post.slug}`} className="group block h-full">
                  <div className="bg-white border border-[#E8E2D8] rounded-2xl h-full flex flex-col overflow-hidden shadow-sm hover:border-[#C49A3C]/50 hover:shadow-[0_8px_30px_rgba(196,154,60,0.14)] hover:-translate-y-1 transition-all duration-300">
                    {/* Custom Advanced Photo Header */}
                    <div className="aspect-[16/10] w-full flex-shrink-0 relative overflow-hidden bg-slate-900">
                      <Image
                        src={post.coverImage}
                        alt={post.title[lang] || post.title.pt || post.title.en || post.title.fr}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300" />
                      <span className="absolute start-3 top-3 font-mono text-[10px] font-bold text-blue-700 tracking-wider uppercase backdrop-blur-md bg-white/95 px-3 py-1 rounded-full border border-blue-200/80 shadow-sm">
                        {post.category === 'Minceur' ? (lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur') : post.category === 'Kinésithérapie' ? (lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie') : (lang === 'pt' ? 'Conselhos' : lang === 'en' ? 'Advice' : 'Conseils')}
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

                      <h2 className="font-serif text-xl font-bold text-[#1A1412] group-hover:text-[#9A7428] transition-colors mb-3 flex-1 leading-snug">
                        {post.title[lang] || post.title.pt || post.title.en || post.title.fr}
                      </h2>

                      <p className="text-sm text-[#6B6058] line-clamp-3 mb-5 leading-relaxed">
                        {post.excerpt[lang] || post.excerpt.pt || post.excerpt.en || post.excerpt.fr}
                      </p>

                      <div className="flex items-center justify-between pt-4 border-t border-[#E8E2D8]">
                        <span className="font-mono text-xs text-[#8A8078]">
                          {new Date(post.publishedAt).toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
                            day: 'numeric', month: 'long'
                          })}
                        </span>
                        <span className="text-xs font-semibold text-[#9A7428] inline-flex items-center gap-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform bg-[#F5E9C8] px-2.5 py-1 rounded-full">
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
    </>
  );
}
