const C=require('./common.cjs');
const read=(name,fallback)=>{const file=C.path.join(C.out,name);return C.fs.existsSync(file)?JSON.parse(C.fs.readFileSync(file,'utf8')):fallback;};
const lines=name=>{const file=C.path.join(C.out,name);return C.fs.existsSync(file)?C.fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];};
const f=(v,n=1)=>Number.isFinite(v)?v.toFixed(n):'—';
const median=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
const range=values=>`${f(Math.min(...values))}–${f(Math.max(...values))}`;
const env=read('environment.json'),api=read('api-summary.json',[]),browser=read('browser-summary.json',[]),load=read('load-summary.json',[]),quality=read('load-quality.json',{phases:[],sse:{}}),outcome=read('load-outcome.json',{}),cleanup=read('cleanup-verification.json',{}),concurrency=read('concurrency.json',{}),regression=read('fixes-regression.json',{}),stale=read('availability-cache.json',{}),profile=read('profile-analysis.json',{}),live=read('live-under-load.json',{}),auth=read('authentication.json',{}),supplement=read('supplemental-journeys.json',{});
const oldDir=C.path.join(C.root,'performance-results/audit-2026-09-28T10-41-14-607Z');
const oldApi=C.fs.existsSync(C.path.join(oldDir,'api-summary.json'))?JSON.parse(C.fs.readFileSync(C.path.join(oldDir,'api-summary.json'))):[];
const analytic=api.find(x=>x.size===10000&&x.name==='analytics'),oldAnalytic=oldApi.find(x=>x.size===10000&&x.name==='analytics');
const patient=api.find(x=>x.size===10000&&x.name==='patients_directory'),oldPatient=api.find(x=>x.size===10000&&x.name==='patients_all');
const eligible=quality.phases.filter(x=>x.eligibleForCapacity&&/^(sustained|stress)-/.test(x.phase)).map(x=>Number(x.phase.split('-')[1]));
const capacity=eligible.length?Math.max(...eligible):null;
const groups=Object.entries(Object.groupBy(browser,x=>x.profile.name+' / '+x.visit));
const browserRows=groups.map(([name,rows])=>`| ${name} | ${rows.length} | ${f(median(rows.map(x=>x.ttfb)))} | ${f(median(rows.map(x=>x.fcp)))} | ${f(median(rows.map(x=>x.lcp)))} (${range(rows.map(x=>x.lcp))}) | ${f(median(rows.map(x=>x.usefulAt)))} | ${f(median(rows.map(x=>x.primaryUsableMs)))} (${range(rows.map(x=>x.primaryUsableMs))}) | ${f(Math.max(...rows.map(x=>x.cls)),5)} | ${rows.every(x=>x.lcp<=2500&&x.cls<=.1)?'PASS observed paint targets':'MISS observed paint targets'} |`).join('\n');
const apiRows=api.map(x=>`| ${x.size} | ${x.name} | ${x.n} | ${f(x.p50)} | ${f(x.p90)} | ${f(x.p95)} | ${f(x.p99)} | ${f(x.max)} | ${f(x.rps,2)} / ${f(x.businessRps,2)} | ${f(x.meanBytes/1024)} | ${x.unexpected}/${x.throttled}/${x.conflicts} | ${x.unexpected?'FAIL':x.p95===null?'Small sample':x.p95<=(x.name==='analytics'?2000:500)?'PASS':'MISS'} |`).join('\n');
const loadRows=load.map(x=>{const q=quality.phases.find(q=>q.phase===x.phase);return `| ${x.phase} | ${x.vus||x.offeredRps+' req/s'} | ${f(x.elapsedSeconds)} | ${x.n} | ${f(x.p50)} | ${f(x.p95)} | ${f(x.p99)} | ${f(x.rps,2)} / ${f(x.businessRps,2)} | ${x.unexpected}/${x.throttled}/${x.conflicts} | ${x.dropped??0} / ${x.schedulerMissed??0} | ${x.stopReason?'STOP: '+x.stopReason:!q?.valid?'INVALID/unverified':q.eligibleForCapacity?'PASS':'MISS budgets/completion'} |`;}).join('\n');
const resourceRows=quality.phases.filter(x=>!x.phase.startsWith('warmup')).map(x=>`| ${x.phase} | ${f(x.server.rssStart/2**20)} → ${f(x.server.rssEnd/2**20)} | ${f(x.server.rssMax/2**20)} | ${f(x.server.rssSlopeMiBPerMinute,3)} | ${f(x.server.cpuP95)} | ${f(x.server.eventLoopP99Max)} | ${f(x.generator.cpuP95)} | ${f(x.maxGeneratorSampleGapMs)} |`).join('\n');
const sseRows=Object.entries(quality.sse).map(([phase,x])=>`| ${phase} | ${x.expectedWrites} | ${x.session0} | ${x.session1} | ${f(x.p50DelayMs)} | ${f(x.p95DelayMs)} | ${f(x.maxDelayMs)} |`).join('\n');
const journeyRows=Object.entries(Object.groupBy(lines('journey-samples.jsonl'),x=>x.name)).map(([name,rows])=>`| ${name} | ${rows.length} | ${f(median(rows.map(x=>x.ms)))} | ${range(rows.map(x=>x.ms))} | ${rows.every(x=>x.ok)?'Validated':'FAIL'} | ${rows.every(x=>x.ms<=200)?'Within 200 ms':'Above 200 ms in at least one sample'} |`).join('\n');
const functional=read('booking-lifecycle.json',{checks:[]}).checks.length===2 && read('extended-regression.json',{checks:[]}).checks.length===6 && !!stale.correct && !regression.errors?.length && regression.checks?.length>0 && Object.values(concurrency).filter(x=>typeof x.passed==='boolean').every(x=>x.passed) && !supplement.failures?.length && !live.error && live.rows?.filter(x=>x.name.includes('persisted-visible')).length===5 && cleanup.passed;
const sourcePaths=['src/app/layout.tsx','src/components/sections/Hero.tsx','src/lib/validation.ts','src/lib/db.ts','src/app/rendez-vous/page.tsx','src/app/admin/page.tsx','src/components/admin/PatientNotesTab.tsx','src/components/admin/AppointmentsTab.tsx','src/components/admin/InvoicesTab.tsx'];
const text=`# Kiné performance fixes — production regression audit

Run: ${C.runId}. Baseline Git commit: ${env.commit}; tested changes are captured in [application.patch](application.patch) and SHA-256 source entries in [environment.json](environment.json). This is a local isolated production build, not a production deployment. Generated: ${new Date().toISOString()}.

## Verdict

Confirmed regression/correctness checks: **${functional?'PASS':'INCOMPLETE OR FAILED — inspect evidence'}**. Performance targets are evaluated separately below; functional success does not mean every latency target passes.

At 10,000 synthetic patients, all-time analytics p95 is **${f(analytic?.p95)} ms**, compared with **${f(oldAnalytic?.p95)} ms** in the September 28 audit. The revised patient directory returns **${f(patient?.meanBytes/1024)} KiB** for 10 records, compared with **${f(oldPatient?.meanBytes/1024)} KiB** from the complete legacy endpoint. These are decoded response bytes, not compressed wire bytes. Before/after observations are on the same host but different runs, not a randomized controlled comparison.

Highest eligible sustained/stress stage: **${capacity?capacity+' concurrent users':'not established'}**, using the revised paginated UI workload and the per-operation gates in [load-quality.json](load-quality.json). This is a tested operating point under the stated workload, not a universal maximum. Stress limits, safety stops and slower individual interactions remain visible below.

## Changes addressing the five findings

1. Removed the blocking startup splash and its user-agent bypass. Critical hero text/actions render visibly in server HTML; only needed hero images load initially.
2. Booking availability is fetched again when returning to a date, on focus, and every 30 seconds during date/time selection. Pending requests are aborted before the details/confirmation steps so they cannot erase a submitted selection. A focused competing-booking test verifies conflict recovery and stable confirmation. Obsolete requests are aborted; unavailable selections clear; conflicts refresh the slot list. Cross-session regression result: ${JSON.stringify(stale)}.
3. Reused the Lisbon Intl formatter and memoized repeated payment timestamp conversions within analytics requests. 1,006 deterministic formatter equivalence cases include midnight, year boundaries and both DST transitions. The five-request CPU/SQL diagnostic contains ${profile.requests?.map(x=>f(x.ms)).join(', ')||'no'} ms request timings. Query counts: ${profile.requests?.map(x=>x.queryCount).join(', ')||'unavailable'}; SQL totals: ${profile.requests?.map(x=>f(x.sqlMs)).join(', ')||'unavailable'} ms. Profile attribution is taken from actual samples, not the old report.
4. Appointment/invoice/patient lists now use server pagination. Calendar requests are bounded to a validated date range; global counts stay global. Patient sessions/history and remote modal/palette searches load on demand. Legacy-only patient notes remain searchable and are deduplicated against structured records. The old unpaginated API remains for compatibility and is still measured.
5. Corrected the URL/tab synchronization race, withheld interactive dashboard controls until mounted, and initialized live status as disconnected. SSE changes refetch the current query so off-page records cannot be blindly inserted. Five immediate real-click repetitions and repeated tab switches passed when recorded in [fixes-regression.json](fixes-regression.json).

Relevant source files: ${sourcePaths.map(p=>'['+p+'](../../'+p+')').join(', ')}.

## Environment and reproducibility

Node ${env.runtime}; Next ${env.versions.next}; React ${env.versions.react}; SQLite adapter ${env.versions['better-sqlite3']}; libSQL client ${env.versions['@libsql/client']}; bcrypt ${env.versions.bcryptjs}. CPU ${env.hardware.cpu}, ${env.hardware.logicalCpus} logical processors, ${f(env.hardware.totalMemory/2**30,2)} GiB RAM; ${env.hardware.os}. Production build duration: **${f(read('build-result.json',{}).durationMs/1000)} seconds**, reported separately. The final build succeeded; a preliminary snapshot required a clean font-build cache after a failed restricted-network build.

The workspace is configured for remote Turso, but this run used only the isolated SQLite destination verified by PRAGMA database_list before writes. Test server and load generator share this Windows host over loopback HTTP, with no CDN. SMTP, WhatsApp, telemetry and reCAPTCHA credentials were absent. The existing public human-fallback booking contract was exercised without modifying rate limits. Authentication uses cost-12 bcrypt and real session cookies.

Exact commands and semantics: [README](scripts/README.md), [execution-sequence.jsonl](execution-sequence.jsonl), [environment](environment.json), [dataset manifests](dataset-manifests.jsonl), [load configuration](load-configuration.json), [browser configuration](browser-environment.json). Growth used 100/1,000/10,000 patients, one linked appointment/invoice and three sessions per patient. Session dates repeat by design to preserve the old fixture distribution; clinical schedule diversity is not established. Each run has a unique ID and exact synthetic record manifest.

The smoke initially left a synthetic legacy note, which the new combined directory correctly included. Its exact phone was removed and the incomplete preflight measurements archived before repeating growth. This final run starts from a fresh isolated database; see preflight-history.json. An initial browser measurement window could close before script loading finished after splash removal; those preliminary samples were archived in the preflight run, and this final browser run waits for document load and fonts before collecting execution/resources. Primary-action timing remains measured before that wait.

## Browser conditions and observed paint targets

All timings ms. Five repeats per primary profile/visit; one returning-cold sample. Normal loopback or CDP latency 150 ms, download 200,000 B/s, upload 93,750 B/s; CPU rate 1 or 4. Desktop 1440×900; mobile 390×844 at device scale 2. Normal visitor UA/no reduced motion is compared with headless and reduced-motion controls. No OS/server cache eviction is claimed. Returning-warm retains browser cache; returning-cold clears browser cache but preserves visit storage.

| Condition / visit | n | TTFB median | FCP median | LCP median (range) | Useful content median | Primary actionable median (range) | Max CLS | LCP ≤2500 / CLS ≤0.1 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
${browserRows}

Primary actionability is a Playwright trial click on the real booking anchor, not a claim of full hydration. The separate dashboard regression uses real immediate clicks. Metrics are lab observations, not field INP. CLS is a conservative sum of observed shifts rather than the session-window Web Vitals algorithm. Detailed script bytes, script execution duration, long tasks, stalls, console errors, failed requests and waterfalls are in [browser-summary.json](browser-summary.json), [browser-samples.jsonl](browser-samples.jsonl), HARs, screenshots and per-profile traces. Final observation waits for document load, font readiness and one additional second; it is not a complete lifetime page measurement.

## API and dataset growth

Sequential warmed requests after one validation warm-up at each scale. p90 requires n≥50, p95 n≥100, p99 n≥1,000. Reads target p95≤500 ms; analytics ≤2,000 ms. Exports use a separate 2,000 ms interactive budget and n=20 median/range, not p95. The complete-list benchmarks are compatibility/scaling diagnostics rather than the revised dashboard workload.

| Patients | Operation | n | p50 ms | p90 | p95 | p99 | Max | req/s / successful tx/s | Mean KiB | Error/throttle/conflict | Read budget |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${apiRows}

Authentication: n=${auth.summary?.n}, median ${f(auth.summary?.p50)} ms, range ${f(auth.summary?.min)}–${f(auth.summary?.max)} ms, ${f(auth.summary?.businessRps,2)} successful logins/s. Separate 1,000 ms interactive budget; all responses/cookies and a subsequent authenticated request are checked. Throughput is measured wall time, not the sum of individual request durations. Native query plans and direct timings: [query-plans.json](query-plans.json); CPU and SQL diagnostics: [profile-analysis.json](profile-analysis.json), analytics.cpuprofile, profile-sql.jsonl. Remote round trips, remote locks and Turso latency were not measured.

## Real workflows

Durations include the explicitly scripted action(s), waits and visible completion. Combined navigation or multi-action workflow timings are not browser input-event latency. Writes are checked against SQLite and visible UI. The 200 ms interaction goal is shown without hiding misses or reclassifying slow cases as passes.

| Workflow | n | Median ms | Range ms | Correctness | 200 ms observation |
|---|---:|---:|---:|---|---|
${journeyRows}

[Journey raw samples](journey-samples.jsonl), [supplemental journeys](supplemental-journeys.json), [immediate-click/search regressions](fixes-regression.json), [cross-session live update](live-session.json), [under-load browser verification](live-under-load.json). Public navigation, booking/service/date/time changes, confirmation, language switching, body explorer, login, searches, patient sessions, invoice search, analytics unlock, export, admin creation and another active session are exercised. The body explorer observed in this UI is SVG; no WebGL renderer benchmark is claimed.

## Load, capacity and recovery

Engineering workload assumption: 60% public, 30% authenticated admin reads, 10% synthetic writes, with 1–3 s think times. The revised read paths are paginated; raw capacity numbers are not directly interchangeable with the old full-list workload. Every write verifies persistence. Rate-limited/conflicting requests are reported separately. No login is performed per operation. Generator CPU, memory, event-loop delay and sample continuity are monitored independently.

| Phase | Users / arrival rate | Measured s | n | p50 ms | p95 | p99 | req/s / successful tx/s | Error/throttle/conflict | Dropped / scheduler missed | Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${loadRows}

Stop/outcome record: ${JSON.stringify(outcome)}. Arrival-rate runs retain offered counts, maximum in-flight work and scheduler lag. Per-operation budgets, exact phase completion, generator gaps, CPU/GC/event-loop measurements and RSS slopes are in [load-quality.json](load-quality.json). A combined fast percentile never overrides a slow individual operation. Resource stability is a measured window, not proof of leak-free behavior indefinitely.

| Phase | RSS start → end MiB | Peak RSS MiB | RSS slope MiB/min | Server CPU p95 % of one core | Max sampled event-loop p99 ms | Generator CPU p95 % | Max generator sample gap ms |
|---|---:|---:|---:|---:|---:|---:|---:|
${resourceRows}

| Phase | Generator writes | Session 0 events | Session 1 events | Median delivery ms | p95 delivery ms | Max delivery ms |
|---|---:|---:|---:|---:|---:|---:|
${sseRows}

SSE per-phase delivery includes background browser writes. Browser writes deliberately performed during the soak: ${live.extraSyntheticWrites??'unverified'}; their count is additional to load-generator writes and must be considered when comparing stream totals. Delivery deltas subtract wall-clock timestamps in separate processes; occasional negative values were observed, so these are approximate timestamp diagnostics, not precise transport latency. The browser's persisted-to-visible measurements use a monotonic timer. Stress/spike safety stops, if present, are capacity findings rather than data-integrity failures.

## Correctness and cleanup

Concurrency results: ${JSON.stringify(Object.fromEntries(Object.entries(concurrency).filter(([k])=>k!=='contested'&&k!=='distinct').map(([k,v])=>[k,v.passed??v])))}. Contested-slot outcomes: ${JSON.stringify(concurrency.contested?.counts)}; records persisted: ${concurrency.contested?.records}. Distinct-slot writes passed: ${concurrency.distinct?.passed}. All application rate limits remain enabled.

Cleanup verified: **${cleanup.passed?'PASS':'NOT VERIFIED'}**. [Synthetic record identities](synthetic-record-manifest.json) and [cleanup verification](cleanup-verification.json) record deletions, remaining rows, foreign keys, duplicate active slots, SQLite integrity and source hashes. The exact server process is stopped before cleanup. No production data was changed. Source hashes must match the source used to build the tested snapshot.

## Remaining limits and follow-up priorities

- Slow interaction/workflow samples above 200 ms remain explicit in the table. Profile those particular animations, first-use chunks and navigation/render work before further tuning (estimated 1–2 days; confidence depends on the trace). Do not infer field INP from these workflows.
- Any mobile paint misses or high CPU-throttle variability need representative device testing (estimated half a day). CDP throttling is a simulation; local loopback excludes production CDN and real network behavior.
- The combined legacy/structured patient directory trades extra SQL work for complete search coverage and bounded payloads. Its measured growth results should guide any later indexing or legacy-data migration (estimated 1–2 days; preserve clinical records).
- Full-list compatibility endpoints and exports still grow with dataset size. They are no longer fetched automatically by the dashboard. Remote Turso staging tests and export streaming are future work if their measured production costs justify it (estimated 1–2 days).
- Sustainable capacity is limited to the measured host, dataset and workload. Horizontal workers, remote database contention, production email/WhatsApp integrations, production CDN and real-user percentiles were not exercised. No production deployment or external messaging was performed.

Reproduction scripts and SHA-256 evidence manifest are archived with this report. Preliminary/failed calibration artifacts are retained separately and are not counted as final passing measurements. Execution interruptions: ${JSON.stringify(read('execution-interruption.json',null))}. Any interrupted browser samples are retained separately from the complete replacement matrix.

Browser request classification is retained in [browser-quality.json](browser-quality.json). Raw request-failure counts include canceled background RSC requests (ERR_ABORTED on _rsc URLs); captured HAR headers identify prefetch traffic. These are reported separately from other request failures, with real route navigation checked independently. Raw counts are cumulative within each context and must not be summed as unique failures.
`;
C.fs.writeFileSync(C.path.join(C.out,'REPORT.md'),text);
C.write('audit-verdict.json',{functional,capacity,analyticsP95Ms:analytic?.p95,browserPaintTargetsMet:browser.length>0&&browser.every(x=>x.lcp<=2500&&x.cls<=.1),allWorkflowSamplesWithin200ms:lines('journey-samples.jsonl').every(x=>x.ms<=200),cleanupPassed:cleanup.passed});
console.log(C.path.join(C.out,'REPORT.md'));
