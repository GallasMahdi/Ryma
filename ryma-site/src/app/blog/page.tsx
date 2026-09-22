'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { IconArrowDown, IconArrowUpRight, IconSearch, IconX } from '@tabler/icons-react';
import { useLanguage } from '@/lib/i18n';
import { BlogCard } from '@/components/ui/blog-card';
import { JOURNAL_CATEGORIES, JOURNAL_COPY, JOURNAL_POSTS, journalCategoryLabel, normalizeJournalSearch, type JournalCategory } from '@/data/journal';
import styles from '@/components/blog/Journal.module.css';

export default function BlogPage() {
  const { lang } = useLanguage();
  const copy = JOURNAL_COPY[lang];
  const [category, setCategory] = useState<JournalCategory>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const posts = useMemo(() => {
    const terms = normalizeJournalSearch(query).split(/\s+/).filter(Boolean);
    const filtered = JOURNAL_POSTS.filter(post => {
      const text = normalizeJournalSearch(`${post.title[lang]} ${post.excerpt[lang]} ${post.tags.join(' ')} ${journalCategoryLabel(post.category, lang)}`);
      return (category === 'all' || post.category === category) && terms.every(term => text.includes(term));
    });
    return sort === 'shortest' ? filtered.sort((a, b) => a.readingTime - b.readingTime) : filtered;
  }, [category, query, sort, lang]);

  function reset() { setCategory('all'); setQuery(''); setSort('newest'); }

  return (
    <div className={styles.journal}>
      <header id="journal-top" className={`${styles.container} ${styles.masthead}`}>
        <div className={styles.eyebrowRow}><span>{copy.eyebrow}</span><span className={styles.edition}>Digital Clínica <i>/</i> Lisboa</span></div>
        <div className={styles.mastheadGrid}>
          <h1 className={styles.journalTitle}>{copy.title} <em>{copy.emphasis}</em><span aria-hidden="true">.</span></h1>
          <div className={styles.mastheadIntro}><p>{copy.intro}</p><a href="#journal-collection" className={styles.textLink}>{copy.explore}<IconArrowDown size={16} aria-hidden="true" /></a></div>
        </div>
        {JOURNAL_POSTS[0] && <BlogCard post={JOURNAL_POSTS[0]} lang={lang} variant="featured" />}
      </header>

      <section id="journal-collection" aria-labelledby="collection-heading" className={`${styles.container} ${styles.collection}`}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{copy.explore}</span><h2 id="collection-heading">{copy.collection}</h2></div><span className={styles.collectionNumber}>{String(JOURNAL_POSTS.length).padStart(2, '0')}<span>{copy.results}</span></span></div>
        <div className={styles.toolbar}>
          <div className={styles.categories} role="group" aria-label={copy.explore}>
            {JOURNAL_CATEGORIES.map(key => <button type="button" key={key} aria-pressed={category === key} aria-controls="journal-results" onClick={() => setCategory(key)}>{journalCategoryLabel(key, lang)}<span>{key === 'all' ? JOURNAL_POSTS.length : JOURNAL_POSTS.filter(post => post.category === key).length}</span></button>)}
          </div>
          <div className={styles.search} role="search">
            <IconSearch size={18} stroke={1.5} aria-hidden="true" />
            <input type="search" aria-label={copy.search} placeholder={copy.placeholder} value={query} onChange={event => setQuery(event.target.value)} />
            {query && <button type="button" aria-label={copy.clear} onClick={() => setQuery('')}><IconX size={17} aria-hidden="true" /></button>}
          </div>
        </div>
        <div className={styles.resultBar}>
          <p role="status" aria-live="polite" aria-atomic="true">{posts.length} {posts.length === 1 ? copy.result : copy.results}{category !== 'all' && <> <span aria-hidden="true">/</span> {journalCategoryLabel(category, lang)}</>}</p>
          <label className={styles.sort}><span>{copy.sort}</span><select aria-label={copy.sort} value={sort} onChange={event => setSort(event.target.value)}><option value="newest">{copy.newest}</option><option value="shortest">{copy.shortest}</option></select></label>
        </div>
        <div id="journal-results" className={styles.cardGrid}>
          {posts.map(post => <BlogCard key={post.slug} post={post} lang={lang} />)}
        </div>
        {posts.length === 0 && <div className={styles.empty}><IconSearch size={30} stroke={1} aria-hidden="true" /><h3>{copy.empty}</h3><p>{copy.emptyText}</p><button type="button" className={styles.primaryButton} onClick={reset}>{copy.reset}<IconArrowUpRight size={18} aria-hidden="true" /></button></div>}
      </section>
      <section className={`${styles.container} ${styles.closing}`}>
        <div><span className={styles.eyebrow}>Digital Clínica · Lisboa</span><h2>{copy.closing}</h2><p>{copy.closingText}</p></div>
        <Link href="/services" className={styles.primaryButton}>{copy.treatments}<IconArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
