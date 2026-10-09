# Deployment and acceptance runbook

## Configuration and release identity

Select the intended Vercel project/server, HTTPS domain, database and region. Record Git SHA and deployment ID. Successful deployments exist under both `ryma` and `ryma-swz4`; verify the intended alias in the account.

Use `.env.example` to configure the target's secret management: new independent admin/owner passwords as bcrypt hashes (cost >=12), a fresh random session secret, persistent DB, SMTP and real notification recipient, matching reCAPTCHA keys. Review stored owner-password overrides and revoke old sessions/owner grants. Do not commit secrets or leave plaintext passwords in command history.

Set canonical origin, actual clinic contact/address/hours and applicable business/professional identifiers before building. `NEXT_PUBLIC_*` is public build-time configuration. Support/social/map values are optional and hidden when absent. `NEXT_PUBLIC_RELEASE_SHA` can identify the build in support diagnostics. The audited local environment fails preflight and was preserved unchanged.

## Storage and migration

- Vercel/serverless must use persistent Turso, never bundled SQLite or ephemeral disk. Verify DB and function region placement.
- One self-hosted instance may use SQLite with absolute mounted `DATABASE_PATH` and `ALLOW_SQLITE_FALLBACK=true`. Use a dedicated service account, appropriate file permissions and a filesystem supporting WAL/locking.
- Multiple instances need shared durable storage, not independent SQLite files. Test atomic scheduling, revocation and SSE in the actual topology.
- Schema revision `2026-10-09.1` enables cheap subsequent initialization. Future shared schema/migration changes must bump the revision and include migration tests. Back up first; rehearse on a clone.
- Preserve current hosted data as requested. A fresh launch DB needs explicitly configured actual treatments, staff and hours. Never run the hosted demo publisher against launch data.

## Build and release gate

With the actual target environment injected, from `ryma-site`:

```sh
npm ci
npm run check:production -- --database
npm audit --omit=dev
npm run test:regression
npm run test:production
npm run build
```

Preflight performs configuration and SELECT-only checks; it does not prove SMTP inbox delivery or detect every possible kind of unmarked synthetic row. Do not bypass a failed gate. Use a consistent supported Node runtime satisfying the installed Next.js/native dependencies.

Isolated behavioral verification:

```sh
npm run build:audit
node scripts/test-http-workflows.cjs
```

This uses disposable storage, disabled external delivery and test-process-only CAPTCHA stubs. Do not expose that server publicly. **Rebuild with real public configuration after `build:audit`.** The app requires a Next.js server; it is not a static export. Start the production build with `npm start` under a service supervisor and graceful restart policy. On Vercel, verify project root/build SHA. Run CI checks before packaging because `.vercelignore` excludes test/demo scripts.

## Ingress and operations

Terminate TLS at a trusted reverse proxy; bind the app privately and block direct public access to its port. Overwrite client-supplied forwarded IP headers. Only set `TRUSTED_PROXY=cloudflare` behind restricted Cloudflare ingress.

Enforce request-body, connection and rate limits. A 1 MiB global body cap is an initial setting to test against legitimate admin operations; contact also enforces 16 KiB. Never cache authenticated/API responses. Preserve Next.js cache/language-cookie semantics and caching for fingerprinted static assets.

Disable buffering for `/api/admin/events`; pass chunks immediately and allow long-lived streaming/reconnection. Tune timeouts against the heartbeat and test logout/session expiry, many tabs and multiple instances.

Configure encrypted scheduled backups, retention, restricted access and a tested restore process with agreed recovery objectives. Monitor readiness 503, request latency/error rate, disk/memory/restarts, backup failures and integration queues. Avoid logging clinical details or secrets.

## Integration acceptance

- Register the staging/production domains in reCAPTCHA. Verify valid booking/contact, absent/wrong-action rejection, idempotent retries and competing slot reservations.
- Send an authorized staging email and inspect inbox delivery plus the mail provider's sender authentication setup. Exercise failure paths. Booking mail currently has no durable retry outbox.
- Leave `WHATSAPP_ENABLED=false` until Meta onboarding/signature tests pass. Schedule authenticated `POST /api/whatsapp/jobs` every minute using its job secret. Webhook `after` processing alone is not a retry scheduler. Monitor pending/failed deliveries.
- Check public Git history for old DB revisions/secrets; untracking a file does not erase history.
- Validate actual contact details, staff, treatments/prices/schedules, legal/privacy content and clinical/financial documents with the clinic's appropriate reviewers.

## Target-server performance acceptance

Run bounded tests against a staging copy of the exact final artifact with realistic larger data, booking writes and concurrent SSE. Record p50/p95/p99, throughput, errors, CPU/memory, DB latency and I/O. Include burst/recovery and a much longer soak than this audit's two-minute phase. Do not create synthetic clinic records in the live database.

Measure real phone/desktop rendering, image payloads, interaction delay and layout stability with the final domain/public configuration. Loopback HTTP timing does not establish browser performance.

Verify the final SHA's full workflows: catalogue, slots, booking, admin, clinical records, invoices, owner authorization, logout revocation, backup/restore. Record accepted residual risks and a rollback plan for both artifact and compatible database state.
