'use client';

import Link from 'next/link';
import { IconArrowUpRight } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { JOURNAL_COPY, JOURNAL_POSTS } from '@/data/journal';
import { BlogCard } from '@/components/ui/blog-card';
import styles from '@/components/blog/Journal.module.css';

export function BlogPreview() {
  const { lang } = useLanguage();
  const copy = JOURNAL_COPY[lang];
  return (
    <section id="journal" className={`${styles.journal} ${styles.preview}`} aria-labelledby="journal-preview-heading">
      <div className={styles.container}>
        <div className={styles.previewHeading}>
          <div><span className={styles.eyebrow}>{copy.title} {copy.emphasis} / Digital Clínica</span><h2 id="journal-preview-heading">{copy.previewTitle}<em>{copy.previewEmphasis}</em></h2></div>
          <div><p>{copy.previewIntro}</p><Link href="/blog#journal-top" className={styles.textLink}>{copy.allArticles}<IconArrowUpRight size={18} aria-hidden="true" /></Link></div>
        </div>
        <div className={styles.cardGrid}>{JOURNAL_POSTS.slice(0, 3).map(post => <BlogCard key={post.slug} post={post} lang={lang} />)}</div>
      </div>
    </section>
  );
}
