import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function testInvoiceRace(concurrency) {
  console.log(`\n======================================================`);
  console.log(`[PHASE 7 INVOICE RACE] Concurrency: ${concurrency} simultaneous invoice creations`);
  console.log(`======================================================`);

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'Admin login failed');

  const requests = Array.from({ length: concurrency }, (_, i) => {
    return fetch(`${BASE_URL}/api/admin/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        patientName: `Invoice Race Patient ${i + 1}`,
        patientPhone: `+35191777${String(i + 1).padStart(4, '0')}`,
        serviceSlug: 'reeducation-posturale',
        serviceName: 'Reeducação Postural Global',
        amount: 60,
        vatRate: 0,
        paymentMethod: 'MULTIBANCO',
        paymentStatus: 'PAID',
      }),
    }).then(async res => {
      let body;
      try { body = await res.json(); } catch { body = null; }
      return { status: res.status, body };
    }).catch(err => ({ status: 'FETCH_ERROR', error: err.message }));
  });

  const results = await Promise.all(requests);

  const successes = results.filter(r => r.status === 201 || r.status === 200);
  const failures = results.filter(r => r.status !== 201 && r.status !== 200);

  console.log(`Status Breakdown (${concurrency} concurrent requests):`);
  console.log(`  - Successful Creations: ${successes.length}`);
  console.log(`  - Failures: ${failures.length}`);
  if (failures.length > 0) {
    console.log(`  - Sample Failure:`, failures[0]);
  }

  // Check generated invoice numbers for collisions
  const createdNumbers = successes.map(s => s.body?.invoice?.invoiceNumber).filter(Boolean);
  const uniqueNumbers = new Set(createdNumbers);

  console.log(`\nINVOICE NUMBER UNIQUENESS:`);
  console.log(`  - Total invoice numbers received: ${createdNumbers.length}`);
  console.log(`  - Unique invoice numbers: ${uniqueNumbers.size}`);

  if (createdNumbers.length !== uniqueNumbers.size) {
    console.error(`🚨 CRITICAL DATA INTEGRITY FAILURE: Duplicate invoice numbers generated in API responses!`);
  } else {
    console.log(`  - All ${createdNumbers.length} returned invoice numbers are unique.`);
  }

  if (failures.length > 0) {
    console.warn(`⚠️ CONCURRENCY WARNING: ${failures.length} concurrent requests failed due to retry exhaustion or lock contention.`);
  }
}

async function run() {
  await testInvoiceRace(10);
  await testInvoiceRace(30);
}

run().catch(console.error);
