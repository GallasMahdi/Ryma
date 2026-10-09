# API route audit — 9 October 2026

Every exported HTTP handler is enumerated from the final TypeScript source. Auto-generated framework HEAD/OPTIONS are not counted. All APIs use no-store HTTP headers. Admin access means a cryptographically valid, unexpired, unrevoked session; owner access adds the expiring server-side financial authorization grant.

**37 route paths; 55 exported handlers. 43 anonymous authorization probes passed on the isolated local server.**

Source review and authentication probes do not prove every success/error branch. See the main report for behavioral test and integration coverage.

| Route | Methods and access | Behavior / limits / remaining concerns |
|---|---|---|
| [`/api/admin/analytics/lock`](../../src/app/api/admin/analytics/lock/route.ts) | POST: Admin session | Revokes owner step-up grant for current admin session. |
| [`/api/admin/analytics/password`](../../src/app/api/admin/analytics/password/route.ts) | POST: Owner step-up | Owner step-up and current-password check; atomic password-change quota; updates stored owner hash. |
| [`/api/admin/analytics`](../../src/app/api/admin/analytics/route.ts) | GET: Owner step-up | Owner step-up required. Filtered financial and operational aggregates; no-store. |
| [`/api/admin/analytics/verify`](../../src/app/api/admin/analytics/verify/route.ts) | POST: Admin session | Admin session plus owner password; atomic attempt quota; expiring server-side step-up grant. |
| [`/api/admin/appointments/[id]`](../../src/app/api/admin/appointments/[id]/route.ts) | GET: Admin session<br>PATCH: Admin session<br>DELETE: Admin session | Single appointment read, validated reschedule/status changes and deletion; conflict protection preserves capacity. |
| [`/api/admin/appointments/multiple/preview`](../../src/app/api/admin/appointments/multiple/preview/route.ts) | POST: Admin session | Validated multi-session capacity proposal; response previews availability without final commitment. |
| [`/api/admin/appointments/multiple`](../../src/app/api/admin/appointments/multiple/route.ts) | POST: Admin session | Atomic multi-session booking, validates proposal and conflicts; idempotent retry support. |
| [`/api/admin/appointments`](../../src/app/api/admin/appointments/route.ts) | GET: Admin session<br>POST: Admin session | Filtered lists, bounded page/limit mode and summary mode; legacy no-page mode remains unbounded. POST validates and atomically books. |
| [`/api/admin/events`](../../src/app/api/admin/events/route.ts) | GET: Admin session | Authenticated SSE; checks session revocation and durable booking revision. Cleans up on disconnect/errors; reverse proxy buffering must be off. |
| [`/api/admin/export`](../../src/app/api/admin/export/route.ts) | GET: Owner step-up | Owner-only CSV/full JSON backup export with spreadsheet-formula escaping and cross-site download guard; bulk in-memory export, needs large-dataset testing. |
| [`/api/admin/invoices/[id]`](../../src/app/api/admin/invoices/[id]/route.ts) | GET: Admin session<br>PUT: Admin session<br>DELETE: Owner step-up | Admin read/update; deletion requires owner step-up; amount/revision and dependency validation. |
| [`/api/admin/invoices/export`](../../src/app/api/admin/invoices/export/route.ts) | GET: Owner step-up | Owner-only filtered billing CSV with formula escaping and cross-site download guard; buffered bulk export. |
| [`/api/admin/invoices`](../../src/app/api/admin/invoices/route.ts) | GET: Admin session<br>POST: Admin session | Paginated/filterable invoices and validated creation. Owner-only aggregate totals; legacy no-page mode unbounded. |
| [`/api/admin/invoices/sessions`](../../src/app/api/admin/invoices/sessions/route.ts) | POST: Admin session | Create an internal document for 1–100 completed visits of one patient; 64 KiB body cap, exact-cent totals, VAT validation, saved price snapshots, stable idempotency key and atomic duplicate-billing guards. |
| [`/api/admin/login`](../../src/app/api/admin/login/route.ts) | POST: Public / own-session | Password login with atomic 10/IP/15-minute production quota, bcrypt and secure signed session; shipped defaults rejected. |
| [`/api/admin/logout`](../../src/app/api/admin/logout/route.ts) | POST: Public / own-session | Clears cookie and persists revocation; anonymous logout is idempotently successful; 503 if authenticated revocation fails. |
| [`/api/admin/me`](../../src/app/api/admin/me/route.ts) | GET: Admin session | Admin status plus record counts; backup/no-show details cached for 60 seconds per process; no-store HTTP. |
| [`/api/admin/patients/[id]/billing-sessions`](../../src/app/api/admin/patients/[id]/billing-sessions/route.ts) | GET: Admin session | Paginated completed-visit selection, maximum 100 rows per page; optional date range, historical price and existing-document linkage; planned, future and archived visits excluded. |
| [`/api/admin/patients/[id]/sessions`](../../src/app/api/admin/patients/[id]/sessions/route.ts) | POST: Admin session<br>PATCH: Admin session<br>DELETE: Admin session | Create/update/delete clinical sessions with patient/appointment linkage checks and audit revisions. |
| [`/api/admin/patients`](../../src/app/api/admin/patients/route.ts) | GET: Admin session<br>POST: Admin session<br>DELETE: Owner step-up | Patient detail/directory/search and validated save; directory page size <=100. Legacy aggregate notes path is unbounded. Delete requires owner step-up. |
| [`/api/admin/practitioners`](../../src/app/api/admin/practitioners/route.ts) | GET: Admin session<br>POST: Admin session | Read/update full team, resources, working hours, service mappings and exceptions; version/conflict validation. |
| [`/api/admin/prescriptions/[id]`](../../src/app/api/admin/prescriptions/[id]/route.ts) | DELETE: Admin session | Authenticated prescription deletion. |
| [`/api/admin/prescriptions`](../../src/app/api/admin/prescriptions/route.ts) | GET: Admin session<br>POST: Admin session | Patient-scoped prescription list and validated creation; no paginated history. |
| [`/api/admin/reviews`](../../src/app/api/admin/reviews/route.ts) | GET: Admin session<br>PATCH: Admin session<br>DELETE: Admin session | Unpaginated moderation list; approve/reject/feature or delete existing review. Needs pagination at larger volumes. |
| [`/api/admin/slots/bulk`](../../src/app/api/admin/slots/bulk/route.ts) | POST: Admin session | Validated bulk slot blocking/unblocking with conflict checks. |
| [`/api/admin/slots`](../../src/app/api/admin/slots/route.ts) | GET: Admin session<br>POST: Admin session | Live admin availability and manual slot blocking; checks active appointments. |
| [`/api/admin/treatments`](../../src/app/api/admin/treatments/route.ts) | GET: Admin session<br>POST: Admin session | Catalogue/configuration read and validated treatment save/archive/publication with revisions; catalogueOnly=1 reduces reads. |
| [`/api/admin/whatsapp`](../../src/app/api/admin/whatsapp/route.ts) | GET: Admin session | Integration readiness and inbox/outbox aggregate counts; no secret values returned. |
| [`/api/appointments`](../../src/app/api/appointments/route.ts) | POST: Public / own-session | Public booking: production CAPTCHA, IP and phone quotas, validated contact/service/date, atomic capacity and idempotency; mail runs after response. |
| [`/api/contact`](../../src/app/api/contact/route.ts) | POST: Public / own-session | Validated contact mail: 16 KiB streamed body cap, 5/IP/hour, production CAPTCHA; 200 only after SMTP acceptance; 503 on delivery failure. |
| [`/api/health`](../../src/app/api/health/route.ts) | GET: Public / own-session | Read/write database readiness; concurrent probes share a 5-second result. 503 on unavailable/non-writable storage; errors redacted. |
| [`/api/practitioners`](../../src/app/api/practitioners/route.ts) | GET: Public / own-session | Public active practitioner/service projection; live database read, no-store. |
| [`/api/reviews`](../../src/app/api/reviews/route.ts) | GET: Public / own-session<br>POST: Public / own-session | GET approved reviews only (default/max 100), independent global rating/count; POST pending moderated submission, 5/IP/hour, honeypot. No CAPTCHA on reviews. |
| [`/api/slots`](../../src/app/api/slots/route.ts) | GET: Public / own-session | Live capacity by validated date/service/practitioner; no-store. Repeated scheduling reads should be profiled against the target database. |
| [`/api/treatments`](../../src/app/api/treatments/route.ts) | GET: Public / own-session | Published database catalogue only; no-store; 503 on dependency failure. |
| [`/api/whatsapp/jobs`](../../src/app/api/whatsapp/jobs/route.ts) | POST: Bearer job secret | Bearer job secret; requires configured integration; processes durable inbox/outbox. External scheduler must POST every minute. |
| [`/api/whatsapp/webhook`](../../src/app/api/whatsapp/webhook/route.ts) | GET: Verify token<br>POST: HMAC signature | GET token challenge; POST app-secret HMAC verification, 64 KiB limit and durable enqueue before acknowledgment. Provider integration still needs staging verification. |
