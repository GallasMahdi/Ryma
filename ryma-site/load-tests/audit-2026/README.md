# Performance fixes and reproducible regression audit

Run from `ryma-site` with dependencies from the repository lockfile. This harness creates a new timestamped `performance-results/` directory and builds an isolated production copy. It does not copy `.env` files, contact the configured remote Turso database, or provide notification credentials. Generated audit credentials and database files must stay local.

```powershell
node load-tests/audit-2026/validation-regression.cjs
node load-tests/audit-2026/setup.cjs
node load-tests/audit-2026/server.cjs build
# Keep the server running in a separate terminal:
node load-tests/audit-2026/server.cjs start
# Sequentially, without overlapping benchmark workloads:
node load-tests/audit-2026/api.cjs
node load-tests/audit-2026/fixes-regression.cjs
node load-tests/audit-2026/extended-regression.cjs
node load-tests/audit-2026/booking-lifecycle.cjs
node load-tests/audit-2026/sequence.cjs profile.cjs analyze-profile.cjs concurrency.cjs journeys.cjs journeys-extra.cjs availability-cache.cjs live-session.cjs auth.cjs browser.cjs
node load-tests/audit-2026/prepare-load.cjs
node load-tests/audit-2026/load.cjs
# During the soak only, in a separate terminal, record a deliberate browser workload:
node load-tests/audit-2026/live-under-load.cjs
# After load.cjs finishes:
node load-tests/audit-2026/quality.cjs
node load-tests/audit-2026/browser-quality.cjs
node load-tests/audit-2026/server.cjs stop
node load-tests/audit-2026/cleanup.cjs
node load-tests/audit-2026/report-fixes.cjs
node load-tests/audit-2026/finalize.cjs
```

Set `AUDIT_PLAYWRIGHT_PATH` and `AUDIT_CHROME_PATH` when the bundled Windows defaults do not match your installation. The build downloads Google Fonts; network access is required on a clean cache. A failed font build can leave unusable Turbopack cache: preserve that failed cache under a different name before a clean rebuild.

Keep the host awake throughout measurements. `node load-tests/audit-2026/status.cjs` shows current load progress and monitoring gaps. Preserve interrupted evidence and repeat the affected stage; elapsed sleep time is not valid sustained load. `browser-quality.cjs` retains raw request-failure counts and separately classifies canceled background RSC requests. The successful route journeys remain independent checks of navigation.

The initial API smoke verifies the actual database file and empty baseline before writing. Dataset growth uses 100, 1,000, and 10,000 synthetic patients with linked appointments, invoices and three sessions each. The fixtures retain the original audit distribution for comparison: sessions repeat their patient's appointment date/time, so this is a scaling workload, not a clinical scheduling simulation. Exact row identities, foreign keys and duplicate active booking slots are checked. Reset and cleanup operate only on the isolated run database.

The revised dashboard workload reads 10-row pages, includes global appointment totals, and uses the combined structured/legacy patient directory. The original unpaginated endpoints remain in the API benchmarks for comparison and backward compatibility. This workload change is intentional and must be disclosed in before/after capacity comparisons.

Load mix defaults to `[20,40,10,10,10,8,2]`: homepage, availability, appointment page, patient directory, invoice page, appointment note update, public booking. Set `AUDIT_MIX_JSON` to seven nonnegative integer percentages totaling 100. This is an engineering assumption, not production analytics. Think times are 1–3 seconds; each virtual user logs in once and has one fixed synthetic client IP. Arrival requests are assigned fairly among the existing idle virtual users, each retaining its original cookie and fixed IP. Rate limits are unmodified, and throttled operations are not successful business transactions.

Run baseline (2 minutes), sustained 5/10/25/50 users (3 minutes each after 15-second warm-up), spike 5→100 within 10 seconds with a 60-second peak and recovery, bounded stress 100/200, arrival-rate scenarios, and a 30-minute soak at up to 10 previously demonstrated stable users. Escalation stops on sustained unexpected errors above 5%, empirical rolling p99 above 5 seconds for 60 seconds, or free memory below 500 MiB. Recovery is observed after a stop; a stop is not a pass. `--bounded-arrival` supplies a separately documented 10/20 requests/s follow-up when higher arrival stages were skipped.

Browser measurements use ordinary desktop/mobile Chrome user agents, normal/reduced motion controls, fresh and returning contexts, cold/warm browser cache, and documented CDP network/CPU throttling. Five repetitions per primary condition; one additional returning-cold sample per condition. A trial click measures actionability, not React hydration or field INP. The dedicated regression test instead performs immediate real dashboard clicks. CLS is a conservative sum of observed shifts rather than the Web Vitals session-window metric. Observation windows and raw events are retained. No OS cache eviction or real-device/network equivalence is claimed.

`sequence.cjs` stops if a child fails and records exact timestamps/exit codes. Regression scripts assert results and database contents; scenario failures set a nonzero exit status. `quality.cjs` evaluates actual hold completion, generator continuity, per-operation latency budgets, errors, resources and SSE delivery. Percentiles: p90 at ≥50, p95 at ≥100, p99 at ≥1,000 samples; smaller sets report median/range or a conservative maximum. Throughput uses measured wall time. CPU/SQL profiling runs separately on port 3218, excluded from primary latency measurements.

Historical scripts and results from September 28 are retained in that run's own archived `scripts/` directory. Do not reuse its absolute paths, generated passwords, or hardcoded report verdicts for a new run. The new report and completion files must be based on this run's actual evidence.
