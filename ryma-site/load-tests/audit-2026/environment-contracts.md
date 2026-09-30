# Inspected environment and API contracts

These facts describe the checked-out source and this local experiment. Deployment settings were not fetched from a hosting account.

- Next.js App Router, React 19, Node runtime, `npm run build` → `next build`; `npm start` → `next start`. Installed versions and lockfile commit are in environment.json. No Docker/Cloudflare/Vercel deployment manifest was found at the repository root. Source comments mention Vercel and Cloudflare, but comments do not establish the active hosting topology. `scripts/vercel-audit.mjs` is historical tooling, not deployment evidence.
- The configured project environment chooses remote Turso/libSQL. Audit subprocesses instead receive a new absolute SQLite path under their timestamped result directory, an empty Turso URL and explicit SQLite fallback. SQLite 3.53.4, WAL journal mode; PRAGMA database_list is saved before test writes. The remote database was never queried or mutated.
- `next.config.ts`: compression enabled, AVIF/WebP image optimization and one-year minimum image cache TTL. Security headers/CSP allow specific Google services. Configured public-page cache headers include one-hour browser and one-day shared cache values; dynamic rendering/language cookies and actual response headers can override deployment behavior. Admin and the benchmarked dynamic APIs use no-store. Reviews have a distinct short public cache rule and were not a primary API benchmark.
- `src/lib/session.ts`, `session-policy.ts`, and `/api/admin/login`: sealed `ryma_admin_session` HttpOnly cookie, SameSite=Lax, Secure in production, eight-hour absolute lifetime; valid logins verify cost-12 bcrypt in the audit. Login checks a ten-failed-attempts/15-minute/IP budget; successful logins do not increment that failure counter.
- `/api/admin/analytics/verify`: authenticated owner-password step-up, 15-minute grant; ten failed attempts/15 minutes/IP. The audit uses a separately generated owner password.
- Public booking actually allows 100 attempted bookings/IP/hour and three successful bookings/normalized phone/hour. The older 20/IP comment in the route header disagrees with the executable 100 limit; this audit uses the executable value. Honeypot must be empty. Missing reCAPTCHA token uses the existing ≥1,200 ms human-timing fallback; supplied tokens are verified normally. Tests set a valid synthetic rendered timestamp and do not alter server validation.
- SMTP user/password, notification destination, WhatsApp token and telemetry keys are absent in the child environment; no external messaging controls are clicked. The live reCAPTCHA token path and external message delivery latency remain unmeasured.
- `/api/admin/events` is an authenticated process-local SSE connection with revocation checks, 20-second keep-alive and explicit cleanup. The dashboard listens to named creation/update/delete events, uses a 35-second fallback polling interval while live and eight seconds while disconnected, and throttles focus refresh. A single process does not establish cross-instance delivery.

| Contract exercised | Validation |
|---|---|
| `GET /api/slots?date=YYYY-MM-DD` and `?dates=...` | 15 configured non-Sunday slots, correct day map; correctness tests compare booked/cancelled results directly with the DB |
| `POST /api/appointments` | Current service `reeducation-posturale`, future Lisbon calendar date, valid time, normalized synthetic phone, name, fallback fields; 201 and matching persisted record; contested slot returns 409 |
| `Idempotency-Key` public booking retry | Sequential retry returns `HIT_IDEMPOTENT`; one persisted record |
| `POST /api/admin/login` and `GET /api/admin/me` | Success body, session cookie and authenticated follow-up; no redirect accepted as success |
| `GET /api/admin/appointments` | Full list matches seeded size; page/limit/search and global `summary=1` exercised; bounded `calendar=1&dateFrom=...&dateTo=...` and phone history preserve dashboard behavior; `PATCH /[id]` verifies updated notes/status |
| `GET /api/admin/patients` | Full/page/search compatibility records with embedded sessions; revised `directory=1` returns bounded combined structured/legacy rows and global filter counts; `phone=...` loads selected-patient details and sessions on demand |
| `/api/admin/patients/[id]/sessions` | Source implements POST/PATCH/DELETE, **not GET**; loading is through embedded sessions |
| `GET /api/admin/invoices` | Full/page counts and seeded synthetic invoices |
| `GET /api/admin/analytics?range=all&lang=en` | Admin + owner grant, valid analytics body; separate CPU/SQL profile |
| `GET /api/admin/export?type=patients|invoices|appointments` | Synthetic content and expected row count where fixed datasets apply; browser download exercised |
| Public `/`, `/services`, service detail, `/tarifs`, `/rendez-vous` | Actual navigation, language, SVG explorer, service/date/time selection and confirmed booking |

See the request URLs/payload builders in api.cjs, common.cjs, concurrency.cjs and the journey scripts for exact bodies. Rejected requests and HTTP timeouts are distinct from completed business transactions.
