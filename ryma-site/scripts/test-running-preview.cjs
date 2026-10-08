const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Database = require('better-sqlite3');

// Deliberately limited to the isolated launcher and its known synthetic credentials.
const fixture = path.resolve(process.env.RYMA_PREVIEW_DB || 'missing');
assert(fixture.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(fixture) === 'fixture.db' && fs.existsSync(path.dirname(fixture)), 'Set RYMA_PREVIEW_DB to the running preview fixture');
const port = Number(process.env.RYMA_PREVIEW_PORT || 3007);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Invalid preview port');
const base = 'http://127.0.0.1:' + port;
let cookie = '', count = 0, sequence = 963100000;
const result = [];
async function call(url, { method = 'GET', body, auth = true, raw, headers = {} } = {}) {
  const res = await fetch(base + url, { method, redirect: 'manual', headers: { Origin: base, ...(auth && cookie ? { Cookie: cookie } : {}), ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body !== undefined || raw !== undefined ? { body: raw ?? JSON.stringify(body) } : {}) });
  if (auth && res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0];
  return res;
}
async function check(name, fn) { await fn(); count++; result.push(name); console.log('PASS ' + name); }
const nextDate = new Date(Date.now() + 15 * 86400000);
while (nextDate.getUTCDay() === 0) nextDate.setUTCDate(nextDate.getUTCDate() + 1);
const date = nextDate.toISOString().slice(0, 10);
const booking = overrides => ({ patientName: 'HTTP Test Patient', phone: '+351' + (++sequence), service: 'reeducation-posturale', date, startTime: '09:00', _form_rendered_at: Date.now() - 5000, ...overrides });
const hours = Array.from({ length: 6 }, (_, i) => [{ dayOfWeek: i + 1, startMinute: 510, endMinute: 750 }, { dayOfWeek: i + 1, startMinute: 840, endMinute: 1050 }]).flat();
let configuration, a, b, booked;

(async () => {
  await check('running server and database health', async () => { const r = await call('/api/health', { auth: false }); assert.equal(r.status, 200); assert.equal((await r.json()).status, 'healthy'); });
  await check('all public pages and an unknown page render correctly', async () => {
    for (const page of ['/', '/a-propos', '/tarifs', '/avis', '/services', '/services/reeducation-posturale', '/blog', '/contact', '/rendez-vous', '/mentions-legales', '/confidentialite', '/conditions-utilisation']) {
      const r = await call(page, { auth: false }); assert.equal(r.status, 200, page); assert.match(await r.text(), /<html/);
    }
    const unknown = await call('/definitely-not-a-page', { auth: false });
    assert.equal(unknown.status, 307); assert.equal(unknown.headers.get('location'), '/');
  });
  await check('anonymous users cannot read any admin dataset', async () => {
    for (const url of ['/api/admin/appointments', '/api/admin/patients', '/api/admin/invoices', '/api/admin/prescriptions', '/api/admin/reviews', '/api/admin/practitioners', '/api/admin/slots?date=' + date, '/api/admin/analytics']) assert.equal((await call(url, { auth: false })).status, 401, url);
  });
  await check('bad login rejected; valid login sets a usable protected session', async () => {
    assert.equal((await call('/api/admin/login', { method: 'POST', body: { password: 'incorrect-fixture' } })).status, 401);
    const r = await call('/api/admin/login', { method: 'POST', body: { password: 'team-preview-only' } }); assert.equal(r.status, 200); assert(cookie); assert.equal((await call('/api/admin/me')).status, 200);
  });
  await check('team configuration persists through the real API', async () => {
    configuration = await (await call('/api/admin/practitioners')).json();
    a = configuration.practitioners.find(p => p.id === 'legacy');
    const services = configuration.services.filter(s => s.practitionerId === a.id);
    let r = await call('/api/admin/practitioners', { method: 'POST', body: { revision: configuration.revision, action: 'practitioner', practitioner: { ...a, name: 'Dr. Teste A', profession: 'Médico', color: '#2563eb' }, services, hours } });
    assert.equal(r.status, 200, await r.clone().text()); configuration = await r.json();
    r = await call('/api/admin/practitioners', { method: 'POST', body: { revision: configuration.revision, action: 'practitioner', practitioner: { name: 'Fisioterapeuta Teste B', profession: 'Fisioterapeuta', color: '#059669', active: 1, bookable: 1, priority: 1 }, services, hours } });
    assert.equal(r.status, 200, await r.clone().text()); configuration = await r.json(); b = configuration.practitioners.find(p => p.name === 'Fisioterapeuta Teste B'); assert(b);
  });
  await check('stale configuration edit returns conflict', async () => {
    assert.equal((await call('/api/admin/practitioners', { method: 'POST', body: { revision: configuration.revision - 1, action: 'clinic-hours', hours } })).status, 409);
  });
  await check('malformed JSON and invalid selections return errors, not server crashes', async () => {
    assert.equal((await call('/api/appointments', { method: 'POST', raw: '{', auth: false })).status, 400);
    for (const data of [{ practitionerId: 42 }, { date: '2027-02-30' }, { startTime: '09:15' }, { phone: '123' }]) assert.equal((await call('/api/appointments', { method: 'POST', body: booking(data), auth: false })).status, 422);
    assert.equal((await call('/api/appointments', { method: 'POST', body: booking({ _hp_company: 'bot' }), auth: false })).status, 403);
  });
  await check('public named booking and five retries create one pending reservation', async () => {
    const body = booking({ practitionerId: b.id, clientRequestId: 'http-' + Date.now() });
    const ids = [];
    for (let i = 0; i < 5; i++) { const r = await call('/api/appointments', { method: 'POST', body, auth: false }); assert.equal(r.status, 201, await r.clone().text()); const data = await r.json(); ids.push(data.confirmation.id); assert.equal(data.confirmation.practitionerId, b.id); assert.equal(data.confirmation.status, 'PENDING'); }
    assert.equal(new Set(ids).size, 1); booked = (await (await call('/api/admin/appointments/' + ids[0])).json()).appointment;
  });
  await check('parallel appointments on different practitioners succeed and overlaps fail', async () => {
    assert.equal((await call('/api/admin/appointments', { method: 'POST', body: booking({ practitionerId: a.id }) })).status, 201);
    assert.equal((await call('/api/admin/appointments', { method: 'POST', body: booking({ practitionerId: b.id, startTime: '09:30' }) })).status, 409);
    assert.equal((await call('/api/admin/appointments', { method: 'POST', body: booking({ practitionerId: a.id, startTime: '09:00', phone: booked.phone }) })).status, 409);
  });
  await check('concurrent earliest requests consume only actual team capacity', async () => {
    const responses = await Promise.all(Array.from({ length: 10 }, () => call('/api/appointments', { method: 'POST', auth: false, body: booking({ startTime: '10:00', clientRequestId: crypto.randomUUID() }) })));
    assert.equal(responses.filter(r => r.status === 201).length, 2);
    assert(responses.every(r => [201, 409].includes(r.status)));
  });
  await check('rescheduling is versioned and malformed patches preserve the record', async () => {
    const url = '/api/admin/appointments/' + booked.id;
    assert.equal((await call(url, { method: 'PATCH', body: { date: null } })).status, 422);
    const moved = await call(url, { method: 'PATCH', body: { startTime: '11:00', expectedVersion: booked.version } }); assert.equal(moved.status, 200); const changed = (await moved.json()).appointment;
    assert.equal(changed.startTime, '11:00');
    assert.equal((await call(url, { method: 'PATCH', body: { notes: 'stale', expectedVersion: booked.version } })).status, 409);
    assert.equal((await call(url, { method: 'PATCH', body: { status: 'CANCELLED', expectedVersion: changed.version } })).status, 200);
  });
  await check('practitioner closures do not close another professional', async () => {
    assert.equal((await call('/api/admin/slots/bulk', { method: 'POST', body: { date, scope: 'custom', times: ['14:00'], practitionerId: b.id } })).status, 200);
    for (const [id, expected] of [[a.id, true], [b.id, false]]) {
      const r = await call('/api/slots?date=' + date + '&service=reeducation-posturale&practitionerId=' + id, { auth: false }); const body = await r.json(); assert.equal(body.slots.find(s => s.time === '14:00').available, expected);
      assert(!JSON.stringify(body).includes('patientName'));
    }
  });
  await check('admin alone cannot access owner analytics; explicit owner unlock works', async () => {
    assert.equal((await call('/api/admin/analytics')).status, 403);
    assert.equal((await call('/api/admin/analytics/verify', { method: 'POST', body: { password: 'owner-preview-only' } })).status, 200);
    assert.equal((await call('/api/admin/analytics')).status, 200);
    assert.equal((await call('/api/admin/export?type=appointments')).status, 200);
  });
  await check('logout revokes a copied session cookie', async () => {
    const oldCookie = cookie;
    assert.equal((await call('/api/admin/logout', { method: 'POST', body: {} })).status, 200);
    cookie = oldCookie; assert.equal((await call('/api/admin/me')).status, 401); cookie = '';
  });
  await check('live fixture integrity and foreign keys remain valid', async () => {
    const database = new Database(fixture, { readonly: true });
    try {
      assert.deepEqual(database.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
      assert.equal(database.pragma('foreign_key_check').length, 0);
      assert.equal(database.prepare('SELECT COUNT(*) AS count FROM patients').get().count, database.prepare('SELECT COUNT(DISTINCT phone) AS count FROM appointments').get().count, 'Failed requests must not create patient profiles');
    } finally { database.close(); }
  });
  const report = { date: new Date().toISOString(), checksPassed: count, testAppointmentDate: date, checks: result };
  const destination = path.resolve(__dirname, '../../output/multi-practitioner/running-app-tests.json');
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, JSON.stringify(report, null, 2));
  console.log(`${count} running-app checks passed. Preview remains available at ${base}.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
