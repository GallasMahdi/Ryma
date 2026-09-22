import Link from 'next/link';
import Image from 'next/image';
import { IconArrowUpRight } from '@tabler/icons-react';
import type { BlogPost, Lang } from '@/data/blog-posts';
import { JOURNAL_COPY, journalCategoryLabel, journalDate } from '@/data/journal';
import styles from '@/components/blog/Journal.module.css';

interface BlogCardProps {
  post: BlogPost;
  lang: Lang;
  variant?: 'grid' | 'featured';
}

export function BlogCard({ post, lang, variant = 'grid' }: BlogCardProps) {
  const copy = JOURNAL_COPY[lang];
  const featured = variant === 'featured';
  return (
    <article className={featured ? styles.featured : styles.card}>
      <Link href={`/blog/${post.slug}#article-top`} className={styles.cardLink}>
        <div className={styles.cardImage}>
          <Image src={post.coverImage} alt="" fill loading={featured ? 'eager' : 'lazy'}
            sizes={featured ? '(max-width: 760px) 100vw, (max-width: 1336px) 53vw, 656px' : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, (max-width: 1336px) 33vw, 392px'}
            className={styles.image} />
          {featured && <span className={styles.featuredLabel}>{copy.featured}</span>}
          {!featured && <span className={styles.imageArrow} aria-hidden="true"><IconArrowUpRight size={22} stroke={1.4} /></span>}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.meta}><span>{journalCategoryLabel(post.category, lang)}</span><i aria-hidden="true" /><span>{post.readingTime} {copy.minutes}</span></div>
          {featured ? <h2 className={styles.cardTitle}>{post.title[lang]}</h2> : <h3 className={styles.cardTitle}>{post.title[lang]}</h3>}
          <p className={styles.cardExcerpt}>{post.excerpt[lang]}</p>
          <div className={styles.cardFooter}>
            <time dateTime={post.publishedAt}>{journalDate(post.publishedAt, lang)}</time>
            <span className={styles.readLink}>{copy.read}<IconArrowUpRight size={18} stroke={1.5} aria-hidden="true" /></span>
          </div>
        </div>
      </Link>
    </article>
  );
}
