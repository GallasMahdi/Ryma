import assert from 'assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

async function testHoneypotAndFallback() {
  console.log('===============================================================');
  console.log('🛡️ TESTING BOT DEFENSE: HONEYPOT & RECAPTCHA FALLBACK 🛡️');
  console.log('===============================================================\n');

  const testDate = '2028-11-20';
  const testTime = '10:30';

  // 1. Test Bot Fill: Honeypot filled with text -> Must be REJECTED (403 Forbidden)
  console.log('[Case 1] Bot fills honeypot field (_hp_company = "SpamCorp")...');
  const botRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientName: 'Spam Bot',
      phone: '+351912000001',
      service: 'reeducation-posturale',
      date: testDate,
      startTime: testTime,
      _hp_company: 'SpamCorp',
      _form_rendered_at: Date.now() - 5000,
    }),
  });
  console.log('Bot Response Status:', botRes.status);
  assert.strictEqual(botRes.status, 403, 'Bot with filled honeypot should be rejected with 403');
  const botBody = await botRes.json();
  console.log('Bot Rejection Message:', botBody.error);
  console.log('✅ Case 1 Passed: Honeypot trap caught the bot.\n');

  // 2. Test Fast Bot: Honeypot empty but submitted in <1200ms -> Must be REJECTED (429/403)
  console.log('[Case 2] Ultra-fast Bot submits in 100ms...');
  const fastBotRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientName: 'Fast Bot',
      phone: '+351912000002',
      service: 'reeducation-posturale',
      date: testDate,
      startTime: '11:00',
      _hp_company: '',
      _form_rendered_at: Date.now() - 100, // 100ms ago!
    }),
  });
  console.log('Fast Bot Response Status:', fastBotRes.status);
  assert.strictEqual(fastBotRes.status, 403, 'Sub-1.2s bot should be rejected with 403');
  console.log('✅ Case 2 Passed: Timing trap caught the automated script.\n');

  // 3. Test Human with Ad-Blocker (No reCAPTCHA token, empty honeypot, >1.2s human timing)
  console.log('[Case 3] Legitimate human with Ad-Blocker (no recaptchaToken, >1.2s elapsed)...');
  const humanPhone = `+351914${Math.floor(100000 + Math.random() * 900000)}`;
  const humanDate = `2028-11-${String(Math.floor(10 + Math.random() * 18)).padStart(2, '0')}`;
  const humanRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientName: 'AdBlock Patient',
      phone: humanPhone,
      service: 'reeducation-posturale',
      date: humanDate,
      startTime: '14:30',
      _hp_company: '',
      _form_rendered_at: Date.now() - 4500, // 4.5s elapsed
    }),
  });
  console.log('Human AdBlocker Response Status:', humanRes.status);
  assert.strictEqual(humanRes.status, 201, 'Legitimate human without token should succeed via honeypot fallback');
  const humanBody = await humanRes.json();
  assert.ok(humanBody.confirmation?.date, 'Appointment confirmation should be returned');
  console.log('Appointment Confirmed for:', humanBody.confirmation.date, humanBody.confirmation.startTime);
  console.log('✅ Case 3 Passed: Legitimate user booked successfully without reCAPTCHA token.\n');

  console.log('===============================================================');
  console.log('🎉 ALL BOT DEFENSE & RECAPTCHA FALLBACK TESTS PASSED! 🎉');
  console.log('===============================================================');
}

testHoneypotAndFallback().catch(err => {
  console.error('❌ Bot Defense Test Failed:', err);
  process.exit(1);
});
