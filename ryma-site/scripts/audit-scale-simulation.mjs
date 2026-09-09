import Database from 'better-sqlite3';
import { performance } from 'perf_hooks';

async function testScale() {
  console.log('=== PHASE 6: ADMIN SCALE & UNBOUNDED QUERY ANALYSIS ===\n');

  // Create an in-memory or temp SQLite DB to simulate 1k, 10k, 50k records
  const db = new Database(':memory:');

  // Create tables mimicking production schema
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
    CREATE INDEX idx_invoices_patient ON invoices(patientPhone);
    CREATE INDEX idx_invoices_date ON invoices(createdAt);
  `);

  const insertAppt = db.prepare(`
    INSERT INTO appointments (id, patientName, email, phone, service, date, startTime, status, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInv = db.prepare(`
    INSERT INTO invoices (id, invoiceNumber, patientName, patientPhone, serviceSlug, serviceName, amount, paymentMethod, paymentStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed batches: 1,000, 10,000, 50,000
  const scales = [1000, 10000, 50000];

  for (const count of scales) {
    console.log(`--- Testing Scale: ${count.toLocaleString()} Records ---`);

    // Populate up to count
    const currentCount = db.prepare('SELECT COUNT(*) as c FROM appointments').get().c;
    const toInsert = count - currentCount;

    const seedStart = performance.now();
    db.transaction(() => {
      for (let i = 0; i < toInsert; i++) {
        const id = 'appt_' + (currentCount + i);
        insertAppt.run(
          id,
          'Patient ' + (currentCount + i),
          `patient${currentCount + i}@example.com`,
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
          'inv_' + (currentCount + i),
          'FT2026/' + (currentCount + i),
          'Patient ' + (currentCount + i),
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
    console.log(`  Inserted ${toInsert} rows in ${(performance.now() - seedStart).toFixed(1)}ms`);

    // 1. Unbounded dbGetAppointments() query
    const tAppt0 = performance.now();
    const allAppts = db.prepare('SELECT * FROM appointments ORDER BY date DESC, startTime ASC').all();
    const tAppt1 = performance.now();
    const jsonAppts = JSON.stringify(allAppts);
    const tApptJson = performance.now();

    console.log(`  Unbounded dbGetAppointments():`);
    console.log(`    SQL Query Time     : ${(tAppt1 - tAppt0).toFixed(2)} ms`);
    console.log(`    JSON Stringify Time: ${(tApptJson - tAppt1).toFixed(2)} ms`);
    console.log(`    Payload Memory Size: ${(jsonAppts.length / 1024 / 1024).toFixed(2)} MB`);

    // 2. Full-table scan search: LIKE '%query%' (unindexed leading wildcard)
    const tSearch0 = performance.now();
    const searchRes = db.prepare('SELECT * FROM appointments WHERE patientName LIKE ? OR phone LIKE ?').all('%50%', '%50%');
    const tSearch1 = performance.now();
    console.log(`  Full-Table Scan Search (LIKE '%...%'):`);
    console.log(`    Search Time        : ${(tSearch1 - tSearch0).toFixed(2)} ms (${searchRes.length} hits)`);

    // 3. Analytics In-Memory Aggregation Simulation
    const tAnalytics0 = performance.now();
    const appts = db.prepare('SELECT * FROM appointments').all();
    const invs = db.prepare('SELECT * FROM invoices').all();
    // Simulate current /api/admin/analytics in-memory processing
    const total = appts.length;
    const confirmed = appts.filter(a => a.status === 'CONFIRMED').length;
    const paidRevenue = invs.filter(i => i.paymentStatus === 'PAID').reduce((s, i) => s + i.amount, 0);
    const dowCounts = Array(7).fill(0);
    appts.forEach(a => {
      const d = new Date(a.date + 'T12:00:00');
      dowCounts[(d.getDay() + 6) % 7]++;
    });
    const tAnalytics1 = performance.now();
    console.log(`  In-Memory /api/admin/analytics calculation:`);
    console.log(`    Memory Processing  : ${(tAnalytics1 - tAnalytics0).toFixed(2)} ms`);
    console.log(`    Total Heap Used    : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n`);
  }
}

testScale();
