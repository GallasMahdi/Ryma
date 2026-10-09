# Hosted demo inventory and preservation plan

**No hosted cleanup was performed.** The user chose to keep hosted data and receive this report. These figures describe the locally configured cloud database; its equivalence to the production Vercel database is unverified.

`ryma_demo_imports` records `ryma-professional-demo-v1` imported 8 October 2026 at 14:34:41.255 UTC. [Aggregate evidence](demo-data-inventory.json) includes current synthetic-ID counts and targeted dependency checks, without patient details or secrets.

| Category | Total | Identified synthetic IDs | Preserve/review |
|---|---:|---:|---|
| Patients | 101 | 100 | Other patient and all dependencies |
| Appointments | 432 | 431 | Other appointment and its links |
| Invoices | 287 | 287 | Numbering/history before any future deletion |
| Clinical sessions | 421 | 421 | Revisions and appointment links |
| Prescriptions | 50 | 50 | Document/patient relationships |
| Reviews | 44 | 36 | Other 8; inspect moderation/provenance |
| Practitioners | 5 | 4 | Shared staff references |
| Resources | 3 | 3 | Room/equipment mappings |
| Schedule exceptions | 3 | 3 | Staff schedules |
| Blocked slots | 92 | 3 | Other 89 unless separately proven synthetic |
| Treatment revisions | 17 | 17 | Publication/history dependencies |
| Clinical revisions | 9 | 9 | Clinical history |
| WhatsApp inbox/outbox | 6 / 6 | 6 / 6 | Prevent accidental sends during rehearsal |

The import also records 100 patient notes, 15 treatments, 36 practitioner-service mappings, 32 working-hour rows, 5 service-resource mappings, 10 idempotency keys and 6 WhatsApp conversations. These are historical import counts, not a deletion instruction for current shared configuration. Some tables have no suitable synthetic primary ID.

Four targeted checks found zero non-demo appointments, invoices, sessions or prescriptions referencing demo patients. This does not exhaust practitioner, resource, treatment, schedule, revision, conversation and idempotency relationships.

## Launch option preserving this database

Keep the current database as a restricted staging/demo environment. A separately provisioned launch database can receive verified team/treatment/schedule settings and explicitly approved non-demo records. Confirm deployment/database identity before any import. No such provisioning/migration was performed here.

## Rehearsal steps if cleanup is authorized later

1. Verify the selected DB and hosting binding; freeze writes and disable outbound/scheduled jobs.
2. Create a consistent encrypted backup and prove restoration into an isolated database. Avoid copying only a SQLite main file while WAL writes are active.
3. On the clone, enumerate exact provenance/import IDs. Prefix checks are corroboration, not sufficient grounds for blanket deletion.
4. Build the complete dependency graph; preserve unclassified data and shared configuration. Review invoice numbering, clinical and immutable audit history.
5. Rehearse a transactional cleanup or approved-record migration. Reconcile counts, foreign keys, clinical links, invoice totals, capacity and owner reports. Keep explicit affected-record IDs out of the public repository.
6. Obtain authorization for the reviewed record set before changing the chosen hosted DB. Keep rollback available and verify the public catalogue, staff and reviews afterward.

No destructive SQL is included because the inventory alone is insufficient for a safe deletion plan. `node scripts/audit-demo-records.mjs` is SELECT-only and writes aggregate evidence.
