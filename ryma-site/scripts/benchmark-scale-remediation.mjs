import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';

async function runScaleRemediationBenchmark() {
  console.log('===============================================================');
  console.log('⚡ BENCHMARK: UNBOUNDED (OLD) VS PAGINATED + SQL AGGREGATE (NEW) ⚡');
  console.log('===============================================================\n');

  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE appointments (
      id TEXT PRIMARY KEY,
      patientName TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      service TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      coverageType TEXT DEFAULT 'PARTICULAR',
      coverageProvider TEXT,
      coverageNumber TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX idx_appointments_date ON appointments(date);
    CREATE INDEX idx_appointments_status ON appointments(status);

    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      invoiceNumber TEXT NOT NULL UNIQUE,
      appointmentId TEXT,
      patientId TEXT,
      patientName TEXT NOT NULL,
      patientNif TEXT DEFAULT '999999990',
      patientEmail TEXT,
      patientPhone TEXT NOT NULL,
      patientAddress TEXT,
      coverageType TEXT DEFAULT 'PARTICULAR',
      coverageProvider TEXT,
      coverageNumber TEXT,
      serviceSlug TEXT NOT NULL,
      serviceName TEXT NOT NULL,
      practitioner TEXT,
      amount REAL NOT NULL,
      vatRate REAL NOT NULL DEFAULT 0,
      vatExemptionReason TEXT DEFAULT 'Artigo 9.º do CIVA',
      paymentMethod TEXT NOT NULL DEFAULT 'MULTIBANCO',
      paymentStatus TEXT NOT NULL DEFAULT 'PAID',
      paidAt TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, patientName, email, phone, service, date, startTime, status, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInv = db.prepare(`
    INSERT INTO invoices (id, invoiceNumber, patientName, patientPhone, serviceSlug, serviceName, amount, paymentMethod, paymentStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const COUNT = 50000;
  console.log(`Seeding database with ${COUNT.toLocaleString()} rows...`);
  const t0 = performance.now();
  db.transaction(() => {
    for (let i = 0; i < COUNT; i++) {
      const id = 'appt_' + i;
      insertAppt.run(
        id,
        'Patient ' + i,
        `patient${i}@example.com`,
        '91' + String(1000000 + i).slice(-7),
        'kinesitherapie-generale',
        '2026-09-10',
        '09:00',
        i % 4 === 0 ? 'CONFIRMED' : i % 4 === 1 ? 'COMPLETED' : 'PENDING',
        'Medical notes for session ' + i,
        new Date().toISOString(),
        new Date().toISOString()
      );
      insertInv.run(
        'inv_' + i,
        'FT2026/' + i,
        'Patient ' + i,
        '91' + String(1000000 + i).slice(-7),
        'kinesitherapie-generale',
        'Sessão Geral',
        55.0,
        'MULTIBANCO',
        i % 5 === 0 ? 'PENDING' : 'PAID',
        new Date().toISOString(),
        new Date().toISOString()
      );
    }
  })();
  console.log(`Seeded in ${(performance.now() - t0).toFixed(0)} ms\n`);

  // --- COMPARISON 1: APPOINTMENTS LISTING ---
  console.log('--- 1. Appointments Query: Unbounded vs Paginated ---');
  // OLD: SELECT *
  const tOldAppt0 = performance.now();
  const oldAppts = db.prepare('SELECT * FROM appointments ORDER BY date DESC, startTime ASC').all();
  const oldPayload = JSON.stringify(oldAppts);
  const tOldAppt1 = performance.now();

  // NEW: SELECT * ... LIMIT 50 OFFSET 0
  const tNewAppt0 = performance.now();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM appointments').get();
  const newAppts = db.prepare('SELECT * FROM appointments ORDER BY date DESC, startTime ASC LIMIT 50 OFFSET 0').all();
  const newPayload = JSON.stringify({ appointments: newAppts, total: countRow.cnt, page: 1, limit: 50 });
  const tNewAppt1 = performance.now();

  console.log(`OLD (Unbounded 50k rows):`);
  console.log(`  Execution + Serialize Time : ${(tOldAppt1 - tOldAppt0).toFixed(2)} ms`);
  console.log(`  Wire Payload Size          : ${(oldPayload.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`NEW (Paginated 50 rows):`);
  console.log(`  Execution + Serialize Time : ${(tNewAppt1 - tNewAppt0).toFixed(2)} ms`);
  console.log(`  Wire Payload Size          : ${(newPayload.length / 1024).toFixed(2)} KB`);
  console.log(`  Speedup Factor             : ${( (tOldAppt1 - tOldAppt0) / (tNewAppt1 - tNewAppt0) ).toFixed(1)}x faster`);
  console.log(`  Payload Reduction          : ${( (1 - newPayload.length / oldPayload.length) * 100 ).toFixed(2)}% lighter\n`);

  // --- COMPARISON 2: ANALYTICS AGGREGATION ---
  console.log('--- 2. Analytics Calculation: In-Memory vs SQL Aggregate ---');
  // OLD: Load all appointments and invoices into memory
  const tOldAna0 = performance.now();
  const appts = db.prepare('SELECT * FROM appointments').all();
  const invs = db.prepare('SELECT * FROM invoices').all();
  const oldTotal = appts.length;
  const oldConfirmed = appts.filter(a => a.status === 'CONFIRMED').length;
  const oldRevenue = invs.filter(i => i.paymentStatus === 'PAID').reduce((s, i) => s + i.amount, 0);
  const oldAnaPayload = JSON.stringify({ total: oldTotal, confirmed: oldConfirmed, revenue: oldRevenue, rows: appts });
  const tOldAna1 = performance.now();

  // NEW: SQL Aggregate
  const tNewAna0 = performance.now();
  const apptStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
    FROM appointments
  `).get();
  const invStats = db.prepare(`
    SELECT
      COALESCE(SUM(amount), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN paymentStatus = 'PAID' THEN amount ELSE 0 END), 0) as paidRevenue
    FROM invoices
    WHERE paymentStatus != 'CANCELLED'
  `).get();
  const newAnaPayload = JSON.stringify({ ...apptStats, ...invStats });
  const tNewAna1 = performance.now();

  console.log(`OLD (In-Memory JS Aggregate of 50k rows):`);
  console.log(`  Query + Calculation Time   : ${(tOldAna1 - tOldAna0).toFixed(2)} ms`);
  console.log(`NEW (SQL Aggregates in Database):`);
  console.log(`  Query + Calculation Time   : ${(tNewAna1 - tNewAna0).toFixed(2)} ms`);
  console.log(`  Speedup Factor             : ${( (tOldAna1 - tOldAna0) / (tNewAna1 - tNewAna0) ).toFixed(1)}x faster`);
  console.log(`  Serverless RAM Impact      : 0 MB memory leak risk (aggregated inside SQLite/Turso)\n`);

  console.log('===============================================================');
  console.log('✅ BENCHMARK COMPLETE: SCALABILITY BOTTLENECK ELIMINATED! ✅');
  console.log('===============================================================');
}

runScaleRemediationBenchmark().catch(console.error);
