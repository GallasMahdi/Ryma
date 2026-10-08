# Treatments feature — implementation and verification

Date: 8 October 2026. Scope: the new treatment catalogue and its connections to Team, the public website, bookings, clinical records, invoices, analytics and backups.

The feature is implemented in the project. The isolated production preview runs at <http://127.0.0.1:3119/admin?tab=treatments>. Its synthetic administrator password is `fix-admin-test`. No deployment or migration of the real database was performed.

## What the administrator can do

1. Open **Dashboard → Treatments → New treatment**.
2. Enter the name, summary, optional description, permanent URL identifier, category, price and duration. Portuguese, English and French content can be edited separately; missing translations fall back to the available text.
3. Choose the practitioners who can perform the treatment. Existing practitioner duration overrides and preparation/cleanup buffers are retained. Leaving this selection empty is valid for a draft.
4. Save as **Draft**, or choose **Published** to make it visible online. Publishing requires an active practitioner enabled online, with recurring clinic/practitioner hours that fit the duration and buffers on the booking grid.
5. Edit the treatment later, or set **Archived** to stop new reservations. Archiving retains appointments, clinical records, invoices and practitioner mappings. It does not cancel existing appointments. Archived appointments can still be managed using their saved duration and resource allocation.

There is no destructive treatment-delete operation. The URL identifier cannot be changed after creation. Removing a practitioner assignment that still has future appointments produces a conflict with the affected appointments. Team distinguishes published, draft, archived and internal treatments; a draft-only assignment does not make a practitioner online.

## Data and integration

- `treatment_catalog` is the runtime source of truth. The original catalogue is used for one-time seeding, with a persistent migration marker so restarts cannot resurrect archived entries or refill an intentionally empty catalogue.
- Authenticated writes validate publication state, translations, category, immutable identifiers, integer duration, exact price cents and practitioner identities. Prices accept €0–€50,000, durations 5–720 minutes. Request bodies have a size limit.
- Treatment content, practitioner mappings and the change history commit in one transaction. Catalogue and appointment writes share a database revision, preventing stale edits and publication/booking races. The audit actor is a session hash, not the raw session identifier.
- Public catalogue, navigation, service lists/details, individual prices, booking selectors and sitemap read the published catalogue. Draft and archived detail URLs return HTTP 404. Existing tabs refresh on focus, visibility and at 30-second intervals while visible. Booking always checks the current database state at commit time.
- Identifier validation uses a primary-key lookup. Public hydration reuses server data; unchanged refreshes retain stable client state. The admin label refresh uses a lightweight catalogue response instead of rereading all scheduling tables. There is no mutable process-wide catalogue cache.
- New appointment records preserve name translations, price cents, category, duration, buffers and resource allocation. Confirmation pages and emails use the saved values. Invoice defaults can use the linked appointment snapshot; issued invoices retain their own identity, amount and category. Analytics and exports use snapshots when available.
- Recurring reservations, manual clinical records, practitioner/resource assignment and the WhatsApp conversation logic accept custom identifiers. WhatsApp transport and SMTP delivery were disabled or mocked throughout testing.
- Backup format **3.0.0** includes treatments and their revision history. Existing formats 1.0.0 and 2.0.0 remain supported and retain the current catalogue when they do not contain one. Restores remain atomic.

Existing rich service content is preserved when basic fields are edited. New treatments do not invent clinical indications, contraindications or FAQs; empty optional sections are hidden. Package pricing and anatomical hotspot editorial content remain separately authored content.

Legacy appointments did not store historical prices or treatment names. The first catalogue migration fills available snapshots from the pre-existing catalogue; this does not establish what was actually charged historically. Existing invoices and the previous audit's historical reconciliation flags remain authoritative for financial review.

## Verification evidence

| Check | Result | Evidence |
|---|---:|---|
| Existing SQLite regression suite, including scheduling, clinical data, invoices, reviews, phones, WhatsApp, reset and modal behavior | 150 passed | [suite.log](suite.log) |
| Existing libSQL regression suite | 120 passed | [libsql.log](libsql.log) |
| Dashboard/security regression checks | 36 passed | [dashboard.log](dashboard.log) |
| Treatment lifecycle and exception suite, SQLite | 21 passed | [treatments.log](treatments.log) |
| Treatment lifecycle and exception suite, libSQL | 21 passed | [treatments-libsql.log](treatments-libsql.log) |
| React/DOM editor, catalogue refresh and Team badge checks | 3 passed | [treatments-ui.log](treatments-ui.log) |
| Actual production-server HTTP lifecycle checks | 15 passed | [http-results.json](http-results.json) |
| TypeScript | Passed | [typecheck.log](typecheck.log) |
| Next.js production webpack build | Passed | [build.log](build.log) |
| Real database and backup preservation | 16 files unchanged | [real-data-preservation.json](real-data-preservation.json) |

Runner counts include parent tests and repeated checks against both database adapters; these are not counts of distinct user features. The final source fingerprint is recorded in [source-hashes.json](source-hashes.json).

Exceptions exercised include missing practitioners, incompatible hours, duplicate identifiers, malformed translation objects, fractional/out-of-range amounts, duration bounds, simultaneous writers, stale revisions, transaction failure, archived treatment booking, repeated booking intents, failed catalogue reads, intentional empty catalogues, repeated migrations, backup validation/rollback, network failure during editing, double submit, dirty-form dismissal, HTML injection and cross-origin changes.

The real HTTP path verifies draft creation, publication, service/detail/pricing/booking/sitemap updates, practitioner lookup, a custom-service booking, interval occupancy, saved price/duration, invoice defaults, invalid updates, archiving, repeat booking recovery and retained invoices. It leaves synthetic test treatments and their appointments archived.

## Defects found and corrected during this work

| Finding | Correction and retest |
|---|---|
| The old static catalogue prevented a new identifier from working consistently across the site and APIs. | Replaced runtime consumers with the shared catalogue; both adapters and production HTTP tested. |
| A stale editor draft could survive “Reload settings” when the returned revision did not change. | Explicit editor remount generation; DOM regression passed. |
| New cross-origin protection rejected a valid loopback request because Next normalized its URL hostname. | Compare against the actual request Host, with malformed/foreign-origin rejection; both unit and real HTTP checks passed. |
| Minimal legacy scheduling schemas lacked an invoice service identifier. | Conditional legacy snapshot migration; populated legacy migration tests passed on both engines. |
| Array values could be coerced into valid category/status names. | Require actual strings; malformed enum arrays reject without mutation on both adapters. |
| Team online badges counted draft/archived-only assignments. | Published-service eligibility required for the badge; DOM regression passed. |
| Catalogue edits could reprice or reclassify historical estimates and invoice defaults. | Appointment and invoice snapshots, snapshot-aware displays, exports and analytics; lifecycle and financial regressions passed. |
| Empty catalogues and optional content exposed an infinite starting price or empty headings. | Empty-state display and optional section guards; empty-catalogue behavior tested and production build passed. |
| Some price displays rounded away cents; archived services disappeared from historical selectors. | Cent precision and separate historical catalogue access; type/build and integration checks passed. |

## Boundaries of this verification

No failures remain in the executed automated checks. This is not a guarantee that no undiscovered defect exists.

Interactive browser access to the local server was blocked by the browser policy during the earlier audit. No alternate browser driver was used to bypass it. This round used React/jsdom behavior tests and actual HTTP/server-rendered HTML checks; mobile layout, touch, screen-reader behavior and a complete visual walkthrough remain unverified in a real browser.

The production database, real credentials, external email/WhatsApp transport and deployment environment were not used. Applying migrations to real historical data and confirming the existing clinical/financial review flags remain deployment work. SQLite and file-backed libSQL were tested; network latency and remote Turso failure modes were not simulated as a production load test.

## Reproducing the checks

From the project directory, `node docs/audit/tools/run-treatments.cjs prepare` copies source into the existing isolated project without `.env` or real data. The launcher sanitizes credentials and selects `treatments-fixture.db`.

Available modes are `suite`, `libsql`, `dashboard`, `treatments`, `treatments-libsql`, `treatments-ui`, `typecheck`, `build` and `start`. Run build/start sequentially while no other preview occupies port 3119. With that fixture server running, execute `node docs/audit/tools/http-treatments.cjs`. `npm run test:treatments` runs the standalone feature suites against temporary fixtures.
