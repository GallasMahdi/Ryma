# Dashboard logic audit — 18 September 2026

## Scope and result

Reviewed dashboard authentication and owner permissions, appointments and recurring plans, slot blocking, patient notes and clinical sessions, invoices, prescriptions, reviews, exports, event streaming, analytics, and asynchronous client state. Fixed confirmed defects and added `npm run test:dashboard`.

This is a source and isolated integration audit. No real patient records were changed. Earlier BodyMap and navigation edits remain separate from these dashboard changes.

## Corrected findings

| Area | Defect and correction |
| --- | --- |
| Patient data | Repeat bookings could overwrite existing clinical profiles; omitted note-form fields could erase demographics or coverage. Booking now preserves existing patients, and partial updates preserve omitted values. |
| Clinical sessions | Session insertion and calendar booking could succeed independently, leaving orphan records. Creation and deletion now transact together. Newly generated recurring sessions share a deterministic appointment link. |
| Booking concurrency | Rescheduling could bypass blocked slots; blocking could race with booking. Database triggers enforce both directions. |
| Input validation | Null JSON, invalid calendar dates, arbitrary times, invalid enums, and malformed prescription items could reach business logic. Added validation and bounded pagination; duplicate recurrence previews are rejected. |
| Bulk availability | Delete/reinsert blocking left a race window. Each day's updates now transact; oversized/reversed ranges are rejected instead of silently truncated. |
| Authentication | Resealing could extend effective access, and owner verification did not consistently enforce revocation. Guards now enforce an absolute eight-hour session lifetime and revocation. |
| Owner access | Owner password rotation left existing grants active. Password update and grant revocation now transact together. Failed locking/logout is no longer presented as success. |
| Production configuration | Public development credentials were accepted in production. Production now rejects default/missing credentials. SQLite production access requires explicit configuration. |
| Database authority | Cloud errors could silently fall back to local records and writes, causing divergence. Configured Turso remains authoritative; failed writes are not blindly replayed. |
| Invoice integrity | Ordinary updates could bypass owner cancellation controls or reopen cancelled documents. Status validation closes these paths. PAID updates preserve payment timestamps; PENDING clears them. |
| Invoice retries | Concurrent retries could create duplicate invoices. Idempotency records and invoices now commit atomically; reusing a key for different inputs returns a conflict. |
| Analytics | Charts mixed estimated appointment income with cash receipts and used a maximum rather than summing same-day payments. Revenue now uses paid invoices, payment dates, Lisbon day boundaries, and cent precision. Capacity uses actual opening slots and blocked slots. |
| Client state | Patient lists stopped at 100, cached slot selection could be overwritten by older requests, and delayed document responses could appear under another patient. Removed the cutoff and added response-order guards. Analytics responses are also guarded and cleared on lost authorization. |
| Live events | Event streams could retain listeners and continue after revocation. Streams check authorization and release listeners on close/cancel. |

## Verification

- `npm run test:dashboard`: **35 passing regression checks**, using a temporary SQLite database and synthetic patient records; no email or cloud database access.
- `npx tsc --noEmit`: passed after the final code edits.
- Production build: `npm run build` passes. `node scripts/check-production-build.cjs` also verifies builds with all authentication credentials blank. Secret validation is deferred until request-time access; importing routes no longer throws during page-data collection. Invalid production credentials still prevent authentication (login returns 503 with `AUTH_CONFIGURATION_ERROR`). Admin login does not depend on the owner fallback password. No deployment secrets or login passwords were changed.
- Regression coverage includes authentication boundaries, revocation, profile preservation, rollback under booking conflicts, paired deletion, invoice retry concurrency, real payment aggregation, Lisbon summer-time boundaries, malformed requests, and event cleanup.

## Remaining issues and verification limits

1. **Deployment configuration:** valid unique session/admin/owner secrets are required in Vercel; this audit does not modify or certify that environment. Remote Turso failure/concurrency paths need testing against a disposable Turso database before deployment; the regression suite verifies SQLite transactions only. A read-only live connectivity check passed outside the local network sandbox.
2. **Historical recurring-session links:** new sessions have reliable calendar links, but older records may not. A read-only reconciliation report and a reviewed migration are needed before repairing historical relationships; this audit does not guess matches in clinical data.
3. **Legacy invoice retry keys:** new invoice requests use a namespaced transactional record. Old retry-cache entries are not migrated, so replaying a pre-change key can create a new invoice. Avoid replaying old requests during rollout; reconcile legacy keys if such retries are queued.
4. **Scheduling semantics:** collision protection uses date/start-time slots. Treatment-duration overlap, multiple practitioners, and room capacity are not represented by this model. Confirm the clinic's scheduling rules before extending it.
5. **Bulk operations:** changes are atomic per day, not across the entire multi-day range. A conflict can follow previously committed days; the API reports processed slots. The UI should be reviewed for a clear partial-completion message.
6. **Analytics semantics:** revenue now means received payments. Historical reports using estimated appointment income will differ. The retention funnel still uses booking history; it is not a completed-treatment retention measure. Other unused legacy analytics helpers were not rewritten.
7. Browser checks on an isolated instance passed for login, patient creation, note saving, invoice creation, owner unlock/lock, payment analytics, slot block/unblock, and appointment creation. A duplicate appointment display race was reproduced and fixed, then verified with a second appointment. The tablet header was compacted. Actual email delivery, printed/PDF exports, backup restoration, and live third-party workflows were not exercised end to end. Existing startup migrations and review seeding remain application behavior; test production rollout against a restored copy first.

The checks establish coverage for the corrected defects, not proof that every dashboard workflow is defect-free.
