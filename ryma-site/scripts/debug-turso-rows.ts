import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!.replace(/^libsql:\/\//, 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function debugTursoRows() {
  console.log('Testing SELECT COUNT(*) as cnt...');
  const res1 = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM rate_limit_log WHERE ip = ?',
    args: ['127.0.0.1']
  });
  console.log('res1.rows:', res1.rows);
  console.log('res1.rows[0]:', res1.rows[0]);
  console.log('res1.rows[0].cnt:', res1.rows[0]?.cnt);
  console.log('Type of cnt:', typeof res1.rows[0]?.cnt);

  console.log('\nTesting SELECT startTime FROM appointments...');
  const res2 = await client.execute({
    sql: "SELECT startTime FROM appointments WHERE date = ?",
    args: ['2026-08-12']
  });
  console.log('res2.rows:', res2.rows);

  console.log('\nTesting SELECT date, time FROM blocked_slots...');
  const res3 = await client.execute({
    sql: "SELECT date, time FROM blocked_slots",
    args: []
  });
  console.log('res3.rows length:', res3.rows.length);
  console.log('res3.rows[0]:', res3.rows[0]);
}

debugTursoRows();
