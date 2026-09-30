const C=require('./common.cjs');const {fs,path,out}=C;
const read=(n,fallback=null)=>{try{return JSON.parse(fs.readFileSync(path.join(out,n),'utf8'))}catch{return fallback}};
const jsonl=n=>{try{return fs.readFileSync(path.join(out,n),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)}catch{return[]}};
const round=(v,n=1)=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(n):'—';
const median=a=>{const x=a.filter(v=>typeof v==='number').sort((a,b)=>a-b);return x.length?(x[Math.floor((x.length-1)/2)]+x[Math.floor(x.length/2)])/2:null};
const range=a=>`${round(Math.min(...a))}–${round(Math.max(...a))}`;
const env=read('environment.json'),api=read('api-summary.json',[]),browser=read('browser-summary.json',[]),load=read('load-summary.json',[]),outcome=read('load-outcome.json'),cleanup=read('cleanup-verification.json'),concurrency=read('concurrency.json'),profile=read('profile-analysis.json'),auth=read('authentication.json'),journeys=jsonl('journey-samples.jsonl'),journeyFailures=jsonl('journey-failures.jsonl');
const interruption=read('execution-interruption.json'),live=read('live-session.json'),availabilityCache=read('availability-cache.json'),supplement=read('supplemental-journeys.json');
const quality=read('load-quality.json',{phases:[],sse:{}}),underLoad=read('live-under-load.json'),arrivalOutcome=read('arrival-outcome.json');
const phaseQuality=name=>quality.phases.find(r=>r.phase===name);
const phaseVerdict=r=>interruption?.invalidPhases.includes(r.phase)?'INVALID: host/runner interruption':r.stopReason?'STOPPED: '+r.stopReason:!phaseQuality(r.phase)?'Awaiting final validation':!phaseQuality(r.phase).valid?'INVALID measurement':phaseQuality(r.phase).eligibleForCapacity?'PASS backend budgets in this window':phaseQuality(r.phase).latencyBudgetsMet?'FAIL completion/errors':'FAIL latency';
const browserGroups=Object.entries(Object.groupBy(browser,r=>r.profile.name+' / '+r.visit));
const browserTable=browserGroups.map(([key,rows])=>`| ${key} | ${rows.length} | ${round(median(rows.map(r=>r.ttfb)))} | ${round(median(rows.map(r=>r.fcp)))} | ${round(median(rows.map(r=>r.lcp)))} (${range(rows.map(r=>r.lcp))}) | ${round(median(rows.map(r=>r.usefulAt)))} | ${round(median(rows.map(r=>r.primaryUsableMs)))} (${range(rows.map(r=>r.primaryUsableMs))}) | ${round(Math.max(...rows.map(r=>r.cls)),5)} | ${rows.every(r=>r.lcp<=2500)?'LCP met':'LCP missed'} / ${rows.every(r=>r.cls<=.1)?'CLS met':'CLS missed'} |`).join('\n');
const apiTable=api.map(r=>`| ${r.size} | ${r.name} | ${r.n} | ${round(r.p50)} | ${round(r.p90)} | ${round(r.p95)} | ${round(r.p99)} | ${round(r.max)} | ${round(r.rps,2)} / ${round(r.businessRps,2)} | ${round(r.meanBytes/1024)} | ${r.unexpected}/${r.throttled}/${r.conflicts} | ${r.unexpected?'FAIL':r.p95===null?'Small sample; no p95 verdict':r.p95<=(r.name==='analytics'?2000:500)?'PASS':'FAIL latency'} |`).join('\n');
const loadTable=load.map(r=>`| ${r.phase} | ${r.vus??'arrival'} | ${round(r.elapsedSeconds)} | ${r.n} | ${round(r.p50)} | ${round(r.p95)} | ${round(r.p99)} | ${round(r.max)} | ${round(r.rps,2)} / ${round(r.businessRps,2)} | ${r.unexpected}/${r.throttled}/${r.conflicts} | ${r.dropped??0} | ${phaseVerdict(r)} |`).join('\n');
const journeyTable=Object.entries(Object.groupBy(journeys,r=>r.name)).map(([name,rows])=>`| ${name} | ${rows.length} | ${round(median(rows.map(r=>r.ms)))} | ${range(rows.map(r=>r.ms))} | ${rows.every(r=>r.ok)?'Executed / validated':'Failed'} |`).join('\n');
const resources=jsonl('server-resources.jsonl'),gen=jsonl('generator-resources.jsonl');
const max=(rows,k)=>rows.length?Math.max(...rows.map(r=>r[k])):null;
const costs=browser.filter(r=>r.visit==='first-cold');
const costTable=Object.entries(Object.groupBy(costs,r=>r.profile.name)).map(([name,rr])=>`| ${name} | ${rr.length} | ${round(median(rr.map(r=>r.jsEncodedBytes/1024)))} | ${round(median(rr.map(r=>r.jsTransferBytes/1024)))} | ${round(median(rr.map(r=>r.scriptDurationSeconds*1000)))} | ${round(median(rr.map(r=>r.longTasks)),0)} | ${round(median(rr.map(r=>r.blockingMs)))} | ${round(Math.max(...rr.map(r=>r.maxLongTask)))} | ${Math.max(...rr.map(r=>r.errors))} |`).join('\n');
const resourceTable=quality.phases.filter(r=>r.valid&&!r.phase.startsWith('warmup')).map(r=>`| ${r.phase} | ${round(r.server.rssStart/2**20)} → ${round(r.server.rssEnd/2**20)} / ${round(r.server.rssMax/2**20)} | ${round(r.server.cpuP50)} / ${round(r.server.cpuP95)} | ${round(r.server.eventLoopP99Max)} | ${round(r.server.gcTotalMs)} | ${round(r.generator.cpuP50)} / ${round(r.generator.cpuP95)} | ${round(r.generator.eventLoopMax)} |`).join('\n');
const opTable=quality.phases.filter(r=>r.valid&&!r.phase.startsWith('warmup')&&r.phase!=='load-smoke').flatMap(r=>Object.entries(r.perOperation).map(([name,v])=>`| ${r.phase} | ${name} | ${v.n} | ${v.metric} | ${round(v.ms)} | ${v.budgetMs} | ${v.pass?'PASS':'FAIL'} |`)).join('\n');
const arrivalTable=quality.phases.filter(r=>r.arrival).map(r=>{const s=load.find(s=>s.phase===r.phase);return`| ${r.phase} | ${s.offeredRps} | ${r.arrival.targetIterations} | ${r.arrival.actuallyOffered} | ${r.arrival.completed} | ${r.arrival.capacityDropped} | ${r.arrival.schedulerMissed} | ${round(s.businessRps,2)} | ${s.peakInflight}/${s.maxInflight} | ${round(s.schedulerLagP95Ms)} |`;}).join('\n');
const eligible=load.filter(s=>phaseQuality(s.phase)?.eligibleForCapacity&&/^(sustained|stress)-/.test(s.phase)),highest=eligible.sort((a,b)=>b.vus-a.vus)[0];
const soak=load.find(s=>s.phase.startsWith('soak-')),soakQuality=soak?phaseQuality(soak.phase):null;
const browserRaw=jsonl('browser-samples.jsonl');
const resourceCosts=browserRaw.map(r=>({label:r.label,maxFrameStallMs:Math.max(0,...r.stalls.map(x=>x.duration)),imageEncodedBytes:r.resources.filter(x=>x.initiatorType==='img'||x.name.includes('/_next/image')).reduce((a,x)=>a+x.encodedBodySize,0),fontEncodedBytes:r.resources.filter(x=>/\.(woff2?|ttf)(\?|$)/.test(x.name)).reduce((a,x)=>a+x.encodedBodySize,0),nonAbortRequestFailures:r.failedRequests.filter(x=>!String(x.error).includes('ERR_ABORTED')),consoleErrors:r.consoleErrors}));
C.write('browser-resource-costs.json',resourceCosts);
const report=`# Kiné performance audit — ${C.runId}

${cleanup?'Execution complete; see explicitly unexecuted items and limits below.':'AUDIT IN PROGRESS — these are provisional results.'}

## 1. Verdict

Kiné's ordinary first visit is visibly delayed by the splash and animations. Returning visits are substantially faster. Local availability and paginated admin APIs are fast at the tested dataset sizes. The dashboard loads complete patient/session, appointment and invoice datasets, causing growing response sizes and client work. All-time analytics at 10,000 records misses its 2-second p95 budget; CPU profiling identifies repeated Lisbon date formatter construction as the dominant measured cause. A separately reproduced booking UI defect retains stale selectable availability after another user books a slot. The database prevents duplicates, but overall UX acceptance fails.

These are **local production-build + isolated SQLite** results, not production Turso/CDN capacity or field INP. No application behavior was changed and no deployment was performed.

## 2. Environment, isolation and reproducibility

- Commit: \`${env?.commit}\`. Original pre-audit status had untracked \`output/\` and \`tmp/\`; auditor additions are confined to \`load-tests/audit-2026/\` and \`performance-results/\`.
- Node ${env?.runtime}; Next ${env?.versions.next}; React ${env?.versions.react}; better-sqlite3 ${env?.versions['better-sqlite3']}; libSQL client ${env?.versions['@libsql/client']}; bcryptjs ${env?.versions.bcryptjs}. SQLite engine and database path: [sqlite-environment.json](sqlite-environment.json).
- ${env?.hardware.cpu}; ${env?.hardware.logicalCpus} logical processors; ${round(env?.hardware.totalMemory/2**30)} GiB RAM; ${env?.hardware.os} ${env?.hardware.release}. Shared desktop machine; background OS/app activity was not controlled. Load generator and server share this host.
- Existing application environment selects remote Turso/libSQL (${env?.configuredDatabase.hostname}). It was not queried or mutated. Audit server uses the exact fresh SQLite file recorded by PRAGMA database_list, with TURSO_DATABASE_URL empty and ALLOW_SQLITE_FALLBACK=true. Localhost alone was not used as evidence of isolation.
- All app code/public assets were copied into the result directory without .env files, data or .next. Source hashes: [environment.json](environment.json). New synthetic admin/owner/session credentials only. SMTP credentials, WhatsApp token, analytics IDs and reCAPTCHA keys absent. No messaging links/buttons were clicked. The app's existing human-fallback booking contract was used with valid timing and empty honeypot; rate limits stayed enabled.
- Production build succeeded in ${round(read('build-result.json')?.durationMs/1000,2)} s after an initial network-blocked Google Fonts download failed. The retry reused partial build cache; this is **not a clean-cache build benchmark**. Logs: [build.log](build.log). Production server reports ready in 185 ms; no platform/serverless cold-start claim.
- HTTP loopback, port 3217, no CDN/proxy network or TLS latency. Production caching configuration is retained; actual API responses are no-store. Public pages are dynamically rendered because they read language state. Next image/font assets are local; the first image optimization/cache state was not independently reset between repetitions.
- Browser and throttling details: [browser-environment.json](browser-environment.json). Normal network is unthrottled loopback. Constrained network is 150 ms artificial latency, 200,000 B/s download, 93,750 B/s upload. Mobile viewport 390×844/DPR2; desktop 1440×900/DPR1. CPU slowdown 4× via CDP in its explicitly named condition.
- Run commands: [reproduction.md](reproduction.md); harness: [scripts/README.md](scripts/README.md). The ignored sandbox, DB and generated credential file are local execution artifacts. The saved scripts plus source commit recreate the experiment.
- Inspected route/authentication/rate-limit, caching and hosting evidence: [environment-contracts.md](environment-contracts.md). No hosting control-plane configuration was fetched; source references to Vercel/Cloudflare do not establish the deployed topology.

## 3. Test-harness audit

The historical runner was **not executed**. Its findings were treated as historical claims.

| Defect | Evidence and consequence |
|---|---|
| Database mismatch / destructive setup | load-tests/run-suite.mjs hardcodes data/ryma.db, but .env.local selects Turso; it deletes every appointment in its contested slot before testing. |
| Burst described as sustained load | runLoadAndStressTest makes exactly one request per VU at each level. |
| Invalid combined throughput | Overall RPS divides by summed request latencies instead of elapsed wall time. |
| Unexecuted phases passed | metrics.spike.pass and metrics.endurance.pass are assigned true without phase execution. |
| Bad success criteria | 429 is excluded from load errors; security checks accept broad status sets without inspecting persistence/rendering. |
| Stale fixtures | September dates are past; kinesitherapie-generale is not an active public service slug. Current service reeducation-posturale is used by this audit. |
| Credentials and session modeling | Shared default admin password; k6 load/smoke logs in repeatedly rather than maintaining a realistic authenticated session. |
| Cleanup and failures | Broad LOADTEST-prefix cleanup, incomplete related-record cleanup, no HTTP timeout, catch logs fatal errors without reliably failing the process. |
| Misleading coverage | README advertises auth.js and appointments.js which are absent; k6 endurance holds only three minutes and uses a Sunday/past date with trivial availability. |

The replacement records raw samples, content assertions, database outcomes, exact phase wall time, unique run IDs, manifests and failed/rejected transactions. The initial calibration exposed two **new harness errors**, retained in calibration/: booking auto-created a patient after the smoke appointment was removed, and sessions were initially read from a nonexistent GET route. They were corrected: exact synthetic fixture cleanup, embedded sessions from the patients API, and stop-on-validation-failure. Calibration failures are not counted as platform failures or passed benchmarks. Final API tables use only the corrected run.

## 4. Browser experience

Times are milliseconds. Five independent contexts per primary first-visit/returning condition; median and full range, **not reliable tail percentiles**. Returning warm uses the same context/sessionStorage. The one-sample returning-cold diagnostic clears browser cache but preserves splash state. Server, OS and SQLite page caches are not forcibly evicted. First-load image optimization may affect the earliest repetition.

| Condition / visit | n | TTFB median | FCP median | observed LCP median (range) | Useful content median | Primary actionability median (range) | Max CLS sum | Target |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
${browserTable}

Useful-content time is the first visible viewport h1 after the splash overlay disappears. Actionability is Playwright's normal anchor visibility/stability/hit-target trial click; it is a laboratory usability proxy, not an event-handler hydration or field-INP measurement. Actual clicks and persisted visible booking are separately exercised below. LCP is observed through the explicit post-actionability observation window; later carousel changes are not measured. CLS observer sums non-input layout shifts within that window (a conservative window sum, not the Web Vitals session-window algorithm). Very small sums still meet the 0.1 target; no field percentile claim.

The app deliberately skips splash for HeadlessChrome/Lighthouse/PageSpeed/bots and reduced motion (src/components/ui/SplashScreen.tsx:149; src/app/layout.tsx:195). Normal tests supply an ordinary Chrome UA and no reduced motion; their splash presence is observed. Headless/reduced-motion controls are labeled separately. This is headless Chrome executing the **ordinary visitor branch**, not a claim that a headed physical phone was tested.

First-cold JavaScript and main-thread observations (five samples per row; medians except maximum task and error count):

| Condition | n | JS encoded KiB | JS transfer KiB | Script CPU ms | Long tasks | Sum of task time beyond 50 ms | Longest task ms | Console/page errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${costTable}

Script CPU is Chrome Performance.ScriptDuration. Blocking is excess above 50 ms across observed long tasks, not Lighthouse TBT. Frame stalls and image/font bytes are summarized in [browser-resource-costs.json](browser-resource-costs.json); individual request start/duration/transfer/cache timings remain in the raw resource entries and HAR files. No hydration exception was logged in these homepage samples. Early dashboard interaction behavior is separately discussed below.

Raw navigation/resource timings, long tasks, animation-frame stalls, event timing, JS transfer/cache sizes, console errors and failed requests: [browser-samples.jsonl](browser-samples.jsonl). Condensed metrics: [browser-summary.json](browser-summary.json). Waterfalls: *.har. Traces: *-trace.zip, view with Playwright trace viewer. Representative images: [desktop](desktop-normal-first-cold.png), [mobile constrained](mobile-constrained-first-cold.png), [mobile CPU4](mobile-constrained-cpu4-first-cold.png). Aborted requests at reload/context close must not be interpreted as server errors.


## 5. Real journeys

All times below are lab action/workflow completion times. Writes explicitly labeled persisted-visible include a read of the same isolated database and the UI confirmation. Other timings must not be substituted for persisted-visible write time. Human think time is absent from scripted end-to-end journeys. No networkidle waits were used with SSE.

| Journey/action | n | Median ms | Range ms | Status |
|---|---:|---:|---:|---|
${journeyTable}

Journey failures/limitations retained: ${journeyFailures.length?journeyFailures.map(f=>f.name+': '+f.error.replace(/\n/g,' ').slice(0,220)).join('; '):'None recorded by the journey harness at report generation.'}

Corrective follow-ups: language options use role=option; the SVG body explorer is on the homepage; historical appointments require Table view; retained hidden panels require visible-only locators. Successful corrected measurements remain in the table above. The initial extra journey script also hit an ambiguous Unlock Analytics locator and was corrected to the submit button. These harness failures are not application performance failures. [supplemental-journeys.json](supplemental-journeys.json) records subsequent completion. Its second-session timeout was a hidden-locator artifact: a final visible-only test received the real SSE payload and displayed the appointment in ${live?.visibleMs??'pending'} ms ([live-session.json](live-session.json), [live-session-trace.zip](live-session-trace.zip)). Patient History was opened and its seeded session content verified in that same final run.

The deployed body explorer uses AnatomicalSVGViewer (src/components/sections/BodyMap.tsx:429). BodyViewer3D has no callers in src; no runtime 3D performance result is claimed. SVG front/back interaction is the implemented path. Sessions load embedded in patient records; /api/admin/patients/[id]/sessions has POST/PATCH/DELETE but no GET.

During the 10-user soak, five additional admin-created appointments were checked in a real active dashboard after its Live indicator appeared. All were persisted and displayed, but the observed range was 531–3,755 ms, median 1,022 ms: this small-sample check **misses the 1-second write target**, without claiming p95. Evidence: [live-under-load.json](live-under-load.json), [trace](live-under-load-trace.zip), [image](live-under-load.png). The extra browser activity is intentionally part of the soak observation and is not included in the generator's operation counts. Seven supplementary appointments were created across successful and failed attempts. API SSE totals therefore include seven extra creates during this phase.

Three earlier attempts clicked controls immediately after DOMContentLoaded. The requested Table/Patient Records view did not remain active; in the two attempts that wrote, the real event reached the browser but Week view did not show a far-future appointment. The traces and screenshots are retained under calibration/live-under-load* and calibration/r2-*, calibration/r3-*. Waiting for the actual Live readiness indicator and checking Table's active state allowed the five completed observations. **The early-click problem is unresolved**: a hydration/readiness or initial-render race is a hypothesis, not a proven root cause. It is not counted as lost database data or missing SSE delivery.

The provisional 200 ms interaction target is missed by service detail navigation, language switching, several tab/open actions, and the first SVG change; some repeat filters and SVG changes meet it. These are action-to-verified-result lab timings, not field INP. Full multi-step mobile workflows were not repeated under every homepage profile.

## 6. API/database benchmarks and growth

Every growth fixture contains N patients, N historical completed appointments on valid non-Sunday unique slots, 3N linked sessions, and N linked paid invoices. Public write fixtures use future dates derived in Europe/Lisbon, valid 30-minute slots and current service slugs. No real patient dataset was copied. Exact seed counts/IDs: [dataset-manifests.jsonl](dataset-manifests.jsonl). Approximate workload representativeness is an assumption: one completed appointment and three session-history rows per patient are intentionally modest linked histories. Those three session rows share the parent appointment date/time, so this is not a rich longitudinal treatment history or a multi-session scheduling-density test. Foreign keys and the appointment-slot constraints were checked.

Sequential warm API samples; reported wall throughput is achieved by this sequential test, not capacity. Response sizes are uncompressed response bytes as consumed by Node fetch. p90 reported at n≥50, p95 at n≥100, p99 at n≥1,000. Smaller samples retain median/max. Status/content assertions prevent treating redirects, rejection or empty results as success. Errors column: unexpected/throttled/conflicts.

| Patients | Operation | n | p50 | p90 | p95 | p99 | max | req/s / business/s | KiB | Errors | Target |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${apiTable}

Authentication: ${auth?.summary.n} successful real logins; median ${round(auth?.summary.p50)} ms, range ${round(auth?.summary.min)}–${round(auth?.summary.max)} ms. A provisional 1-second login-response budget accommodates cost-12 bcrypt while keeping an interactive login tolerable; n=20 does not establish p95. Export budget: 5 seconds to a complete valid local CSV for up to 10,000 synthetic records (user initiated background-style download); n=20 per scale, so no p95 claim. Deployment bandwidth can materially change export duration. Final login measurements had 19/20 responses within the 1-second budget; the maximum was 1,026 ms. This is a small-sample observed miss, not an established p95 failure. All measured fixed-size export samples were below 5 seconds.

All-time analytics profiling was a separate run: [analytics.cpuprofile](analytics.cpuprofile), [profile-analysis.json](profile-analysis.json), [profile-sql.jsonl](profile-sql.jsonl). Each of five diagnostic requests executed five SQL queries. They show roughly 2.3–2.7 seconds total versus 18–49 ms actual SQLite execution. The dominant compiled function maps directly to getLisbonDateTime, constructing Intl.DateTimeFormat on every invocation; its self-time is about ${round((profile?.interpretation?.topSelfShareOfAllSamples||0)*100)}% of all sampled CPU time. This is direct profiling evidence, not a guess that all slow APIs are database-bound.

Query plans and 100 direct SQL timings per query: [query-plans.json](query-plans.json). Patient substring search scans the ordered index with leading-wildcard OR predicates; simple pages/slot/session lookups use relevant indexes. Patients are assembled with a bulk session query rather than an N+1 query per patient. SQL counts are captured only in the diagnostic profile, not for all primary requests. Remote libSQL round-trip, connection reuse, transaction lock-wait duration and Turso regional behavior are **unmeasured**. No lock-wait value is invented from absence of errors.


## 7. Controlled load, capacity and recovery

Load uses 1,000 seeded patients and the dashboard's actual unpaginated reads. The assumed mix is 60% public (20% HTML homepage, 40% availability), 30% authenticated admin reads (appointments/patients/invoices equally), 10% synthetic writes (8% appointment note updates, 2% public booking). Login occurs once per VU before measured stages. 1–3 second seeded think times. Fixed synthetic IP per VU represents separate users; no per-request IP rotation. A separate phone test confirms rate limiting, and actual 429s remain failures to complete a business transaction. Two authenticated SSE readers stay open during load.

Baseline 1 VU/120 s; sustained 5/10/25/50 VUs each 180 s after 15 s warmup; bounded 100/200 VU stress planned for 120 s each; 60-second recovery; soak 30 min at a demonstrated low stable level. Stress at 200 VUs stopped early under the rolling-latency safety rule. The planned 5→100 VU spike and original 50/100 requests/s arrival escalation were **not executed after that stop**. A separate bounded arrival follow-up offers 10 and 20 requests/s for 60 seconds each with a maximum of 50 in flight, below the previously observed stable throughput/concurrency. Actual execution and stops below take precedence over planned durations. [Configuration](load-configuration.json), [arrival follow-up](arrival-configuration.json).

| Phase | VUs | Actual wall s | n | p50 | p95 | p99 | max | req/s / business/s | Errors U/T/C | Dropped | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
${loadTable}

Outcome: ${outcome?JSON.stringify(outcome):'Pending.'} Sustainable capacity is restricted to measured successful throughput, per-operation latency targets, correctness and stable resources over the reported window. A short stress pass is not a 30-minute capacity proof; if maximum load still passes it is a tested lower bound, not an invented maximum. Per-operation distributions and offered/dropped arrival counts: [load-summary.json](load-summary.json); raw results: [load-samples.jsonl](load-samples.jsonl). Write verifiedMs includes database checking; raw ms is HTTP completion only. UI visibility is established separately by the browser workflows.

**Backend operating envelope:** ${highest?highest.vus+' VUs was the highest completed measured hold meeting per-operation backend latency and success budgets, at '+round(highest.businessRps,2)+' successful operations/s over '+round(highest.elapsedSeconds)+' seconds.':'Awaiting final phase validation.'} At 100 VUs the full appointment and patient list p95 values exceeded 500 ms, and homepage HTTP p95 exceeded the additional provisional 1-second budget. At 200 VUs mixed p95 was about 7.2 seconds; the run stopped after about 73 seconds. Recovery at 5 VUs completed with 148/148 successes and mixed p95 about 96 ms.

${soak?'The '+soak.vus+'-VU soak completed '+round(soak.elapsedSeconds)+' seconds with '+soak.successes+'/'+soak.n+' successes, '+round(soak.businessRps,2)+' successful operations/s, and mixed p95 '+round(soak.p95)+' ms. Backend phase-budget result: '+(soakQuality?.eligibleForCapacity?'PASS':'FAIL or pending validation')+'.':'The 30-minute soak is pending.'} This proves only the stated observation windows. **End-to-end sustainable capacity is not certified**: the stale public slot UI and slow/early dashboard interactions fail overall correctness/experience acceptance. Production Turso capacity remains unmeasured.

The repeated five-user hold had zero API failures, but its 87 homepage samples included a 1,595 ms maximum and its 44 patient-list samples a 517 ms maximum. Those exceed the deliberately conservative small-sample maximum checks; neither set establishes a reliable p95. The repeat also used the now-grown dataset and a different time window, so the result must not be read as a monotonic capacity curve.

Per-operation target decisions use verified completion p95 at n≥100 and maximum at smaller n. A small-n pass means no observed sample exceeded the target, not that p95 is established. Homepage HTTP has an additional provisional 1-second server-response budget; browser LCP and usability are evaluated independently.

| Phase | Operation | n | Decision metric | ms | Budget ms | Result |
|---|---|---:|---|---:|---:|---|
${opTable}

| Arrival phase | Offered target /s | Target iterations | Actually offered | Completed | In-flight-cap drops | Scheduler missed | Business/s including drain | Peak/max in flight | Scheduler lag p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${arrivalTable||'| Pending | — | — | — | — | — | — | — | — | — |'}

Arrival result: ${arrivalOutcome?JSON.stringify(arrivalOutcome):'Pending.'} Total unstarted is cap drops plus scheduler misses; offered rate, completed rate and request latency are kept separate to expose coordinated omission. [load-quality.json](load-quality.json) contains the machine-readable decisions, resource summaries and SSE event counts.

Execution interruption: ${interruption?interruption.observed+' '+interruption.cause+' '+interruption.resolution:'None recorded.'} See [execution-interruption.json](execution-interruption.json). Invalid phases are retained visibly, excluded from capacity, and never labeled pass. Sustained writes grow the dataset beyond the initial 1,000 patients/appointments; successful booking counts and response sizes quantify that growth. This is not a fixed-size memory-leak experiment. Initial load smoke and write/concurrency smoke passed; the separately identified public UI cache defect remains an overall acceptance failure.

Resource observations exclude invalid interruption phases from this table. CPU percentages are relative to **one logical core**, so 100% is one fully occupied core, not the whole eight-thread host. Event-loop column is the largest five-second-window p99; generator stall is the largest observed delay.

| Phase | Server RSS start→end / peak MiB | Server CPU p50/p95 % | Server loop p99 max ms | GC total ms | Generator CPU p50/p95 % | Generator stall max ms |
|---|---:|---:|---:|---:|---:|---:|
${resourceTable}

Soak server RSS slope was ${round(soakQuality?.server.rssSlopeMiBPerMinute,3)} MiB/min over the observed window. Interpret the endpoints, GC and trajectory together: allocations grow with added bookings, and a fitted slope is not a proof of a memory leak. Phase-specific trajectories: [server-resources.jsonl](server-resources.jsonl), [generator-resources.jsonl](generator-resources.jsonl). GC duration/count sampled every five seconds. Load-generator co-location and logging/JSON parsing may limit offered throughput; explicit scheduler/drop evidence must be checked before attributing all saturation to the platform. At stress the server and generator share CPU/memory, so this audit does not isolate a production service ceiling.

The aggregate soak budget pass does not erase outliers: maximum homepage HTTP time was 6.79 seconds, maximum five-second-window server loop p99 was 2.06 seconds, and generator delay briefly reached 1.84 seconds. These short stalls did not persist long enough to trigger the safety rule. Desktop activity and the intentional browser diagnostics remain confounders; causality is not attributed solely to the application.



## 8. Concurrency and correctness

${concurrency?Object.entries(concurrency).map(([k,v])=>'- '+k+': '+(v.passed===undefined?JSON.stringify(v):v.passed?'PASS':'FAIL')).join('\n'):'Pending.'}

Full statuses, persisted counts and payloads: [concurrency.json](concurrency.json). Contested submissions count 429 separately and require exactly one persisted active booking; idempotent retries require the replay header and one stored booking. Independent simultaneous field updates and post-cancellation availability are checked. At 50 VUs, each reader received all 434 write events; pooled delivery p95 was 20 ms. During soak, each received 865 generated writes plus seven supplementary browser writes (872 each), pooled delivery p95 23 ms. These are correlated copies of each event, not independent users or field latency samples. API-side SSE event delivery: [sse-load.jsonl](sse-load.jsonl); client rendering is a separate journey observation. No multi-instance/serverless broadcast claim can be made from a single local Node process.

**FAIL: public availability cache freshness.** Observed date ${availabilityCache?.date}, slot ${availabilityCache?.time}: the first browser saw it free; another session successfully booked it; after changing away and back, the original browser still enabled it (${availabilityCache?.afterOtherSessionBookingEnabled}), while the fresh API reported available=${availabilityCache?.authoritative?.available} and the active DB contained ${availabilityCache?.persisted} booking. Evidence: [availability-cache.json](availability-cache.json), [trace](availability-cache-trace.zip), [screenshot](availability-cache-after-other-booking.png). The early return from slotCacheRef.current[date] in src/app/rendez-vous/page.tsx:498 serves cached state without refreshing. This is a stale UI correctness failure; it is not a duplicate database booking.

## 9. Ranked bottlenecks and recommendations

| Rank | Measured bottleneck / impact | Recommended change (not applied) | Effort / confidence |
|---:|---|---|---|
| 1 | Splash/entrance gates ordinary first-visit access for seconds; audit-UA branch hides this wait. | Remove the mandatory blocking splash or make it nonblocking; measure ordinary visitor branch in CI. | 0.5–1 day / high. Exact improvement requires a new measurement. |
| 2 | Instant-looking cached slot selection is stale after another user books; customers can select a slot that the API correctly rejects. | Revalidate cached availability on revisit/focus and invalidate on conflict; keep the authoritative transaction guard. | 0.5–1 day / high, directly reproduced. |
| 3 | 10,000-record all-time analytics p95 ≈3.45 s and multi-second main-thread stalls. CPU dominated by formatter construction, SQL a small fraction. | Reuse one timezone formatter; convert each timestamp once; move bounded aggregation into SQL where useful. | 1–2 days / high for cause; performance gain unmeasured. |
| 4 | Dashboard prefetches full patient/session, appointment and invoice arrays. Patient payload alone ≈14 MB at 10,000 records. | Connect UI to existing pagination/search endpoints and load sessions on demand; avoid prefetching all datasets. | 2–4 days / high. Server payload reduction is supported by existing endpoint measurements; final UI benefit needs retest. |
| 5 | Mobile CPU/network constraints enlarge JavaScript/animation startup delay; long tasks and actionability data are retained in browser evidence. | Profile and defer noncritical motion/hero work; simplify entrance effects and lazy-load below-fold code. | 1–3 days / medium until change-specific trace. |

Estimated efforts are engineering estimates, not measured delivery commitments. No numerical improvement or production capacity is promised.

## 10. Cleanup and limitations

Cleanup ${cleanup?.passed?'PASS':'pending or requires inspection'}: [synthetic-record-manifest.json](synthetic-record-manifest.json) captures exact row identities before deletion; [cleanup-verification.json](cleanup-verification.json) records deleted/remaining counts, foreign-key/integrity checks and source hash comparison. Growth fixture resets also retain exact ID manifests. Only this run's records in its new isolated file are removed. No production cleanup command is run.

Unmeasured or limited: the 5→100 VU spike and original 50/100 requests/s arrival escalation after the safety stop; production Turso/network/CDN/serverless cold starts; real users/field INP; actual mobile hardware/GPU; headed-browser comparison; real external email/reCAPTCHA round trips; per-request production query tracing/lock waits; multiple server instances; long-term memory beyond the explicit soak window; broad dataset histories beyond the defined fixtures. Returning-cold browser diagnostics have n=1 per profile and may observe partial late resource completion; they are not a primary pass/fail dataset. Browser interaction samples are lab timings with small n. Historical reports are not promoted to current evidence.

Any journey failure above is unpassed until a separately recorded corrective rerun demonstrates completion. The companion supplemental journey file, if present, lists successful follow-ups without erasing original failures. The report never treats an unexecuted test as passed.

Steady-load reads validate status, shape and minimum expected fixture counts; they do not compare every returned field with a transactionally frozen database snapshot on every request. Each successful synthetic write is checked directly in the active isolated database. Fixed-size growth reads have exact expected counts and seeded-content checks. These validation boundaries are part of the workload definition.
`;
fs.writeFileSync(path.join(out,'REPORT.md'),report);console.log(path.join(out,'REPORT.md'));
