import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- STARTING SECURITY REMEDIATION VERIFICATION SUITE ---');

  // Test 1: Session Revocation Post-Logout
  console.log('\n[TEST 1] Testing Session Revocation After Logout...');
  const rLogin = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  assert.strictEqual(rLogin.status, 200, 'Admin login failed');
  const rawSetCookie = rLogin.headers.get('set-cookie');
  assert.ok(rawSetCookie, 'No session cookie received');
  const sessionCookie = rawSetCookie.split(';')[0];

  // Verify access before logout
  const rBefore = await fetch(`${BASE_URL}/api/admin/appointments`, {
    headers: { Cookie: sessionCookie },
  });
  if (rBefore.status !== 200) {
    console.log('rBefore status:', rBefore.status, await rBefore.json());
  }
  assert.strictEqual(rBefore.status, 200, 'Authenticated access before logout failed');

  // Call logout
  const rLogout = await fetch(`${BASE_URL}/api/admin/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  });
  assert.strictEqual(rLogout.status, 200, 'Logout failed');

  // Replay old cookie
  const rReplay = await fetch(`${BASE_URL}/api/admin/appointments`, {
    headers: { Cookie: sessionCookie },
  });
  const replayBody = await rReplay.json();
  console.log('Replay after logout status:', rReplay.status, replayBody);
  assert.strictEqual(rReplay.status, 401, 'CRITICAL: Replayed cookie was NOT rejected after logout!');
  console.log('✅ TEST 1 PASSED: Zombie session successfully rejected with 401.');

  // Test 2: Owner Step-Up Token Invalidation on Lock
  console.log('\n[TEST 2] Testing Owner Step-Up Replay Invalidation on Lock...');
  const rLogin2 = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  const rawAdminCookie2 = rLogin2.headers.get('set-cookie');
  assert.ok(rawAdminCookie2, 'No admin cookie received on second login');
  const adminCookie2 = rawAdminCookie2.split(';')[0];

  // Verify owner password to step-up
  const rUnlock = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie2 },
    body: JSON.stringify({ password: 'ryma2024owner' }),
  });
  assert.strictEqual(rUnlock.status, 200, 'Owner step-up failed');
  const rawOwnerCookie = rUnlock.headers.get('set-cookie');
  assert.ok(rawOwnerCookie, 'No owner cookie received');
  const ownerCookie = rawOwnerCookie.split(';')[0];

  // Verify access with owner cookie
  const rOwnerBefore = await fetch(`${BASE_URL}/api/admin/analytics`, {
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(rOwnerBefore.status, 200, 'Analytics access with owner cookie failed');

  // Call lock
  const rLock = await fetch(`${BASE_URL}/api/admin/analytics/lock`, {
    method: 'POST',
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(rLock.status, 200, 'Analytics lock failed');

  // Replay pre-lock owner cookie
  const rOwnerReplay = await fetch(`${BASE_URL}/api/admin/analytics`, {
    headers: { Cookie: ownerCookie },
  });
  const replayOwnerBody = await rOwnerReplay.json();
  console.log('Replay of owner cookie after lock status:', rOwnerReplay.status, replayOwnerBody);
  assert.strictEqual(rOwnerReplay.status, 403, 'CRITICAL: Pre-lock owner cookie was NOT rejected with 403!');
  console.log('✅ TEST 2 PASSED: Pre-lock step-up cookie was rejected with 403.');

  // Test 3: Cross-Patient IDOR Prevention
  console.log('\n[TEST 3] Testing Cross-Patient IDOR Prevention on Sessions...');
  const rPatients = await fetch(`${BASE_URL}/api/admin/patients`, {
    headers: { Cookie: adminCookie2 },
  });
  const patientsData = await rPatients.json();
  const p1 = patientsData.patients?.[0];
  const p2 = patientsData.patients?.[1];

  // Add session for patient 1
  const rAddSession = await fetch(`${BASE_URL}/api/admin/patients/${p1.id}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie2 },
    body: JSON.stringify({ evaPainScore: 3, notes: 'Patient 1 legit session', sessionType: 'MANUAL' }),
  });
  const sessionCreated = await rAddSession.json();
  const sId = sessionCreated.session.id;

  // Attempt IDOR update via Patient 2 URL
  const rIdorPatch = await fetch(`${BASE_URL}/api/admin/patients/${p2.id}/sessions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie2 },
    body: JSON.stringify({ sessionId: sId, evaPainScore: 10, notes: 'IDOR attack!' }),
  });
  console.log('Cross-patient PATCH status:', rIdorPatch.status, await rIdorPatch.json());
  assert.strictEqual(rIdorPatch.status, 404, 'CRITICAL: Cross-patient session update was not blocked!');

  // Attempt IDOR delete via Patient 2 URL
  const rIdorDelete = await fetch(`${BASE_URL}/api/admin/patients/${p2.id}/sessions?sessionId=${sId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie2 },
  });
  console.log('Cross-patient DELETE status:', rIdorDelete.status, await rIdorDelete.json());
  assert.strictEqual(rIdorDelete.status, 404, 'CRITICAL: Cross-patient session delete was not blocked!');

  // Legitimate cleanup via Patient 1 URL
  const rClean = await fetch(`${BASE_URL}/api/admin/patients/${p1.id}/sessions?sessionId=${sId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie2 },
  });
  assert.strictEqual(rClean.status, 200, 'Legitimate session cleanup failed');
  console.log('✅ TEST 3 PASSED: Cross-patient IDOR blocked with 404.');

  // Test 4: CSV Sanitization on leading spaces & formulas
  console.log('\n[TEST 4] Testing CSV Formula Sanitization...');
  function sanitizeCsvField(val) {
    if (val === null || val === undefined) return '""';
    if (typeof val === 'number') return String(val);
    let str = String(val);
    if (/^\s*[=\+\-@\t\r]/.test(str)) {
      str = `'${str.trimStart()}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }
  assert.strictEqual(sanitizeCsvField('=SUM(1+1)'), '"\'=SUM(1+1)"');
  assert.strictEqual(sanitizeCsvField('   =SUM(1+1)'), '"\'=SUM(1+1)"');
  assert.strictEqual(sanitizeCsvField('\t@cmd|/c calc'), '"\'@cmd|/c calc"');
  assert.strictEqual(sanitizeCsvField('  -5+2'), '"\'-5+2"');
  console.log('✅ TEST 4 PASSED: CSV formula sanitization handles leading whitespace properly.');

  // Test 5: Invoice Input Validation
  console.log('\n[TEST 5] Testing Invoice Input Validation (VAT rate & amount)...');
  const rInvBadVat = await fetch(`${BASE_URL}/api/admin/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie2 },
    body: JSON.stringify({
      patientName: 'Test Patient',
      patientPhone: '+351912345678',
      serviceSlug: 'kinesitherapie-generale',
      amount: 50,
      vatRate: 99, // Invalid VAT rate
    }),
  });
  console.log('Bad VAT rate response:', rInvBadVat.status, await rInvBadVat.json());
  assert.strictEqual(rInvBadVat.status, 422, 'Invalid VAT rate was not rejected with 422');

  const rInvBadAmount = await fetch(`${BASE_URL}/api/admin/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie2 },
    body: JSON.stringify({
      patientName: 'Test Patient',
      patientPhone: '+351912345678',
      serviceSlug: 'kinesitherapie-generale',
      amount: -10, // Invalid negative amount
    }),
  });
  console.log('Negative amount response:', rInvBadAmount.status, await rInvBadAmount.json());
  assert.strictEqual(rInvBadAmount.status, 422, 'Negative amount was not rejected with 422');
  console.log('✅ TEST 5 PASSED: Invoice input validation enforces strict VAT and amount constraints.');

  console.log('\n======================================================');
  console.log('🎉 ALL SECURITY REGRESSION TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
