// Internal billing records. This schema does not implement fiscal certification.
export const INVOICE_COLUMNS = { documentKind: 'TEXT', externalReference: 'TEXT' };
export const INVOICE_TABLES = [
  `CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY, invoiceId TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    appointmentId TEXT, sessionId TEXT, serviceSlug TEXT NOT NULL, serviceName TEXT NOT NULL, servicePole TEXT,
    date TEXT NOT NULL, startTime TEXT, practitionerId TEXT, practitioner TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity=1),
    unitPriceCents INTEGER NOT NULL CHECK(typeof(unitPriceCents)='integer' AND unitPriceCents>0),
    totalCents INTEGER NOT NULL CHECK(totalCents=unitPriceCents*quantity),
    vatRate INTEGER NOT NULL CHECK(vatRate IN(0,6,13,23)), vatExemptionReason TEXT, priceAdjustmentReason TEXT, releasedAt TEXT,
    CHECK(appointmentId IS NOT NULL OR sessionId IS NOT NULL)
  )`,
  'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoiceId,date,startTime)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_items_appointment ON invoice_items(appointmentId) WHERE appointmentId IS NOT NULL AND releasedAt IS NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_items_session ON invoice_items(sessionId) WHERE sessionId IS NOT NULL AND releasedAt IS NULL',
];

export const INVOICE_GUARDS = [
  'CREATE INDEX IF NOT EXISTS idx_invoices_appointment ON invoices(appointmentId)',
  `CREATE TRIGGER IF NOT EXISTS invoice_items_snapshot_guard BEFORE UPDATE OF
   invoiceId,appointmentId,sessionId,serviceSlug,serviceName,servicePole,date,startTime,practitionerId,practitioner,quantity,unitPriceCents,totalCents,vatRate,vatExemptionReason,priceAdjustmentReason ON invoice_items
   BEGIN SELECT RAISE(ABORT,'invoice_item_snapshot_immutable'); END`,
  `CREATE TRIGGER IF NOT EXISTS invoice_item_legacy_guard BEFORE INSERT ON invoice_items
   WHEN NEW.appointmentId IS NOT NULL AND NEW.releasedAt IS NULL BEGIN
   SELECT RAISE(ABORT,'session_already_invoiced') WHERE EXISTS(
     SELECT 1 FROM invoices WHERE appointmentId=NEW.appointmentId AND id!=NEW.invoiceId AND paymentStatus!='CANCELLED'); END`,
  ...['INSERT', 'UPDATE OF appointmentId,paymentStatus'].map((event, index) =>
    `CREATE TRIGGER IF NOT EXISTS invoice_appointment_billing_guard_${index} BEFORE ${event} ON invoices
     WHEN NEW.appointmentId IS NOT NULL AND NEW.paymentStatus!='CANCELLED' BEGIN
     SELECT RAISE(ABORT,'session_already_invoiced') WHERE EXISTS(
       SELECT 1 FROM invoices WHERE appointmentId=NEW.appointmentId AND id!=NEW.id AND paymentStatus!='CANCELLED') OR EXISTS(
       SELECT 1 FROM invoice_items WHERE appointmentId=NEW.appointmentId AND invoiceId!=NEW.id AND releasedAt IS NULL); END`),
  `CREATE TRIGGER IF NOT EXISTS invoice_items_cancel AFTER UPDATE OF paymentStatus ON invoices
   WHEN NEW.paymentStatus='CANCELLED' AND OLD.paymentStatus!='CANCELLED'
   BEGIN UPDATE invoice_items SET releasedAt=NEW.updatedAt WHERE invoiceId=NEW.id AND releasedAt IS NULL; END`,
  `CREATE TRIGGER IF NOT EXISTS invoice_items_no_reopen BEFORE UPDATE OF paymentStatus ON invoices
   WHEN OLD.paymentStatus='CANCELLED' AND NEW.paymentStatus!='CANCELLED' AND EXISTS(SELECT 1 FROM invoice_items WHERE invoiceId=OLD.id)
   BEGIN SELECT RAISE(ABORT,'cancelled_invoice_immutable'); END`,
];
