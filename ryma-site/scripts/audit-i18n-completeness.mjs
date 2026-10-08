import { pt } from '../src/data/translations/pt.ts';
import { en } from '../src/data/translations/en.ts';
import { fr } from '../src/data/translations/fr.ts';
// Audit the administrator-managed public catalogue, never a built-in service list.
const catalogueUrl=process.env.SERVICE_AUDIT_URL;
if(!catalogueUrl)throw new Error('Set SERVICE_AUDIT_URL to the explicit /api/treatments endpoint to audit.');
const catalogueResponse=await fetch(catalogueUrl);
if(!catalogueResponse.ok)throw new Error('Catalogue unavailable: '+catalogueResponse.status);
const {services:SERVICES}=await catalogueResponse.json();

import { BLOG_POSTS } from '../src/data/blog-posts.ts';

const issues = {
  missingKeys: [],
  extraKeys: [],
  emptyTranslations: [],
  identicalUntranslated: [],
  servicesMissingLocale: [],
  pricingMissingLocale: [],
  blogMissingLocale: [],
};

console.log('========================================================================');
console.log('🌐 100% INTERNATIONALIZATION (i18n) & LOCALE COMPLETENESS AUDIT 🌐');
console.log('Languages Evaluated: PT (Portuguese) | EN (English) | FR (French)');
console.log('========================================================================\n');

// ─── 1. RECURSIVE DICTIONARY AUDIT ───────────────────────────────────────────
console.log('--- [1/5] AUDITING UI DICTIONARY SYMMETRY (pt.ts vs en.ts vs fr.ts) ---');

function compareObjects(baseObj, targetObj, targetLang, currentPath = '') {
  for (const key of Object.keys(baseObj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    const baseVal = baseObj[key];
    const targetVal = targetObj ? targetObj[key] : undefined;

    if (targetVal === undefined) {
      issues.missingKeys.push({ lang: targetLang, path: fullPath });
      continue;
    }

    if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
      if (typeof targetVal !== 'object' || targetVal === null || Array.isArray(targetVal)) {
        issues.missingKeys.push({ lang: targetLang, path: `${fullPath} (type mismatch: expected object)` });
      } else {
        compareObjects(baseVal, targetVal, targetLang, fullPath);
      }
    } else if (typeof baseVal === 'string') {
      if (typeof targetVal !== 'string') {
        issues.missingKeys.push({ lang: targetLang, path: `${fullPath} (type mismatch: expected string)` });
      } else {
        if (!targetVal.trim()) {
          issues.emptyTranslations.push({ lang: targetLang, path: fullPath });
        }
        if (targetVal.includes('TODO') || targetVal.includes('[MISSING]') || targetVal.includes('FIXME')) {
          issues.emptyTranslations.push({ lang: targetLang, path: `${fullPath} (contains placeholder)` });
        }
      }
    } else if (Array.isArray(baseVal)) {
      if (!Array.isArray(targetVal)) {
        issues.missingKeys.push({ lang: targetLang, path: `${fullPath} (type mismatch: expected array)` });
      } else if (targetVal.length === 0 && baseVal.length > 0) {
        issues.emptyTranslations.push({ lang: targetLang, path: `${fullPath} (empty array)` });
      }
    }
  }

  // Check for extraneous keys in target
  if (targetObj) {
    for (const key of Object.keys(targetObj)) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      if (baseObj[key] === undefined) {
        issues.extraKeys.push({ lang: targetLang, path: fullPath });
      }
    }
  }
}

compareObjects(pt, en, 'en');
compareObjects(pt, fr, 'fr');

// Also cross-check identical strings between EN and PT / FR and PT
function checkUntranslatedDuplicates(baseObj, targetObj, targetLang, currentPath = '') {
  // Ignored phrases (brand names, universal medical terms, addresses, numbers, symbols)
  const ignored = new Set([
    'Digital Clínica',
    'Lisboa, Portugal',
    'Avenida da Liberdade 120, 1250-146 Lisboa, Portugal',
    '+351 912 345 678',
    'contacto@digitalclinica.pt',
    '€',
    'min',
    '1 200+',
    '8+',
    '3',
    '99%',
    '100%',
    '4.9/5',
    '08h30 - 19h00',
    'PT',
    'EN',
    'FR',
    'MBWAY',
    'MULTIBANCO',
  ]);

  for (const key of Object.keys(baseObj)) {
    const fullPath = currentPath ? `${currentPath}.${key}` : key;
    const baseVal = baseObj[key];
    const targetVal = targetObj ? targetObj[key] : undefined;

    if (typeof baseVal === 'string' && typeof targetVal === 'string') {
      const bTrim = baseVal.trim();
      const tTrim = targetVal.trim();
      if (bTrim.length > 25 && bTrim === tTrim && !ignored.has(bTrim)) {
        issues.identicalUntranslated.push({
          lang: targetLang,
          path: fullPath,
          text: bTrim.slice(0, 50) + '...',
        });
      }
    } else if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
      if (typeof targetVal === 'object' && targetVal !== null) {
        checkUntranslatedDuplicates(baseVal, targetVal, targetLang, fullPath);
      }
    }
  }
}

checkUntranslatedDuplicates(pt, en, 'en');
checkUntranslatedDuplicates(pt, fr, 'fr');

console.log(`  UI Dictionary Keys checked: ${Object.keys(pt).length} namespaces.`);
console.log(`  Missing Keys in EN / FR   : ${issues.missingKeys.length}`);
console.log(`  Extraneous / Orphan Keys  : ${issues.extraKeys.length}`);
console.log(`  Empty Translations        : ${issues.emptyTranslations.length}`);
console.log(`  Suspicious Copied Strings : ${issues.identicalUntranslated.length}\n`);

// ─── 2. CLINICAL SERVICES LOCALIZATION AUDIT ─────────────────────────────────
console.log('--- [2/5] AUDITING CLINICAL SERVICES DATA (runtime catalogue) ---');
for (const s of SERVICES) {
  const checkFields = ['name', 'shortDesc', 'longDesc'];
  for (const f of checkFields) {
    for (const l of ['pt', 'en', 'fr']) {
      if (!s[f] || !s[f][l] || !s[f][l].trim()) {
        issues.servicesMissingLocale.push({ slug: s.slug, field: f, lang: l });
      }
    }
  }
  // Check array fields: indications, contraindications, sessionFlow
  const checkListFields = ['indications', 'contraindications', 'sessionFlow'];
  for (const lf of checkListFields) {
    for (const l of ['pt', 'en', 'fr']) {
      if (!s[lf] || !Array.isArray(s[lf][l]) || s[lf][l].length === 0) {
        issues.servicesMissingLocale.push({ slug: s.slug, field: `${lf}[]`, lang: l });
      }
    }
  }
  // Check FAQs
  if (Array.isArray(s.faq)) {
    s.faq.forEach((faqItem, idx) => {
      for (const l of ['pt', 'en', 'fr']) {
        if (!faqItem.q || !faqItem.q[l] || !faqItem.q[l].trim()) {
          issues.servicesMissingLocale.push({ slug: s.slug, field: `faq[${idx}].q`, lang: l });
        }
        if (!faqItem.a || !faqItem.a[l] || !faqItem.a[l].trim()) {
          issues.servicesMissingLocale.push({ slug: s.slug, field: `faq[${idx}].a`, lang: l });
        }
      }
    });
  }
}
console.log(`  Services Audited          : ${SERVICES.length} services`);
console.log(`  Missing Locales in Services: ${issues.servicesMissingLocale.length}\n`);

// Static pricing packages were removed; prices are audited in the runtime catalogue.
// ─── 4. BLOG POSTS & ARTICLES LOCALIZATION AUDIT ─────────────────────────────
console.log('--- [4/5] AUDITING BLOG POSTS & HEALTH ARTICLES (src/data/blog-posts.ts) ---');
for (const b of BLOG_POSTS) {
  for (const l of ['pt', 'en', 'fr']) {
    if (!b.title || !b.title[l] || !b.title[l].trim()) {
      issues.blogMissingLocale.push({ slug: b.slug, field: 'title', lang: l });
    }
    if (!b.excerpt || !b.excerpt[l] || !b.excerpt[l].trim()) {
      issues.blogMissingLocale.push({ slug: b.slug, field: 'excerpt', lang: l });
    }
    if (!b.content || !b.content[l] || !b.content[l].trim()) {
      issues.blogMissingLocale.push({ slug: b.slug, field: 'content', lang: l });
    }
  }
}
console.log(`  Blog Posts Audited        : ${BLOG_POSTS.length} posts`);
console.log(`  Missing Locales in Blog   : ${issues.blogMissingLocale.length}\n`);

// Patient-authored reviews are database records in their original language, not seeded translations.

// ─── FINAL DIAGNOSTIC REPORT ─────────────────────────────────────────────────
console.log('========================================================================');
console.log('📊 DETAILED AUDIT FINDINGS & DEFECT INVENTORY');
console.log('========================================================================');

let totalDefects = 0;
for (const [category, list] of Object.entries(issues)) {
  totalDefects += list.length;
  if (list.length > 0) {
    console.log(`\n❌ [${category.toUpperCase()}] — ${list.length} Defect(s):`);
    list.slice(0, 10).forEach(item => {
      console.log(`   • ${JSON.stringify(item)}`);
    });
    if (list.length > 10) {
      console.log(`   ... and ${list.length - 10} more`);
    }
  }
}

if (totalDefects === 0) {
  console.log('\n🎉 100% LOCALE COMPLETENESS: ZERO MISSING KEYS OR LOCALES FOUND!');
} else {
  console.log(`\n⚠️ TOTAL i18n DEFECTS FOUND: ${totalDefects}`);
}
console.log('========================================================================');
