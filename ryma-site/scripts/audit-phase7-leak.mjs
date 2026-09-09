import http from 'http';

console.log('=== PHASE 7: MEMORY LEAK & SSE SUBSCRIPTION HUNT ===\n');

async function loginAdmin() {
  const res = await fetch('http://localhost:3005/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  return cookie.split(';')[0];
}

async function run() {
  const cookie = await loginAdmin();
  console.log('Admin logged in, session cookie acquired.');

  console.log('Opening and abruptly destroying 60 SSE connections to test listener cleanup...');

  let active = 0;
  for (let i = 0; i < 60; i++) {
    const req = http.request('http://localhost:3005/api/admin/events', {
      headers: {
        'Cookie': cookie,
        'Accept': 'text/event-stream',
      },
    });

    req.on('response', (res) => {
      active++;
      // Wait 50ms to establish connection, then destroy socket abruptly without closing stream
      setTimeout(() => {
        req.destroy();
      }, 50);
    });

    req.on('error', () => {});
    req.end();
    await new Promise(r => setTimeout(r, 20));
  }

  await new Promise(r => setTimeout(r, 2000));
  console.log(`Finished 60 abruptly terminated SSE connections.`);
}

run();
