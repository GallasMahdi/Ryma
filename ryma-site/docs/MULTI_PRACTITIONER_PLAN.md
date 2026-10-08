# Multiple practitioners: implementation, verification and rollout

Date: 7 October 2026. Status: implemented and verified locally; not deployed to production.

## Implemented behavior

- Patients choose an eligible practitioner or **Earliest available**. Solo practices auto-select their only eligible practitioner. Confirmation shows the actual assigned professional, duration and pending status.
- The admin **Equipa** section manages practitioner profiles, eligible treatments, duration and preparation/recovery buffers, weekly shifts, dated leave/opening exceptions, clinic opening hours and shared resources. Archiving retains historical attribution.
- Availability combines clinic and practitioner schedules, full treatment duration, buffers, leave, patient conflicts and required shared resources. Different practitioners can work simultaneously when their patients and required resources differ.
- Public/admin booking, recurrence, reassignment, future manual sessions and WhatsApp use one reservation service. Recurring sessions retain one practitioner and commit atomically. Clinic-wide and practitioner-specific blocks are distinct.
- The team day agenda displays a column per practitioner and actual appointment durations. Practitioner filtering applies to agenda columns, appointments, totals and slot management. Mobile supports a selected practitioner and horizontal scrolling for larger teams.
- Database guards prevent practitioner, patient and resource overlaps. Configuration revisions and appointment versions reject stale writes. Booking request keys protect retries. Schedule changes refresh through the existing event stream.
- Clinical sessions, invoices, prescriptions, CSV exports, calendars and email data retain practitioner attribution. Document authors must be selected when several active practitioners make the choice ambiguous.
- Backup format 2.0.0 includes scheduling configuration and assignment snapshots. Restore validates the complete payload and applies it atomically; legacy backups map to the migrated solo practitioner. Occupancy uses available practitioner minutes.

The core is in `src/lib/scheduling-schema.ts`, `src/lib/scheduling.ts`, `src/lib/booking-service.ts` and `src/lib/schedule-math.ts`. SQLite and Turso/libSQL use the same rules.

## Verification evidence

All checks used isolated synthetic databases and patients. No production migration, database write, real message or email delivery was performed.

| Check | Result |
| --- | --- |
| Production Next.js build, TypeScript and static generation | Passed |
| Scheduling tests against SQLite | 68 reported tests passed, including suite container |
| Scheduling tests through libSQL using a local file database | 68 reported tests passed, including suite container |
| Existing admin regression audit | 36 checks passed |
| Phone and review regressions | 14 tests passed |
| WhatsApp booking regressions | 15 tests passed per adapter |
| Desktop browser | Team creation; public named-practitioner booking; same-time admin booking on another practitioner; rejected conflicting reassignment; successful reassignment and return; provider filtering; practitioner-specific morning block |
| Mobile browser at 390 px | Selected practitioner agenda verified; page width equals viewport width |
| Earliest-available public booking | Successful commit showing assigned practitioner, 50-minute duration and pending confirmation |
| Browser console | No errors recorded in the three verification tabs |
| Browser fixture integrity | SQLite integrity check: ok; foreign-key check: no violations |
| Full regression suite | 97 reported tests passed, no failures/skips |
| Scheduling + WhatsApp on libSQL | 83 reported tests passed, no failures/skips |
| Real production-build HTTP server | 15 check groups passed, covering public pages, authentication, team settings, retries, concurrent booking, rescheduling, closures, owner access and database integrity |
| Additional real HTTP stress checks | 5 groups passed: concurrent phone limits, 20 independent bookings, concurrent recurring retries, malformed input and persisted database invariants |

### Additional exception audit

The follow-up audit reproduced and fixed eight defects:

1. Retrying a public booking incorrectly consumed its patient's booking allowance. Verified replays now bypass the new-booking limit and do not increment it; new reservations remain limited.
2. Idempotency payload comparison omitted notes, coverage and status. These now participate in the comparison, so reusing a key with changed booking data is rejected.
3. Reassigning a cancelled booking changed its practitioner ID without changing its saved name. Appointment and linked session names now remain consistent.
4. Non-string practitioner preferences were silently treated as earliest-available requests. Public and admin booking validation now rejects them.
5. Null/empty rescheduling dates or times became silent no-op updates. They and nonpositive/stale versions now return validation/conflict responses without changing the booking.
6. Recurrence preview rounded/clamped invalid counts and discarded invalid pattern entries. It now rejects malformed counts and partial patterns.
7. Backup restore accepted JSON objects/null in place of resource ID arrays. It now validates allocation shape, references and duplicate IDs before writes.
8. Failed single/series bookings created empty patient profiles before reserving capacity. New patient and note creation now commits atomically with appointments and sessions; concurrent failures leave no empty clinical records.

The exception suite also checks private/archived practitioners, reopening cancellations, duration snapshots, resource deactivation, Sunday exception deletion, malformed bulk ranges, calendar summer/winter offsets, UTF-8 calendar folding and 2,592 combinations of start time, duration and buffers against an independent minute-based interval check. All run on both adapters.

### Adversarial preproduction pass

The next pass added `scripts/scheduling-adversarial.cjs` with real transactions and injected failures, on both adapters. It reproduced further defects and verified their fixes:

- Six simultaneous public bookings bypassed the three-per-phone allowance. The allowance check now participates in the scheduling revision and its charge commits atomically with the booking. IP check-and-charge also holds one write transaction.
- A lost commit acknowledgement recovered the booking but lost its rate-limit charge. The charge now survives the same transaction as the reservation.
- An obsolete response-cache write could return 500 after a successful booking. The redundant cache write was removed; the booking's persisted request key is authoritative.
- Deleting and recreating a patient profile could bypass their retained appointment conflict. Availability checks normalized phones as well as patient IDs, and SQL guards enforce the stored phone invariant.
- Patient deletion racing with booking could leave an orphan patient reference. Patient changes now advance scheduling revisions; patient lookup follows the revision read.
- Permanent appointment deletion left orphan clinical session links. Explicit deletion now removes the appointment and linked session atomically; an injected deletion failure preserves both.
- Recurring booking accepted malformed practitioner preferences and patient names. It now uses the shared booking validator, also checking request-key and pain-score inputs. Preview checks practitioner preference types too.
- Recurring requests could not recover after a lost response. A payload hash and plan IDs now commit with the entire plan. Admin single and recurring forms keep request keys across network retries. Replay refuses a changed payload or partially removed plan, and survives backup restore.
- Backup restore accepted unknown scheduling references and impossible calendar dates. These now fail before writes. An injected late restore failure independently verifies complete data and revision rollback.
- Twenty simultaneous bookings on independent dates produced twelve false “slot taken” responses. Bounded retry backoff resolves contention; exhausted retries return a retryable busy response, preserving the request key. All twenty succeeded in both adapters and through the production-build HTTP server.
- The admin Cancel action called permanent deletion. It now uses a versioned status update, retaining the booking, clinical links and retry identity. Successful status changes apply the server's new version immediately.

Additional passing cases include competing reschedules with exactly one winner, raw SQL collision guards after patient deletion, expiry of rate-limit windows, concurrent recurring retries, SMTP exceptions preserving the booking, and busy-response recovery without orphan profiles.

Browser verification exercised invalid phones on both forms, expired-session redirection, unavailable/blocked slots, a two-session admin plan, a slot taken after the patient reached the details step, retained patient details after that conflict, and successful booking of an alternative time visible in the admin agenda. The confirmation also fits a 390 px viewport. No browser console errors were recorded during these flows.

The final rebuilt admin was also tested through its Cancel confirmation dialog. The cancelled entry remained visible; a direct database check verified the same appointment ID, version 2, `CANCELLED` status and its preserved clinical session. Screenshot: `../output/multi-practitioner/adversarial-safe-cancellation.jpg`. The final running preview is described by `running-preview.json`; it contains only synthetic data.

Evidence: `adversarial-*-before.log`/`load-before.log` preserve reproduced failures; `regression-tests.log`, `libsql-tests.log`, `production-build.log`, `running-adversarial-tests.json` and `running-preview.json` describe final checks. One earlier combined libSQL test process exited after its assertions passed without a diagnostic; isolated TAP and subsequent combined TAP reruns completed successfully. Local libSQL file tests exercise the adapter but cannot establish remote network reliability.

These checks are not a claim that every possible failure or production environment was tested. Email sending is currently best effort: an SMTP exception preserves the booking, but email has no durable retry queue. Production notification reliability requires either that queue or an explicit operational follow-up process. Verify remote Turso, production credentials, SMTP/WhatsApp delivery and a production-like restore before launch. Test delivery was disabled; no live patient data was used.

Saved follow-up evidence: `../output/multi-practitioner/regression-tests.log`, `libsql-tests.log`, `dashboard-tests.log` and `running-app-tests.json`. The HTTP suite requires a fresh isolated preview from `scripts/run-scheduling-preview.cjs`; set `RYMA_PREVIEW_DB` to its printed temporary fixture path before running `node scripts/test-running-preview.cjs`. Do not run it against production data. Remote Turso networking and real external message delivery remain outside these local checks.

Scheduling coverage includes populated legacy migration, repeated initialization, parallel bookings and retries, partial overlaps, buffers, lunch breaks, Sunday exceptions, patient/resource conflicts, stale edits, schedule changes affecting bookings, authentication, public data minimization, atomic recurrence, historical clinical entries, document authors, scoped bulk blocks, backup round-trip/rollback and CSV column alignment.

Reproduce from `ryma-site` in PowerShell:

```powershell
npm run test:regression
npm run test:dashboard
$env:RYMA_TEST_ADAPTER = 'libsql'
node --test scripts/test-scheduling.cjs scripts/test-whatsapp-booking.cjs
Remove-Item Env:RYMA_TEST_ADAPTER
node scripts/run-scheduling-preview.cjs build
```

The preview helper uses a temporary database, skips production environment loading, binds to localhost and disables outgoing email/WhatsApp. Run `node scripts/run-scheduling-preview.cjs start` for isolated browser verification. Its synthetic credentials apply only to that local helper.

Browser evidence is in `../output/multi-practitioner/`: `admin-desktop.jpg`, `admin-mobile.jpg` and `client-confirmation.jpg`.

## Production rollout

1. Take and verify a recoverable pre-migration database backup. Schedule a brief booking maintenance window and stop old application writers. Old and new releases must not write concurrently during this schema transition.
2. Deploy the new release. Database initialization runs the versioned migration, assigns existing appointments to the stable `legacy` practitioner, preserves historical data, removes old clinic-wide collision rules and installs scoped rules.
3. In **Equipa**, rename the migrated practitioner to the actual professional. Configure clinic hours and each practitioner's services, durations, buffers, shifts and absences. Migration seeds the previous booking grid: Monday–Saturday, 08:30–12:30 and 14:00–17:30. Verify this against actual clinic operations.
4. Review future appointments before enabling additional publicly bookable practitioners. Configuration changes that invalidate future bookings are rejected with affected appointment IDs; resolve those bookings explicitly.
5. Verify public named/earliest booking, admin filtering/rescheduling, notification delivery and backup export with production configuration before reopening booking traffic. Local tests do not verify remote Turso network behavior, production SMTP or live WhatsApp delivery.
6. Rollback requires restoring the pre-migration backup and previous release with writers stopped. There is no automatic reverse migration; do not start the old release against the migrated database.

## Scope and limits

This supports one clinic with multiple practitioners. Existing shared admin authentication and owner analytics protection remain. Individual staff accounts, practitioner-specific record permissions and tenant isolation are separate work; shared admin access does not restrict a practitioner to their own patients.

Resources represent individually reserved rooms/equipment, not interchangeable pooled capacity. The clinical catalog remains oriented to physiotherapy/aesthetics; doctor profiles do not add specialty-specific medical workflows. Historical occupancy uses current configured schedules, not historical schedule versions. Public marketing hours remain static website copy and must be reconciled with booking hours during setup.

## Original audit and design rationale

The remaining sections preserve the pre-implementation audit. Their descriptions of then-current behavior and source line numbers are historical; the implemented scope and verification above take precedence.

Extend the product to support one clinic with one or more practitioners. Keep the solo experience simple by automatically selecting the only eligible practitioner. For a team, let the patient choose a practitioner or select **Earliest available**, as requested.

Every appointment must reserve a specific practitioner before it is committed. Availability must account for that practitioner's services, working hours, breaks, absences, treatment duration, and any required shared room or equipment. Adding a dropdown alone cannot deliver this behavior: the current database enforces one active appointment across the entire clinic at a given time.

This plan assumes one clinic per deployment. Hosting unrelated clinics in the same application requires a separate tenant isolation design covering patients, queries, authentication, exports, events, and settings. Adding practitioners does not provide that isolation. A practitioner can represent a doctor or physiotherapist; the existing service catalog and clinical workflows are still primarily physiotherapy and aesthetics.

## Audit scope and evidence

The review traced schema initialization for SQLite and Turso/libSQL, all appointment writers in application source, public and admin availability, recurring booking, manual patient sessions, public booking, day/week/list agendas, slot management, WhatsApp conversations, events and caches, staff authentication, patient records, documents, analytics, and backup/restore scripts. It reviewed the current working tree, including the existing uncommitted booking-duration and WhatsApp work.

| Area | Current behavior and consequence | Implementation impact |
| --- | --- | --- |
| Appointment identity | [Appointment type](C:/Users/User/Desktop/Ryma/ryma-site/src/types/admin.ts:7) and database appointments have no practitioner ID. | Add a required practitioner relationship and a display-name snapshot. |
| Database collision rules | [Global unique index](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:193) reserves `(date, startTime)` clinic-wide. The SQLite initializer repeats it. | Replace it with practitioner-scoped protection in both adapters. |
| Duration collision rules | [Booking triggers](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/booking-schedule.ts:40) reject overlapping intervals across every appointment on the date. | Scope overlaps to practitioner and configured resources. Updating only the unique index will still reject simultaneous bookings. |
| Old database guards | [Exact-time triggers](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:313) also enforce global blocking. | Replace all old guards explicitly; leaving one behind can retain the solo limitation. |
| Closures and leave | [Blocked slots](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:60) use `UNIQUE(date, time)` with no owner. | Distinguish clinic closures from practitioner absence and resource unavailability. |
| Availability engine | [Batched availability](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:892) considers every active appointment and block together. | Filter eligible practitioners and evaluate their independent capacity. |
| Working hours | [Fixed time grid](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/validation.ts:9), Sunday exclusions, and [public hours](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/site.ts:30) are separate assumptions. The grid ends at 17:00 while displayed clinic hours end at 19:00. | Use configured weekly opening intervals and exceptions. Resolve the existing hours discrepancy during setup; do not silently extend booking hours. |
| Admin availability | [Admin slots](C:/Users/User/Desktop/Ryma/ryma-site/src/app/api/admin/slots/route.ts:37) maps only appointment start times, while public availability checks full durations. | Both views must use the same interval engine. A 09:00 appointment lasting 50 minutes must occupy 09:30 in the admin view too. |
| Bulk blocks and rescheduling | [Bulk blocks](C:/Users/User/Desktop/Ryma/ryma-site/src/app/api/admin/slots/bulk/route.ts:81) and [rescheduling prechecks](C:/Users/User/Desktop/Ryma/ryma-site/src/app/api/admin/appointments/[id]/route.ts:102) use exact starts. Database overlap guards still reject overlapping writes. | Replace inconsistent prechecks and return useful conflict details. Validate practitioner-only transfers and reopening cancelled appointments as well. |
| Public booking | [Booking page](C:/Users/User/Desktop/Ryma/ryma-site/src/app/rendez-vous/page.tsx:326) requests availability by service/date; its confirmation uses local selection state. | Add practitioner preference and display the server's committed assignment in the confirmation. |
| Recurring sessions | [Recurring API](C:/Users/User/Desktop/Ryma/ryma-site/src/app/api/admin/appointments/multiple/route.ts:86) accepts a practitioner string, but the appointment model does not. | Use practitioner IDs in preview, atomic creation, and linked patient sessions. |
| Manual sessions | [Manual session writer](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:2033) can insert an appointment directly when a time is supplied. | Route future reservations through the booking service; distinguish historical clinical entries from new appointments. |
| Agenda and capacity | [Week calendar](C:/Users/User/Desktop/Ryma/ryma-site/src/components/admin/AppointmentsTab.tsx:252) calculates occupancy from appointment counts and a fixed slot count. [Day agenda](C:/Users/User/Desktop/Ryma/ryma-site/src/components/admin/DayAgendaView.tsx:97) is a chronological list. | Add practitioner filters, a team day view, and capacity based on actual scheduled minutes. |
| WhatsApp | [Conversation model](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/whatsapp/types.ts:4) has service/date/time but no practitioner. | Add the same practitioner preference, actual assignment, and refreshed availability used on the website. |
| Staff access | [Session model](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/session.ts:5) identifies an admin session, with no user ID, practitioner ID, or role. Login uses a configured shared admin password. | Practitioner profiles are independent of login accounts. Add named accounts and permissions before giving practitioners their own dashboard access. |
| Clinical and billing identity | [Invoice creation](C:/Users/User/Desktop/Ryma/ryma-site/src/components/admin/CreateInvoiceModal.tsx:234) and [prescription creation](C:/Users/User/Desktop/Ryma/ryma-site/src/components/admin/CreatePrescriptionModal.tsx:152) send `SITE.professionalName`. | Carry the actual responsible practitioner into records and document snapshots. Keep the clinic's billing identity separate. |
| Confirmation and calendars | [Email calendar link](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/email.ts:75) assumes 50 minutes and names Digital Clínica as practitioner. The separate [calendar helper](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/appointment-calendar.ts:16) already handles Lisbon time. | Reuse one calendar builder and the committed duration, status, and practitioner. |
| Events and caches | [Admin cache](C:/Users/User/Desktop/Ryma/ryma-site/src/app/admin/page.tsx:186) is keyed by date. [Database revisions](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/booking-schedule.ts:34) track appointments and blocked slots. | Include practitioner/service in cache keys, and invalidate on schedule, absence, eligibility, and resource changes. |
| Analytics | [Occupancy calculation](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:4148) assumes one fixed clinic schedule. | Add practitioner filters and compute booked minutes divided by actual available practitioner minutes. |
| Recovery | [Backup export and restore](C:/Users/User/Desktop/Ryma/ryma-site/src/lib/db.ts:2691) and CLI scripts enumerate known tables and columns. | Version backups and include new identities, schedules, constraints, and snapshots. Otherwise restore can lose practitioner assignments. |

`src/lib/appointmentSystem.ts` contains an older localStorage booking implementation, but no imports of that module were found in `src`. Keep it out of the new booking path; remove or explicitly retire it after confirming it has no external use. Some older architecture/audit documents also describe behavior that has since changed, so implementation should follow verified source and update those documents.

## Patient and clinic experience

Public flow: **Treatment → Practitioner or Earliest available → Date and time → Details → Confirmation**. With one eligible practitioner, select them automatically and show their name without adding an extra selection step. Only practitioners enabled for the chosen service appear. Changing the treatment or practitioner clears incompatible date/time selections.

Earliest available means the earliest bookable start across eligible practitioners. For a time shared by several available practitioners, show it once. At commit, assign one eligible practitioner using a stable policy, such as configured booking priority followed by practitioner ID. Availability is advisory until that transaction succeeds. If another patient takes the final opening, refresh choices; never silently change the patient's selected time or explicitly selected practitioner.

| Example at 09:00 | Practitioner A | Practitioner B | Patient choosing Earliest available |
| --- | --- | --- | --- |
| A has a 50-minute appointment; B is working and qualified | Unavailable | Available | Can book with B |
| A is on leave; B is working and qualified | Unavailable | Available | Can book with B |
| Both are free, but B does not offer this treatment | Available | Ineligible | Can book with A |
| Both are free, but the required shared machine is reserved | Unavailable for this treatment | Unavailable for this treatment | No opening at 09:00 |
| Clinic is closed | Unavailable | Unavailable | No opening at 09:00 |

For reception, add an **All practitioners / selected practitioner** control shared by appointments, agenda, and availability. The desktop team day view should have time vertically and a column per selected practitioner. Blocks show actual treatment duration; breaks and leave are visible. Preserve the list view, use a filtered practitioner week view, and use a practitioner selector plus chronological agenda on mobile. Labels must identify practitioners independently of color, while appointment status retains its current meaning.

Add practitioner management for profile, profession, eligible services, public booking status, weekly hours, breaks, and dated exceptions. Distinguish **unavailable**, **fully booked**, and **clinic closed**. Creating an appointment from the agenda should prefill its practitioner/date/time and still validate the complete reservation on the server.

For physiotherapy session plans, default to the same practitioner throughout the series. Preview conflicts and alternatives before saving. Switching practitioners requires an explicit selection; an automatically mixed series should not be the default.

## Proposed data model

| Entity | Main fields and rule |
| --- | --- |
| `clinic_settings` | Timezone, booking increment, booking horizon, and relevant booking policies. Start with `Europe/Lisbon` and the existing 30-minute start increment. |
| `practitioners` | Stable ID, display name, profession, optional professional details, color, active flag, public-booking flag, booking priority. Archive instead of deleting referenced practitioners. |
| `practitioner_services` | Practitioner ID + service slug; optional duration/buffer overrides. A practitioner can offer several services and a service can have several practitioners. |
| `clinic_working_hours` | Weekday and opening intervals. Split intervals represent lunch breaks. |
| `practitioner_working_hours` | Practitioner ID, weekday, start/end minutes, effective date range. Split shifts supported. |
| `availability_exceptions` | Clinic or practitioner scope, date, interval, closure/absence or replacement working hours. Enforce valid scope and interval constraints. |
| `appointments` additions | Required practitioner ID, practitioner-name snapshot, numeric duration and before/after buffer snapshots, version for optimistic edits. Retain existing local date/startTime and derive interval bounds consistently on the server. |
| Clinical record links | Practitioner ID and preserved display-name snapshot on sessions and prescriptions; optional explicit appointment link on sessions. Preserve original text where historical identity is uncertain. |
| `invoices` additions | Practitioner reference when known plus an immutable displayed identity snapshot. Clinic invoice numbering remains clinic-wide. |
| Optional resources | Rooms/equipment, service requirements, and appointment resource allocations. Required before enabling parallel use of any shared limited resource. Model individual units initially. |
| Staff accounts | User ID, role, optional practitioner link, active status, credential/session identity. Required for individual staff access; separate from bookable profiles. |

Store durations as numbers. The catalog currently contains 20, 30, 45, 50, and 60 minute treatments. A 30-minute booking increment controls permitted starts, not appointment length. Existing appointment lengths must remain stable when someone edits the service catalog later; currently overlap logic derives lengths from the live catalog.

Keep patient records shared within the clinic and display who provided each treatment. Do not create a duplicate patient per practitioner. For future bookings, prevent simultaneous appointments for the same identified patient across different practitioners; use canonical patient identity rather than introducing another raw phone comparison. Existing shared-phone identity assumptions need care when adding such a check.

## One authoritative scheduling service

Extract scheduling responsibilities from the large `db.ts` into a focused server module with persistence functions for both adapters. Public slots, admin slots, single bookings, recurring previews/commits, rescheduling, manual future appointments, and WhatsApp must call this service.

For each candidate:

1. Validate service, active eligible practitioner, date, and clinic-local time.
2. Resolve the effective duration and buffers, and snapshot them on creation.
3. Require the entire occupied interval to fit both clinic and practitioner working intervals. Dated replacement hours replace that day's normal schedule; closures and absences subtract from the result. Practitioner exceptions cannot reopen a clinic closure.
4. Remove overlapping practitioner reservations, relevant closures, and required resource reservations. Treat intervals as half-open: `start < otherEnd && otherStart < end`, so adjacent reservations can meet exactly at an endpoint.
5. Revalidate and commit the appointment, assignment, and resource allocations atomically. Preserve the current `status != CANCELLED` occupancy rule initially, including pending bookings.
6. Publish an availability revision only after commit, then send confirmation from committed data.

Keep database guards against overlapping reservations. Include practitioner changes, duration/buffer changes, rescheduling, status reactivation, and block updates in those guards. A unique `(practitionerId, date, startTime)` index is a useful extra constraint but cannot detect partial overlaps by itself.

Appointment writes and schedule/absence/resource changes must coordinate through the same write transaction or guarded revision mechanism. A schedule change cannot race a booking between validation and commit. If changing hours or adding leave affects future bookings, show affected appointments and require explicit resolution; never silently cancel or relocate them.

Earliest-available assignment must be concurrency-safe. If its first candidate loses a race, it can retry other eligible practitioners at the same requested time within a bounded operation. Use a stable booking request ID tied to the normalized request, with a unique database constraint, so retries across channels return the same committed booking and assignment. A materially different request must use a new key. Recurring series remain all-or-nothing when a member conflicts.

Keep daily availability and monthly calendar queries batched by date range. Group rows by practitioner and date; avoid one database call for every practitioner/time combination. Cache keys must include date/range, practitioner preference, and service; availability invalidation must also cover profile eligibility and working-hour changes.

## API and integration changes

| Surface | Planned contract |
| --- | --- |
| Public practitioner lookup | `GET /api/practitioners?service=...` returns public profile fields for eligible bookable practitioners only. |
| Public availability | Extend `/api/slots` with `practitionerId` or explicit `preference=earliest`. Require the service in the new contract. Return available starts and resolved duration information without patient data or internal block reasons. |
| Public creation | Extend `/api/appointments` with practitioner preference and a stable request ID. Return the committed practitioner, time, duration, and status for confirmation. |
| Admin management | Add practitioner, eligible-service, working-hour, and exception endpoints with server validation and audit records. |
| Admin appointments | Add practitioner filtering, creation and reassignment. Check an expected version to avoid silently overwriting another receptionist's edit. |
| Admin availability | Replace exact-start maps with interval status from the scheduling service. Explicit scope for practitioner leave versus clinic closure. |
| Recurring sessions | Require an assigned practitioner in both preview and commit; return practitioner-specific conflicts and alternatives. |
| WhatsApp | Add practitioner/earliest choice, invalidate stale selections, preserve request identity on retry, and include the committed practitioner in the reply. |
| Notifications and calendars | Use one confirmation model and calendar helper for email, website, WhatsApp, Google Calendar links, and ICS downloads. |
| Patient records and documents | Show practitioner attribution; preserve issued document snapshots and keep referring doctor distinct from treating practitioner. |
| Analytics and export | Add practitioner filters where meaningful, including consistent query summaries and CSV output. Version full backups and restore dependencies. |

New fields should be added to both current Appointment type definitions during the transition, then consolidated so frontend and database contracts cannot drift. Update Portuguese, French, and English copy together. Team profiles should eventually replace the single-professional assumptions on public information pages while keeping the clinic brand.

If practitioners receive their own accounts, introduce owner, receptionist, and practitioner permissions before release. The server must enforce access for direct record URLs, patient history, downloads, search, and real-time streams; a UI filter is insufficient. Keep the existing owner step-up requirement for sensitive reporting. Define practitioner access to shared patient history explicitly during account rollout.

## Migration and implementation order

1. **Establish the migration baseline.** Preserve current work, take a verified backup, inventory the actual deployed schema, and test on disposable copies. Introduce a versioned migration runner shared by both adapters. Do not rely on adding more startup `CREATE IF NOT EXISTS` statements.
2. **Add practitioner identity and schedules.** Create one legacy practitioner for existing appointments and a service mapping matching current capabilities. The configured name is presently a clinic name, so confirm the actual practitioner's identity before publishing a personal profile. Preserve the current slot-derived working intervals until the 19:00 discrepancy is resolved. Existing blocks remain clinic-wide closures.
3. **Backfill safely.** Assign legacy appointment ownership and snapshot service durations available at migration time. Report unknown services and existing conflicts; old exact durations cannot be reconstructed with certainty from the current catalog. Preserve existing clinician text in sessions/invoices/prescriptions, and only map it to a practitioner when identity is unambiguous. Validate all required references before making them mandatory.
4. **Switch scheduling consistently.** Install scoped indexes and interval guards, remove all global legacy guards, and update both schema initializers so a restart cannot recreate them. Move every active writer/reader to the shared engine. Update backup and restore together with the schema. Coordinate the cutover so an old server instance cannot continue writing the old shape.
5. **Build staff management and agenda.** Add profiles, schedules, service assignment, exceptions, practitioner filters, team day columns, and appointment reassignment. Keep solo mode working with no extra required user steps.
6. **Complete all booking channels and outputs.** Add website and WhatsApp preference, recurring-series continuity, committed-assignment confirmations, actual practitioner attribution on documents, revised capacity metrics, and cache/event invalidation.
7. **Verify and release.** Run migration, functional, concurrency, restore, permissions where applicable, and browser checks in staging. Start with one practitioner, then enable a second only after the acceptance checks pass and any required shared resources are configured.

All seven steps are part of a complete team-booking release. Individual practitioner accounts can be a separate release only if booking remains managed by the existing authorized clinic administrator. Multi-clinic hosting, external calendar synchronization, payments, and complex practitioner-specific pricing can be separate projects.

A rollback must preserve bookings created after migration. Once simultaneous appointments for different practitioners exist, restoring the old clinic-wide unique index or simply downgrading the application is unsafe. Disable new team bookings if necessary and fix forward, or use a tested restore/reconciliation process that accounts for intervening bookings.

## Acceptance checks

| Check | Required result |
| --- | --- |
| Existing solo clinic | Booking, recurring sessions, blocks, records, and documents continue to work with one migrated practitioner. |
| Two practitioners at the same time | Different patients can book each practitioner simultaneously. |
| Same practitioner overlap | Reject overlapping appointments, including unequal starts and 20/45/50/60-minute services. Accept exact adjacency when buffers permit. |
| Working hours | Reject services extending into breaks, leave, or closing time; honor split shifts and dated exceptions. |
| Eligibility | Reject unknown, inactive, non-bookable, and service-ineligible practitioners at the appropriate public/admin boundaries. |
| Shared resources | Reject two simultaneous allocations of one required room or device even when practitioners are free. |
| Earliest-available races | Parallel requests fill available eligible capacity without overbooking or duplicate assignment. Retry of one request creates one appointment. |
| Reassignment and rescheduling | Validate the new practitioner and interval atomically, including status reactivation. Concurrent edits produce a conflict rather than lost data. |
| Schedule-edit race | A concurrent absence or working-hours change cannot silently invalidate a new reservation. Existing bookings are surfaced for resolution. |
| Recurring plans | Preserve practitioner continuity, show preview conflicts, and roll back the whole series if a slot changes before commit. |
| Manual sessions | Future timed entries use scheduling constraints; historical care entries do not accidentally create new future reservations. |
| All booking channels | Website, admin, manual future sessions, recurring plans, and WhatsApp agree on the same availability. |
| Real-time refresh | Two reception tabs see practitioner changes and leave promptly; changing filters never shows another practitioner's cached slots. |
| Historical stability | Editing duration, name, or active status does not rewrite old appointment lengths or issued documents. |
| Calendar correctness | Website/email calendar exports agree on practitioner, actual duration/status, and Lisbon time across daylight-saving dates. |
| Analytics | Capacity reflects actual practitioner working minutes and leave; totals and filtered results reconcile. |
| Recovery | Old backups migrate correctly; new backups restore all practitioner relationships and schedules on both adapters. |
| Staff access, if enabled | Direct APIs, export, search, and streams enforce role and record scope. |
| Browser experience | Solo/team booking and reception agenda work on desktop/mobile in Portuguese, French, and English. |

## Verification completed for this audit

The existing isolated booking suite passed with **15 reported tests on SQLite** and **15 on a local libSQL adapter**. Commands: `node --test scripts/test-whatsapp-booking.cjs` and the same command with `RYMA_TEST_ADAPTER=libsql`. These cover current booking integration, retry/idempotency behavior, duration-overlap guards, blocked intervals, and database revision delivery. They establish a baseline for existing behavior; they do not demonstrate multi-practitioner support, deployed Turso behavior, or a completed UI migration.

No live database, production bookings, deployment, or application source was changed during this audit. The only deliverable change is this repository plan.
