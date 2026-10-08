# Full platform demo

Create a complete fictional clinic with the **current application migrations and business rules**. The generator is local-only; it never loads `.env.local`, connects to Turso, changes `data/ryma.db`, or runs automatically during deployment.

From `ryma-site`:

```sh
npm install
npm run demo:seed
npm run demo:dev
```

Open **http://127.0.0.1:3007** for the website and **http://127.0.0.1:3007/admin** for the dashboard. The launcher creates the demo automatically if necessary.

| Access | Local demo password |
| --- | --- |
| Administrator | `ryma2024admin` |
| Owner analytics | `ryma2024owner` |

The server binds to this computer only. These credentials are supplied explicitly to the demo process and do not modify Vercel credentials. SMTP, WhatsApp delivery, reCAPTCHA and configured analytics integrations are disabled for the demo process. Public contact links still belong to the site's normal content; use dashboard and booking controls for testing.

## Included scenarios

| Area | Demo data and things to try |
| --- | --- |
| Patients | 100 fictional Portuguese names, searchable histories, four coverage types, referring professionals, and pagination. Names contain `[DEMO]`; emails use `example.invalid`; phone examples use the fictional London `020 7946 00xx` range so the real international phone validator can run. |
| Team | Three active practitioners with different specialties, colors, hours and treatment assignments; one inactive profile. |
| Treatments | 13 published treatments with Portuguese, English and French content, session steps, FAQ, care goals and body areas; one draft and one archived treatment. |
| Agenda | 431 appointments across recent history and the next eight weeks: pending, confirmed, completed, cancelled, no-show and archived examples; website, dashboard and WhatsApp sources. Dates follow the Lisbon calendar at generation time. |
| Clinical records | 421 sessions: measured pain trends, completed visits without a measurement, 130 planned sessions, three imported records awaiting review, three archived encounters and nine clinical revisions. Planned sessions have no invented pain measurements. |
| Treatment plans | Ten recurring plans of three visits, with linked appointments and replay/idempotency records. |
| Billing | 287 linked invoices; paid, pending, cancelled and refunded states; all five payment methods; coverage and VAT examples. Amounts are stored in cents. Every invoice says it is a test document without fiscal value. |
| Recommendations | 50 fictional documents, each exercising the three supported item categories and the print view. They are demo content, not clinical instructions. |
| Reviews | 36 clearly labelled fictional reviews: 18 approved, nine pending, nine rejected; featured and ordinary cards. No fabricated review is marked verified. |
| Resources | Two active shared devices and one inactive device; duration overrides, preparation/cleanup buffers and actual conflict enforcement. |
| Exceptions | Whole-clinic closure, practitioner absence, exceptional Saturday hours, and clinic/practitioner slot blocks. |
| History | A treatment price change preserves old appointment/invoice prices. A completed encounter remains linked to a subsequently archived treatment. |
| Analytics | Revenue, coverage, source, practitioner, service and period filters have realistic linked records to aggregate. Historical invoice issue dates remain in their generated invoice-number year. |
| WhatsApp | Six completed, expired conversation examples in three languages, processed inbox records and expired outbox records. Nothing is queued to send. Real webhook delivery requires a separately configured integration. |
| Backup | Current-format database export can be exercised from the dashboard. Never restore a demo export into the real clinic database. |

The fixture uses business services for catalogue editing, team configuration, patients, future bookings, recurring plans, clinical records, invoices and reviews. Past appointments use the application's slot evaluator plus database conflict guards because normal booking correctly forbids past dates. Synthetic timestamps and legacy-review examples are set explicitly after validation.

## Suggested walkthrough

1. Open Services and Booking; switch PT/EN/FR, filter body areas, choose a practitioner, and make a test booking in an available slot. Check that draft/archived treatments and the inactive practitioner are absent from public choices.
2. Log in to Admin. Filter appointments by status and practitioner. Confirm, move, or cancel a future booking; try an occupied slot and a clinic closure.
3. Search **Ana Almeida [DEMO]** in Patients. Inspect her history, pain graph, imported measurement warning, archived-treatment encounter, invoices, and recurring plan. Edit a clinical note and inspect its revision history.
4. Open Team to inspect working hours, buffers, absences and equipment assignments. Try an edit that would conflict with an existing booking.
5. Open Treatments. Publish the draft after selecting an eligible practitioner; edit a price and verify historical invoice/appointment snapshots stay intact.
6. Filter invoices by payment state and coverage, record a payment, open an invoice print view and export CSV. Open a recommendation document for a patient.
7. Approve/reject a pending demo review and inspect its public visibility. Reviews are explicitly fictional even when approved.
8. Unlock owner analytics using the local owner password. Compare periods and categories, then lock it again. Export a backup and test logout.

Exact closure dates, blocked slots, patient IDs, pending appointment and plan IDs are written to **`.demo/default/report.json`** after generation. Summary counts in this report describe the original seed, not subsequent manual edits.

## Rerun, reset, or use a second demo

Rerunning the seed command keeps existing data and your test edits. To rebuild with dates relative to today, **stop the demo server**, then run:

```sh
npm run demo:seed -- --reset
npm run demo:dev
```

To keep a separate testing dataset:

```sh
npm run demo:seed -- --name presentation
npm run demo:dev -- --name presentation --port 3008
```

All files live under `.demo/<name>/` and are ignored by Git. Only databases bearing the generator's marker can be reset. A process lock prevents a running demo from being reset. After a crash, verify that the process identified in `demo.lock` is stopped before deleting that one lock file. Do not remove SQLite sidecars while a server is running.

Generation happens in a new staging file and validates integrity, foreign keys and every active reservation before replacing a reset demo. A failure preserves the previous database. The old `node scripts/seed-100-patients.mjs` command now delegates to this safe generator; it no longer seeds the cloud or the working database.

## Validation and production-mode preview

```sh
npm run test:demo
npm run test:regression
npm run demo:build
npm run demo:start
```

`test:demo` creates and removes its own named fixture, checks clinical/document links, money, scheduling, analytics, reset behavior and isolation from real configuration. `demo:build` and `demo:start` run with the same isolated database and disabled integrations. They use the normal `.next` build output; run a normal production build again before manually deploying that output elsewhere.

GitHub/Vercel deployment delivers the generator code only. It does **not** automatically add fake patients or reviews to the live clinic.

## Explicitly populate a hosted demo

The optional cloud importer is for an empty clinical platform that the owner has chosen to use as a demonstration. It uses the Turso credentials in your environment or `.env.local`. Check the printed target database before executing:

```sh
npm run demo:publish
npm run demo:publish -- --execute
```

The first command is a read-only preview. The second saves a private full snapshot under `.demo/cloud-backups/` and imports within one database transaction. It refuses to import when patients, patient notes, appointments, clinical sessions, invoices, recommendations or treatments already exist, or clinic hours differ from the tested fixture. It preserves existing authentication settings, professionals, hours, reviews and invoice sequences. New records receive separate demo IDs and invoices use a `DEMO-FT-2026-0001` style number to keep test documents distinct from normal invoice sequences.

No production configuration or password is changed. The import adds only processed inbox records and expired outbox records, so it sends no messages. Existing hosted messaging settings remain in effect for any bookings subsequently made through the live website. The local launcher is the place to test notifications-disabled booking flows.

Existing blocked times and calendar exceptions are preserved. The importer evaluates every synthetic appointment against the combined calendar and adjusts conflicting demo visits before import, updating their linked sessions, document dates and revision snapshots. Historical visits remain in the past. These adjustments are listed in `.demo/cloud-backups/last-import.json`.

An import marker makes subsequent executions a no-op, preserving any edits made while testing. There is no live reset command: removing or replacing a hosted demo is a separate deliberate database maintenance action. The private snapshot includes security settings and must remain outside Git. The importer is covered by libSQL tests for rollback, non-empty-clinic refusal, preserved records, identity links and repeated execution.
