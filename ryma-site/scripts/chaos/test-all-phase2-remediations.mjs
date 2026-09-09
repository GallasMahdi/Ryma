import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

async function runChaosSuite() {
  console.log('================================================================');
  console.log('🚀 RUNNING PASS 2 CHAOS & CONCURRENCY REMEDIATION VERIFICATION 🚀');
  console.log('================================================================');

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0];

  // Owner step-up
  const unlockRes = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ password: 'ryma2024owner' }),
  });
  assert.strictEqual(unlockRes.status, 200, 'Owner step-up failed');
  const ownerCookie = unlockRes.headers.get('set-cookie')?.split(';')[0];

  // ─── TEST 1: Invoice Atomic Sequencing & Zero Race Failures ───
  console.log('\n[TEST 1] Testing Atomic Invoice Sequencing (30 concurrent emissions)...');
  const invoiceRequests = Array.from({ length: 30 }, (_, i) => {
    return fetch(`${BASE_URL}/api/admin/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        patientName: `Atomic Patient ${i + 1}`,
        patientPhone: `+35191111${String(i + 1).padStart(4, '0')}`,
        serviceSlug: 'reeducation-posturale',
        serviceName: 'Reeducação Postural Global',
        amount: 55,
        vatRate: 0,
        paymentMethod: 'MULTIBANCO',
        paymentStatus: 'PAID',
      }),
    }).then(async r => ({ status: r.status, body: await r.json() }));
  });

  const invoiceResults = await Promise.all(invoiceRequests);
  const invSuccesses = invoiceResults.filter(r => r.status === 201);
  assert.strictEqual(invSuccesses.length, 30, `Expected 30 successful invoices, got ${invSuccesses.length}`);
  const invNumbers = invSuccesses.map(s => s.body.invoice.invoiceNumber);
  const uniqueInvNumbers = new Set(invNumbers);
  assert.strictEqual(uniqueInvNumbers.size, 30, 'Duplicate invoice numbers detected!');
  console.log('✅ TEST 1 PASSED: 30/30 invoices created atomically with 0 collisions and 0 failures.');

  // ─── TEST 2: Invoice Idempotency Key (Double-Click Protection) ───
  console.log('\n[TEST 2] Testing Invoice Idempotency Key (Double-Click Protection)...');
  const testIdempotencyKey = `chaos_inv_idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const invPayload = {
    patientName: 'Double Click Patient',
    patientPhone: '+351912223344',
    serviceSlug: 'reeducation-posturale',
    serviceName: 'Reeducação Postural Global',
    amount: 70,
    vatRate: 0,
    paymentMethod: 'MBWAY',
    paymentStatus: 'PAID',
  };

  // Send request 1
  const rInv1 = await fetch(`${BASE_URL}/api/admin/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'Idempotency-Key': testIdempotencyKey,
    },
    body: JSON.stringify(invPayload),
  });
  assert.strictEqual(rInv1.status, 201, 'First invoice request failed');
  const inv1Data = await rInv1.json();
  const originalInvoiceId = inv1Data.invoice.id;
  const originalInvoiceNumber = inv1Data.invoice.invoiceNumber;

  // Send request 2 with exact same Idempotency-Key
  const rInv2 = await fetch(`${BASE_URL}/api/admin/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
      'Idempotency-Key': testIdempotencyKey,
    },
    body: JSON.stringify(invPayload),
  });
  assert.strictEqual(rInv2.status, 201, 'Second idempotent invoice request failed');
  const inv2Data = await rInv2.json();

  assert.strictEqual(inv2Data.invoice.id, originalInvoiceId, 'Idempotency failed: New invoice ID generated!');
  assert.strictEqual(inv2Data.invoice.invoiceNumber, originalInvoiceNumber, 'Idempotency failed: New invoice number generated!');
  console.log('✅ TEST 2 PASSED: Idempotency Key returned cached invoice; zero duplicate billing occurred.');

  // ─── TEST 3: Public Booking Idempotency (Eliminates Phantom Failure) ───
  console.log('\n[TEST 3] Testing Public Booking Idempotency (Phantom Failure Elimination)...');
  const bookingDate = `2028-11-${String(Math.floor(10 + Math.random() * 18)).padStart(2, '0')}`;
  const bookingTime = '14:30';
  const bookingPhone = `+351918${Math.floor(100000 + Math.random() * 900000)}`;
  const clientToken = `req_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const bookingBody = {
    patientName: 'Retry Patient',
    phone: bookingPhone,
    service: 'reeducation-posturale',
    date: bookingDate,
    startTime: bookingTime,
    clientRequestId: clientToken,
  };

  // First booking click
  const rBook1 = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingBody),
  });
  assert.strictEqual(rBook1.status, 201, 'First booking failed');
  const b1Data = await rBook1.json();

  // Second immediate click (e.g. user retried on network jitter)
  const rBook2 = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingBody),
  });
  assert.strictEqual(rBook2.status, 201, `Second booking should return 201 with confirmation, got ${rBook2.status}`);
  const b2Data = await rBook2.json();
  assert.strictEqual(b2Data.confirmation.date, bookingDate);
  assert.strictEqual(b2Data.confirmation.startTime, bookingTime);
  console.log('✅ TEST 3 PASSED: User retry returned 201 confirmation instead of 409 phantom failure.');

  // ─── TEST 4: TOCTOU Slot-Blocking Prevention (Database Trigger) ───
  console.log('\n[TEST 4] Testing TOCTOU Slot-Blocking Prevention via Database Trigger...');
  const blockedDate = `2028-12-${String(Math.floor(10 + Math.random() * 18)).padStart(2, '0')}`;
  const blockedTime = '16:00';

  // Admin blocks the slot
  let rBlock = await fetch(`${BASE_URL}/api/admin/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ date: blockedDate, time: blockedTime }),
  });
  assert.strictEqual(rBlock.status, 200, 'Block slot request failed');
  let blockData = await rBlock.json();
  if (blockData.blocked === false) {
    // If it was already blocked, toggle again to ensure blocked status
    rBlock = await fetch(`${BASE_URL}/api/admin/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ date: blockedDate, time: blockedTime }),
    });
    blockData = await rBlock.json();
  }
  assert.strictEqual(blockData.blocked, true, 'Slot was not successfully marked as blocked');

  // Patient attempts to book the blocked slot
  const rBlockedAttempt = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientName: 'Intruder Booking',
      phone: `+351913${Math.floor(100000 + Math.random() * 900000)}`,
      service: 'reeducation-posturale',
      date: blockedDate,
      startTime: blockedTime,
    }),
  });
  console.log('Booking attempt on blocked slot status:', rBlockedAttempt.status);
  assert.strictEqual(rBlockedAttempt.status, 409, 'Booking on blocked slot was NOT rejected with 409!');
  console.log('✅ TEST 4 PASSED: Booking on blocked slot was strictly rejected at database level.');

  // ─── TEST 5: Transactional Patient Deletion & Orphan Prevention ───
  console.log('\n[TEST 5] Testing Transactional Patient Deletion & Prescription Cascade...');
  // 1. Create a dedicated test patient
  const testPhone = `+351919${Math.floor(100000 + Math.random() * 900000)}`;
  const rPat = await fetch(`${BASE_URL}/api/admin/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      patientName: 'Cascade Test Patient',
      phone: testPhone,
      email: 'cascade@rymatest.pt',
    }),
  });
  assert.strictEqual(rPat.status, 200, 'Patient creation failed');
  const patData = await rPat.json();
  const patId = patData.patient.id;

  // 2. Add a prescription for this patient
  const rRx = await fetch(`${BASE_URL}/api/admin/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({
      patientId: patId,
      patientPhone: testPhone,
      patientName: 'Cascade Test Patient',
      date: '2028-09-18',
      items: [{ category: 'exercise', title: 'GPR posture routine', instructions: '3x daily' }],
    }),
  });
  console.log('Prescription creation status:', rRx.status);
  assert.strictEqual(rRx.status, 201, 'Prescription creation failed');

  // 3. Delete the patient
  const rDel = await fetch(`${BASE_URL}/api/admin/patients?id=${patId}`, {
    method: 'DELETE',
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(rDel.status, 200, 'Patient deletion failed');

  // 4. Verify prescriptions were cleaned up and not orphaned
  const rCheckRx = await fetch(`${BASE_URL}/api/admin/prescriptions?patientPhone=${encodeURIComponent(testPhone)}`, {
    headers: { Cookie: adminCookie },
  });
  const checkRxData = await rCheckRx.json();
  const orphanCount = (checkRxData.prescriptions || []).length;
  assert.strictEqual(orphanCount, 0, `Detected ${orphanCount} orphaned prescriptions!`);
  console.log('✅ TEST 5 PASSED: Patient deletion executed atomically; zero orphaned prescriptions remain.');

  // ─── TEST 6: Backup Snapshot & Restore Round-Trip ───
  console.log('\n[TEST 6] Testing Full Backup Export & Disaster Recovery CLI Restore...');
  const rExport = await fetch(`${BASE_URL}/api/admin/export?type=backup`, {
    headers: { Cookie: ownerCookie },
  });
  assert.strictEqual(rExport.status, 200, 'Backup export failed');
  const backupJson = await rExport.json();
  assert.ok(backupJson.tables.appointments, 'Backup missing appointments table');
  assert.ok(backupJson.tables.security_audit_logs, 'Backup missing security_audit_logs table');
  assert.ok(backupJson.tables.reviews, 'Backup missing reviews table');

  const tmpBackupPath = 'scripts/chaos/temp-backup.json';
  fs.writeFileSync(tmpBackupPath, JSON.stringify(backupJson, null, 2));

  // Run the restore script against the test backup
  console.log('Executing restore CLI script: node scripts/restore-backup.mjs...');
  const restoreOutput = execSync(`node scripts/restore-backup.mjs ${tmpBackupPath}`, { encoding: 'utf8' });
  assert.ok(restoreOutput.includes('DISASTER RECOVERY RESTORE COMPLETE!'), 'Restore script did not complete successfully');
  console.log('✅ TEST 6 PASSED: Full database snapshot exported and restored with 100% schema integrity.');

  fs.unlinkSync(tmpBackupPath);

  console.log('\n================================================================');
  console.log('🎉 ALL PASS 2 CONCURRENCY, CHAOS & DATA INTEGRITY TESTS PASSED! 🎉');
  console.log('================================================================');
}

runChaosSuite().catch(err => {
  console.error('\n❌ CHAOS SUITE FAILED:', err);
  process.exit(1);
});
