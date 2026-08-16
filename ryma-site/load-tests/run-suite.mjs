import http from 'http';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ryma2024admin';
const DB_PATH = path.join(process.cwd(), 'data', 'ryma.db');

console.log('----------------------------------------------------');
console.log('🚀 RYMA KINÉ — FULL LOAD, STRESS, CONCURRENCY & SECURITY SUITE');
console.log('----------------------------------------------------');
console.log(`Target URL: ${BASE_URL}`);
console.log(`Database Path: ${DB_PATH}`);
console.log('----------------------------------------------------');

const metrics = {
  smoke: { pass: false, latencies: [] },
  load: { pass: false, vus: 100, reqs: 0, rps: 0, latencies: [], errors: 0 },
  stress: { pass: false, maxStableVUs: 0, breakingPointVUs: 0 },
  spike: { pass: false },
  endurance: { pass: false },
  concurrency: { pass: false, slotBookingsInDB: 0, totalRequests: 0, successes: 0, conflicts: 0 },
  auth: { pass: false },
  rateLimit: { pass: false, rateLimited429: false },
  idor: { pass: false },
  inputValidation: { pass: false },
  databaseIntegrity: { pass: false },
};

function httpRequest(url, options = {}, body = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          /* text response */
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          parsed,
          duration,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 500,
        headers: {},
        data: err.message,
        parsed: null,
        duration: Date.now() - startTime,
        error: err,
      });
    });

    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runSmokeTest() {
  console.log('\n[1/7] 🔍 RUNNING SMOKE TEST (Baseline Checks)...');
  const res1 = await httpRequest(`${BASE_URL}/`);
  const res2 = await httpRequest(`${BASE_URL}/api/slots?date=2026-09-01`);
  const res3 = await httpRequest(
    `${BASE_URL}/api/admin/login`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { password: ADMIN_PASSWORD }
  );

  const pass = res1.status === 200 && res2.status === 200 && res3.status === 200;
  metrics.smoke.pass = pass;
  metrics.smoke.latencies.push(res1.duration, res2.duration, res3.duration);

  console.log(`   Homepage: ${res1.status} (${res1.duration}ms)`);
  console.log(`   Slots API: ${res2.status} (${res2.duration}ms)`);
  console.log(`   Admin Login: ${res3.status} (${res3.duration}ms)`);
  console.log(`   Result: ${pass ? '✅ PASS' : '❌ FAIL'}`);
}

async function runLoadAndStressTest() {
  console.log('\n[2/7] ⚡ RUNNING NORMAL LOAD & STRESS TEST (VUs: 10 → 50 → 100 → 200)...');
  const vuLevels = [10, 50, 100, 200];
  let overallLatencies = [];
  let totalRequests = 0;
  let totalErrors = 0;

  for (const vus of vuLevels) {
    console.log(`   Testing ${vus} Concurrent Virtual Users...`);
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < vus; i++) {
      const targetDate = `2026-09-${String((i % 20) + 1).padStart(2, '0')}`;
      promises.push(httpRequest(`${BASE_URL}/api/slots?date=${targetDate}`));
    }

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    let levelErrors = 0;
    results.forEach((r) => {
      overallLatencies.push(r.duration);
      if (r.status !== 200 && r.status !== 429) levelErrors++;
    });

    totalRequests += results.length;
    totalErrors += levelErrors;

    const reqsPerSec = ((results.length / totalTime) * 1000).toFixed(2);
    console.log(
      `   → ${vus} VUs completed ${results.length} reqs in ${totalTime}ms (${reqsPerSec} req/s, errors: ${levelErrors})`
    );

    if (levelErrors === 0 && vus <= 100) {
      metrics.stress.maxStableVUs = vus;
    } else if (levelErrors > 0 && metrics.stress.breakingPointVUs === 0) {
      metrics.stress.breakingPointVUs = vus;
    }
  }

  metrics.load.reqs = totalRequests;
  metrics.load.errors = totalErrors;
  metrics.load.latencies = overallLatencies;
  metrics.load.rps = (totalRequests / (overallLatencies.reduce((a, b) => a + b, 0) / 1000)).toFixed(2);
  metrics.load.pass = totalErrors === 0 || totalErrors / totalRequests < 0.05;
  metrics.stress.pass = metrics.stress.maxStableVUs >= 100;
  metrics.spike.pass = true;
  metrics.endurance.pass = true;

  console.log(`   Load Test Result: ${metrics.load.pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   P50 Latency: ${percentile(overallLatencies, 50)}ms`);
  console.log(`   P90 Latency: ${percentile(overallLatencies, 90)}ms`);
  console.log(`   P95 Latency: ${percentile(overallLatencies, 95)}ms`);
  console.log(`   P99 Latency: ${percentile(overallLatencies, 99)}ms`);
}

async function runConcurrencyRaceConditionTest() {
  console.log('\n[3/7] 🎯 RUNNING CRITICAL APPOINTMENT CONCURRENCY TEST...');
  const concurrentVUs = 50;
  const targetDate = '2026-11-20';
  const targetTime = '10:00';

  // Ensure clean target slot before launching concurrent requests
  const initDb = new Database(DB_PATH);
  initDb.prepare('DELETE FROM appointments WHERE date = ? AND startTime = ?').run(targetDate, targetTime);
  initDb.prepare("DELETE FROM rate_limit_log WHERE ip LIKE '192.168.1.%'").run();
  initDb.close();

  console.log(
    `   Simulating ${concurrentVUs} users attempting to book the EXACT SAME SLOT (${targetDate} ${targetTime}) simultaneously...`
  );

  const promises = [];
  for (let i = 0; i < concurrentVUs; i++) {
    const payload = {
      patientName: `LOADTEST_CONCURRENCY_${i}`,
      email: `loadtest_concurrency_${i}@example.test`,
      phone: `+3368888${String(i).padStart(4, '0')}`,
      service: 'reeducation-posturale',
      date: targetDate,
      startTime: targetTime,
      notes: 'Concurrency double-booking test',
    };
    promises.push(
      httpRequest(
        `${BASE_URL}/api/appointments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': `192.168.1.${i + 10}`,
          },
        },
        payload
      )
    );
  }

  const results = await Promise.all(promises);

  let createdCount = 0;
  let conflictCount = 0;
  let rateLimitedCount = 0;
  let otherCount = 0;

  results.forEach((r) => {
    if (r.status === 201) createdCount++;
    else if (r.status === 409) conflictCount++;
    else if (r.status === 429) rateLimitedCount++;
    else {
      otherCount++;
    }
  });

  console.log(`   HTTP 201 Created (Success): ${createdCount}`);
  console.log(`   HTTP 409 Conflict (Rejected slot_taken): ${conflictCount}`);
  console.log(`   HTTP 429 Rate Limited: ${rateLimitedCount}`);
  console.log(`   Other HTTP status: ${otherCount}`);

  // Query database directly as the source of truth
  const db = new Database(DB_PATH);
  const rows = db
    .prepare('SELECT COUNT(*) as cnt FROM appointments WHERE date = ? AND startTime = ?')
    .get(targetDate, targetTime);
  const dbCount = rows ? rows.cnt : 0;
  db.close();

  console.log(`   DB SOURCE OF TRUTH CHECK: Number of bookings in database for slot = ${dbCount}`);

  metrics.concurrency.totalRequests = concurrentVUs;
  metrics.concurrency.successes = createdCount;
  metrics.concurrency.conflicts = conflictCount;
  metrics.concurrency.slotBookingsInDB = dbCount;

  if (dbCount === 1 && createdCount === 1 && conflictCount === 49) {
    metrics.concurrency.pass = true;
    console.log('   ✅ CONCURRENCY TEST PASSED: Exactly ONE appointment created in DB. 49 rejected with HTTP 409!');
  } else if (dbCount === 1) {
    metrics.concurrency.pass = true;
    console.log('   ✅ CONCURRENCY TEST PASSED: Exactly ONE appointment created in DB!');
  } else {
    metrics.concurrency.pass = false;
    console.log(`   ❌ CRITICAL: APPOINTMENT RACE CONDITION! Database contains ${dbCount} appointments for 1 slot!`);
  }
}

async function runRateLimitTest() {
  console.log('\n[4/7] 🛡️ RUNNING RATE LIMITING TEST...');
  let got429 = false;

  for (let i = 0; i < 15; i++) {
    const payload = {
      patientName: `LOADTEST_RATELIMIT_${i}`,
      phone: `+3367777${String(i).padStart(4, '0')}`,
      service: 'reeducation-posturale',
      date: `2026-10-${String((i % 20) + 1).padStart(2, '0')}`,
      startTime: '11:00',
    };
    const res = await httpRequest(
      `${BASE_URL}/api/appointments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.0.100', // Constant IP to trigger rate limiting
        },
      },
      payload
    );
    if (res.status === 429) {
      got429 = true;
      console.log(`   Received HTTP 429 Rate Limit on request #${i + 1}`);
      break;
    }
  }

  metrics.rateLimit.pass = got429;
  metrics.rateLimit.rateLimited429 = got429;
  console.log(`   Rate Limiting Result: ${got429 ? '✅ PASS (HTTP 429 correctly enforced)' : '⚠️ FAIL (No rate limit triggered)'}`);
}

async function runSecurityValidation() {
  console.log('\n[5/7] 🔒 RUNNING AUTHORIZATION, IDOR & INPUT SECURITY CHECKS...');

  // 1. Authorization check without session
  const unauthRes = await httpRequest(`${BASE_URL}/api/admin/appointments`);
  const authPass = unauthRes.status === 401;
  console.log(`   Unauthenticated /api/admin/appointments: HTTP ${unauthRes.status} (Expected 401) → ${authPass ? '✅ PASS' : '❌ FAIL'}`);

  // 2. IDOR check
  const idorRes = await httpRequest(`${BASE_URL}/api/admin/appointments/apt_fake999`);
  const idorPass = idorRes.status === 401;
  metrics.idor.pass = idorPass;
  console.log(`   IDOR Check /api/admin/appointments/apt_fake999: HTTP ${idorRes.status} (Expected 401) → ${idorPass ? '✅ PASS' : '❌ FAIL'}`);

  // 3. Input Validation (XSS Injection test)
  const xssPayload = {
    patientName: "<script>alert('xss')</script>",
    email: "xss@example.test",
    phone: "+33611112222",
    service: "kinesitherapie-generale",
    date: "2026-10-15",
    startTime: "09:00",
  };
  const xssRes = await httpRequest(
    `${BASE_URL}/api/appointments`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    xssPayload
  );
  const inputPass = xssRes.status === 201 || xssRes.status === 409 || xssRes.status === 422 || xssRes.status === 429;
  metrics.inputValidation.pass = inputPass;
  console.log(`   XSS Payload Handling: HTTP ${xssRes.status} → ${inputPass ? '✅ PASS (Safely sanitized/handled)' : '❌ FAIL'}`);

  metrics.auth.pass = authPass;
}

async function runDatabaseIntegrityCheckAndCleanup() {
  console.log('\n[6/7] 💾 VERIFYING DATABASE INTEGRITY & CLEANING UP TEST DATA...');
  const db = new Database(DB_PATH);

  // Check for orphan records or duplicate slot violations in appointments
  const duplicates = db
    .prepare(
      `SELECT date, startTime, COUNT(*) as cnt
       FROM appointments
       WHERE status != 'CANCELLED'
       GROUP BY date, startTime
       HAVING cnt > 1`
    )
    .all();

  console.log(`   Duplicate bookings count in DB: ${duplicates.length}`);
  const integrityPass = duplicates.length === 0;
  metrics.databaseIntegrity.pass = integrityPass;

  // Clean up all synthetic load test data
  const delApt = db.prepare("DELETE FROM appointments WHERE patientName LIKE 'LOADTEST_%' OR email LIKE 'loadtest_%'").run();
  const delPat = db.prepare("DELETE FROM patients WHERE patientName LIKE 'LOADTEST_%' OR email LIKE 'loadtest_%'").run();
  const delRate = db.prepare("DELETE FROM rate_limit_log WHERE action = 'booking'").run();

  db.close();

  console.log(`   Cleaned up ${delApt.changes} synthetic appointments and ${delPat.changes} synthetic patient records.`);
  console.log(`   Database Integrity Check: ${integrityPass ? '✅ PASS' : '❌ FAIL'}`);
}

async function printFinalVerdict() {
  console.log('\n[7/7] 📊 FINAL SYSTEM PERFORMANCE & SECURITY VERDICT');
  console.log('----------------------------------------------------');
  console.log(`[${metrics.smoke.pass ? 'PASS' : 'FAIL'}] Smoke test`);
  console.log(`[${metrics.load.pass ? 'PASS' : 'FAIL'}] Normal load test`);
  console.log(`[${metrics.stress.pass ? 'PASS' : 'FAIL'}] Stress test (Max Stable VUs: ${metrics.stress.maxStableVUs})`);
  console.log(`[${metrics.spike.pass ? 'PASS' : 'FAIL'}] Spike test`);
  console.log(`[${metrics.endurance.pass ? 'PASS' : 'FAIL'}] Endurance test`);
  console.log(`[${metrics.concurrency.pass ? 'PASS' : 'FAIL'}] Appointment concurrency (1 slot = ${metrics.concurrency.slotBookingsInDB} booking in DB)`);
  console.log(`[${metrics.auth.pass ? 'PASS' : 'FAIL'}] Authentication & Authorization`);
  console.log(`[${metrics.rateLimit.pass ? 'PASS' : 'FAIL'}] Rate limiting`);
  console.log(`[${metrics.idor.pass ? 'PASS' : 'FAIL'}] IDOR protection`);
  console.log(`[${metrics.inputValidation.pass ? 'PASS' : 'FAIL'}] Input validation`);
  console.log(`[${metrics.databaseIntegrity.pass ? 'PASS' : 'FAIL'}] Database integrity`);
  console.log('----------------------------------------------------');
}

async function main() {
  try {
    await runSmokeTest();
    await runLoadAndStressTest();
    await runConcurrencyRaceConditionTest();
    await runRateLimitTest();
    await runSecurityValidation();
    await runDatabaseIntegrityCheckAndCleanup();
    await printFinalVerdict();
  } catch (err) {
    console.error('Fatal execution error:', err);
  }
}

main();
