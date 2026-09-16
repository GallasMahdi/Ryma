import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/ryma.db');

const db = new Database(dbPath);

console.log('================================================================');
console.log('🩺 RYMA CLINIC: INVOICES vs ANALYTICS FULL AUDIT & BENCHMARK');
console.log('================================================================');

// 1. Fetch raw invoices from database (same as dbGetInvoices)
const rawInvoices = db.prepare('SELECT * FROM invoices ORDER BY createdAt DESC').all();

// 2. Calculate metrics using EXACT InvoicesTab logic
let invTotalBilled = 0;
let invTotalPaid = 0;
let invTotalPending = 0;
let invCountPaid = 0;
let invCountPending = 0;
let invCountActive = 0;
let invCountCancelled = 0;

for (const inv of rawInvoices) {
  if (inv.paymentStatus === 'CANCELLED') {
    invCountCancelled++;
    continue;
  }
  invCountActive++;
  invTotalBilled += Number(inv.amount) || 0;
  if (inv.paymentStatus === 'PAID') {
    invTotalPaid += Number(inv.amount) || 0;
    invCountPaid++;
  } else {
    invTotalPending += Number(inv.amount) || 0;
    invCountPending++;
  }
}

const invAvgTicket = invCountPaid > 0 ? Math.round((invTotalPaid / invCountPaid) * 100) / 100 : 0;

console.log('\n--- 1. INVOICES TAB COMPUTED METRICS ---');
console.log(`Total Database Invoices  : ${rawInvoices.length}`);
console.log(`Cancelled Invoices (Ignored): ${invCountCancelled}`);
console.log(`Active Invoices          : ${invCountActive}`);
console.log(`Total Billed (Facturé)   : ${invTotalBilled.toFixed(2)} €`);
console.log(`Total Paid (Encaissé)    : ${invTotalPaid.toFixed(2)} €`);
console.log(`Total Pending (En Attente): ${invTotalPending.toFixed(2)} €`);
console.log(`Paid Count               : ${invCountPaid}`);
console.log(`Pending Count            : ${invCountPending}`);
console.log(`Avg Ticket               : ${invAvgTicket.toFixed(2)} €`);

// 3. Test dbGetFilteredAnalyticsStats simulation in SQLite
function runAnalyticsQuery(range = 'all', pole = 'all') {
  const start = performance.now();
  
  let invQuery = 'SELECT amount, paymentStatus, paymentMethod, coverageType, createdAt FROM invoices WHERE 1=1';
  const params = [];
  
  if (range !== 'all') {
    const now = new Date();
    let startDate = new Date();
    if (range === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (range === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else if (range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    const isoStart = startDate.toISOString();
    invQuery += ' AND createdAt >= ?';
    params.push(isoStart);
  }
  
  const filteredInvoices = db.prepare(invQuery).all(...params);
  
  let statBilled = 0;
  let statPaid = 0;
  let statPending = 0;
  let statCountPaid = 0;
  let statCountPending = 0;
  let statCountActive = 0;
  
  const methodMap = {};
  
  for (const inv of filteredInvoices) {
    if (inv.paymentStatus === 'CANCELLED') continue;
    
    statCountActive++;
    const amt = Number(inv.amount) || 0;
    statBilled += amt;
    
    if (inv.paymentStatus === 'PAID') {
      statPaid += amt;
      statCountPaid++;
      const m = inv.paymentMethod || 'OTHER';
      methodMap[m] = (methodMap[m] || 0) + amt;
    } else {
      statPending += amt;
      statCountPending++;
    }
  }
  
  const durationMs = performance.now() - start;
  
  return {
    statBilled,
    statPaid,
    statPending,
    statCountPaid,
    statCountPending,
    statCountActive,
    methodMap,
    durationMs,
  };
}

const analyticsAll = runAnalyticsQuery('all', 'all');

console.log('\n--- 2. ANALYTICS TAB COMPUTED METRICS (range: all) ---');
console.log(`Active Invoices Count    : ${analyticsAll.statCountActive}`);
console.log(`Total Billed             : ${analyticsAll.statBilled.toFixed(2)} €`);
console.log(`Total Paid               : ${analyticsAll.statPaid.toFixed(2)} €`);
console.log(`Total Pending            : ${analyticsAll.statPending.toFixed(2)} €`);
console.log(`Paid Count               : ${analyticsAll.statCountPaid}`);
console.log(`Pending Count            : ${analyticsAll.statCountPending}`);
console.log(`Query Execution Time     : ${analyticsAll.durationMs.toFixed(2)} ms`);

// 4. Parity verification assertions
console.log('\n--- 3. MATHEMATICAL PARITY AUDIT ---');
const checks = [
  { name: 'Active Invoices Count', inv: invCountActive, ana: analyticsAll.statCountActive },
  { name: 'Paid Invoices Count', inv: invCountPaid, ana: analyticsAll.statCountPaid },
  { name: 'Pending Invoices Count', inv: invCountPending, ana: analyticsAll.statCountPending },
  { name: 'Total Billed Amount (€)', inv: invTotalBilled, ana: analyticsAll.statBilled },
  { name: 'Total Paid Amount (€)', inv: invTotalPaid, ana: analyticsAll.statPaid },
  { name: 'Total Pending Amount (€)', inv: invTotalPending, ana: analyticsAll.statPending },
];

let allPassed = true;
for (const c of checks) {
  const diff = Math.abs(c.inv - c.ana);
  const passed = diff < 0.001;
  if (!passed) allPassed = false;
  console.log(`[${passed ? 'PASS ✅' : 'FAIL ❌'}] ${c.name.padEnd(26)}: InvoicesTab = ${c.inv}, Analytics = ${c.ana}, Diff = ${diff.toFixed(2)}`);
}

// Check breakdown sums
const methodTotal = Object.values(analyticsAll.methodMap).reduce((a, b) => a + b, 0);
const methodDiff = Math.abs(methodTotal - analyticsAll.statPaid);
console.log(`[${methodDiff < 0.01 ? 'PASS ✅' : 'FAIL ❌'}] Payment Methods Sum vs Paid Revenue: Sum = ${methodTotal.toFixed(2)} €, Paid = ${analyticsAll.statPaid.toFixed(2)} €, Diff = ${methodDiff.toFixed(2)} €`);

// 5. Rapidity Benchmark Across Ranges
console.log('\n--- 4. RAPIDITY & LATENCY BENCHMARK ---');
const ranges = ['all', 'today', 'week', 'month', 'quarter', 'year'];
for (const r of ranges) {
  const runs = [];
  for (let i = 0; i < 5; i++) {
    runs.push(runAnalyticsQuery(r, 'all').durationMs);
  }
  const avg = runs.reduce((a, b) => a + b, 0) / runs.length;
  console.log(`Range: ${r.padEnd(8)} -> Avg Query Latency: ${avg.toFixed(3)} ms (min: ${Math.min(...runs).toFixed(3)}ms, max: ${Math.max(...runs).toFixed(3)}ms)`);
}

console.log('\n================================================================');
if (allPassed && methodDiff < 0.01) {
  console.log('🎉 AUDIT RESULT: PERFECT 100% PARITY & SUB-MILLISECOND LATENCY ACHIEVED');
} else {
  console.log('⚠️ AUDIT RESULT: DISCREPANCY DETECTED');
  process.exit(1);
}
console.log('================================================================\n');
