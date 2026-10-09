// Bounded, anonymous GET-only production audit. Never submits clinic records.
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';

const base = process.env.AUDIT_BASE_URL || 'https://ryma-ten.vercel.app';
const output = path.resolve('docs/production-audit-2026-10-09');
fs.mkdirSync(output, { recursive: true });
const result = { observedAt: new Date().toISOString(), base, localSha: execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), deployments: [], endpoints: [] };
const get = async url => {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), redirect:'manual', headers: {Accept:'application/json'} });
  if (!r.ok) throw Error(`HTTP ${r.status} for ${url}`);
  return r.json();
};
try {
  const deployments = await get('https://api.github.com/repos/GallasMahdi/Ryma/deployments?per_page=4');
  for (const d of deployments) {
    const statuses = await get(d.statuses_url);
    result.deployments.push({environment:d.environment,sha:d.sha,createdAt:d.created_at,statuses:statuses.map(s=>({state:s.state,url:s.environment_url,logUrl:s.log_url,updatedAt:s.updated_at}))});
  }
} catch (e) { result.deploymentError = e.message; }
const date = new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const routes = ['/', '/rendez-vous', '/services', '/admin/login', '/api/health', '/api/treatments', '/api/practitioners', '/api/reviews?limit=12', `/api/slots?date=${date}`, '/api/admin/me', '/api/admin/appointments'];
for (const route of routes) {
  const samples = [];
  for (let i=0; i<8; i++) {
    const start = performance.now();
    try {
      const r = await fetch(base+route, {signal:AbortSignal.timeout(30000),redirect:'manual'});
      const ttfbMs = performance.now()-start;
      const body = await r.arrayBuffer();
      const headers = Object.fromEntries(['cache-control','content-encoding','x-vercel-id','x-vercel-cache','age','content-type'].map(k=>[k,r.headers.get(k)]));
      samples.push({status:r.status,ttfbMs,fullMs:performance.now()-start,bytes:body.byteLength,headers});
      // Save only aggregate operational metadata, never record payloads.
      if (route==='/api/health' && i===0) result.health=JSON.parse(Buffer.from(body));
    } catch (e) { samples.push({error:e.message,fullMs:performance.now()-start}); }
  }
  const times=samples.filter(s=>!s.error).map(s=>s.fullMs).sort((a,b)=>a-b);
  const entry={route,samples,medianMs:times[Math.floor(times.length/2)],maxMs:times.at(-1)};
  result.endpoints.push(entry);
  fs.writeFileSync(path.join(output,'live-readonly.json'),JSON.stringify(result,null,2));
  console.log(`${route}: median ${entry.medianMs?.toFixed(1)} ms, max ${entry.maxMs?.toFixed(1)} ms, statuses ${[...new Set(samples.map(s=>s.status??s.error))]}`);
}
console.log('Saved bounded live evidence and deployment commit metadata.');
