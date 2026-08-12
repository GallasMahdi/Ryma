async function testServer() {
  const ports = [3000, 3001, 3002];
  let activePort = null;

  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}/api/slots?date=2026-08-13`);
      if (res.ok) {
        activePort = port;
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!activePort) {
    console.error('No running dev server found on ports 3000, 3001, 3002');
    return;
  }

  console.log(`--- Testing Running Server on http://localhost:${activePort} ---`);

  // 1. Test Slots API
  const slotsRes = await fetch(`http://localhost:${activePort}/api/slots?date=2026-08-13`);
  console.log('GET /api/slots Status:', slotsRes.status);
  const slotsData = await slotsRes.json();
  console.log('Slots returned count:', slotsData.slots?.length);
  console.log('Available slots count:', slotsData.slots?.filter((s) => s.available).length);
  console.log('First 3 slots:', slotsData.slots?.slice(0, 3));

  // 2. Test Admin Login API
  const loginRes = await fetch(`http://localhost:${activePort}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  console.log('\nPOST /api/admin/login Status:', loginRes.status);
  console.log('POST /api/admin/login Set-Cookie Header:', loginRes.headers.get('set-cookie'));
  const loginData = await loginRes.json();
  console.log('Login Response:', loginData);
}

testServer();
