# Dashboard-managed services audit — 8 October 2026

Follow-up: at the user's request, the homepage Before/After gallery was restored with its five original photo assets. It is an editorial gallery with a link to the current catalogue; it does not seed treatments, select hardcoded booking slugs or add session-count claims. The images are displayed whole and unfiltered. The production build and desktop/mobile gallery navigation checks passed after restoration.

The service catalogue now comes from the database and is managed in **Dashboard → Treatments**. Fresh installations start with no treatments, no practitioner/service assignments and no sample patient reviews. No application source contains a built-in treatment list, price list or service-duration lookup.

Existing database records are retained. Removing automatic seed logic does not erase treatments, reviews, appointments or invoices already saved in an existing installation. Administrators can edit or archive saved treatments in the dashboard.

## Admin workflow

1. Open **Treatments → New treatment**. Enter a name and summary in at least one language, choose a category, price and duration. The permanent URL identifier is suggested from the name.
2. Optionally enter other translations, description, care goals, body areas, clinical steps, indications, contraindications, search aliases and FAQ pairs. Missing translations use available content. Empty optional fields do not invent clinical content.
3. Save as **Draft** while preparing it. A draft can have no assigned practitioner and remains hidden from clients.
4. Assign at least one active practitioner enabled for online booking whose working hours can fit the treatment and buffers, then **Publish**. The website, booking menu, prices, sitemap and WhatsApp catalogue use the saved treatment.
5. Edit when necessary or **Archive** to stop new bookings. Existing appointments retain their original name, price and duration snapshots. Existing invoices and clinical history remain available.

A practitioner with zero selected treatments handles none. Selecting three treatments grants exactly those three; adding a fourth treatment later does not automatically assign it. Treatments without discovery goals or body areas remain available under All.

## Corrections made

- Removed the 13 built-in services, static pricing packages, fixed before/after service promotion and automatic sample-review insertion. Regression tests explicitly create synthetic service fixtures; application initialization does not import those fixtures.
- Replaced slug-specific booking durations, hidden clinical-service defaults, WhatsApp aliases, review filters and discovery mappings with persisted catalogue data. Booking forms require an explicit valid selection.
- Added dashboard editing for care goals, body areas, optional clinical lists, FAQ translations and search aliases.
- Fixed recurring-plan preview to use the same custom duration as the committed booking. Database overlap guards now read persisted duration metadata instead of a static SQL lookup.
- Fixed empty admin catalogue responses falling back to a stale parent catalogue. Existing orphaned historical mappings remain readable/restorable without becoming selectable for new bookings.
- Corrected zero-price display, translation fallback, custom assessment category labels, dynamic catalogue counts and the assessment prompt when no assessment is published.
- Removed the fixed ten-session offer. General category labels, clinic information, UI text and editorial blog articles remain content, not a source of bookable services. Related-service links render only when the referenced service is actually published.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| General regression suite, SQLite | 150 passed, 0 failed | `suite.log` |
| Regression suite, local libSQL adapter | 120 passed, 0 failed | `libsql.log` |
| Treatment lifecycle, SQLite | 30 passed, 0 failed | `treatments.log` |
| Treatment lifecycle, local libSQL | 30 passed, 0 failed | `treatments-libsql.log` |
| React/DOM treatment tests | 8 passed, 0 failed | `treatments-ui.log` |
| Dashboard regression checks | 36 passed | `dashboard.log` |
| Final production-server HTTP scenarios | 20 passed | `http-results.json` |
| TypeScript and production build | Passed | `typecheck.log`, `build.log` |

These are runner-reported counts. Nested parent tests and runs on different adapters are included; the total is not a claim of 394 unique business scenarios.

### Scenario coverage

| Area | Cases exercised |
| --- | --- |
| Empty installation | No catalogue, mappings or sample reviews; empty public pages; old built-in URLs return 404; unknown services cannot be booked/reviewed |
| Creation/content | First custom treatment, all categories, single-language fallback, optional metadata, omissions versus clearing, FAQ and aliases |
| Validation | Invalid/null/array/prototype payloads, length limits, duplicate IDs, malformed slugs, invalid enum selections, price precision, zero price, maximum price and duration boundaries |
| Publication | Every Draft/Published/Archived transition; republishing; no eligible practitioner; inactive/internal practitioner; insufficient working hours |
| Team/resources | Zero assignments, exactly three assignments, no automatic future assignment, duration overrides, buffers, resource mappings, existing-booking conflicts |
| Booking | Website/dashboard/WhatsApp, custom price/duration snapshots, overlap, blocked slots, concurrency, duplicate intent replay, recurring preview and commit |
| History | Price/name/duration edits preserve previous appointments; archived services block new care but keep historical invoicing and clinical records |
| API/security | Anonymous access, cross-origin mutation, invalid JSON, stale revisions, concurrent edits, HTML escaping, transaction rollback, retryable database errors |
| Recovery | Idempotent migrations, deliberately empty catalogue, backup round-trip, older backups and orphan historical mappings |
| UI | Draft retention, close confirmation, duplicate-submit lock, offline errors, stale-editor reload, empty-context refresh, alias search, assessment-only catalogue, category labels in PT/EN/FR |

## Browser verification

Completed against the isolated production preview using synthetic data:

- Confirmed empty public catalogue and live count of zero after reloading the final build.
- Created `QA Browser Treatment` in the UI at €42.75 / 75 minutes as a draft with zero practitioners.
- Attempted publication without a practitioner and verified the validation error and retained form.
- Assigned a practitioner and added a goal, body area, clinical lists, alias and FAQ; saved and published successfully.
- Opened its public detail and verified saved content, duration and price. The booking link selected the custom service and practitioner. Alias search returned the custom treatment.
- Inspected the editor at 1440×960 and 390×844. The mobile document had equal client and scroll widths (390px); form content scrolls and save/cancel controls remain accessible.
- Archived the browser fixture. The final HTTP lifecycle returned the final public catalogue to empty. No browser console errors were observed in the inspected logs.

Images: `editor-desktop.jpg`, `editor-mobile.jpg`. These show synthetic browser-test records, not actual clinic data.

## Isolation and practical limits

All writes occurred in disposable databases under the isolated preview/test workflow. The 16 pre-existing real data files have identical SHA-256 hashes before and after this task; `verification.json` records the comparison. The preview's application source matches the working source file-for-file. `.env` files and outgoing SMTP/WhatsApp credentials were not used. The preview remains available at http://127.0.0.1:3119/ with synthetic admin password `fix-admin-test`.

An earlier libSQL test-process shutdown returned a native failure after assertions had passed. Its output is retained in `libsql-shutdown-failure.log`. The focused scheduling rerun (80 passed) and subsequent full libSQL reruns (120 passed, clean exit) succeeded. A root cause for that earlier process exit was not established.

Remote Turso networking, real email/WhatsApp delivery, production deployment and real clinic data migration were not exercised. Passing this finite matrix does not prove that every possible input or infrastructure failure is impossible.

## Reproduction

Use `node docs/audit/tools/run-dynamic-services.cjs prepare` to copy source into the isolated preview without real data or `.env`. Then run modes `suite`, `libsql`, `treatments`, `treatments-libsql`, `treatments-ui`, `dashboard`, `typecheck` and `build` as needed. Mode `start` serves the synthetic preview on port 3119.

The HTTP harness `node docs/audit/tools/http-dynamic-services.cjs` deliberately asserts a fresh empty database before creating fixtures. For another full HTTP run, select a new disposable fixture filename in both the launcher and HTTP harness; do not point either at the real database. `node docs/audit/tools/verify-dynamic-services.cjs` validates logs, source-copy equality and unchanged real-data hashes.
