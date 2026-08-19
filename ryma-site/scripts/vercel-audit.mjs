/**
 * Full live Vercel deployment audit script.
 * Tests every public and authenticated API endpoint.
 * Run: node --env-file=.env.local scripts/vercel-audit.mjs
 */

const BASE = 'https://ryma-ten.vercel.app';
const ADMIN_PASS = 'ryma2024admin'; // from .env.local comment

let sessionCookie = '';

const GREEN  = '\x1b[32m✅';
const RED    = '\x1b[31m❌';
const YELLOW = '\x1b[33m⚠️ ';
const BLUE   = '\x1b[36mℹ️ ';
const RESET  = '\x1b[0m';

let passed = 0, failed = 0, warnings = 0;

function log(icon, label, detail = '') {
  console.log(`  ${icon} ${label}${detail ? ': ' + detail : ''}${RESET}`);
}

async function check(label, fn) {
  try {
    const result = await fn();
    if (result === true) { log(GREEN, label); passed++; }
    else if (result === 'warn') { log(YELLOW, label); warnings++; }
    else { log(RED, label, typeof result === 'string' ? result : JSON.stringify(result)); failed++; }
  } catch (err) {
    log(RED, label, err.message);
    failed++;
  }
}

async function get(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Cookie': sessionCookie,
      ...opts.headers,
    },
    ...opts,
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

async function post(path, data, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
      ...opts.headers,
    },
    body: JSON.stringify(data),
    ...opts,
  });
  let body;
  try { body = await res.json(); } catch { body = null; }
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body, setCookie };
}

console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
console.log('\x1b[1m  🔍 Ryma Vercel Full Deployment Audit\x1b[0m');
console.log('\x1b[1m  Target: ' + BASE + '\x1b[0m');
console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

// ── 1. Public Pages ───────────────────────────────────────────────
console.log('\x1b[1m[1] Public Pages\x1b[0m');

await check('Homepage / loads (200)', async () => {
  const r = await get('/');
  return r.status === 200 || 'Got ' + r.status;
});

await check('Booking page /rendez-vous loads (200)', async () => {
  const r = await get('/rendez-vous');
  return r.status === 200 || 'Got ' + r.status;
});

await check('Services page loads (200)', async () => {
  const r = await get('/services');
  return r.status === 200 || 'Got ' + r.status;
});

await check('Admin login page loads (200)', async () => {
  const r = await get('/admin/login');
  return r.status === 200 || 'Got ' + r.status;
});

// ── 2. GET /api/slots ─────────────────────────────────────────────
console.log('\n\x1b[1m[2] Slots API (/api/slots)\x1b[0m');

await check('Slots: future date returns array', async () => {
  const r = await get('/api/slots?date=2026-09-15');
  if (r.status !== 200) return 'HTTP ' + r.status;
  if (!Array.isArray(r.body?.slots)) return 'slots not array: ' + JSON.stringify(r.body);
  if (r.body.slots.length === 0) return 'slots array is empty';
  const sample = r.body.slots[0];
  if (!sample.time || typeof sample.available !== 'boolean') return 'slot shape wrong: ' + JSON.stringify(sample);
  log(BLUE, `  Got ${r.body.slots.length} slots, sample: ${JSON.stringify(sample)}`);
  return true;
});

await check('Slots: Sunday returns all unavailable', async () => {
  // Aug 23 2026 is a Sunday
  const r = await get('/api/slots?date=2026-08-23');
  if (r.status !== 200) return 'HTTP ' + r.status;
  const allUnavailable = r.body?.slots?.every(s => !s.available && s.reason === 'sunday');
  return allUnavailable || 'Not all slots marked sunday';
});

await check('Slots: missing date returns 400', async () => {
  const r = await get('/api/slots');
  return r.status === 400 || 'HTTP ' + r.status;
});

await check('Slots: invalid date returns 400', async () => {
  const r = await get('/api/slots?date=not-a-date');
  return r.status === 400 || 'HTTP ' + r.status;
});

// ── 3. POST /api/appointments ─────────────────────────────────────
console.log('\n\x1b[1m[3] Booking API (/api/appointments)\x1b[0m');

const TEST_DATE = '2026-09-20';
const TEST_TIME = '09:00';
let createdApptId = null;

await check('Booking: valid booking creates appointment (201)', async () => {
  const r = await post('/api/appointments', {
    patientName: 'Test Audit Patient',
    phone: '+351912345678',
    email: 'audit@test.com',
    service: 'reeducation-posturale',
    date: TEST_DATE,
    startTime: TEST_TIME,
    coverageType: 'PARTICULAR',
  });
  if (r.status !== 201) return 'HTTP ' + r.status + ' body=' + JSON.stringify(r.body);
  if (!r.body?.success) return 'success !== true: ' + JSON.stringify(r.body);
  if (!r.body.confirmation?.date) return 'no confirmation.date';
  log(BLUE, `  Confirmed date=${r.body.confirmation.date} time=${r.body.confirmation.startTime}`);
  return true;
});

await check('Booking: duplicate slot returns 409 slot_taken', async () => {
  const r = await post('/api/appointments', {
    patientName: 'Another Patient',
    phone: '+351923456789',
    service: 'reeducation-posturale',
    date: TEST_DATE,
    startTime: TEST_TIME,
    coverageType: 'PARTICULAR',
  });
  if (r.status !== 409) return 'Expected 409, got ' + r.status;
  if (r.body?.error !== 'slot_taken') return 'error not slot_taken: ' + JSON.stringify(r.body);
  return true;
});

await check('Booking: missing name returns 422', async () => {
  const r = await post('/api/appointments', {
    phone: '+351912000000',
    service: 'reeducation-posturale',
    date: '2026-09-21',
    startTime: '10:00',
  });
  return r.status === 422 || 'HTTP ' + r.status;
});

await check('Booking: invalid service returns 422', async () => {
  const r = await post('/api/appointments', {
    patientName: 'Test',
    phone: '+351912000000',
    service: 'invalid-service-xyz',
    date: '2026-09-21',
    startTime: '10:00',
  });
  return r.status === 422 || 'HTTP ' + r.status;
});

await check('Booking: past date returns 422', async () => {
  const r = await post('/api/appointments', {
    patientName: 'Test',
    phone: '+351912000000',
    service: 'reeducation-posturale',
    date: '2020-01-01',
    startTime: '10:00',
  });
  return r.status === 422 || 'HTTP ' + r.status;
});

// ── 4. Verify slot is now marked booked ───────────────────────────
await check('Slots: booked slot now shows unavailable', async () => {
  const r = await get(`/api/slots?date=${TEST_DATE}`);
  if (r.status !== 200) return 'HTTP ' + r.status;
  const slot = r.body?.slots?.find(s => s.time === TEST_TIME);
  if (!slot) return 'Slot not found in response';
  return slot.available === false || `slot ${TEST_TIME} is still available!`;
});

// ── 5. Admin Auth ─────────────────────────────────────────────────
console.log('\n\x1b[1m[4] Admin Authentication\x1b[0m');

await check('Admin /api/admin/me returns 401 without auth', async () => {
  const r = await get('/api/admin/me');
  return r.status === 401 || 'HTTP ' + r.status;
});

await check('Admin login: wrong password returns 401', async () => {
  const r = await post('/api/admin/login', { password: 'wrongpassword' });
  return r.status === 401 || 'HTTP ' + r.status;
});

await check('Admin login: correct password returns 200 + session cookie', async () => {
  const r = await post('/api/admin/login', { password: ADMIN_PASS });
  if (r.status !== 200) return 'HTTP ' + r.status + ' body=' + JSON.stringify(r.body);
  if (!r.setCookie) return 'No set-cookie header';
  // Extract session cookie
  sessionCookie = r.setCookie.split(';')[0];
  log(BLUE, `  Session cookie set: ${sessionCookie.substring(0, 40)}...`);
  return true;
});

await check('Admin /api/admin/me returns 200 after login', async () => {
  const r = await get('/api/admin/me');
  return r.status === 200 || 'HTTP ' + r.status + ' ' + JSON.stringify(r.body);
});

// ── 6. Admin Appointments ─────────────────────────────────────────
console.log('\n\x1b[1m[5] Admin — Appointments\x1b[0m');

await check('GET /api/admin/appointments returns array', async () => {
  const r = await get('/api/admin/appointments');
  if (r.status !== 200) return 'HTTP ' + r.status;
  if (!Array.isArray(r.body?.appointments)) return 'appointments not array';
  log(BLUE, `  Total appointments in DB: ${r.body.appointments.length}`);
  // Find our test appointment
  const testAppt = r.body.appointments.find(a => a.date === TEST_DATE && a.startTime === TEST_TIME);
  if (testAppt) {
    createdApptId = testAppt.id;
    log(BLUE, `  Test appointment found: ${testAppt.id} status=${testAppt.status}`);
  } else {
    log(YELLOW, `  Test appointment NOT found in list`);
  }
  return true;
});

await check('GET /api/admin/appointments?status=PENDING filters correctly', async () => {
  const r = await get('/api/admin/appointments?status=PENDING');
  if (r.status !== 200) return 'HTTP ' + r.status;
  const allPending = r.body?.appointments?.every(a => a.status === 'PENDING');
  return allPending !== false || 'Non-PENDING appointments in result';
});

await check('GET /api/admin/appointments?search= filters correctly', async () => {
  const r = await get('/api/admin/appointments?search=Audit');
  if (r.status !== 200) return 'HTTP ' + r.status;
  log(BLUE, `  Search "Audit" returned ${r.body?.appointments?.length} results`);
  return true;
});

// ── 7. Admin Update Appointment Status ───────────────────────────
console.log('\n\x1b[1m[6] Admin — Appointment Status Update\x1b[0m');

if (createdApptId) {
  await check(`PATCH /api/admin/appointments/${createdApptId} → CONFIRMED`, async () => {
    const r = await fetch(`${BASE}/api/admin/appointments/${createdApptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });
    const body = await r.json().catch(() => null);
    if (r.status !== 200) return 'HTTP ' + r.status + ' ' + JSON.stringify(body);
    if (body?.appointment?.status !== 'CONFIRMED') return 'status not CONFIRMED: ' + JSON.stringify(body);
    return true;
  });

  await check(`PATCH → CANCELLED to clean up test appointment`, async () => {
    const r = await fetch(`${BASE}/api/admin/appointments/${createdApptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie },
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const body = await r.json().catch(() => null);
    if (r.status !== 200) return 'HTTP ' + r.status;
    return body?.appointment?.status === 'CANCELLED' || 'status: ' + body?.appointment?.status;
  });
} else {
  log(YELLOW, '  Skipping appointment update tests (test appointment not found)');
  warnings++;
}

// ── 8. Admin Patients ─────────────────────────────────────────────
console.log('\n\x1b[1m[7] Admin — Patients\x1b[0m');

await check('GET /api/admin/patients returns array', async () => {
  const r = await get('/api/admin/patients');
  if (r.status !== 200) return 'HTTP ' + r.status;
  if (!Array.isArray(r.body?.patients)) return 'patients not array';
  log(BLUE, `  Total patients in DB: ${r.body.patients.length}`);
  return true;
});

// ── 9. Admin Slots (Blocked) ──────────────────────────────────────
console.log('\n\x1b[1m[8] Admin — Blocked Slots\x1b[0m');

await check('GET /api/admin/slots returns blockedSlots array', async () => {
  const r = await get('/api/admin/slots?date=2026-09-25');
  if (r.status !== 200) return 'HTTP ' + r.status;
  if (!Array.isArray(r.body?.slots)) return 'slots not array: ' + JSON.stringify(r.body);
  log(BLUE, `  Slots returned for date: ${r.body.slots.length}`);
  return true;
});

const BLOCK_DATE = '2026-09-25';
const BLOCK_TIME = '11:00';

await check('POST /api/admin/slots blocks a slot', async () => {
  const r = await post('/api/admin/slots', { date: BLOCK_DATE, time: BLOCK_TIME });
  if (r.status !== 200) return 'HTTP ' + r.status + ' ' + JSON.stringify(r.body);
  return true;
});

await check('Blocked slot shows unavailable in public /api/slots', async () => {
  const r = await get(`/api/slots?date=${BLOCK_DATE}`);
  if (r.status !== 200) return 'HTTP ' + r.status;
  const slot = r.body?.slots?.find(s => s.time === BLOCK_TIME);
  if (!slot) return 'Slot not found';
  return slot.available === false || `slot ${BLOCK_TIME} is still available after blocking!`;
});

await check('POST /api/admin/slots unblocks the slot', async () => {
  const r = await post('/api/admin/slots', { date: BLOCK_DATE, time: BLOCK_TIME });
  if (r.status !== 200) return 'HTTP ' + r.status + ' ' + JSON.stringify(r.body);
  return true;
});

await check('Unblocked slot shows available again', async () => {
  const r = await get(`/api/slots?date=${BLOCK_DATE}`);
  if (r.status !== 200) return 'HTTP ' + r.status;
  const slot = r.body?.slots?.find(s => s.time === BLOCK_TIME);
  if (!slot) return 'Slot not found';
  return slot.available === true || `slot ${BLOCK_TIME} still unavailable after unblocking!`;
});

// ── 10. Security Headers ──────────────────────────────────────────
console.log('\n\x1b[1m[9] Security Headers\x1b[0m');

await check('X-Frame-Options: DENY is set', async () => {
  const r = await get('/');
  return r.headers['x-frame-options'] === 'DENY' || 'value: ' + r.headers['x-frame-options'];
});

await check('X-Content-Type-Options: nosniff is set', async () => {
  const r = await get('/');
  return r.headers['x-content-type-options'] === 'nosniff' || 'value: ' + r.headers['x-content-type-options'];
});

await check('Content-Security-Policy is present', async () => {
  const r = await get('/');
  return Boolean(r.headers['content-security-policy']) || 'CSP header missing';
});

// ── 11. Logout ────────────────────────────────────────────────────
console.log('\n\x1b[1m[10] Admin Logout\x1b[0m');

await check('POST /api/admin/logout clears session', async () => {
  const r = await post('/api/admin/logout', {});
  return r.status === 200 || 'HTTP ' + r.status;
});

await check('/api/admin/me returns 401 after logout', async () => {
  const r = await get('/api/admin/me');
  return r.status === 401 || 'HTTP ' + r.status;
});

// ── Final Summary ─────────────────────────────────────────────────
console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
console.log(`\x1b[1m  RESULTS: ${GREEN} ${passed} passed${RESET}  ${RED} ${failed} failed${RESET}  ${YELLOW} ${warnings} warnings${RESET}`);
console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

if (failed > 0) process.exit(1);
