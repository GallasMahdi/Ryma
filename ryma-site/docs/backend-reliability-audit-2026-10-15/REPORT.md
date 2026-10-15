# Backend performance and reliability audit — 15 October 2026

## Executive summary

Scanned the current Next.js App Router source and exercised all exported API handler methods against an isolated production-mode server backed by a disposable SQLite database. The source scan found **37 API route paths and 55 exported HTTP handlers**. No Next.js Server Actions (`'use server'`) were found. Forty-three anonymous authorization probes passed. All test data and credentials were synthetic; external delivery integrations and production services were not used.

The audit found a mismatch in the booking CAPTCHA setup: the server required reCAPTCHA, but the booking form did not request or send a token. That produced the user's Vercel “Security check failed” response. Per the user's request, I removed CAPTCHA enforcement from appointment bookings until the real integration is ready. The booking form now proceeds without a token; current anti-abuse controls remain in place. The contact form's separate CAPTCHA check is unchanged.

The full backend audit previously passed: build, type check, production readiness tests (10/10), regression suite (210/210), end-to-end HTTP workflow/adversarial checks (20/20), and the 27 read-only load scenarios (2,700 requests, zero HTTP errors). After temporarily disabling booking CAPTCHA, the updated production readiness test and regression suite were rerun and passed. The isolated timing run is useful for comparing endpoints under one test setup, but it does not establish production capacity or an SLO.

## Scope and environment

- **Application:** Next.js 16.3.8 App Router, Node.js v24.18.0.
- **Database design:** SQLite (`better-sqlite3`) or Turso/libSQL depending on environment configuration. The isolated HTTP test and timing harness used a temporary local SQLite fixture. No Turso endpoint or live database was configured or contacted.
- **HTTP target:** local loopback only, production-mode Next server, synthetic credentials, disabled email/WhatsApp delivery, disposable seeded records. The saved timing snapshot predates the temporary CAPTCHA disable and used a fake verifier only for that historical check.
- **Route inventory:** [API-ROUTES.md](API-ROUTES.md) lists every route path, exported method, access class, main behavior, and known scaling limits.
- **Timing artifacts:** [ENDPOINT-TIMINGS.md](ENDPOINT-TIMINGS.md) has a response/status/latency row for every method; [endpoint-timings.json](endpoint-timings.json) contains exact sample values and distributions.
- **Reproduction:** `node scripts/audit-api-routes.cjs` performs the source inventory/authorization probe workflow; `node scripts/audit-api-performance.cjs` runs the isolated timing and read-only load harness. These scripts use temporary fixture data; review their setup before adapting them to another environment.

## Findings

### Booking reCAPTCHA temporarily disabled on request

**Status: Disabled for appointment bookings until the real integration is configured.**

The deployed endpoint required a server-verified `booking` token while the public appointment form did not request or send one. That mismatch caused the visible “Security check failed” error. I removed the booking route's reCAPTCHA verifier so Vercel no longer rejects bookings for a missing or invalid booking CAPTCHA token.

Appointment booking retains IP and per-phone rate limits, the honeypot and minimum form-time checks, server-side input validation, and transactional slot/conflict handling. The updated production readiness test confirms a production booking-shaped request without a CAPTCHA token reaches successful booking behavior and does not call the reCAPTCHA verifier. The contact endpoint still uses its own CAPTCHA verification.

Changed files: [booking route](../../src/app/api/appointments/route.ts), [production readiness tests](../../scripts/test-production-readiness.cjs), and the [performance harness](../../scripts/audit-api-performance.cjs).

### Finding 2 — Slot lookup is the most latency-sensitive measured read — follow-up

At concurrency 100, the slot endpoint had a 319.4 ms p95 and 332.8 ms p99; at concurrency 50 its p95 was 184.3 ms. All requests still returned 200. This run used a small local SQLite fixture, so it does not demonstrate the cost with realistic appointment history, multiple practitioners, or remote Turso latency. Profile the query against representative staging data before tuning indexes or caching; keep capacity/conflict correctness in the same measurement.

### Finding 3 — Some legacy list and export paths can scale with full data size — follow-up

Source review found legacy no-page modes for admin appointments and invoices, an unbounded aggregate notes path in patient APIs, unpaginated prescription history and review moderation, and exports buffered in memory. Their behavior is documented in [API-ROUTES.md](API-ROUTES.md). Small-fixture results do not test memory or latency growth. Add paging/streaming or explicit hard limits where usage requires it, then profile with a large synthetic dataset before production scale increases.

### Finding 4 — Prescription deletion reports success for a missing id — contract decision

The authenticated `DELETE /api/admin/prescriptions/[id]` probe returned 200 for a nonexistent id. This may be intended idempotent behavior, but it differs from the 404 behavior of several other dynamic record handlers. Decide and document the contract; no change was made because the semantics are not specified by the current audit request.

## Per-endpoint response-time and error table

The complete **55-method table** is in [ENDPOINT-TIMINGS.md](ENDPOINT-TIMINGS.md), including access exercised, sample count, status distribution, mean, p95, and 2xx count. Its detailed source is JSON-linked there. The checked-in timing snapshot is historical and was captured before booking CAPTCHA was disabled; rerunning the harness now validates a no-token booking.

Read handlers received 10 samples each. Most write handlers were timed with one intentionally invalid body or missing-record probe; those values measure the rejection path, not the successful business operation. Four stateful authentication flows (login, owner verification, lock, logout) were separately run successfully. The earlier timing snapshot also tested booking with missing, invalid, and synthetic valid CAPTCHA tokens while the gate was active. Expected 4xx responses count as “failed” in the timing artifact’s raw `httpErrorRate`; this metric should be read as “non-2xx rate for the probe,” not an unexpected-error rate.

### Read-only concurrent load summary

Each cell is **100 requests per endpoint per concurrency setting**. p95/p99 are client-observed HTTP milliseconds. All 27 scenarios had 100/100 2xx and zero non-2xx responses.

| Endpoint | Concurrency 10 p95 / p99 | Concurrency 50 p95 / p99 | Concurrency 100 p95 / p99 |
|---|---:|---:|---:|
| `GET /api/health` | 16.5 / 17.4 ms | 72.1 / 77.8 ms | 107.4 / 111.9 ms |
| `GET /api/treatments` | 22.4 / 25.0 ms | 89.9 / 96.8 ms | 126.0 / 130.6 ms |
| `GET /api/practitioners` | 40.8 / 53.5 ms | 102.8 / 106.3 ms | 144.3 / 150.1 ms |
| `GET /api/reviews?limit=12` | 25.7 / 29.7 ms | 79.6 / 84.3 ms | 151.8 / 156.3 ms |
| `GET /api/slots?date=…&service=…` | 61.6 / 71.6 ms | 184.3 / 190.3 ms | 319.4 / 332.8 ms |
| `GET /api/admin/appointments?page=1&limit=20` | 31.7 / 34.3 ms | 99.0 / 101.8 ms | 211.3 / 213.5 ms |
| `GET /api/admin/patients?directory=1&limit=20` | 33.3 / 36.0 ms | 137.6 / 140.2 ms | 263.4 / 267.7 ms |
| `GET /api/admin/invoices?page=1&limit=20` | 41.6 / 45.2 ms | 112.0 / 126.5 ms | 270.1 / 276.1 ms |
| `GET /api/admin/me` | 40.4 / 45.1 ms | 96.6 / 96.8 ms | 187.4 / 189.9 ms |

## Test matrix and results

| Area | Command / method | Result | Notes |
|---|---|---|---|
| Source inventory | `node scripts/audit-api-routes.cjs` and handler scan | **Passed** | 37 paths, 55 exported methods, 43 anonymous access probes passed. No Server Actions found. |
| Production build | `npm run build:audit` | **Passed** | Rebuilt after booking CAPTCHA was disabled. |
| TypeScript | `npx tsc --noEmit` | **Passed** | Rechecked after booking CAPTCHA was disabled; no type diagnostics. |
| Production readiness | `npm run test:production` | **Passed, 10/10** | Post-disable rerun confirms production booking proceeds without a CAPTCHA token; also checks ingress-IP headers. |
| Regression | `npm run test:regression` | **Passed, 210/210** | Post-disable rerun. |
| HTTP workflows + adversarial | `node scripts/test-http-workflows.cjs` | **Passed, 20/20** | 15 workflow checks plus 5 adversarial checks: rate limit, 20 simultaneous distinct bookings, duplicate recurring-plan replay, invalid plan input, DB integrity. Includes anonymous-admin protection probes. |
| Endpoint timings | `node scripts/audit-api-performance.cjs` | **Passed** | 55/55 methods sampled. 10 samples for reads; single probe for most writes. Full details in JSON and Markdown tables. |
| Read-only load | Included in timing harness | **Passed, 27/27 scenarios** | 2,700 requests, concurrency 10/50/100, zero non-2xx responses. No write load generated. |
| Lint | No lint script configured in `package.json` | **Not available** | No lint command was run. |

## Not tested / follow-up

- Production or staging traffic, data, credentials, database, email, WhatsApp, Google reCAPTCHA, or third-party services.
- Turso/libSQL network latency, transient failures, retry behavior, write ambiguity, remote transaction behavior, or failover. No production database was used.
- Database outage/failure injection and recovery, filesystem-full conditions, process crash between commit and notification, and multi-process consistency.
- Load tests against writes or public booking capacity. The 20 concurrent booking requests in the workflow suite were distinct, functional correctness probes, not a sustained throughput benchmark.
- Large-dataset pagination/export memory growth and query plans. These need a synthetic data set sized to expected deployment scale.
- Browser abort/disconnect behavior, reverse-proxy buffering for SSE, and full WhatsApp scheduler/provider callbacks. The fixture intentionally disables providers; webhook POST responded 503 and jobs POST without a bearer secret returned 401.
- Full valid success branch coverage for every mutation method. The method inventory is complete, but most mutation timing probes intentionally stop at validation or missing-record handling. Existing workflow/regression tests cover selected successful mutations, not every branch.

## Overall assessment

The handler inventory and local route workflows are complete for the current source tree. Booking reCAPTCHA is intentionally disabled at the user's request until the real booking integration is configured; re-enable it only after the booking form sends a token and the Vercel site/secret keys and action are verified together. No unexpected errors appeared in the earlier read-only load run. Treat the measured numbers as a reproducible local baseline only. Before setting capacity limits or claiming production performance, repeat against representative synthetic data and the intended database topology, then add explicit SLO/error thresholds.
