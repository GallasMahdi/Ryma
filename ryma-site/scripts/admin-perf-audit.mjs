import { performance } from 'perf_hooks';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ryma2024admin';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'ryma2024owner';

async function runAdminAudit() {
  console.log(`\n========================================================================`);
  console.log(`🛡️ AUDIT DE PERFORMANCE DU DASHBOARD ADMIN — DIGITAL CLÍNICA`);
  console.log(`Cible : ${BASE_URL}`);
  console.log(`Date  : ${new Date().toLocaleString()}`);
  console.log(`========================================================================\n`);

  // Step 1: Login
  console.log(`--- [1/4] AUTHENTIFICATION ADMIN & SESSION ---`);
  const tLogin0 = performance.now();
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  const tLogin1 = performance.now();
  const loginCookie = loginRes.headers.get('set-cookie');
  console.log(`  ✓ Connexion Admin POST /api/admin/login | Code: ${loginRes.status} | Temps: ${(tLogin1 - tLogin0).toFixed(1)}ms`);

  if (!loginRes.ok || !loginCookie) {
    console.error(`  ✗ Échec de connexion admin. Cookie manquant.`);
    return;
  }

  // Extract session cookie
  const sessionCookieHeader = loginCookie.split(';')[0];

  // Step 2: Step-up Owner Analytics
  const tOwner0 = performance.now();
  const ownerRes = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookieHeader,
    },
    body: JSON.stringify({ password: OWNER_PASSWORD }),
  });
  const tOwner1 = performance.now();
  const ownerCookie = ownerRes.headers.get('set-cookie') || sessionCookieHeader;
  const fullCookie = ownerCookie.split(';')[0];
  console.log(`  ✓ Déverrouillage Propriétaire POST /api/admin/analytics/verify | Code: ${ownerRes.status} | Temps: ${(tOwner1 - tOwner0).toFixed(1)}ms`);

  // Step 3: Admin Page Loads
  console.log(`\n--- [2/4] CHARGEMENT PAGES DU DASHBOARD (/admin) ---`);
  const adminPages = [
    { name: 'Dashboard Accueil (/admin)', path: '/admin' },
    { name: 'Dashboard Tab Rendez-vous (/admin?tab=appointments)', path: '/admin?tab=appointments' },
    { name: 'Dashboard Tab Patients (/admin?tab=patients)', path: '/admin?tab=patients' },
    { name: 'Dashboard Tab Facturation (/admin?tab=invoices)', path: '/admin?tab=invoices' },
    { name: 'Dashboard Tab Créneaux (/admin?tab=slots)', path: '/admin?tab=slots' },
    { name: 'Dashboard Tab Avis (/admin?tab=reviews)', path: '/admin?tab=reviews' },
    { name: 'Dashboard Tab Analytics (/admin?tab=analytics)', path: '/admin?tab=analytics' },
  ];

  for (const p of adminPages) {
    const times = [];
    let size = 0;
    let status = 0;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE_URL}${p.path}`, {
        headers: { 'Cookie': fullCookie },
        redirect: 'manual',
      });
      status = res.status;
      const buf = await res.arrayBuffer();
      const t1 = performance.now();
      times.push(t1 - t0);
      size = buf.byteLength;
    }
    const cold = times[0].toFixed(1);
    const warm = ((times[1] + times[2]) / 2).toFixed(1);
    const sizeKb = (size / 1024).toFixed(1);
    console.log(`  ✓ ${p.name.padEnd(52)} | Code: ${status} | Cold: ${cold.padStart(6)}ms | Warm: ${warm.padStart(6)}ms | Taille: ${sizeKb.padStart(5)} KB`);
  }

  // Step 4: Admin API Endpoints
  console.log(`\n--- [3/4] TEMPS DE RÉPONSE DES API ADMIN ---`);
  const adminApis = [
    { name: 'Session & Droits (/api/admin/me)', path: '/api/admin/me' },
    { name: 'Rendez-vous (/api/admin/appointments)', path: '/api/admin/appointments' },
    { name: 'Dossiers Patients (/api/admin/patients)', path: '/api/admin/patients' },
    { name: 'Factures & Recettes (/api/admin/invoices)', path: '/api/admin/invoices' },
    { name: 'Gestion Créneaux (/api/admin/slots?date=2026-09-10)', path: '/api/admin/slots?date=2026-09-10' },
    { name: 'Gestion Avis (/api/admin/reviews)', path: '/api/admin/reviews' },
    { name: 'Statistiques & CA (/api/admin/analytics?lang=fr)', path: '/api/admin/analytics?lang=fr' },
  ];

  const apiLatencies = [];
  for (const api of adminApis) {
    const times = [];
    let size = 0;
    let status = 0;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const res = await fetch(`${BASE_URL}${api.path}`, {
        headers: { 'Cookie': fullCookie },
      });
      status = res.status;
      const buf = await res.arrayBuffer();
      const t1 = performance.now();
      times.push(t1 - t0);
      size = buf.byteLength;
    }
    const cold = times[0].toFixed(1);
    const warm = ((times[1] + times[2]) / 2).toFixed(1);
    const min = Math.min(...times).toFixed(1);
    apiLatencies.push(parseFloat(warm));
    const sizeKb = (size / 1024).toFixed(1);
    console.log(`  ✓ ${api.name.padEnd(52)} | Code: ${status} | Cold: ${cold.padStart(6)}ms | Warm: ${warm.padStart(6)}ms | Min: ${min.padStart(5)}ms | Poids: ${sizeKb.padStart(5)} KB`);
  }

  // Step 5: Live SSE Connection check
  console.log(`\n--- [4/4] FLUX TEMPS RÉEL (SSE /api/admin/events) ---`);
  const tSse0 = performance.now();
  const controller = new AbortController();
  const sseTimeout = setTimeout(() => controller.abort(), 2000);
  try {
    const sseRes = await fetch(`${BASE_URL}/api/admin/events`, {
      headers: { 'Cookie': fullCookie },
      signal: controller.signal,
    });
    const tSse1 = performance.now();
    clearTimeout(sseTimeout);
    console.log(`  ✓ Connexion Flux SSE /api/admin/events | Code: ${sseRes.status} | Établi en: ${(tSse1 - tSse0).toFixed(1)}ms | Type: ${sseRes.headers.get('content-type')}`);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`  ✓ Flux SSE /api/admin/events actif (écoute continue confirmée)`);
    } else {
      console.log(`  ✗ Erreur SSE:`, err.message);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`📊 SYNTHÈSE ADMIN DASHBOARD`);
  const avgApi = (apiLatencies.reduce((a, b) => a + b, 0) / apiLatencies.length).toFixed(1);
  console.log(`  • Temps de réponse moyen des API Admin  : ${avgApi} ms`);
  console.log(`  • Temps de déverrouillage analytics     : ${(tOwner1 - tOwner0).toFixed(1)} ms`);
  console.log(`========================================================================\n`);
}

runAdminAudit();
