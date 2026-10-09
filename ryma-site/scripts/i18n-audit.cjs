const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createAppLoader, ROOT } = require('./demo/runtime.cjs');

function compare(base, target, at, issues) {
  if (typeof base === 'string') {
    if (typeof target !== 'string' || (base.trim() && !target.trim())) issues.push(`${at}: missing text`);
    else if (/\bTODO\b|\[MISSING\]|\bFIXME\b/.test(target)) issues.push(`${at}: translation placeholder`);
    return;
  }
  if (!base || typeof base !== 'object') return;
  if (!target || typeof target !== 'object' || Array.isArray(base) !== Array.isArray(target)) { issues.push(`${at}: missing structure`); return; }
  for (const key of Object.keys(base)) compare(base[key], target[key], `${at}.${key}`, issues);
  for (const key of Object.keys(target)) if (!(key in base)) issues.push(`${at}.${key}: extra key`);
}

function staticAudit() {
  const load = createAppLoader(), issues = [];
  const pt = load('@/data/translations/pt').pt;
  for (const lang of ['en', 'fr', 'es']) compare(pt, load('@/data/translations/' + lang)[lang], lang, issues);
  const posts = load('@/data/blog-posts').BLOG_POSTS;
  for (const post of posts) for (const field of ['title', 'excerpt', 'content']) for (const lang of ['pt', 'en', 'fr', 'es']) {
    if (!post[field]?.[lang]?.trim()) issues.push(`blog.${post.slug}.${field}.${lang}: missing text`);
  }
  const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
  let localizedRecords = 0;
  for (const file of files(path.join(ROOT, 'src'))) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isArrayLiteralExpression(node)) {
        const languages = node.elements.map(e => ts.isStringLiteral(e) ? e.text : ts.isObjectLiteralExpression(e) ? e.properties.find(p => ts.isPropertyAssignment(p) && p.name.text === 'code')?.initializer?.text : undefined);
        if (['pt', 'en', 'fr'].every(l => languages.includes(l)) && !languages.includes('es')) issues.push(`${path.relative(ROOT, file)}: language selector missing es`);
      }
      if (ts.isConditionalExpression(node) && /\blang\b/.test(node.condition.getText(source))) {
        let root = node;
        while (ts.isConditionalExpression(root.parent)) root = root.parent;
        const text = root.getText(source);
        if (root === node && /lang\s*===\s*['"]pt['"]/.test(text) && /lang\s*===\s*['"]en['"]/.test(text) && !/lang\s*===\s*['"]es['"]/.test(text)) issues.push(`${path.relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: language choice missing es`);
      }
      if (ts.isObjectLiteralExpression(node)) {
        const props = new Map(node.properties.filter(ts.isPropertyAssignment).map(p => [p.name.text, p.initializer]));
        if (['pt', 'en', 'fr'].every(l => props.has(l))) {
          localizedRecords++;
          if (!props.has('es')) issues.push(`${path.relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: localized record missing es`);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['txt', 'copy', 'words'].includes(node.expression.text) && node.arguments.length === 3 && node.arguments.every(n => ts.isStringLiteral(n) || ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n))) {
        issues.push(`${path.relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: three-language helper call`);
      }
      node.forEachChild(visit);
    }
    visit(source);
  }
  return { issues, articles: posts.length, localizedRecords };
}

function catalogueAudit(services) {
  const issues = [];
  for (const service of services) {
    // Optional fields need a translation only when content exists in another locale.
    for (const field of ['name', 'shortDesc', 'longDesc', 'sessionFlow', 'indications', 'contraindications']) {
      const value = service[field];
      if (!value || !Object.values(value).some(v => Array.isArray(v) ? v.length : typeof v === 'string' && v.trim())) continue;
      for (const lang of ['pt', 'en', 'fr', 'es']) if (Array.isArray(value.fr) ? !value[lang]?.length : !value[lang]?.trim()) issues.push(`${service.slug}.${field}.${lang}: missing content`);
    }
    for (const [i, faq] of (service.faq || []).entries()) for (const field of ['q', 'a']) for (const lang of ['pt', 'en', 'fr', 'es']) {
      if (!faq[field]?.[lang]?.trim()) issues.push(`${service.slug}.faq.${i}.${field}.${lang}: missing content`);
    }
  }
  return issues;
}

module.exports = { staticAudit, catalogueAudit, compare };
