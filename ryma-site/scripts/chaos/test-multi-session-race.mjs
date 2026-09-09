import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function testMultiSessionRace() {
  console.log(`\n======================================================`);
  console.log(`[PHASE 6 MULTI-SESSION ATOMICITY & RACE TEST]`);
  console.log(`======================================================`);

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'Admin login failed');

  // We test two batches that have 1 overlapping slot and 2 distinct slots
  const sharedDate = '2028-07-10';
  const sharedSlot = '10:00';

  const batchA = {
    patientName: 'Batch Patient Alpha',
    phone: '+351919990001',
    service: 'reeducation-posturale',
    sessions: [
      { date: sharedDate, startTime: '09:00' },
      { date: sharedDate, startTime: sharedSlot }, // Shared conflict slot
      { date: sharedDate, startTime: '11:00' },
    ],
  };

  const batchB = {
    patientName: 'Batch Patient Beta',
    phone: '+351919990002',
    service: 'reeducation-posturale',
    sessions: [
      { date: sharedDate, startTime: '14:00' },
      { date: sharedDate, startTime: sharedSlot }, // Shared conflict slot
      { date: sharedDate, startTime: '15:00' },
    ],
  };

  // Launch both batch creations at the exact same millisecond
  console.log(`Firing Batch A and Batch B simultaneously with conflicting slot ${sharedDate} ${sharedSlot}...`);
  const [resA, resB] = await Promise.all([
    fetch(`${BASE_URL}/api/admin/appointments/multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(batchA),
    }),
    fetch(`${BASE_URL}/api/admin/appointments/multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(batchB),
    }),
  ]);

  const bodyA = await resA.json();
  const bodyB = await resB.json();

  console.log(`Batch A Status: ${resA.status}`, bodyA.success ? 'SUCCESS' : bodyA.error);
  console.log(`Batch B Status: ${resB.status}`, bodyB.success ? 'SUCCESS' : bodyB.error);

  // Check database state: exactly how many appointments exist for sharedDate?
  const apptsRes = await fetch(`${BASE_URL}/api/admin/appointments?date=${sharedDate}`, {
    headers: { Cookie: cookie },
  });
  const apptsData = await apptsRes.json();
  const apptsOnDate = (apptsData.appointments || []).filter(a => a.status !== 'CANCELLED');

  console.log(`\nDATABASE ATOMICITY VERIFICATION:`);
  console.log(`  - Total active appointments for date ${sharedDate}: ${apptsOnDate.length}`);
  const alphaAppts = apptsOnDate.filter(a => a.patientName === 'Batch Patient Alpha');
  const betaAppts = apptsOnDate.filter(a => a.patientName === 'Batch Patient Beta');
  console.log(`  - Appointments for Batch Alpha: ${alphaAppts.length}`);
  console.log(`  - Appointments for Batch Beta: ${betaAppts.length}`);

  // Test Atomicity rule: Either ALL 3 sessions are created, or 0 are created (no partial batch commit)
  if (alphaAppts.length !== 0 && alphaAppts.length !== 3) {
    console.error(`🚨 ATOMICITY FAILURE: Batch Alpha partially committed ${alphaAppts.length}/3 appointments!`);
  } else if (betaAppts.length !== 0 && betaAppts.length !== 3) {
    console.error(`🚨 ATOMICITY FAILURE: Batch Beta partially committed ${betaAppts.length}/3 appointments!`);
  } else {
    console.log(`🎉 ATOMICITY PASSED: Batches are strictly all-or-nothing (0 or 3 committed).`);
  }

  // Check if the shared slot was double-booked
  const sharedSlotBookings = apptsOnDate.filter(a => a.startTime === sharedSlot);
  if (sharedSlotBookings.length > 1) {
    console.error(`🚨 DOUBLE BOOKING IN BATCH: Slot ${sharedSlot} booked ${sharedSlotBookings.length} times!`);
  } else {
    console.log(`🎉 CONFLICT PASSED: Shared slot booked exactly ${sharedSlotBookings.length} time(s).`);
  }
}

testMultiSessionRace().catch(console.error);
