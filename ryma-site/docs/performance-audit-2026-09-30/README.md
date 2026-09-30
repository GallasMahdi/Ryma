# Performance corrections and regression results — 2026-09-30

Tested run: `audit-2026-09-30T09-37-49-670Z`. Baseline: `8f3b9e2a5b4b8f1197053f40fe8cd27cd3d215f8`. Application source commit: `85dad8060ed1ddb12a87fd49e0b667ea402c04c3`.

The confirmed correctness regressions pass. This is an isolated local production-build audit using SQLite, synthetic patients and disabled notification credentials. It does not establish production Turso/CDN capacity or real-user INP. Full local traces, profiles, screenshots, manifests and cleanup evidence are retained in `performance-results/audit-2026-09-30T09-37-49-670Z/`; generated credentials and large artifacts are intentionally excluded from Git.

Changes remove the blocking splash, render primary hero content immediately, reuse Lisbon date formatting, paginate dashboard datasets, preserve global search/counts and legacy patient records, load clinical sessions on demand, fix the tab synchronization race, and revalidate booking availability without erasing the selection during submission. Invoice search results no longer reset an open form.

Production build and TypeScript checks passed. Tests include 1,006 timezone equivalence cases, exact API response validation at 100/1,000/10,000 patients, 66 browser samples, immediate real dashboard clicks, off-page searches and note saving, invoice modal search, calendar/page navigation, competing bookings, idempotency, rate limits, cross-session updates and a completed 30-minute soak. Cleanup and source hashes were verified.

At 10,000 patients, analytics p95 was **351.7 ms** (prior audit: about 3,454 ms). A 10-record patient directory response was **4754 decoded bytes**, replacing the dashboard's roughly 14 MB full-directory/session download. Before/after runs are not randomized comparisons; see all samples and variability.

| First visit, cold browser cache | n | Median LCP ms | Maximum LCP ms | Median primary actionability ms |
|---|---:|---:|---:|---:|
| desktop-normal | 5 | 352.0 | 972.0 | 566.9 |
| mobile-normal | 5 | 288.0 | 500.0 | 654.9 |
| mobile-constrained | 5 | 1664.0 | 1680.0 | 1710.0 |
| mobile-constrained-cpu4 | 5 | 1960.0 | 2016.0 | 3264.0 |
| headless-control | 5 | 280.0 | 316.0 | 560.7 |
| reduced-motion-control | 5 | 292.0 | 332.0 | 546.1 |

Mobile profile: 390×844, CDP latency 150 ms and 200,000 B/s down where constrained; CPU rate 4 where named. Actionability uses a trial click and is distinct from the real-click dashboard regressions. Paint target verdict across all 66 samples: **all observed LCP/CLS targets met**. Some measured navigation and multi-step workflow samples remain above the provisional 200 ms goal; no blanket interaction-latency pass is claimed.

| Load phase | Operations | Aggregate p95 ms | req/s | Errors/throttles/conflicts | Per-operation/completion verdict |
|---|---:|---:|---:|---:|---|
| baseline | 61 | — | 0.5 | 0/0/0 | Pass operation budgets |
| sustained-5 | 448 | 48.1 | 2.5 | 0/0/0 | Pass operation budgets |
| sustained-10 | 895 | 47.8 | 4.9 | 0/0/0 | Pass operation budgets |
| sustained-25 | 2230 | 52.1 | 12.2 | 0/0/0 | Pass operation budgets |
| sustained-50 | 4429 | 53.7 | 24.2 | 0/0/0 | Pass operation budgets |
| spike-before | 53 | — | 2.5 | 0/0/0 | Pass operation budgets |
| spike-peak | 2964 | 70.7 | 47.2 | 0/0/0 | Pass operation budgets |
| spike-recovery | 149 | 43.8 | 2.4 | 0/0/0 | Pass operation budgets |
| stress-100 | 5905 | 74.1 | 48.1 | 0/0/0 | Pass operation budgets |
| stress-200 | 11764 | 152.4 | 95.9 | 0/0/0 | Pass operation budgets |
| recovery | 148 | 53.2 | 2.4 | 0/0/0 | Pass operation budgets |
| arrival-50 | 3000 | 48.1 | 50.0 | 0/0/0 | Pass operation budgets |
| arrival-100 | 6000 | 69.1 | 100.0 | 0/0/0 | Pass operation budgets |
| soak-10 | 8837 | 52.2 | 4.9 | 0/0/0 | Pass operation budgets |

Highest completed sustained/stress stage meeting recorded per-operation gates: **200 VUs**. This is a measured point for the documented workload, not an unlimited capacity claim. The revised workload uses paginated reads, so compare it with the prior unpaginated workload accordingly. Latency, hold completion, RSS/CPU/event-loop behavior, generator continuity and SSE counts are retained in [load-quality.json](load-quality.json). Stress safety stops and latency misses are explicit.

Warm-up stages that exceeded at least one operation budget: warmup-100, warmup-200. At the highest eligible stress stage, server CPU p95 was 93.8% of one core; passing latency budgets does not imply spare capacity beyond that tested point.

SSE timestamp deltas use separate-process wall clocks and include occasional negative values; treat them as approximate diagnostics. The persisted-to-visible browser timings use a monotonic timer.

- [API/growth results](api-summary.json)
- [Browser results](browser-summary.json)
- [Browser request classification](browser-quality.json): canceled background RSC requests remain in the raw counts and are distinguished from navigation/resource failures.
- [Load results](load-summary.json)
- [Correctness and cleanup summary](correctness-summary.json)
- [Reproduction instructions](../../load-tests/audit-2026/README.md)

Only code, reproducible harness scripts and compact non-secret results are published. No production deployment was performed by this audit.

Execution interruption record: {"archive":"interrupted-browser-system-sleep","reason":"Windows System log confirms Button or Lid sleep at 09:50:43Z and resume at 09:54:23Z. Incomplete browser matrix excluded and retained in interrupted-browser-system-sleep. API and correctness stages completed before sleep. Full browser matrix rerun on identical application source.","invalidPhases":[]}.
