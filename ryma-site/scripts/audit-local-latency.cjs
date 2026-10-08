// Explicit loopback-only audit. Uses synthetic demo credentials; never prints cookies/data.
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3007';
const target = new URL(base);
assert.equal(target.hostname, '127.0.0.1', 'Only the isolated loopback demo is supported');
const output = path.resolve(process.env.AUDIT_OUTPUT || 'docs/performance-audit-2026-10-08/http-results.json');
let cookie = '';
const results = { date: new Date().toISOString(), base, environment: 'local production build / SQLite / synthetic demo', samplesPerEndpoint: 20, endpoints: [], phases: [], checks: [] };
const stats = values => {
  const sorted = [...values].sort((a,b) => a-b), round = n => Math.round(n*10)/10;
  return { samples: sorted.length, minMs: round(sorted[0]), medianMs: round(sorted[Math.floor(sorted.length/2)]), ...(sorted.length >= 100 ? { p95Ms: round(sorted[Math.ceil(sorted.length*.95)-1]) } : {}), maxMs: round(sorted.at(-1)) };
};
async function request(route, {auth = false, body, expected = 200} = {}) {
  const start = performance.now();
  const response = await fetch(base+route, {method: body === undefined ? 'GET' : 'POST', redirect: 'manual', signal: AbortSignal.timeout(15000), headers: {...(auth ? {Cookie: cookie} : {}), ...(body === undefined ? {} : {'Content-Type':'application/json', Origin:base})}, ...(body === undefined ? {} : {body:JSON.stringify(body)})});
  const ttfb = performance.now()-start;
  const bytes = Buffer.from(await response.arrayBuffer());
  const elapsed = performance.now()-start;
  assert.equal(response.status, expected, `${route}: expected ${expected}, got ${response.status}`);
  return {response, bytes, elapsed, ttfb};
}
async function measure(route, auth = false) {
  const times = [], ttfb = [];
  let bytes;
  for (let i=0;i<20;i++) {const r = await request(route,{auth});times.push(r.elapsed);ttfb.push(r.ttfb);bytes=r.bytes.length;}
  const result = {route, auth, bytes, firstObservedMs: Math.round(times[0]*10)/10, warm:stats(times.slice(1)), all:stats(times), ttfb:stats(ttfb)};
  results.endpoints.push(result);
  console.log(`${route}: median ${result.all.medianMs} ms, max ${result.all.maxMs} ms, ${bytes} bytes`);
}
async function phase(name, concurrency, seconds, routes) {
  const started = performance.now(), deadline = started+seconds*1000, times = [], failures = [], health = [];
  let next = 0;
  await Promise.all(Array.from({length:concurrency}, async (_,worker) => {
    while(performance.now()<deadline) {
      const route = routes[next++ % routes.length];
      try {const result = await request(route,{auth:route.startsWith('/api/admin')});times.push(result.elapsed); if(route==='/api/health') {const body=JSON.parse(result.bytes);health.push(body.memory);}}
      catch(error) {failures.push({route,error:error.message});}
      // Fixed think time keeps this an explicit bounded workload, not saturation.
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }));
  const elapsedSeconds = (performance.now()-started)/1000;
  const result = {name,concurrency,requestedSeconds:seconds,elapsedSeconds:Math.round(elapsedSeconds*10)/10,thinkTimeMs:200,completed:times.length,requestsPerSecond:Math.round(times.length/elapsedSeconds*10)/10,latency:stats(times),failures,health};
  results.phases.push(result); fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2));
  console.log(`PHASE ${name}: ${times.length} reads, p95 ${result.latency.p95Ms} ms, max ${result.latency.maxMs} ms, errors ${failures.length}`);
  assert.equal(failures.length,0,`${name} had request failures`);
}
(async()=>{
  const health = JSON.parse((await request('/api/health')).bytes);
  assert.equal(health.status,'healthy');assert.equal(health.environment,'production');
  results.checks.push('Production health and database readiness');
  for(const route of ['/api/admin/me','/api/admin/appointments','/api/admin/patients','/api/admin/invoices','/api/admin/reviews','/api/admin/practitioners','/api/admin/treatments','/api/admin/analytics']) await request(route,{expected:401});
  results.checks.push('Eight protected reads reject anonymous requests');
  const login = await request('/api/admin/login',{body:{password:'ryma2024admin'}});
  cookie = login.response.headers.get('set-cookie')?.split(';')[0]; assert(cookie);
  await request('/api/admin/analytics',{auth:true,expected:403});
  results.checks.push('Admin access alone cannot read owner analytics');
  const owner = await request('/api/admin/analytics/verify',{auth:true,body:{password:'ryma2024owner'}});
  if(owner.response.headers.get('set-cookie')) cookie=owner.response.headers.get('set-cookie').split(';')[0];
  const date = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const publicRoutes=['/','/a-propos','/services','/services/reeducation-posturale','/tarifs','/avis','/contact','/rendez-vous','/blog','/mentions-legales','/confidentialite','/conditions-utilisation','/admin/login','/api/health','/api/treatments','/api/practitioners','/api/reviews',`/api/slots?date=${date}&service=reeducation-posturale`];
  const adminRoutes=['/admin','/api/admin/me','/api/admin/appointments?summary=1&page=1&limit=10','/api/admin/patients?directory=1&page=1&limit=10','/api/admin/invoices?page=1&limit=10','/api/admin/reviews','/api/admin/practitioners','/api/admin/treatments?catalogueOnly=1',`/api/admin/slots?date=${date}`,'/api/admin/analytics?range=30d&lang=pt'];
  for(const route of publicRoutes) await measure(route);
  for(const route of adminRoutes) await measure(route,true);
  const controller = new AbortController(), began=performance.now();
  const sseDeadline=setTimeout(()=>controller.abort(),10000);
  const sse=await fetch(base+'/api/admin/events',{headers:{Cookie:cookie},signal:controller.signal});
  assert.equal(sse.status,200);assert.match(sse.headers.get('content-type'),/text\/event-stream/);
  const reader=sse.body.getReader();const first=await reader.read();assert(first.value?.length);results.sseFirstChunkMs=Math.round((performance.now()-began)*10)/10;clearTimeout(sseDeadline);controller.abort();
  results.checks.push('SSE returns an actual first event chunk');
  const mix=['/','/api/treatments',publicRoutes.at(-1),...adminRoutes.slice(1,6),'/api/health'];
  await phase('steady-4',4,60,mix);
  await phase('burst-12',12,30,mix);
  await phase('recovery-4',4,30,mix);
  await phase('soak-4',4,120,mix);
  await request('/api/admin/logout',{auth:true,body:{}});await request('/api/admin/me',{auth:true,expected:401});results.checks.push('Logout revokes the copied HTTP session');
  fs.writeFileSync(output,JSON.stringify(results,null,2));
})().catch(error=>{results.error=error.message;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(results,null,2));console.error(error);process.exitCode=1;});
