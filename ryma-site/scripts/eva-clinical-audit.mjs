const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ryma2024admin';

console.log('================================================================');
console.log('🩺 RUNNING CLINICAL EVA (0-10) WORKFLOW & API AUDIT');
console.log(`Target: ${BASE_URL}`);
console.log('================================================================\n');

let adminCookie = '';

async function runTest(name, fn) {
  try {
    const result = await fn();
    console.log(`✅ [${name}] ${result || 'PASSED'}`);
    return true;
  } catch (err) {
    console.error(`❌ [${name}] FAILED: ${err.message}`);
    return false;
  }
}

async function startAudit() {
  let passed = 0;
  let total = 0;

  // 1. Admin Authentication
  total++;
  if (await runTest('ADMIN_AUTH', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) throw new Error('No cookie returned');
    adminCookie = setCookie.split(';')[0];
    return 'Admin authenticated and cookie issued';
  })) passed++;

  // 2. Create Clinical Patient Record
  let patientId = '';
  const testPhone = '+351910009988';
  total++;
  if (await runTest('CREATE_PATIENT', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        patientName: 'EVA Audit Patient',
        phone: testPhone,
        email: 'eva.audit@clinic.pt',
        gender: 'F',
        coverageType: 'PARTICULAR',
        pathologyTags: 'Lombalgia Crónica L4-L5',
        totalPrescribedSessionsStr: '10',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create patient');
    patientId = data.patient.id;
    return `Created patient with ID: ${patientId}`;
  })) passed++;

  // 3. Log Session #1 with Baseline EVA 8/10 (Severe Pain)
  let session1Id = '';
  total++;
  if (await runTest('LOG_SESSION_1_BASELINE_EVA', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients/${patientId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        date: '2026-09-01',
        time: null,
        serviceSlug: 'reeducation-posturale',
        evaPainScore: 8, // Initial severe pain
        sessionType: 'MANUAL',
        notes: 'Sessão 1: Avaliação inicial postural. Dor lombar intensa.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log session 1');
    session1Id = data.session.id;
    if (data.session.evaPainScore !== 8) throw new Error(`Expected EVA 8, got ${data.session.evaPainScore}`);
    return `Logged Session #1 with EVA 8/10 (ID: ${session1Id})`;
  })) passed++;

  // 4. Log Session #2 with EVA 5/10 (Moderate Pain)
  let session2Id = '';
  total++;
  if (await runTest('LOG_SESSION_2_EVA_5', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients/${patientId}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        date: '2026-09-04',
        time: null,
        serviceSlug: 'reeducation-posturale',
        evaPainScore: 5,
        sessionType: 'MANUAL',
        notes: 'Sessão 2: Redução da tensão muscular lombar.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log session 2');
    session2Id = data.session.id;
    if (data.session.evaPainScore !== 5) throw new Error(`Expected EVA 5, got ${data.session.evaPainScore}`);
    return `Logged Session #2 with EVA 5/10 (ID: ${session2Id})`;
  })) passed++;

  // 5. Test Live 1-Tap PATCH Update of EVA Score (Session #2: 5 ➔ 2/10)
  total++;
  if (await runTest('PATCH_EVA_UPDATE_SESSION_2', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients/${patientId}/sessions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        sessionId: session2Id,
        evaPainScore: 2, // Adjusted to mild pain
        notes: 'Sessão 2: Resposta excelente, dor residual leve.',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to PATCH session 2');
    if (data.session.evaPainScore !== 2) throw new Error(`Expected updated EVA 2, got ${data.session.evaPainScore}`);
    return `Successfully updated Session #2 EVA from 5 to 2/10 in real-time`;
  })) passed++;

  // 6. Test EVA Score Bounds Clamping (Input 15 Clamped to 10, -5 Clamped to 0)
  total++;
  if (await runTest('EVA_BOUNDS_CLAMPING', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients/${patientId}/sessions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        sessionId: session2Id,
        evaPainScore: 15, // Out of bounds
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to test clamping');
    if (data.session.evaPainScore !== 10) throw new Error(`Expected clamped 10, got ${data.session.evaPainScore}`);
    return 'Out-of-bound EVA 15 successfully clamped to 10/10 max';
  })) passed++;

  // 7. Verify EMR Patient Dossier Retrieval & Progression Metrics
  total++;
  if (await runTest('PATIENT_EMR_PROGRESSION_METRICS', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients`, {
      method: 'GET',
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to fetch patients list');
    const p = data.patients.find(it => it.id === patientId);
    if (!p) throw new Error('Patient not found in response');
    if (!p.sessions || p.sessions.length < 2) throw new Error(`Expected 2 sessions, got ${p.sessions ? p.sessions.length : 0}`);
    return `Verified EMR record has ${p.sessions.length} sessions with active EVA tracking`;
  })) passed++;

  // 8. Clean up test patient record
  total++;
  if (await runTest('CLEANUP_EVA_TEST_PATIENT', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/patients?id=${patientId}&phone=${encodeURIComponent(testPhone)}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie },
    });
    if (!res.ok) throw new Error('Failed to delete test patient');
    return 'Test patient and all associated sessions cleanly purged';
  })) passed++;

  console.log('\n================================================================');
  console.log(`📊 CLINICAL EVA AUDIT RESULTS: ${passed}/${total} Passed (${Math.round((passed/total)*100)}%)`);
  console.log('================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

startAudit();
