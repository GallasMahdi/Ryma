'use client';
import { getLocalizedText } from '@/data/services';
import { useServices } from '@/components/ServiceCatalogProvider';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { IconArrowLeft, IconArrowUpRight } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';

import { JOURNAL_COPY, JOURNAL_POSTS, journalCategoryLabel, journalDate } from '@/data/journal';
import { parseArticleContent } from '@/lib/journal-content';
import { ArticleContent } from '@/components/blog/ArticleContent';
import { BlogCard } from '@/components/ui/blog-card';
import styles from '@/components/blog/Journal.module.css';

export default function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const SERVICES = useServices();
  const getServiceBySlug = (slug: string) => SERVICES.find(s => s.slug === slug);
  const { slug: routeSlug } = use(params);
  const { lang } = useLanguage();
  const copy = JOURNAL_COPY[lang];
  let slug: string;
  try {
    slug = decodeURIComponent(routeSlug);
  } catch {
    notFound();
  }
  const post = JOURNAL_POSTS.find(article => article.slug === slug);
  if (!post) notFound();
  const blocks = parseArticleContent(post.content[lang]);
  const headings = blocks.filter(block => block.type === 'heading' && block.level === 2);
  const relatedService = post.relatedServiceSlug ? getServiceBySlug(post.relatedServiceSlug) : undefined;
  const otherPosts = JOURNAL_POSTS.filter(article => article.slug !== slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category)).slice(0, 3);
  const contents = <ol className={styles.contentsList}>{headings.map(heading => heading.type === 'heading' && <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol>;

  return (
    <div className={styles.journal}>
      <header id="article-top" className={`${styles.container} ${styles.articleHeader}`}>
        <div className={styles.articleBack}><Link href="/blog#journal-collection" className={styles.textLink}><IconArrowLeft size={16} aria-hidden="true" />{copy.back}</Link><span className={styles.eyebrow}>{copy.title} {copy.emphasis} / Digital Clínica</span></div>
        <div className={styles.articleIntro}>
          <div className={styles.meta}><span>{journalCategoryLabel(post.category, lang)}</span><i aria-hidden="true" /><span>{post.readingTime} {copy.minutes}</span></div>
          <h1 className={styles.articleTitle}>{post.title[lang]}</h1>
          <p className={styles.articleDeck}>{post.excerpt[lang]}</p>
          <div className={styles.byline}><span className={styles.monogram} aria-hidden="true">dc</span><div><p>{copy.author}</p><time dateTime={post.publishedAt}>{journalDate(post.publishedAt, lang)}</time></div></div>
        </div>
        <div className={styles.articleCover}><Image src={post.coverImage} alt="" fill loading="eager" sizes="(max-width: 1336px) 100vw, 1240px" className={styles.image} /></div>
      </header>
      <div className={`${styles.container} ${styles.readingLayout}`}>
        <aside className={styles.readingAside}>
          <nav className={styles.desktopContents} aria-label={copy.contents}><span className={styles.eyebrow}>{copy.contents}</span>{contents}</nav>
          <details className={styles.mobileContents}><summary>{copy.contents}</summary><nav aria-label={copy.contents}>{contents}</nav></details>
        </aside>
        <article className={styles.articleBody}>
          <ArticleContent blocks={blocks} tableLabel={copy.table} />
          <div className={styles.articleAuthor}><span className={styles.monogram} aria-hidden="true">dc</span><div><p>{copy.author}</p><span>{copy.authorRole}</span></div></div>
          {relatedService && <section className={styles.service} aria-labelledby="related-treatment"><span className={styles.eyebrow}>{copy.service}</span><h2 id="related-treatment">{getLocalizedText(relatedService.name,lang)}</h2><p>{getLocalizedText(relatedService.shortDesc,lang)}</p><div className={styles.serviceActions}><Link href={`/services/${relatedService.slug}`} className={styles.primaryButton}>{copy.serviceLink}<IconArrowUpRight size={18} aria-hidden="true" /></Link><Link href="/rendez-vous" className={styles.textLink}>{copy.book}<IconArrowUpRight size={18} aria-hidden="true" /></Link></div></section>}
        </article>
      </div>
      <section className={`${styles.container} ${styles.related}`} aria-labelledby="related-articles">
        <div className={styles.sectionHeading}><h2 id="related-articles">{copy.related}</h2><Link href="/blog#journal-collection" className={styles.textLink}>{copy.allArticles}<IconArrowUpRight size={18} aria-hidden="true" /></Link></div>
        <div className={styles.cardGrid}>{otherPosts.map(article => <BlogCard key={article.slug} post={article} lang={lang} />)}</div>
      </section>
    </div>
  );
}
