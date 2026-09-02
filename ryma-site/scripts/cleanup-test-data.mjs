import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

let dbUrl = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl && fs.existsSync(path.join(process.cwd(), '.env.local'))) {
  const envText = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TURSO_DATABASE_URL=')) dbUrl = trimmed.split('=')[1].trim();
    if (trimmed.startsWith('TURSO_AUTH_TOKEN=')) authToken = trimmed.split('=')[1].trim();
  }
}

if (!dbUrl) {
  console.log('No TURSO_DATABASE_URL found, exiting');
  process.exit(0);
}

const client = createClient({ url: dbUrl, authToken });

async function clean() {
  console.log('Connecting to Turso to clean test records...');
  
  const testPatients = await client.execute(
    "SELECT id, phone, patientName FROM patients WHERE patientName LIKE '%<script%' OR patientName LIKE '%=cmd%' OR patientName LIKE '%Audit%' OR phone IN ('918765432', '917778899', '915554433', '919998877')"
  );

  console.log(`Found ${testPatients.rows.length} test patients.`);
  for (const p of testPatients.rows) {
    await client.execute({ sql: 'DELETE FROM patient_sessions WHERE patientId = ?', args: [p.id] });
    await client.execute({ sql: 'DELETE FROM patients WHERE id = ?', args: [p.id] });
    console.log(`Deleted test patient: ${p.patientName} (${p.phone})`);
  }

  const testAppts = await client.execute(
    "SELECT id, patientName FROM appointments WHERE patientName LIKE '%<script%' OR patientName LIKE '%=cmd%' OR patientName LIKE '%Audit%' OR patientName LIKE '%Contender%' OR patientName LIKE '%Race%'"
  );
  console.log(`Found ${testAppts.rows.length} test appointments.`);
  for (const a of testAppts.rows) {
    await client.execute({ sql: 'DELETE FROM appointments WHERE id = ?', args: [a.id] });
    console.log(`Deleted test appointment: ${a.patientName}`);
  }

  const testInvoices = await client.execute(
    "SELECT id, invoiceNumber, patientName FROM invoices WHERE patientName LIKE '%<script%' OR patientName LIKE '%=cmd%' OR patientName LIKE '%Audit%' OR patientName LIKE '%Race%'"
  );
  console.log(`Found ${testInvoices.rows.length} test invoices.`);
  for (const inv of testInvoices.rows) {
    await client.execute({ sql: 'DELETE FROM invoices WHERE id = ?', args: [inv.id] });
    console.log(`Deleted test invoice: ${inv.invoiceNumber} (${inv.patientName})`);
  }

  console.log('✅ All test records cleanly purged from database!');
  process.exit(0);
}

clean().catch(err => {
  console.error('Clean error:', err);
  process.exit(1);
});
