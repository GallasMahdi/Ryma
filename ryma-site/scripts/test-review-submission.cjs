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
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].callback();
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
  const writes = [], posts = [], executions = [];
  let googleCalls = 0, attempts = 0, hookIndex = 0;
  const state = [];
  const window = {};
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
      useEffect() {},
      useCallback(callback) { return callback; },
    },
    'next/link': 'a', 'next/script': 'fixture-script',
    'framer-motion': { AnimatePresence: 'fixture-presence', motion: new Proxy({}, { get: (_, key) => key }) },
    '@tabler/icons-react': new Proxy({}, { get: (_, key) => `fixture-${String(key)}` }),
    '@/components/layout/EditorialPageHeader': { EditorialPageHeader: 'fixture-header' },
    '@/components/layout/EditorialPageHeader.module.css': {},
    '@/components/animation/ScrollReveal': { ScrollReveal: 'fixture-reveal' },
    '@/data/editorial-pages': { EDITORIAL_PAGES: { reviews: { en: { secondary: 'Write review' } } } },
    '@/data/testimonials': { TESTIMONIALS: [] }, '@/data/services': { SERVICES: [] },
    '@/lib/i18n': { useLanguage: () => ({ lang: 'en', t: { common: { bookAppointment: 'Book' } } }) },
    '@/lib/sound': { playSoftClick() {}, playNotificationChime() {} },
    '@/lib/validation': { getClientIp: () => 'fixture-ip' },
    '@/lib/db': {
      dbCheckRateLimit: async () => !options.rateLimited,
      dbRecordRateLimitAttempt: async () => { attempts++; },
      dbCreateReview: async input => { writes.push(input); return { id: 'fixture-review', createdAt: '2026-09-30', ...input }; },
      dbGetApprovedReviews: async () => [],
    },
  };
  const load = loader(mocks, {
    window, process: { env }, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    fetch: async (url, init) => {
      if (url === 'https://www.google.com/recaptcha/api/siteverify') {
        googleCalls++;
        assert.equal(new URLSearchParams(init.body).get('secret'), 'fixture-secret');
        assert(new URLSearchParams(init.body).get('response').startsWith('fixture-token-'));
        if (options.networkFailure) throw new Error('Fixture network failure');
        return Response.json(options.googleResult ?? { success: true, score: 0.9, action: 'review' }, { status: options.googleStatus ?? 200 });
      }
      assert.equal(url, '/api/reviews', 'Unexpected outbound request');
      if (init?.method === 'POST') {
        posts.push(JSON.parse(init.body));
        return route.POST(new NextRequest('http://fixture.invalid/api/reviews', init));
      }
      return Response.json({ reviews: [] });
    },
  });
  route = load('@/app/api/reviews/route');
  const Page = load('@/app/avis/page').default;
  const render = () => { hookIndex = 0; return Page(); };
  const openForm = () => {
    find(render(), node => node.type === 'button' && node.props.children === 'Write review').props.onClick();
    const tree = render();
    find(tree, node => node.props?.placeholder === 'Ex: Beatriz Lima').props.onChange({ target: { value: 'Review Fixture' } });
    find(tree, node => node.type === 'textarea').props.onChange({ target: { value: 'Isolated review submission test.' } });
  };
  return {
    timers, env, window, recaptcha, writes, posts, executions, render, openForm,
    token: load('@/lib/recaptcha-client').getRecaptchaToken,
    submit: () => find(render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} }),
    post: body => route.POST(new NextRequest('http://fixture.invalid/api/reviews', { method: 'POST', body: JSON.stringify(body) })),
    get googleCalls() { return googleCalls; }, get attempts() { return attempts; },
  };
}

test('review form loads verification and sends a fresh review token through the real route', async () => {
  const f = fixture();
  assert.equal(find(f.render(), node => node.type === 'fixture-script').props.src, 'https://www.google.com/recaptcha/api.js?render=fixture-site-key');
  f.openForm();
  await f.submit();
  assert.equal(f.executions[0].action, 'review');
  assert.equal(f.posts[0].recaptchaToken, 'fixture-token-1');
  assert.equal(f.googleCalls, 1);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].status, 'PENDING');
  assert.equal(f.writes[0].verified, false);
  assert.equal(f.attempts, 1);
  assert(nodes(f.render()).some(node => typeof node.props?.children === 'string' && node.props.children.includes('after approval')));
  f.timers.advance(2200);
  f.openForm();
  await f.submit();
  assert.equal(f.posts[1].recaptchaToken, 'fixture-token-2');
});

test('slow script loading waits before sending the review', async () => {
  const f = fixture({ delayedScript: true });
  f.openForm();
  const submitted = f.submit();
  assert.equal(f.posts.length, 0);
  f.timers.advance(500);
  f.window.grecaptcha = f.recaptcha;
  f.timers.advance(100);
  await submitted;
  assert.equal(f.writes.length, 1);
});

test('blocked script times out, preserves the form, and supports a later retry', async () => {
  const f = fixture({ delayedScript: true });
  f.openForm();
  const submitted = f.submit();
  f.timers.advance(12_000);
  await submitted;
  assert.equal(f.posts.length, 0);
  assert.equal(f.writes.length, 0);
  assert.equal(f.timers.size, 0);
  const tree = f.render();
  assert.equal(find(tree, node => node.type === 'textarea').props.value, 'Isolated review submission test.');
  assert(nodes(tree).some(node => node.props?.children === 'Verification unavailable'));
  f.window.grecaptcha = f.recaptcha;
  await f.submit();
  assert.equal(f.writes.length, 1);
});

test('failed or stalled token execution completes without posting an unverified review', async () => {
  for (const stalled of [false, true]) {
    const f = fixture();
    f.recaptcha.execute = () => stalled ? new Promise(() => {}) : Promise.reject(new Error('Fixture error'));
    f.openForm();
    const submitted = f.submit();
    if (stalled) f.timers.advance(12_000);
    await submitted;
    assert.equal(f.posts.length, 0);
    assert.equal(f.timers.size, 0);
  }
});

test('missing, rejected, low-score and wrong-action tokens never create reviews', async () => {
  const body = { patientName: 'Review Fixture', rating: 5, comment: 'Isolated review test.' };
  const missing = fixture();
  assert.equal((await missing.post(body)).status, 403);
  assert.equal(missing.googleCalls, 0);
  assert.equal(missing.writes.length, 0);
  for (const googleResult of [
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: true, action: 'review', score: 0.1 },
    { success: true, action: 'booking', score: 0.9 },
  ]) {
    const f = fixture({ googleResult });
    assert.equal((await f.post({ ...body, recaptchaToken: 'fixture-token-invalid' })).status, 403);
    assert.equal(f.writes.length, 0);
  }
});

test('service/configuration failures report temporary unavailability and remain closed', async () => {
  for (const options of [{ networkFailure: true }, { googleStatus: 503 }, { env: { RECAPTCHA_SECRET_KEY: '' } }]) {
    const f = fixture(options);
    const response = await f.post({ recaptchaToken: 'fixture-token-valid' });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'SECURITY_VERIFICATION_UNAVAILABLE');
    assert.equal(f.writes.length, 0);
  }
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
