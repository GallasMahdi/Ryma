# Reproduce the Kiné audit

Run from `C:\Users\User\Desktop\Ryma\ryma-site` in PowerShell, at commit `8f3b9e2a5b4b8f1197053f40fe8cd27cd3d215f8`, using the repository lockfile dependencies. This audit used Node 24.18.0, npm 11.16.0, Chrome and Playwright 1.62.1. Hardware, browser version and timestamps are in environment.json and browser-environment.json. The audit never runs the historical run-suite.mjs.

The artifact's `scripts/` directory is an archival copy. To use that copy in a fresh checkout, place its `.cjs`, `.py` and `.md` files under `load-tests/audit-2026/` first. Run `setup.cjs` to generate a new latest.json and a new isolated destination; do not reuse this run's absolute paths or credentials. The copied `executed-main-load.cjs` preserves the precise main-load code used before the follow-up CLI options were added.

```powershell
# Optional overrides if the bundled defaults differ on your computer:
$env:AUDIT_PLAYWRIGHT_PATH = 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:AUDIT_CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

node load-tests/audit-2026/setup.cjs
node load-tests/audit-2026/server.cjs build
# Separate terminal, same repository directory:
node load-tests/audit-2026/server.cjs start

# Main terminal, sequentially, with no overlapping benchmark workloads:
node load-tests/audit-2026/api.cjs
node load-tests/audit-2026/profile.cjs
node load-tests/audit-2026/analyze-profile.cjs
node load-tests/audit-2026/browser.cjs
node load-tests/audit-2026/journeys.cjs
node load-tests/audit-2026/journeys-extra.cjs
node load-tests/audit-2026/live-session.cjs
node load-tests/audit-2026/availability-cache.cjs
node load-tests/audit-2026/concurrency.cjs
node load-tests/audit-2026/reset-growth.cjs
node -e 'require("./load-tests/audit-2026/common.cjs").seed(1000)'
node load-tests/audit-2026/load.cjs

# Follow-ups used in this run, after the main process completes:
node load-tests/audit-2026/load.cjs --repeat-baseline
node load-tests/audit-2026/load.cjs --bounded-arrival
node load-tests/audit-2026/auth.cjs

node load-tests/audit-2026/quality.cjs
# Stop the exact audit server PID recorded in start-process.json.
# Verify its command line is this localhost:3217 Next process before stopping it.
node load-tests/audit-2026/cleanup.cjs
node load-tests/audit-2026/report.cjs
node load-tests/audit-2026/finalize.cjs
```

`api.cjs` verifies PRAGMA database_list and records the initially empty table identities before its first synthetic write. The build child receives an allowlisted environment without the project's .env files. Actual isolation does not rely on the HTTP hostname. `cleanup.cjs` captures exact row identities, deletes only those absent from the empty-run baseline in the unique isolated file, and checks remaining rows, foreign keys, duplicate active slots and source hashes. Stop the server before cleanup so background work cannot recreate records.

During the main soak, a separate terminal ran `node load-tests/audit-2026/live-under-load.cjs`. This intentional active dashboard adds a small UI workload; its start/end timestamps are saved. The final script waits for the UI's Live indicator and asserts that Table view is active. Earlier direct early-click attempts are preserved as unresolved observations in calibration/. Browser traces can be opened with Playwright's trace viewer; HAR files contain the request waterfalls.

This run used two small sequencing helpers to avoid overlapping workloads: `repeat-after-load.cjs` waited for load-outcome.json, then ran the baseline repeat; `finish-load.cjs` waited for repeat-process-result.json, then ran bounded arrival and authentication. They do not schedule recurring work. Do not start those helpers in addition to the equivalent sequential commands above.

## Exact deviations and preserved failures

- The first production build failed on network-blocked Google Fonts. The second `node load-tests/audit-2026/server.cjs build` succeeded with network permission and reused partial cache. Its 18.56-second duration is not a clean-cache measurement.
- Initial API calibration left an auto-created patient after deleting its smoke appointment and assumed a nonexistent sessions GET endpoint. These assumptions were corrected. The original outputs are retained under calibration/. Exact cleanup was run with reset-growth.cjs, then `$env:AUDIT_REMEASURE='1'`, `node load-tests/audit-2026/api.cjs`, and `Remove-Item Env:AUDIT_REMEASURE`; this preserved the initial database and environment snapshot.
- Initial journey locators were corrected to current labels/routes and visible panels. `AUDIT_EXTRA_ONLY=1` was used for the admin-only corrective run of journeys-extra.cjs; the final patient-history/live-session run is recorded separately. The exact failure messages remain in journey-failures.jsonl and calibration evidence. One-off booking/UI writes are not statistical p95 estimates.
- A roughly 51-minute host/runner sampling gap invalidated the original baseline and first five-user hold. Its cause is unverified. The generator resumed, and later stages were measured normally. The repeat-baseline option reran 1 VU for 120 seconds, 15-second warmup, and 5 VUs for 180 seconds, with current fixture growth documented. Invalid observations remain visible and excluded from capacity.
- The 200-VU stress stopped after the p99 safety threshold persisted. The spike and original 50/100 requests/s arrival escalation were not executed. The bounded follow-up offers 10 and 20 requests/s with at most 50 in flight, below the earlier stable envelope, and records scheduler misses and capacity drops.
- Authentication was remeasured with auth.cjs because the initial helper used summed sequential request times as its elapsed denominator. The final authentication.json uses actual loop wall time; the original is retained in calibration/authentication-summed-latencies.json.

## Configuration and interpretation

The default workload weights are `[20,40,10,10,10,8,2]` in this order: homepage HTML, availability, complete appointments, complete patients/sessions, complete invoices, appointment-note update, public booking. Override with `AUDIT_MIX_JSON`, a JSON array of seven nonnegative integer weights totaling 100. This run used defaults: 60% public, 30% admin reads, 10% writes. These proportions are assumptions, not observed production analytics.

Think time is uniform 1–3 seconds with deterministic seed 9282026; logins occur once per VU and are excluded from steady load. Fixed benchmark IP per VU represents independent users; no per-request IP rotation. Every booking uses a new synthetic patient phone. Request timeout is 15 seconds. Rolling safety rules: unexpected failures >5% for 30 seconds, empirical rolling p99 >5 seconds for 60 seconds, or free RAM below 500 MiB. Rate limits and app code remain unchanged.

All phase throughput uses completed operations divided by actual wall time, including draining. Arrival offers use their scheduled window and expose both capacity drops and scheduler misses. p90 requires 50 samples, p95 100, p99 1,000; smaller samples show median/max. Browser primary profiles have five repetitions each and report median/range. No confidence interval, real-user percentile, deployment maximum or server/OS cold-cache claim is implied.

First browser contexts are cache-cold, returning warm contexts preserve browser cache and splash session state. One-sample returning-cold diagnostics clear browser cache while retaining session state. Primary measurements are otherwise warm-server/SQLite-cache measurements. The first /api/health observation includes initial local DB initialization; it is not an established platform cold start. SQL instrumentation and CPU sampling run in a separate diagnostic process on port 3218.

The private-config.json, sandbox and SQLite files are ignored local artifacts. The report, scripts, manifests, samples, HARs, traces and screenshots are the evidence bundle. Traces may contain synthetic names, generated test cookies and generated test login values; no real patient dataset or production credentials were copied into the sandbox.

Optional plotting source `charts.py` is included, but the bundled Python lacked matplotlib in this run. The plotting attempt and limitation are recorded in chart-rendering.json. No missing chart image is linked as evidence; the report uses numerical comparison tables. Installing a plotting package is not necessary to reproduce the measurements.
