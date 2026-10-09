# Digital Clínica

Next.js clinic website and administration application. Business records and the treatment catalogue come from the database.

Read the [production audit](docs/production-audit-2026-10-09/REPORT.md), [complete API report](docs/production-audit-2026-10-09/API-ROUTES.md) and [deployment runbook](docs/production-audit-2026-10-09/DEPLOYMENT-RUNBOOK.md) before releasing.

Configure the target environment using `.env.example`, then:

```sh
npm ci
npm run check:production -- --database
npm run test:regression
npm run test:production
npm run build
npm start
```

The production check must pass against the actual deployment configuration. It does not send email or modify database records. A successful build alone does not mean the configuration is ready. Public `NEXT_PUBLIC_*` values are compiled at build time.

Use Turso on Vercel. A single self-hosted instance can use SQLite with an explicit absolute persistent `DATABASE_PATH` and `ALLOW_SQLITE_FALLBACK=true`. Never deploy a database in the source checkout. Multiple instances require shared durable storage.

`npm run build:audit` creates an isolated production build with external credentials disabled and a temporary database. `node scripts/test-http-workflows.cjs` tests it on port 3008 with disposable data and synthetic Google verification. Rebuild with the real public configuration for release afterward.

`node scripts/audit-production-readonly.mjs` performs bounded anonymous GET probes and reads GitHub deployment records. Set `AUDIT_BASE_URL` for the intended deployment. `node scripts/audit-api-routes.cjs --probe` enumerates handlers and checks anonymous rejection on an isolated loopback server; it refuses remote targets.

Development fixtures remain isolated under `.demo` and are excluded from Vercel upload; see [the fixture guide](docs/DEMO-DATA.md). Do not run the hosted demo publisher against a launch database. Existing hosted data was preserved at the user's request; see [the cleanup inventory](docs/production-audit-2026-10-09/HOSTED-DATA-CLEANUP.md).

For interactive local booking tests without Google credentials, run `npm run demo:dev -- --name production-audit --port 3009` and open http://localhost:3009. This preserves that fixture's existing test records and disables external delivery. `demo:start` uses production security checks and rejects public bookings while reCAPTCHA is unconfigured; use it for production rendering checks, not credential-free booking walkthroughs.
