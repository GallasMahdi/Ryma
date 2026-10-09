// Isolated regression tests: no credentials, network, emails, or real database writes.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const root = path.resolve(__dirname, '..');

function createLoader(mocks = {}) {
  const cache = new Map();
  function load(request, parent = path.join(root, 'index.js')) {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    let filename = request.startsWith('@/') ? path.join(root, 'src', request.slice(2))
      : request.startsWith('.') ? path.resolve(path.dirname(parent), request) : request;
    if (!path.isAbsolute(filename)) return require(filename);
    if (fs.existsSync(filename + '.ts')) filename += '.ts';
    if (fs.existsSync(filename + '.tsx')) filename += '.tsx';
    if (!/\.tsx?$/.test(filename)) return require(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename, module);
    cache.set(filename, mod);
    mod.filename = filename;
    mod.paths = module.paths;
    mod.require = id => load(id, filename);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    mod._compile(source, filename);
    return mod.exports;
  }
  return load;
}

const load = createLoader();
const { validateAndNormalizePhone, requireNormalizedPhone } = load('@/lib/phone');
const valid = [
  ['912345678', '+351912345678'], ['912 345 678', '+351912345678'],
  ['+351 912 345 678', '+351912345678'], ['00351 912 345 678', '+351912345678'],
  ['  912\u00a0345\u202f678  ', '+351912345678'],
  ['212345678', '+351212345678'], ['961234567', '+351961234567'],
  ['+33 6 12 34 56 78', '+33612345678'], ['0033 6 12 34 56 78', '+33612345678'],
  ['+44 20 7946 0018', '+442079460018'], ['+1 213 373 4253', '+12133734253'],
  ['+216 20 123 456', '+21620123456'],
];
const invalid = [
  '.', ')', '(', '912345678.', '912345678)', '(912345678)', '912.345.678',
  '912-345-678', 'Call +351912345678', '+351912345678 ext 123',
  '91234567', '9123456789', '912345', '111111111', '999999999',
  '+3519123456', '+3519123456789', '+351111111111', '+351991234567',
  '+999912345678', '+12345678', '+3510912345678', '351912345678',
  '++351912345678', '+ 351912345678', '912+345678', '00351',
  '+0123456789', '+351912345678901234', '912345678\n', '\t912345678',
  '912\r\n345678', '９１２３４５６７８', '912\u200b345678', '912345678'.padEnd(65, ' '),
  912345678, ['912345678'], { phone: '912345678' }, true,
];

test('strict full-number validation, normalization and localized errors', () => {
  for (const [input, normalized] of valid) {
    const result = validateAndNormalizePhone(input);
    assert.equal(result.isValid, true, input);
    assert.equal(result.normalized, normalized);
    assert.equal(validateAndNormalizePhone(result.formatted).normalized, normalized);
    assert.equal(requireNormalizedPhone(input), normalized);
  }
  for (const lang of ['pt', 'en', 'fr']) {
    for (const input of [...invalid, '', '   ', null, undefined]) {
      const result = validateAndNormalizePhone(input, lang);
      assert.equal(result.isValid, false, JSON.stringify(input));
      assert.equal(result.normalized, '');
      assert(result.error && result.errorCode);
    }
  }
  // Invalid characters must never disappear when inserted anywhere in a valid number.
  for (const character of ['.', ')', '(', '-', 'a', '/', '\\', '\n', '\t', '\0', '\u200b']) {
    for (let i = 0; i <= 13; i++) {
      const input = '+351912345678';
      assert.equal(validateAndNormalizePhone(input.slice(0, i) + character + input.slice(i)).isValid, false);
    }
  }
});

test('every write API rejects invalid phones and passes only E.164 to persistence', async () => {
  const writes = [];
  let authorized = true;
  const db = new Proxy({
    dbCheckRateLimit: async () => true,
    dbConsumeRateLimit: async () => true,
    dbRecordRateLimitAttempt: async () => {},
    dbGetIdempotencyKey: async () => null,
    dbSaveIdempotencyKey: async () => {},
    dbCreateAppointment: async input => { writes.push(input); return { success: true, appointment: { id: 'test', ...input } }; },
    dbCreateMultipleAppointments: async input => { writes.push(input); return { success: true, appointments: [], patientSessions: [], patientId: 'test' }; },
    dbUpsertPatient: async input => { writes.push(input); return input; },
    dbCreateInvoice: async input => { writes.push(input); return input; },
    dbCreatePrescription: async input => { writes.push(input); return input; },
  }, { get(target, key) { if (!(key in target)) throw new Error(`Unexpected database access: ${String(key)}`); return target[key]; } });
  const loadRoute = createLoader({
    'next/server': {NextRequest,NextResponse,after(){}},
    '@/lib/db': db,
    '@/lib/treatments': {getTreatments:async()=>require('./fixtures/services.cjs').SERVICES,isKnownTreatment:async slug=>require('./fixtures/services.cjs').SERVICES.some(s=>s.slug===slug)},
    '@/lib/booking-service': { findBookingReplay: async () => null },
    '@/lib/requireAdmin': { requireAdmin: async () => authorized ? { ok: true } : NextResponse.json({}, { status: 401 }) },
    '@/lib/events': { broadcastAppointmentCreated() {} },
    '@/lib/email': { sendAppointmentConfirmationEmail: async () => {}, sendAdminNewBookingNotification: async () => {} },
    '@/lib/recaptcha': { verifyRecaptchaToken: async () => ({ valid: true }) },
  });
  const { SERVICES } = require('./fixtures/services.cjs');
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const body = { patientName: 'Validation Test', phone: '', patientPhone: '', service: SERVICES[0].slug,
    serviceSlug: SERVICES[0].slug, date, startTime: '14:30', sessions: [{ date, startTime: '14:30' }],
    clientRequestId:'phone-validation-intent', amount: 50, items: [{ title: 'Test', instructions: 'Test' }], recaptchaToken: 'isolated-test' };
  for (const route of ['appointments', 'admin/appointments', 'admin/appointments/multiple', 'admin/patients', 'admin/invoices', 'admin/prescriptions']) {
    const { POST } = loadRoute(`@/app/api/${route}/route`);
    const request = phone => new NextRequest(`http://localhost/api/${route}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, phone, patientPhone: phone }),
    });
    for (const phone of invalid) {
      writes.length = 0;
      const response = await POST(request(phone));
      assert.equal(response.status, 422, `${route}: ${JSON.stringify(phone)}`);
      assert.equal(writes.length, 0, `${route} must not persist invalid input`);
    }
    for (const [phone, normalized] of valid) {
      writes.length = 0;
      const response = await POST(request(phone));
      assert(response.status >= 200 && response.status < 300, `${route}: ${phone} (${response.status})`);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].phone || writes[0].patientPhone, normalized);
    }
    if (route.startsWith('admin/')) {
      authorized = false;
      assert.equal((await POST(request('912345678'))).status, 401);
      authorized = true;
    }
  }
});

test('persistence methods fail closed before contacting any database', async () => {
  const noDatabase = () => { throw new Error('Database must not be contacted'); };
  const db = createLoader({ '@libsql/client': { createClient: noDatabase }, 'better-sqlite3': noDatabase })('@/lib/db');
  assert.deepEqual(await db.dbCreateAppointment({ phone: '912345678)' }), { success: false, error: 'invalid_data' });
  assert.equal((await db.dbCreateMultipleAppointments({ phone: '.', sessions: [{}] })).error, 'invalid_input');
  for (const action of [
    () => db.dbUpsertPatient({ phone: ')' }),
    () => db.dbUpsertPatientNote('912345678.', 'Test', '', ''),
    () => db.dbEnsurePatientNote('912345678)', 'Test'),
    () => db.dbCreateInvoice({ patientPhone: '.' }, 'test-invalid'),
    () => db.dbCreatePrescription({ patientPhone: ')' }),
  ]) await assert.rejects(action, /INVALID_PHONE/);
});
