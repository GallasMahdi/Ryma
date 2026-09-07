import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSWORD = 'ryma2024admin';
const OWNER_PASSWORD = 'ryma2024owner';
const OUT_DIR = 'c:/Users/User/Desktop/Ryma/pitch-portugal';

async function main() {
  console.log('--- 1. Authenticating with Admin API ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  console.log('Login Set-Cookie received:', setCookie ? 'YES' : 'NO');
  
  // Extract cookie name and value
  const match = setCookie.match(/([^=]+)=([^;]+)/);
  const cookieName = match[1].trim();
  const cookieValue = match[2].trim();

  // Verify owner analytics for full statistics access
  const ownerRes = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `${cookieName}=${cookieValue}`,
    },
    body: JSON.stringify({ password: OWNER_PASSWORD }),
  });
  const ownerSetCookie = ownerRes.headers.get('set-cookie');
  let finalCookieValue = cookieValue;
  if (ownerSetCookie) {
    const ownerMatch = ownerSetCookie.match(/([^=]+)=([^;]+)/);
    if (ownerMatch) finalCookieValue = ownerMatch[2].trim();
  }
  console.log('Owner unlock Set-Cookie received:', ownerSetCookie ? 'YES' : 'NO');

  console.log('--- 2. Starting Headless Chrome with Remote Debugging ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--window-size=1440,920',
  ]);

  // Give Chrome 1.5s to open port
  await new Promise(r => setTimeout(r, 1500));

  console.log('--- 3. Connecting to Chrome via CDP WebSocket ---');
  const newTabRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' });
  const tabData = await newTabRes.json();
  const wsUrl = tabData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  console.log('WebSocket connection established!');

  let msgId = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data.result);
      callbacks.delete(data.id);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Network.enable');

  // Set auth cookies for localhost
  await send('Network.setCookie', {
    name: cookieName,
    value: finalCookieValue,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  async function capture(url, filename, evaluateBefore = null, waitMs = 2500) {
    console.log(`Navigating to ${url}...`);
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));

    if (evaluateBefore) {
      console.log('Evaluating custom action on page...');
      await send('Runtime.evaluate', { expression: evaluateBefore, awaitPromise: true });
      await new Promise(r => setTimeout(r, 1500));
    }

    const scr = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(scr.data, 'base64');
    const dest = path.join(OUT_DIR, filename);
    fs.writeFileSync(dest, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  // 1. Client Reviews page
  await capture('http://localhost:3000/avis', 'dash-client-reviews.png', null, 2500);

  // 2. Client Booking 24/7 page
  await capture('http://localhost:3000/rendez-vous', 'dash-client-booking.png', null, 2500);

  // 3. Admin Dashboard: Agenda & Appointments Tab
  await capture('http://localhost:3000/admin', 'dash-admin-agenda.png', null, 3500);

  // 4. Admin Dashboard: Patient Clinical Dossier / EHR & EVA Tab
  await capture(
    'http://localhost:3000/admin',
    'dash-admin-ehr.png',
    `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes('Dossiers') || b.textContent.includes('Patients') || b.textContent.includes('Prontuários'));
      if (target) target.click();
    })()`,
    3500
  );

  // 5. Admin Dashboard: Invoices & Art. 9 CIVA Tab
  await capture(
    'http://localhost:3000/admin',
    'dash-admin-invoices.png',
    `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes('Factures') || b.textContent.includes('Faturação') || b.textContent.includes('Invoices'));
      if (target) target.click();
    })()`,
    3500
  );

  // 6. Admin Dashboard: Reviews Moderation Tab
  await capture(
    'http://localhost:3000/admin',
    'dash-admin-reviews.png',
    `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes('Avis') || b.textContent.includes('Avaliações') || b.textContent.includes('Reviews'));
      if (target) target.click();
    })()`,
    3500
  );

  // 7. Admin Dashboard: Analytics & Full Statistics Tab
  await capture(
    'http://localhost:3000/admin',
    'dash-admin-analytics.png',
    `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const target = buttons.find(b => b.textContent.includes('Analytics') || b.textContent.includes('Statistiques') || b.textContent.includes('Estatísticas'));
      if (target) target.click();
    })()`,
    3500
  );

  console.log('--- All screenshots captured successfully! ---');
  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
