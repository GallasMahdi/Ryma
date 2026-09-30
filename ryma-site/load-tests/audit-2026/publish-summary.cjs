const C=require('./common.cjs');
const read=name=>JSON.parse(C.fs.readFileSync(C.path.join(C.out,name),'utf8'));
const verdict=read('audit-verdict.json'),complete=read('audit-completion.json');
if(!verdict.functional||!complete.cleanupPassed)throw Error('Do not publish an incomplete audit');
const api=read('api-summary.json'),browser=read('browser-summary.json'),load=read('load-summary.json'),quality=read('load-quality.json');
const dest=C.path.join(C.root,'docs/performance-audit-2026-09-30');C.fs.mkdirSync(dest,{recursive:true});
for(const name of ['api-summary.json','browser-summary.json','browser-quality.json','load-summary.json','load-quality.json'])C.fs.copyFileSync(C.path.join(C.out,name),C.path.join(dest,name));
const concurrency=read('concurrency.json');
const correctness={runId:C.runId,baselineCommit:read('environment.json').commit,sourceCommit:process.env.AUDIT_SOURCE_COMMIT||null,productionDatabaseAccess:false,productionDeploymentPerformed:false,cleanupPassed:complete.cleanupPassed,sourceUnchangedSinceTestBuild:complete.sourceUnchangedSinceTestBuild,regressions:read('fixes-regression.json').checks,extended:read('extended-regression.json').checks,bookingLifecycle:read('booking-lifecycle.json').checks,staleAvailabilityFixed:read('availability-cache.json').correct,concurrency:Object.fromEntries(Object.entries(concurrency).filter(([,v])=>typeof v.passed==='boolean').map(([k,v])=>[k,v.passed])),contestedSlot:{outcomes:concurrency.contested.counts,persisted:concurrency.contested.records},liveUnderLoad:read('live-under-load.json').rows,verdict};
C.fs.writeFileSync(C.path.join(dest,'correctness-summary.json'),JSON.stringify(correctness,null,2)+'\n');
const f=v=>Number.isFinite(v)?v.toFixed(1):'—';const median=values=>{const a=values.sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
const a=api.find(x=>x.size===10000&&x.name==='analytics'),p=api.find(x=>x.size===10000&&x.name==='patients_directory');
const browserTable=Object.entries(Object.groupBy(browser.filter(x=>x.visit==='first-cold'),x=>x.profile.name)).map(([name,rows])=>`| ${name} | ${rows.length} | ${f(median(rows.map(x=>x.lcp)))} | ${f(Math.max(...rows.map(x=>x.lcp)))} | ${f(median(rows.map(x=>x.primaryUsableMs)))} |`).join('\n');
const loadTable=load.filter(x=>!/warmup|smoke|spike-ramp/.test(x.phase)).map(x=>{const q=quality.phases.find(q=>q.phase===x.phase);return `| ${x.phase} | ${x.n} | ${f(x.p95)} | ${f(x.rps)} | ${x.unexpected}/${x.throttled}/${x.conflicts} | ${q?.eligibleForCapacity?'Pass operation budgets':x.stopReason||'See per-operation results'} |`;}).join('\n');
C.fs.writeFileSync(C.path.join(dest,'README.md'),`# Performance corrections and regression results — 2026-09-30

Tested run: \`${C.runId}\`. Baseline: \`${correctness.baselineCommit}\`. Application source commit: \`${correctness.sourceCommit||'see commit history'}\`.

The confirmed correctness regressions pass. This is an isolated local production-build audit using SQLite, synthetic patients and disabled notification credentials. It does not establish production Turso/CDN capacity or real-user INP. Full local traces, profiles, screenshots, manifests and cleanup evidence are retained in \`performance-results/${C.runId}/\`; generated credentials and large artifacts are intentionally excluded from Git.

Changes remove the blocking splash, render primary hero content immediately, reuse Lisbon date formatting, paginate dashboard datasets, preserve global search/counts and legacy patient records, load clinical sessions on demand, fix the tab synchronization race, and revalidate booking availability without erasing the selection during submission. Invoice search results no longer reset an open form.

Production build and TypeScript checks passed. Tests include 1,006 timezone equivalence cases, exact API response validation at 100/1,000/10,000 patients, 66 browser samples, immediate real dashboard clicks, off-page searches and note saving, invoice modal search, calendar/page navigation, competing bookings, idempotency, rate limits, cross-session updates and a completed 30-minute soak. Cleanup and source hashes were verified.

At 10,000 patients, analytics p95 was **${f(a.p95)} ms** (prior audit: about 3,454 ms). A 10-record patient directory response was **${p.meanBytes} decoded bytes**, replacing the dashboard's roughly 14 MB full-directory/session download. Before/after runs are not randomized comparisons; see all samples and variability.

| First visit, cold browser cache | n | Median LCP ms | Maximum LCP ms | Median primary actionability ms |
|---|---:|---:|---:|---:|
${browserTable}

Mobile profile: 390×844, CDP latency 150 ms and 200,000 B/s down where constrained; CPU rate 4 where named. Actionability uses a trial click and is distinct from the real-click dashboard regressions. Paint target verdict across all 66 samples: **${verdict.browserPaintTargetsMet?'all observed LCP/CLS targets met':'some observed paint targets missed'}**. Some measured navigation and multi-step workflow samples remain above the provisional 200 ms goal; no blanket interaction-latency pass is claimed.

| Load phase | Operations | Aggregate p95 ms | req/s | Errors/throttles/conflicts | Per-operation/completion verdict |
|---|---:|---:|---:|---:|---|
${loadTable}

Highest completed sustained/stress stage meeting recorded per-operation gates: **${verdict.capacity??'not established'} VUs**. This is a measured point for the documented workload, not an unlimited capacity claim. The revised workload uses paginated reads, so compare it with the prior unpaginated workload accordingly. Latency, hold completion, RSS/CPU/event-loop behavior, generator continuity and SSE counts are retained in [load-quality.json](load-quality.json). Stress safety stops and latency misses are explicit.

Warm-up stages that exceeded at least one operation budget: ${quality.phases.filter(x=>x.phase.startsWith('warmup-')&&!x.latencyBudgetsMet).map(x=>x.phase).join(', ')||'none'}. At the highest eligible stress stage, server CPU p95 was ${f(quality.phases.find(x=>x.phase==='stress-'+verdict.capacity)?.server.cpuP95)}% of one core; passing latency budgets does not imply spare capacity beyond that tested point.

SSE timestamp deltas use separate-process wall clocks and include occasional negative values; treat them as approximate diagnostics. The persisted-to-visible browser timings use a monotonic timer.

- [API/growth results](api-summary.json)
- [Browser results](browser-summary.json)
- [Browser request classification](browser-quality.json): canceled background RSC requests remain in the raw counts and are distinguished from navigation/resource failures.
- [Load results](load-summary.json)
- [Correctness and cleanup summary](correctness-summary.json)
- [Reproduction instructions](../../load-tests/audit-2026/README.md)

Only code, reproducible harness scripts and compact non-secret results are published. No production deployment was performed by this audit.

Execution interruption record: ${JSON.stringify(C.fs.existsSync(C.path.join(C.out,'execution-interruption.json'))?read('execution-interruption.json'):null)}.
`);
console.log(dest);
