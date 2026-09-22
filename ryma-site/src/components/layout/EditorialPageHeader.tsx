import type { ReactNode } from 'react';
import styles from './EditorialPageHeader.module.css';

interface EditorialPageHeaderProps {
  eyebrow: string;
  title: string;
  emphasis: string;
  description: string;
  aside: ReactNode;
  children: ReactNode;
}

/** Shared, image-free introduction for the clinic's editorial pages. */
export function EditorialPageHeader({ eyebrow, title, emphasis, description, aside, children }: EditorialPageHeaderProps) {
  return (
    <section className={styles.hero} aria-labelledby="page-heading">
      <div className={styles.inner}>
        <div className={styles.overline}>
          <span>{eyebrow}</span>
          <span className={styles.location}>Digital Clínica <i aria-hidden="true">/</i> Lisboa</span>
        </div>
        <div className={styles.grid}>
          <div className={styles.introduction}>
            <h1 id="page-heading" className={styles.title}>{title}<em>{emphasis}</em></h1>
            <p className={styles.description}>{description}</p>
          </div>
          <div className={styles.aside}>{aside}</div>
        </div>
        <div className={styles.footer}>{children}</div>
      </div>
    </section>
  );
}
