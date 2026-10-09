// Enumerate source handlers; optional anonymous authorization probes are loopback-only.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),api=path.join(root,'src/app/api');
const output=path.join(root,'docs/production-audit-2026-10-09');
const descriptions={
 '/api/appointments':'Public booking: production CAPTCHA, IP and phone quotas, validated contact/service/date, atomic capacity and idempotency; mail runs after response.',
 '/api/contact':'Validated contact mail: 16 KiB streamed body cap, 5/IP/hour, production CAPTCHA; 200 only after SMTP acceptance; 503 on delivery failure.',
 '/api/health':'Read/write database readiness; concurrent probes share a 5-second result. 503 on unavailable/non-writable storage; errors redacted.',
 '/api/practitioners':'Public active practitioner/service projection; live database read, no-store.',
 '/api/reviews':'GET approved reviews only (default/max 100), independent global rating/count; POST pending moderated submission, 5/IP/hour, honeypot. No CAPTCHA on reviews.',
 '/api/slots':'Live capacity by validated date/service/practitioner; no-store. Repeated scheduling reads should be profiled against the target database.',
 '/api/treatments':'Published database catalogue only; no-store; 503 on dependency failure.',
 '/api/whatsapp/jobs':'Bearer job secret; requires configured integration; processes durable inbox/outbox. External scheduler must POST every minute.',
 '/api/whatsapp/webhook':'GET token challenge; POST app-secret HMAC verification, 64 KiB limit and durable enqueue before acknowledgment. Provider integration still needs staging verification.',
 '/api/admin/analytics':'Owner step-up required. Filtered financial and operational aggregates; no-store.',
 '/api/admin/analytics/lock':'Revokes owner step-up grant for current admin session.',
 '/api/admin/analytics/password':'Owner step-up and current-password check; atomic password-change quota; updates stored owner hash.',
 '/api/admin/analytics/verify':'Admin session plus owner password; atomic attempt quota; expiring server-side step-up grant.',
 '/api/admin/appointments':'Filtered lists, bounded page/limit mode and summary mode; legacy no-page mode remains unbounded. POST validates and atomically books.',
 '/api/admin/appointments/[id]':'Single appointment read, validated reschedule/status changes and deletion; conflict protection preserves capacity.',
 '/api/admin/appointments/multiple':'Atomic multi-session booking, validates proposal and conflicts; idempotent retry support.',
 '/api/admin/appointments/multiple/preview':'Validated multi-session capacity proposal; response previews availability without final commitment.',
 '/api/admin/events':'Authenticated SSE; checks session revocation and durable booking revision. Cleans up on disconnect/errors; reverse proxy buffering must be off.',
 '/api/admin/export':'Owner-only CSV/full JSON backup export with spreadsheet-formula escaping and cross-site download guard; bulk in-memory export, needs large-dataset testing.',
 '/api/admin/invoices':'Paginated/filterable invoices and validated creation. Owner-only aggregate totals; legacy no-page mode unbounded.',
 '/api/admin/invoices/sessions':'Create an internal document for 1–100 completed visits of one patient; 64 KiB body cap, exact-cent totals, VAT validation, saved price snapshots, stable idempotency key and atomic duplicate-billing guards.',
 '/api/admin/invoices/[id]':'Admin read/update; deletion requires owner step-up; amount/revision and dependency validation.',
 '/api/admin/invoices/export':'Owner-only filtered billing CSV with formula escaping and cross-site download guard; buffered bulk export.',
 '/api/admin/login':'Password login with atomic 10/IP/15-minute production quota, bcrypt and secure signed session; shipped defaults rejected.',
 '/api/admin/logout':'Clears cookie and persists revocation; anonymous logout is idempotently successful; 503 if authenticated revocation fails.',
 '/api/admin/me':'Admin status plus record counts; backup/no-show details cached for 60 seconds per process; no-store HTTP.',
 '/api/admin/patients':'Patient detail/directory/search and validated save; directory page size <=100. Legacy aggregate notes path is unbounded. Delete requires owner step-up.',
 '/api/admin/patients/[id]/sessions':'Create/update/delete clinical sessions with patient/appointment linkage checks and audit revisions.',
 '/api/admin/patients/[id]/billing-sessions':'Paginated completed-visit selection, maximum 100 rows per page; optional date range, historical price and existing-document linkage; planned, future and archived visits excluded.',
 '/api/admin/practitioners':'Read/update full team, resources, working hours, service mappings and exceptions; version/conflict validation.',
 '/api/admin/prescriptions':'Patient-scoped prescription list and validated creation; no paginated history.',
 '/api/admin/prescriptions/[id]':'Authenticated prescription deletion.',
 '/api/admin/reviews':'Unpaginated moderation list; approve/reject/feature or delete existing review. Needs pagination at larger volumes.',
 '/api/admin/slots':'Live admin availability and manual slot blocking; checks active appointments.',
 '/api/admin/slots/bulk':'Validated bulk slot blocking/unblocking with conflict checks.',
 '/api/admin/treatments':'Catalogue/configuration read and validated treatment save/archive/publication with revisions; catalogueOnly=1 reduces reads.',
 '/api/admin/whatsapp':'Integration readiness and inbox/outbox aggregate counts; no secret values returned.',
};
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name==='route.ts'?[path.join(dir,e.name)]:[]);}
const rows=files(api).sort().map(file=>{
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const route='/api/'+path.relative(api,path.dirname(file)).replace(/\\/g,'/');
 const handlers=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(n.name?.text||'')).map(n=>{
  const body=n.body?.getText(ast)||'';
  return {method:n.name.text,access:body.includes('requireOwnerAnalytics(')?'Owner step-up':body.includes('requireAdmin(')?'Admin session':route==='/api/whatsapp/jobs'?'Bearer job secret':route==='/api/whatsapp/webhook'?(n.name.text==='GET'?'Verify token':'HMAC signature'):'Public / own-session',line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1};
 });
 assert(descriptions[route],`Missing audit notes: ${route}`);
 return {route,file:path.relative(root,file).replace(/\\/g,'/'),handlers,notes:descriptions[route]};
});
(async()=>{
 const probes=[];
 if(process.argv.includes('--probe')){
  const base=new URL(process.env.AUDIT_BASE_URL||'http://127.0.0.1:3008');assert(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'Authorization probes are local-only');
  for(const row of rows)for(const h of row.handlers){
   if(!['Admin session','Owner step-up','Bearer job secret'].includes(h.access))continue;
   const url=new URL(row.route.replace(/\[[^\]]+\]/g,'audit-missing-id'),base);
   const start=performance.now(),response=await fetch(url,{method:h.method,redirect:'manual',signal:AbortSignal.timeout(10000),...(h.method==='GET'?{}:{headers:{'Content-Type':'application/json'},body:'{}'})});
   await response.arrayBuffer();probes.push({route:row.route,method:h.method,status:response.status,ms:Math.round(performance.now()-start)});
   assert.equal(response.status,401,`${h.method} ${row.route} must reject an anonymous caller`);
  }
 }
 fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'api-routes.json'),JSON.stringify({observedAt:new Date().toISOString(),routeCount:rows.length,handlerCount:rows.reduce((n,r)=>n+r.handlers.length,0),routes:rows,anonymousProbes:probes},null,2));
 fs.writeFileSync(path.join(output,'API-ROUTES.md'),'# API route audit — 9 October 2026\n\nEvery exported HTTP handler is enumerated from the final TypeScript source. Auto-generated framework HEAD/OPTIONS are not counted. All APIs use no-store HTTP headers. Admin access means a cryptographically valid, unexpired, unrevoked session; owner access adds the expiring server-side financial authorization grant.\n\n'+`**${rows.length} route paths; ${rows.reduce((n,r)=>n+r.handlers.length,0)} exported handlers. ${probes.length} anonymous authorization probes passed on the isolated local server.**\n\n`+'Source review and authentication probes do not prove every success/error branch. See the main report for behavioral test and integration coverage.\n\n| Route | Methods and access | Behavior / limits / remaining concerns |\n|---|---|---|\n'+rows.map(r=>`| [\`${r.route}\`](../../${r.file}) | ${r.handlers.map(h=>h.method+': '+h.access).join('<br>')} | ${r.notes} |`).join('\n')+'\n');
 console.log(JSON.stringify({routePaths:rows.length,handlers:rows.reduce((n,r)=>n+r.handlers.length,0),anonymousProbesPassed:probes.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
