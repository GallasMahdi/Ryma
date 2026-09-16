import Database from 'better-sqlite3';

const db = new Database('data/ryma.db');
const rows = db.prepare('SELECT id, invoiceNumber, amount, paymentStatus, paymentMethod, coverageType, createdAt, paidAt FROM invoices LIMIT 5').all();
console.log('Sample Invoices:', rows);

const totals = db.prepare(`
  SELECT 
    COUNT(*) as totalCount,
    SUM(CASE WHEN paymentStatus != 'CANCELLED' THEN amount ELSE 0 END) as totalRevenue,
    SUM(CASE WHEN paymentStatus = 'PAID' THEN amount ELSE 0 END) as totalPaid,
    SUM(CASE WHEN paymentStatus = 'PENDING' THEN amount ELSE 0 END) as totalPending,
    COUNT(CASE WHEN paymentStatus = 'PAID' THEN 1 END) as countPaid,
    COUNT(CASE WHEN paymentStatus = 'PENDING' THEN 1 END) as countPending,
    COUNT(CASE WHEN paymentStatus = 'CANCELLED' THEN 1 END) as countCancelled
  FROM invoices
`).get();
console.log('Database Invoice Totals:', totals);

const minMax = db.prepare('SELECT MIN(createdAt) as minCreated, MAX(createdAt) as maxCreated, MIN(paidAt) as minPaid, MAX(paidAt) as maxPaid FROM invoices').get();
console.log('Invoice Timestamps:', minMax);

db.close();
