'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';
import { BLOG_POSTS } from '@/data/blog-posts';
import { getServiceBySlug } from '@/data/services';
import { ScrollReveal } from '@/components/animation/ScrollReveal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconClock, IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import Image from 'next/image';

// Simple markdown-like renderer for article content with high readability
function renderContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mt-10 mb-4 pb-2 border-b border-[#E8E2D8]">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-serif text-xl font-bold text-[#9A7428] mt-8 mb-3">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="font-bold text-[#1A1412] text-base md:text-lg mt-6 mb-2">
          {line.slice(2, -2)}
        </p>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="text-[#3A322C] leading-relaxed ms-6 mb-2 text-base md:text-lg">
          {line.slice(2)}
        </li>
      );
    } else if (line.startsWith('| ')) {
      // Skip table lines
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      // Handle inline bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={i} className="text-[#3A322C] leading-relaxed mb-4 text-base md:text-lg">
          {parts.map((part, pi) =>
            pi % 2 === 1 ? <strong key={pi} className="text-[#1A1412] font-semibold">{part}</strong> : part
          )}
        </p>
      );
    }
  });

  return <div className="space-y-1">{elements}</div>;
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default function BlogPostPage({ params }: Props) {
  const { slug } = React.use(params);
  const { lang, t } = useLanguage();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) notFound();

  const relatedService = post.relatedServiceSlug ? getServiceBySlug(post.relatedServiceSlug) : null;
  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="bg-[#FAFAF8] min-h-screen text-[#1A1412]">
      {/* Hero Header */}
      <section className="relative pt-28 pb-10 overflow-hidden bg-gradient-to-b from-[#FDF9F2] to-[#FAFAF8]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,233,200,0.5) 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-4xl px-6 md:px-12">
          <ScrollReveal>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[#9A7428] hover:text-[#C49A3C] transition-colors mb-8 bg-[#F5E9C8] border border-[#C49A3C]/30 px-4 py-2 rounded-full"
            >
              <IconArrowLeft size={14} className="rtl-flip" />
              <span>{t.blog.backToBlog}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="font-mono text-xs font-bold text-[#9A7428] tracking-widest uppercase bg-white/90 px-3.5 py-1 rounded-full border border-[#C49A3C]/30 shadow-xs">
                {post.category === 'Minceur' ? (lang === 'pt' ? 'Emagrecimento' : lang === 'en' ? 'Slimming' : 'Minceur') : post.category === 'Kinésithérapie' ? (lang === 'pt' ? 'Fisioterapia' : lang === 'en' ? 'Physiotherapy' : 'Kinésithérapie') : (lang === 'pt' ? 'Conselhos' : lang === 'en' ? 'Advice' : 'Conseils')}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-xs text-[#7A6E65] bg-white/70 px-3 py-1 rounded-full border border-[#E8E2D8]">
                <IconClock size={13} className="text-[#9A7428]" />
                {post.readingTime} {t.blog.readTime}
              </span>
              <span className="font-mono text-xs text-[#7A6E65] bg-white/70 px-3 py-1 rounded-full border border-[#E8E2D8]">
                {new Date(post.publishedAt).toLocaleDateString(lang === 'pt' ? 'pt-PT' : lang === 'en' ? 'en-US' : 'fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            <h1 className="font-serif text-3xl md:text-5xl font-bold text-[#1A1412] mb-6 leading-tight">
              {post.title[lang] || post.title.pt || post.title.en || post.title.fr}
            </h1>
            <p className="text-[#5A4E46] text-lg md:text-xl leading-relaxed">
              {post.excerpt[lang] || post.excerpt.pt || post.excerpt.en || post.excerpt.fr}
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 pb-24 bg-[#FAFAF8]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
            {/* Article */}
            <article className="lg:col-span-2">
              <div className="bg-white border border-[#E8E2D8] rounded-2xl p-7 md:p-10 shadow-xs">
                {/* Cover Image */}
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-8 border border-[#E8E2D8] bg-slate-900">
                  <Image
                    src={post.coverImage}
                    alt={post.title[lang] || post.title.pt || post.title.en || post.title.fr}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                </div>

                {/* Article Content */}
                <div className="prose prose-stone max-w-none text-[#3A322D] leading-relaxed text-base space-y-4">
                  {(post.content[lang] || post.content.pt || post.content.en || post.content.fr)
                    .split('\n\n')
                    .map((paragraph, i) => {
                      if (paragraph.startsWith('## ')) {
                        return (
                          <h2 key={i} className="font-serif text-2xl md:text-3xl font-bold text-[#1A1412] mt-8 mb-3 pt-4 border-t border-[#E8E2D8]">
                            {paragraph.replace('## ', '')}
                          </h2>
                        );
                      }
                      if (paragraph.startsWith('### ')) {
                        return (
                          <h3 key={i} className="font-serif text-xl font-bold text-[#1A1412] mt-6 mb-2">
                            {paragraph.replace('### ', '')}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <ul key={i} className="list-disc list-inside space-y-1.5 my-3 text-[#4A4038]">
                            {paragraph.split('\n').map((item, j) => (
                              <li key={j}>{item.replace('- ', '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      if (/^\d+\. /.test(paragraph)) {
                        return (
                          <ol key={i} className="list-decimal list-inside space-y-1.5 my-3 text-[#4A4038]">
                            {paragraph.split('\n').map((item, j) => (
                              <li key={j}>{item.replace(/^\d+\. /, '')}</li>
                            ))}
                          </ol>
                        );
                      }
                      return (
                        <p key={i} className="leading-relaxed text-[#4A4038]">
                          {paragraph}
                        </p>
                      );
                    })}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-8 mt-8 border-t border-[#E8E2D8]">
                  <span className="font-mono text-xs text-[#8A8078] me-1">{lang === 'pt' ? 'Etiquetas:' : lang === 'en' ? 'Tags:' : 'Tags :'}</span>
                  {post.tags.map((tag) => (
                    <span key={tag} className="font-mono text-xs bg-[#FAF6EE] border border-[#E8E2D8] text-[#7A6E65] px-2.5 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author Card */}
              <div className="mt-10 bg-white border border-[#E8E2D8] rounded-2xl p-6 flex items-center gap-5 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9A7428] to-[#C49A3C] flex items-center justify-center text-white font-serif font-bold text-xl shadow-md shrink-0">
                  R
                </div>
                <div>
                  <div className="font-serif font-bold text-lg text-[#1A1412]">Ryma Ouichka</div>
                  <div className="text-sm text-[#6B6058] mt-0.5">
                    {lang === 'pt'
                      ? 'Fisioterapeuta & Estética Avançada — Lisboa, Portugal'
                      : lang === 'en'
                      ? 'Physiotherapist & Advanced Aesthetics Specialist — Lisbon, Portugal'
                      : 'Physiothérapeute & Soins Avancés — Lisbonne, Portugal'}
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Related Service Card */}
              {relatedService && (
                <div className="bg-white border border-[#C49A3C]/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
                  <div className="font-mono text-xs text-[#9A7428] uppercase font-bold tracking-wider mb-2">
                    — {lang === 'pt' ? 'Tratamento Recomendado' : lang === 'en' ? 'Recommended Treatment' : 'Soin Recommandé'} —
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#1A1412] mb-3">
                    {relatedService.name[lang] || relatedService.name.pt || relatedService.name.en || relatedService.name.fr}
                  </h3>
                  <p className="text-sm text-[#6B6058] mb-5 leading-relaxed">
                    {relatedService.shortDesc[lang] || relatedService.shortDesc.pt || relatedService.shortDesc.en || relatedService.shortDesc.fr}
                  </p>
                  <div className="font-mono text-2xl font-bold text-[#9A7428] mb-5">
                    {relatedService.price} {t.common.currency}
                  </div>
                  <div className="space-y-2.5">
                    <Button href={`/services/${relatedService.slug}`} variant="primary" className="w-full justify-center">
                      {t.common.viewDetails}
                    </Button>
                    <Button href="/rendez-vous" variant="outline" className="w-full justify-center">
                      {t.common.bookAppointment}
                    </Button>
                  </div>
                </div>
              )}

              {/* Other Articles Card */}
              <div className="bg-white border border-[#E8E2D8] rounded-2xl p-6 shadow-xs">
                <div className="font-mono text-xs text-[#9A7428] uppercase font-bold tracking-wider mb-5 pb-3 border-b border-[#E8E2D8]">
                  {t.blog.relatedTitle}
                </div>
                <div className="space-y-5">
                  {otherPosts.map((p) => (
                    <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl relative overflow-hidden bg-slate-900 shrink-0 border border-[#E8E2D8]">
                        <Image
                          src={p.coverImage}
                          alt={p.title[lang] || p.title.pt || p.title.en || p.title.fr}
                          fill
                          sizes="48px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-[#1A1412] group-hover:text-[#9A7428] transition-colors leading-snug font-semibold line-clamp-2">
                          {p.title[lang] || p.title.pt || p.title.en || p.title.fr}
                        </p>
                        <span className="font-mono text-[11px] text-[#8A8078] mt-1 block">
                          {p.readingTime} {t.common.minutes}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
