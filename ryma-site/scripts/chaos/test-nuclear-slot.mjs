import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function testNuclearSlot(concurrency) {
  const testDate = `2028-06-${String(Math.floor(10 + Math.random() * 18)).padStart(2, '0')}`;
  const testTime = '11:00';

  console.log(`\n======================================================`);
  console.log(`[PHASE 2 NUCLEAR STRESS TEST] Concurrency: ${concurrency} simultaneous bookings`);
  console.log(`Target Slot: ${testDate} at ${testTime}`);
  console.log(`======================================================`);

  // Generate concurrent requests with unique phone numbers and patient names
  const requests = Array.from({ length: concurrency }, (_, i) => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const phone = `+35191${randomSuffix}`;
    const patientName = `Chaos Tester ${i + 1}`;

    return fetch(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `10.0.${Math.floor(i / 250)}.${i % 250 + 1}`, // Unique IP per request to bypass IP rate-limiting in test
      },
      body: JSON.stringify({
        patientName,
        phone,
        service: 'reeducation-posturale',
        date: testDate,
        startTime: testTime,
      }),
    }).then(async res => {
      let body;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { status: res.status, body };
    }).catch(err => ({ status: 'FETCH_ERROR', error: err.message }));
  });

  const results = await Promise.all(requests);

  const successes = results.filter(r => r.status === 201 || r.status === 200);
  const conflicts = results.filter(r => r.status === 409);
  const rateLimited = results.filter(r => r.status === 429);
  const errors = results.filter(r => r.status !== 201 && r.status !== 200 && r.status !== 409 && r.status !== 429);

  console.log(`Status Breakdown (${concurrency} requests):`);
  console.log(`  - 200 OK (Booked): ${successes.length}`);
  console.log(`  - 409 Conflict (Slot taken): ${conflicts.length}`);
  console.log(`  - 429 Rate Limited: ${rateLimited.length}`);
  console.log(`  - Other Errors: ${errors.length}`, errors.slice(0, 3));

  // Check how many appointments actually ended up in the database for this slot
  // We login as admin to query appointments for this date
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];

  const apptsRes = await fetch(`${BASE_URL}/api/admin/appointments?date=${testDate}`, {
    headers: { Cookie: cookie },
  });
  const apptsData = await apptsRes.json();
  const bookedForSlot = (apptsData.appointments || []).filter(
    a => a.date === testDate && a.startTime === testTime && a.status !== 'CANCELLED'
  );

  console.log(`\nDATABASE VERIFICATION:`);
  console.log(`  - Non-cancelled appointments in DB for ${testDate} ${testTime}: ${bookedForSlot.length}`);

  if (bookedForSlot.length === 1 && successes.length === 1) {
    console.log(`\n🎉 RESULT: PASS — Exactly 1 appointment created in DB, all other ${concurrency - 1} requests rejected.`);
  } else {
    console.error(`\n🚨 RESULT: FAIL — DB contains ${bookedForSlot.length} appointments, API returned ${successes.length} 200s!`);
  }

  return { successes: successes.length, bookedInDb: bookedForSlot.length };
}

async function run() {
  await testNuclearSlot(10);
  await testNuclearSlot(50);
}

run().catch(console.error);
