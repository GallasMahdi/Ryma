import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
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

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('ERROR: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is missing');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
  console.log('--- Migrating Turso Cloud Database ---');
  
  // 1. Check patient table columns
  const patientColsRes = await client.execute("PRAGMA table_info(patients)");
  const patientColNames = patientColsRes.rows.map(r => String(r.name));
  console.log('Current patients columns:', patientColNames);

  if (!patientColNames.includes('coverageType')) {
    console.log('Adding coverageType to patients...');
    await client.execute("ALTER TABLE patients ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
    if (patientColNames.includes('cnamStatus')) {
      await client.execute("UPDATE patients SET coverageType = CASE WHEN cnamStatus = 'OUI' THEN 'INSURANCE' WHEN cnamStatus = 'EN_COURS' THEN 'ADSE' ELSE 'PARTICULAR' END");
    }
  }

  if (!patientColNames.includes('coverageProvider')) {
    console.log('Adding coverageProvider to patients...');
    await client.execute("ALTER TABLE patients ADD COLUMN coverageProvider TEXT");
  }

  if (!patientColNames.includes('coverageNumber')) {
    console.log('Adding coverageNumber to patients...');
    await client.execute("ALTER TABLE patients ADD COLUMN coverageNumber TEXT");
    if (patientColNames.includes('cnamNumber')) {
      await client.execute("UPDATE patients SET coverageNumber = cnamNumber WHERE cnamNumber IS NOT NULL AND coverageNumber IS NULL");
    }
  }

  // 2. Check appointments table columns
  const apptColsRes = await client.execute("PRAGMA table_info(appointments)");
  const apptColNames = apptColsRes.rows.map(r => String(r.name));
  console.log('Current appointments columns:', apptColNames);

  if (!apptColNames.includes('coverageType')) {
    console.log('Adding coverageType to appointments...');
    await client.execute("ALTER TABLE appointments ADD COLUMN coverageType TEXT DEFAULT 'PARTICULAR'");
  }

  if (!apptColNames.includes('coverageProvider')) {
    console.log('Adding coverageProvider to appointments...');
    await client.execute("ALTER TABLE appointments ADD COLUMN coverageProvider TEXT");
  }

  if (!apptColNames.includes('coverageNumber')) {
    console.log('Adding coverageNumber to appointments...');
    await client.execute("ALTER TABLE appointments ADD COLUMN coverageNumber TEXT");
  }

  console.log('✅ Turso Database migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
