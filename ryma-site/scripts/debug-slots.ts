import { GET as getSlots } from '../src/app/api/slots/route';
import { NextRequest } from 'next/server';
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
        process.env[key.trim()] = vals.join('=').trim().replace(/\\/g, '');
      }
    }
  });
}

async function testBothDates() {
  console.log('--- Testing Today (2026-08-12) ---');
  const reqToday = new NextRequest('http://localhost:3000/api/slots?date=2026-08-12');
  const resToday = await getSlots(reqToday);
  const dataToday = await resToday.json();
  console.log('Today status:', resToday.status);
  console.log('Today available slots:', dataToday.slots?.filter((s: any) => s.available).length);
  console.log('Today reasons:', dataToday.slots?.map((s: any) => `${s.time}: ${s.available ? 'AVAILABLE' : s.reason}`));

  console.log('\n--- Testing Tomorrow (2026-08-13) ---');
  const reqTom = new NextRequest('http://localhost:3000/api/slots?date=2026-08-13');
  const resTom = await getSlots(reqTom);
  const dataTom = await resTom.json();
  console.log('Tomorrow status:', resTom.status);
  console.log('Tomorrow available slots:', dataTom.slots?.filter((s: any) => s.available).length);
  console.log('Tomorrow first 5 slots:', dataTom.slots?.slice(0, 5));
}

testBothDates();
