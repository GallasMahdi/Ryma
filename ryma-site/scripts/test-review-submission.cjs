// Isolated form-to-route regression tests. No real Google calls or database writes.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { NextRequest } = require('next/server');
const root = path.resolve(__dirname, '..');

function clock() {
  let now = 0, nextId = 0;
  const timers = new Map();
  return {
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { at: now + delay, callback }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = ++nextId; timers.set(id, { at: now + delay, callback, repeat: delay }); return id; },
    clearInterval(id) { timers.delete(id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        if (next[1].repeat) next[1].at += next[1].repeat;
        else timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    },
    get size() { return timers.size; },
  };
}

function loader(mocks, globals) {
  const cache = new Map();
  const context = vm.createContext({
    console: { warn() {}, error() {} }, URLSearchParams, AbortSignal,
    ...globals,
  });
  function load(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (!id.startsWith('@/')) return require(id);
    const base = path.join(root, 'src', id.slice(2));
    const filename = ['.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync);
    assert(filename, `Missing module: ${id}`);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
    }).outputText;
    vm.runInContext(`(function(require, module, exports) {${compiled}\n})`, context)(load, mod, mod.exports);
    return mod.exports;
  }
  return load;
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function find(tree, predicate) {
  const node = nodes(tree).find(predicate);
  assert(node, 'Expected form control is missing');
  return node;
}

function fixture(options = {}) {
  const timers = clock();
  const env = { NODE_ENV: 'production', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'fixture-site-key', RECAPTCHA_SECRET_KEY: 'fixture-secret', ...options.env };
  const writes = [], posts = [], executions = [], reads = [];
  const storedReviews = new Map();
  let googleCalls = 0, attempts = 0, hookIndex = 0;
  const state = [];
  const effects = new Map(), cleanup = new Map();
  const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const recaptcha = {
    ready(callback) { callback(); },
    async execute(key, { action }) {
      executions.push({ key, action });
      return `fixture-token-${executions.length}`;
    },
  };
  if (!options.delayedScript) window.grecaptcha = recaptcha;
  let route;
  const mocks = {
    react: {
      ...React,
      useState(initial) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useRef(initial) {
        const index = hookIndex++;
        if (!(index in state)) state[index] = { current: initial };
        return state[index];
      },
      useEffect(callback, deps) {
        const index = hookIndex++;
        if (!sameDeps(state[index], deps)) {
          state[index] = deps;
          effects.set(index, callback);
        }
      },
      useCallback(callback, deps) {
        const index = hookIndex++;
        if (!sameDeps(state[index]?.deps, deps)) state[index] = { deps, callback };
        return state[index].callback;
      },
    },
    'next/link': 'a', 'next/script': 'fixture-script',
    'framer-motion': { AnimatePresence: 'fixture-presence', motion: new Proxy({}, { get: (_, key) => key }) },
    '@tabler/icons-react': new Proxy({}, { get: (_, key) => `fixture-${String(key)}` }),
    '@/components/layout/EditorialPageHeader': { EditorialPageHeader: 'fixture-header' },
    '@/components/layout/EditorialPageHeader.module.css': {},
    '@/components/animation/ScrollReveal': { ScrollReveal: 'fixture-reveal' },
    '@/data/editorial-pages': { EDITORIAL_PAGES: { reviews: { en: { secondary: 'Write review' } } } },
    '@/components/ServiceCatalogProvider': {useServices:()=>require('./fixtures/services.cjs').SERVICES},
    '@/lib/treatments': {isKnownTreatment:async slug=>require('./fixtures/services.cjs').SERVICES.some(s=>s.slug===slug)},
    '@/data/testimonials': { TESTIMONIALS: [] },
    '@/lib/i18n': { useLanguage: () => ({ lang: 'en', t: { common: { bookAppointment: 'Book', readMore: 'Read reviews' } } }) },
    '@/lib/sound': { playSoftClick() {}, playNotificationChime() {} },
    '@/lib/validation': { getClientIp: () => 'fixture-ip' },
    '@/lib/requireAdmin': { requireAdmin: async () => ({ ok: true }) },
    '@/lib/db': {
      dbConsumeRateLimit: async () => { if(options.rateLimited)return false;attempts++;return true; },
      dbCheckRateLimit: async () => !options.rateLimited,
      dbRecordRateLimitAttempt: async () => { attempts++; },
      dbCreateReview: async input => {
        writes.push(input);
        const review = { id: `fixture-review-${writes.length}`, createdAt: '2026-09-30', ...input };
        storedReviews.set(review.id, review);
        return review;
      },
      dbGetApprovedReviews: async ({ limit } = {}) => [...storedReviews.values()].filter(review => review.status === 'APPROVED').slice(0, limit),
      dbGetApprovedReviewStats: async () => {const rows=[...storedReviews.values()].filter(r=>r.status==='APPROVED');return {total:rows.length,average:rows.length?rows.reduce((n,r)=>n+r.rating,0)/rows.length:0};},
      dbUpdateReviewStatus: async (id, updates) => {
        const review = storedReviews.get(id);
        if (!review) return null;
        const updated = { ...review, ...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)) };
        storedReviews.set(id, updated);
        return updated;
      },
    },
  };
  const load = loader(mocks, {
    window, document, AbortController, process: { env },
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    setInterval: timers.setInterval, clearInterval: timers.clearInterval,
    fetch: async (url, init) => {
      if (url === 'https://www.google.com/recaptcha/api/siteverify') {
        googleCalls++;
        throw new Error('Reviews must not call Google verification');
      }
      assert.equal(new URL(url, 'http://fixture.invalid').pathname, '/api/reviews', 'Unexpected outbound request');
      if (init?.method === 'POST') {
        posts.push(JSON.parse(init.body));
        if (options.apiNetworkFailure) throw new Error('Fixture network failure');
        return route.POST(new NextRequest('http://fixture.invalid/api/reviews', init));
      }
      reads.push({ url, ...init });
      if (options.readFailure) return Response.json({}, { status: 503 });
      return route.GET(new NextRequest('http://fixture.invalid' + url));
    },
  });
  route = load('@/app/api/reviews/route');
  const adminRoute = load('@/app/api/admin/reviews/route');
  const Page = options.homepage ? load('@/components/sections/TestimonialsSection').TestimonialsSection : load('@/app/avis/page').default;
  const render = () => { hookIndex = 0; return Page(); };
  const openForm = () => {
    find(render(), node => node.type === 'button' && node.props.children === 'Write review').props.onClick();
    const tree = render();
    find(tree, node => node.props?.placeholder === 'Ex: Beatriz Lima').props.onChange({ target: { value: 'Review Fixture' } });
    find(tree, node => node.type === 'select').props.onChange({target:{value:'reeducation-posturale'}});
    find(tree, node => node.type === 'textarea').props.onChange({ target: { value: 'Isolated review submission test.' } });
  };
  return {
    timers, env, window, document, recaptcha, writes, posts, reads, executions, render, openForm,
    settle: () => new Promise(setImmediate),
    flushEffects: async () => {
      for (const [index, callback] of effects) {
        cleanup.get(index)?.();
        cleanup.set(index, callback());
      }
      effects.clear();
      await new Promise(setImmediate);
    },
    unmount: () => { for (const dispose of cleanup.values()) dispose?.(); cleanup.clear(); },
    moderate: (id, status) => adminRoute.PATCH(new NextRequest('http://fixture.invalid/api/admin/reviews', {
      method: 'PATCH', body: JSON.stringify({ id, status }),
    })),
    get: () => route.GET(new NextRequest('http://fixture.invalid/api/reviews')),
    token: load('@/lib/recaptcha-client').getRecaptchaToken,
    submit: () => find(render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    post: body => route.POST(new NextRequest('http://fixture.invalid/api/reviews', { method: 'POST', body: JSON.stringify(body) })),
    get googleCalls() { return googleCalls; }, get attempts() { return attempts; },
  };
}

test('review form submits without reCAPTCHA and creates a pending review through the real route', async () => {
  const f = fixture();
  assert.equal(nodes(f.render()).some(node => node.type === 'fixture-script'), false);
  f.openForm();
  await f.submit();
  assert.equal(f.executions.length, 0);
  assert.equal('recaptchaToken' in f.posts[0], false);
  assert.equal(f.googleCalls, 0);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].status, 'PENDING');
  assert.equal(f.writes[0].verified, false);
  assert.equal(f.attempts, 1);
  assert(nodes(f.render()).some(node => typeof node.props?.children === 'string' && node.props.children.includes('after approval')));
  f.timers.advance(2200);
  f.openForm();
  await f.submit();
  assert.equal(f.writes.length, 2);
  assert.equal(f.attempts, 2);
});

test('blocked Google scripts and missing or placeholder keys do not delay review submission', async () => {
  for (const env of [{}, { NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '', RECAPTCHA_SECRET_KEY: '' }]) {
    const f = fixture({ delayedScript: true, env });
    f.openForm();
    const submitted = f.submit();
    assert.equal(f.posts.length, 1, 'Review should post immediately without waiting for Google');
    await submitted;
    assert.equal(f.writes.length, 1);
    assert.equal(f.googleCalls, 0);
  }
});

test('public review endpoint accepts submissions without a token, including stale clients', async () => {
  const body = { serviceSlug:'reeducation-posturale', patientName: 'Review Fixture', rating: 5, comment: 'Isolated review test.' };
  for (const recaptchaToken of [undefined, 'expired-legacy-token']) {
    const f = fixture({ env: { RECAPTCHA_SECRET_KEY: '' } });
    const response = await f.post({ ...body, recaptchaToken });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).review.status, 'PENDING');
    assert.equal(f.googleCalls, 0);
    assert.equal(f.writes.length, 1);
  }
});

test('network failure preserves the review text and allows retry', async () => {
  const options = { apiNetworkFailure: true };
  const f = fixture(options);
  f.openForm();
  await f.submit();
  const tree = f.render();
  assert.equal(find(tree, node => node.type === 'textarea').props.value, 'Isolated review submission test.');
  assert(nodes(tree).some(node => node.props?.children === 'Connection Error'));
  assert.equal(f.writes.length, 0);
  options.apiNetworkFailure = false;
  await f.submit();
  assert.equal(f.writes.length, 1);
});

test('review validation still rejects incomplete and unsafe input', async () => {
  const f = fixture();
  const valid = { serviceSlug:'reeducation-posturale', patientName: 'Review Fixture', rating: 5, comment: 'Isolated review test.' };
  for (const [override, status] of [
    [{ patientName: '' }, 400], [{ rating: 6 }, 400], [{ comment: 'Bad' }, 400],
    [{ patientName: '<script>' }, 422], [{ comment: '<script>alert(1)</script>' }, 422],
  ]) assert.equal((await f.post({ ...valid, ...override })).status, status);
  assert.equal(f.writes.length, 0);
});

test('rate limits, honeypots and malformed payloads still block submissions', async () => {
  const limited = fixture({ rateLimited: true });
  assert.equal((await limited.post({})).status, 429);
  assert.equal(limited.googleCalls, 0);
  const f = fixture();
  for (const body of [null, [], { honeypot: 'spam' }]) assert.equal((await f.post(body)).status, 400);
  assert.equal(f.googleCalls, 0);
  assert.equal(f.writes.length, 0);
});

test('shared client helper preserves the booking action and local unconfigured behavior', async () => {
  const f = fixture();
  assert.equal(await f.token(), 'fixture-token-1');
  assert.equal(f.executions[0].action, 'booking');
  f.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = '';
  assert.equal(await f.token('review'), null);
});

test('approval refreshes an already-open public page without exposing pending or rejected reviews', async () => {
  const f = fixture();
  f.render();
  await f.flushEffects();
  assert.equal(f.reads[0].cache, 'no-store');
  const response = await f.post({ serviceSlug:'reeducation-posturale', patientName: 'New Approved Visitor', rating: 5, comment: 'Moderation visibility fixture.' });
  const { review } = await response.json();
  assert.equal((await (await f.get()).json()).reviews.length, 0);
  assert.match((await f.get()).headers.get('cache-control'), /no-store/);
  assert.equal((await f.moderate(review.id, 'APPROVED')).status, 200);

  f.window.dispatchEvent(new Event('focus'));
  await f.settle();
  assert(nodes(f.render()).some(node => node.props?.children === 'New Approved Visitor'));

  await f.moderate(review.id, 'REJECTED');
  f.timers.advance(60_000);
  await f.settle();
  assert.equal(nodes(f.render()).some(node => node.props?.children === 'New Approved Visitor'), false);
  assert(nodes(f.render()).some(node => typeof node.props?.children === 'string' && node.props.children.startsWith('No reviews have been published')));
  f.unmount();
});

test('homepage refreshes approved reviews and clears its carousel when none remain', async () => {
  const f = fixture({ homepage: true });
  assert.equal(f.render(), null);
  await f.flushEffects();
  assert.equal(f.reads[0].url, '/api/reviews?limit=16');
  assert.equal(f.reads[0].cache, 'no-store');
  const response = await f.post({ serviceSlug:'reeducation-posturale', patientName: 'Homepage Visitor', rating: 5, comment: 'Homepage visibility fixture.' });
  const { review } = await response.json();
  await f.moderate(review.id, 'APPROVED');
  f.document.dispatchEvent(new Event('visibilitychange'));
  await f.settle();
  const rendered = nodes(f.render()).flatMap(node => node.props?.testimonials ?? []);
  assert(rendered.some(item => item.id === review.id));
  await f.moderate(review.id, 'REJECTED');
  f.timers.advance(60_000);
  await f.settle();
  assert.equal(f.render(), null);
  f.unmount();
});

test('background refresh pauses while hidden and stops after unmount', async () => {
  const f = fixture();
  f.render();
  await f.flushEffects();
  const initialReads = f.reads.length;
  f.document.visibilityState = 'hidden';
  f.timers.advance(30_000);
  await f.settle();
  assert.equal(f.reads.length, initialReads);
  f.document.visibilityState = 'visible';
  f.document.dispatchEvent(new Event('visibilitychange'));
  await f.settle();
  assert.equal(f.reads.length, initialReads + 1);
  f.unmount();
  f.window.dispatchEvent(new Event('focus'));
  f.timers.advance(30_000);
  await f.settle();
  assert.equal(f.reads.length, initialReads + 1);
  assert.equal(f.timers.size, 0);
});

test('a failed refresh preserves the last approved data and recovers on focus', async () => {
  const options = {};
  const f = fixture(options);
  const response = await f.post({ serviceSlug:'reeducation-posturale', patientName: 'Existing Visitor', rating: 5, comment: 'Network recovery fixture.' });
  const { review } = await response.json();
  await f.moderate(review.id, 'APPROVED');
  f.render();
  await f.flushEffects();
  options.readFailure = true;
  f.timers.advance(60_000);
  await f.settle();
  assert(nodes(f.render()).some(node => node.props?.children === 'Existing Visitor'));
  await f.moderate(review.id, 'REJECTED');
  options.readFailure = false;
  f.window.dispatchEvent(new Event('focus'));
  await f.settle();
  assert.equal(nodes(f.render()).some(node => node.props?.children === 'Existing Visitor'), false);
  f.unmount();
});
