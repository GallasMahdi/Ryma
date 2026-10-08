// Fresh installations start with an empty, administrator-managed catalogue.
export const TREATMENT_TABLES = [
  `CREATE TABLE IF NOT EXISTS treatment_catalog (
    slug TEXT PRIMARY KEY, content TEXT NOT NULL CHECK(json_valid(content)),
    status TEXT NOT NULL CHECK(status IN('DRAFT','PUBLISHED','ARCHIVED')),
    durationMinutes INTEGER NOT NULL CHECK(typeof(durationMinutes)='integer' AND durationMinutes BETWEEN 5 AND 720),
    priceCents INTEGER NOT NULL CHECK(typeof(priceCents)='integer' AND priceCents BETWEEN 0 AND 5000000),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), updatedAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS treatment_revisions (id TEXT PRIMARY KEY,slug TEXT NOT NULL,beforeJson TEXT,afterJson TEXT NOT NULL,actor TEXT,createdAt TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS catalogue_migrations (version INTEGER PRIMARY KEY)`,
 ];
export const TREATMENT_SCHEMA = [
  ...TREATMENT_TABLES,
  `UPDATE appointments SET serviceNameJson=(SELECT json_extract(content,'$.name') FROM treatment_catalog t WHERE t.slug=appointments.service),servicePriceCents=(SELECT priceCents FROM treatment_catalog t WHERE t.slug=appointments.service),servicePole=(SELECT json_extract(content,'$.pole') FROM treatment_catalog t WHERE t.slug=appointments.service) WHERE serviceNameJson IS NULL AND NOT EXISTS(SELECT 1 FROM catalogue_migrations WHERE version=1)`,
  `UPDATE invoices SET servicePole=(SELECT json_extract(content,'$.pole') FROM treatment_catalog t WHERE t.slug=invoices.serviceSlug) WHERE servicePole IS NULL AND NOT EXISTS(SELECT 1 FROM catalogue_migrations WHERE version=1)`,
  'INSERT OR IGNORE INTO catalogue_migrations(version) VALUES(1)',
  ...['INSERT','UPDATE','DELETE'].map(op => `CREATE TRIGGER IF NOT EXISTS booking_sync_treatment_${op.toLowerCase()} AFTER ${op} ON treatment_catalog BEGIN UPDATE booking_sync SET revision=revision+1 WHERE id=1; END`),
];
