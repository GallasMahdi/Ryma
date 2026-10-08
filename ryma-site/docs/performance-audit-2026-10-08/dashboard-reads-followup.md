# Compact drawer and dashboard request optimization

Follow-up to the mobile navigation release on 8 October 2026. The More sheet has less padding, 68 px destination rows instead of 80 px, 40 px icon containers instead of 48 px and a smaller heading. The dock buttons are 68 px instead of 76 px. Labels remain visible, close/utility controls retain at least 44 px touch targets, and the sheet still scrolls on short screens. The settled sheet measures approximately 527 px high at a 390×844 viewport.

## Agenda delay: cause and correction

The team agenda fetched slot/block data and the complete practitioner configuration whenever the appointment array changed. Every background appointment refresh therefore caused two additional reads and reset the agenda's loading state. The effects now depend on the selected date and schedule-change events. An appointment update renders its new rows without reloading those two datasets or hiding the existing team grid.

Concurrent identical dashboard GETs now share one network request. Explicit reference caches last 30 seconds for practitioner configuration and 15 seconds for agenda slot/block data. The shared cache is bounded to 64 entries. Financial and appointment reads do not retain completed responses. Schedule-change/authentication events and dashboard mutations invalidate shared data; generation checks prevent an older response from repopulating the cache after invalidation. Shared GETs have a 15-second timeout, and failed reads remain retryable.

The dashboard also avoids its unused generic appointment-page request before the agenda supplies its actual day/week query. Its first SSE connection does not repeat the initial load. Language/catalogue changes no longer recreate the appointment fetch callback or reconnect the live stream. Reconnection, visibility/focus recovery and fallback polling still refresh schedule reference data. Invoice pagination no longer fetches unrelated dashboard metadata; creation/voiding refresh metadata when totals can change. The refresh action targets the active tab.

## Verification

- Production build and TypeScript validation passed: [compact-drawer-build.log](compact-drawer-build.log).
- Full regression suite: **183 passed, zero failures**, including seven new request/agenda checks: [dashboard-reads-regression.log](dashboard-reads-regression.log).
- Real HTTP workflow/concurrency suites: **20 checks passed** on a disposable database: [dashboard-reads-http.log](dashboard-reads-http.log).
- Controlled request tests confirm two simultaneous identical reads produce **one network request**; different query URLs stay independent. Expiry, invalidation, bounded cache size, failure/retry and stale-response isolation are covered.
- The DOM agenda test confirms **zero additional reference reads** when a fresh appointment array renders the same day, **one slot read** for a new date, and **two fresh reference reads** after a schedule-change event. These are controlled behavior checks, not production network measurements.
- Browser checks cover initial agenda rendering, forward/backward date navigation, refresh, the availability tab, all three languages, drawer sizing, responsive overflow and console errors.

The earlier load results in this folder describe the previous release. This follow-up changes client request scheduling and layout; it makes no new numerical claim about production API latency or real-device frame rate.

![Smaller mobile drawer](compact-drawer.jpg)
