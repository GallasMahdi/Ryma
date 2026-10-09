# Production readiness audit — 9 October 2026

> Subsequent user-requested change: the original before-and-after homepage gallery and its five original photos were restored after this audit. The removal entries below describe the earlier audit checkpoint and no longer apply to that gallery. Other audit changes remain in place.

> At the user's subsequent request, the splash was restored exactly to its original implementation, including its original animations, approximately four-second timing, session behavior and first-paint skip logic. The intervening optimized splash implementation was removed. Earlier audit entries describing splash removal no longer describe the current UI.

> Local booking follow-up: the preview on port 3009 rejected every booking because `demo:start` enables production CAPTCHA enforcement while the isolated launcher removes Google credentials. Restarted the same `production-audit` fixture with `demo:dev`, preserving existing test data. A browser booking reached the confirmation screen and persisted one pending test appointment (`apt_f58c5f08-828a-4624-8fd1-2b5b6fc5840e`, 12 October at 09:30). The production test for missing tokens and wrong CAPTCHA actions passed. No production security code, hosted data, splash or visual design was changed for this fix. This development preview is for interactive testing; its compilation timings are not production performance measurements.

## Decision

Subsequent agenda fix: confirmation controls now appear only for pending appointments. The day list, cards, grouped list, table and shared detail popup follow pending → confirmed → completed without offering confirmation again after completion. Verified with the existing local test appointment, a refreshed dashboard and its stored `COMPLETED` status. Five new UI regression tests cover the sequence, reopening and terminal statuses; the full regression suite now passes 188 tests, the production-readiness suite passes 8, and TypeScript checking passes. The local preview runs on port 3009 in isolated development mode. No push or deployment was performed; the user will review locally first.

**Do not launch the inspected configuration yet.** The latest Git commit has successful Vercel production deployment records, but material performance, security and misleading demo behavior were corrected during this audit. The working-tree changes have not been committed, pushed or deployed.

Release blockers remain: published demo passwords and a known development session secret in the local production configuration, missing verified clinic/canonical settings, and demo records in the configured cloud database. Vercel's actual environment variables and exact alias mapping were inaccessible. These findings do not establish that Vercel uses identical secrets or that same database.

**Hosted data was preserved**, following the user's instruction: “Keep hosted data; provide the cleanup report.” No hosted cleanup, reset, import, real booking or contact submission was performed. Cloud database inspection used SELECT/PRAGMA and aggregate counts. Anonymous HTTP GET probes included the existing health endpoint, which itself performs a readiness write probe.

## Deployment evidence

- Public repository: [GallasMahdi/Ryma](https://github.com/GallasMahdi/Ryma).
- Local and remote `main`: `c843de55e69f9fbc29944cde36a4ff65f70f76f8`, “Compact mobile drawer and eliminate redundant dashboard reads”.
- GitHub records successful production deployments for that SHA under both `ryma` (8 October, 16:40:08 UTC) and `ryma-swz4` (16:39:31 UTC).
- Measured alias: [ryma-ten.vercel.app](https://ryma-ten.vercel.app). Immutable deployment URLs redirected to protection; Vercel CLI was logged out. Exact alias-to-SHA association remains unverified through Vercel's control plane.
- Responses included `cdg1::iad1` in `x-vercel-id`, suggesting European edge routing and US East function execution. Confirm function/database regions before selecting the launch server.
- Evidence: [deployment/probe records](live-readonly.json), [alias comparison](deployment-comparison.json).

## Changes implemented

| Area | Finding and correction |
|---|---|
| Startup | Removed the forced roughly four-second splash, bot/PageSpeed exemptions, loader CSS and associated prototype/DOM patching. Catalogue count now renders directly. |
| Demo presentation | Removed invented patient/satisfaction figures, qualifications/timeline, before/after showcase, fixed address/map/access claims, reminder promise, fake helpdesk contacts/server status. Configured contact/support/location fields replace assumptions; absent links/maps are hidden. |
| Assets | Removed five unverified before/after PNGs (about 3.35 MiB), unused starter SVGs and the unused localStorage appointment simulator. |
| Contact | Replaced the 1.2-second fake-success simulation with `/api/contact`: validated fields, streamed 16 KiB cap, atomic 5/IP/hour quota, production CAPTCHA, actual SMTP acceptance. Failure preserves form text and displays an error. |
| Dependencies | Pinned Next.js from 16.3.6 to 16.3.8. Final production dependency audit reports zero known vulnerabilities. |
| Database startup | Added durable schema revision marker, batched scheduling DDL and failure propagation. Fresh clients skip unchanged schema/migration writes. |
| Readiness | Coalesced health checks for five seconds per process; reports 503 for non-writable/unavailable storage, redacts exceptions and measures full readiness duration. |
| Booking/email | Production requires CAPTCHA with the expected action. Booking mail uses Next.js `after` instead of the fixed wait; SMTP connection/greeting/socket timeouts are bounded. |
| Abuse controls | Atomic quota consumption for login, owner verification/password change, reviews and contact. Arbitrary Cloudflare headers no longer override identity unless explicitly trusted. |
| Reviews | Refresh interval reduced from 15 to 60 seconds, retaining focus/visibility refresh. Public lists capped at 100; full approved count/average remain separate and accurate. |
| Caching | Removed manual shared-cache policy from cookie-language/live-catalogue pages. Admin/API responses remain no-store. |
| SSE | Timer failures now clean up streams rather than causing unhandled rejections. |
| Data packaging | Untracked local DB without deleting it; added DB/demo upload exclusions. Legacy credential-bearing, mutating live audit now delegates to bounded GET-only checks. |
| Release checks | Added production preflight, shipped-default rejection, explicit persistent SQLite path requirement, isolated build/tests and complete API inventory. Moved export catalogue reads after authorization. |

“Remove static” was applied to fabricated operational data and demo behavior. Useful CSS, fonts, images, translations, editorial content and isolated test fixtures remain. Generating those assets dynamically would add latency. Deploying alone does not import fixtures; development demo scripts/data are excluded from Vercel upload.

## Measured performance

### Live Vercel baseline

88 anonymous sequential GETs: eight samples per path from this workstation. Durations include response-body consumption. They are not browser LCP/INP, controlled cold starts or server execution time. The script's `medianMs` is the upper middle observation for even sample counts; it is called “typical” below. Observed maxima are not p95 estimates.

| Route | Typical, ms | Max, ms | Status |
|---|---:|---:|---|
| `/` | 423 | 958 | 200 |
| `/rendez-vous` | 338 | 428 | 200 |
| `/services` | 332 | 442 | 200 |
| `/admin/login` | 284 | 1,001 | 200 |
| `/api/health` | 465 | 842 | 200 |
| `/api/treatments` | 238 | 331 | 200 |
| `/api/practitioners` | 308 | 602 | 200 |
| `/api/reviews?limit=12` | 223 | 227 | 200 |
| `/api/slots?date=2026-10-16` | 405 | 438 | 200 |
| `/api/admin/me` | 153 | 211 | 401 |
| `/api/admin/appointments` | 155 | 176 | 401 |

The roughly 150 ms anonymous-rejection baseline includes network/routing without normal business reads. Additional slot/readiness delay warrants region/database profiling, but these observations do not isolate its cause. Removing the splash eliminates an intentional wait; it does not establish a measured four-second Core Web Vitals improvement.

### Isolated local production build

Next.js 16.3.8, Windows workstation, local SQLite, synthetic clinic dataset, external delivery disabled. Twenty samples across 28 public/admin paths (560 reads), followed by a bounded mixed GET workload with 200 ms think time. Workers are concurrent request loops, not a supported-user estimate.

| Phase | Workers | Seconds | Reads | Reads/s | p95, ms | Max, ms | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| Steady | 4 | 60 | 1,068 | 17.7 | 35.5 | 43.7 | 0 |
| Burst | 12 | 30 | 1,584 | 52.5 | 50.7 | 88.7 | 0 |
| Recovery | 4 | 30 | 536 | 17.8 | 35.3 | 48.6 | 0 |
| Short soak | 4 | 120 | 2,108 | 17.5 | 40.9 | 681.8 | 0 |

5,296 successful workload reads; 5,856 including endpoint sampling. SSE first actual event: 18.4 ms. A copied session cookie was rejected after logout. RSS samples ranged approximately 310–368 MiB. This short run cannot establish long-term stability or leak freedom; revisit the 682 ms outlier during a longer target-server test.

**The load checkpoint followed the main backend/startup fixes and preceded the final footer/contact/review-aggregate changes.** The final source subsequently passed build/HTTP/authentication verification. These are not exact-final-artifact capacity measurements. Local SQLite and Vercel/Turso differ: no percentage speed improvement or production-throughput claim is justified by comparing them.

A regression verified that a fresh libSQL instance reads the revision and data without rerunning migrations: three calls with file WAL initialization, equivalent to two for a remote client. Twenty simultaneous quota requests allowed exactly five. This proves query/race behavior, not remote cold-start latency.

Raw evidence: [live requests](live-readonly.json), [local load](local-load.json).

## API coverage and tests

The [complete route report](API-ROUTES.md) covers **35 paths and 53 exported handlers**, including access, behavior, limits and concerns. [JSON inventory](api-routes.json) includes source lines and actual anonymous probe responses.

| Check | Result | Scope |
|---|---|---|
| Final production build | Passed | Compilation and TypeScript, Next.js 16.3.8, isolated configuration/storage |
| Main regression | 183 pass / 0 fail | Scheduling, patient integrity, reviews, treatments/UI, admin reads/KPIs, modal, remediation and WhatsApp logic |
| libSQL adapter | 150 pass / 0 fail | Sequential file-backed libSQL tests, not remote Turso capacity |
| Production + review focused | 19 pass / 0 fail | CAPTCHA, health failures, quota race, schema skip, contact failure/body limit, review totals |
| Local HTTP workflows | 20 checks passed | Login/owner gates, booking/retries/rescheduling/conflicts, concurrent writes, logout and FK/integrity |
| Anonymous method gates | 41 passed | Every identified admin/owner/bearer handler rejected anonymous access with 401 |
| Production npm audit | 0 known vulnerabilities | Registry snapshot of production dependencies |
| Browser smoke | Passed | No homepage splash/fake location or observed console errors; contact failure preserves data and displays an error |

Suites overlap; do not sum them as unique scenarios. Google verification is stubbed only inside isolated HTTP test processes; focused tests also check action/failure handling. No real mail, WhatsApp message or public booking was sent. Provider integration remains unverified. This audit does not supply a current mobile-network Lighthouse, LCP, INP or CLS certification.

Logs and audit JSON are beside this report. The screenshot below demonstrates the final contact form's failure state and preserved input; external delivery was disabled in this isolated test.

![Final contact form failure state](contact-failure.png)

## Launch blockers and remaining work

1. **Rotate credentials and invalidate sessions.** Local `.env.local` accepts published demo admin/owner passwords and a known development session secret. Check stored owner-password overrides too. Runtime rejects exact shipped defaults; preflight additionally detects known plaintext under any salt. Enforce preflight as a release gate. Secrets were not printed or overwritten; Vercel's actual values remain unverified.
2. **Choose the launch database deliberately.** The configured cloud DB contains the professional demo import. Changing a commit does not remove rows. Preserve it as requested and use the [cleanup inventory](HOSTED-DATA-CLEANUP.md) for a separately authorized migration/cleanup or a separate launch database.
3. **Inspect public Git history.** A database was tracked publicly. The current inspected local file contains zero patients/appointments/invoices/reviews and its SHA-256 remained unchanged. Older revisions were not exhaustively inspected. Untracking now does not erase historical copies; review history and rotate any exposed secrets before deciding on history removal.
4. **Verify the actual release target.** Select the intended Vercel project/alias and DB; confirm final SHA, regions and build/runtime configuration. Two project names have successful deployments. Working-tree fixes are not live.
5. **Supply verified business configuration.** Canonical HTTPS origin, real address/email/phone/hours and applicable business/professional identifiers must be configured before building. Confirm the retained clinic number, staff, schedules, prices/durations, clinical claims and image rights. Have the clinic's appropriate reviewers check privacy material and financial-document suitability; this audit is not fiscal/regulatory certification.
6. **Prove operations.** Exercise backup/restore, TLS/proxy settings, body limits, alerting, SMTP and CAPTCHA domains on staging. Keep WhatsApp disabled until onboarding, signature checks and scheduled retries are proven.
7. **Measure the target server.** Use realistic data and traffic, including writes and multiple SSE connections. Agree latency/error/capacity requirements and measure browser rendering on representative phones/networks.

## Remaining engineering limits

- Legacy unpaginated appointment/patient/invoice reads, all-note patient paths, moderation lists, prescription histories and buffered exports still grow with data. Main dashboard reads are reduced/paginated; migrate old consumers before large deployments.
- Root page rendering loads the catalogue even for login, so public SSR still depends on DB availability. Shared caching needs explicit publication invalidation and correct language handling.
- `after` is not a durable email queue. Process termination/provider failure can lose notification delivery. Contact 200 means SMTP acceptance, not verified inbox receipt. Do not promise scheduled reminders before implementing them.
- SSE periodically checks authorization/revision; many dashboard tabs increase DB reads. Verify buffering, timeouts and multi-instance behavior.
- Readiness includes a write probe/process statistics. Rate-limit it at ingress or restrict monitoring access. The five-second cache is process-local.
- IP quotas require trusted ingress. Overwrite forwarded headers, prevent direct origin access, and only trust Cloudflare headers behind restricted Cloudflare ingress.
- Older JSON handlers rely on validation/upstream body caps. Enforce a global proxy limit; the new contact endpoint bounds the stream itself.
- CSP retains `unsafe-inline`. Nonce-based CSP is further hardening. The portal still has shared admin/owner credentials, no individual identities or MFA; evaluate those for a multi-user clinical operation.
- Public reviews show at most 100 items, with accurate full totals. Add history pagination if volume requires it.

## Reproduction and references

Use the [deployment runbook](DEPLOYMENT-RUNBOOK.md). The isolated audit artifact was built without real public settings and must be rebuilt for release.

Relevant primary guidance: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [CDN caching](https://nextjs.org/docs/app/guides/cdn-caching), [Vercel inspection](https://vercel.com/docs/cli/inspect), [Vercel forwarded headers](https://vercel.com/docs/headers/request-headers). Dependency findings are preserved in the audit JSON files.
