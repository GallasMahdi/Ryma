// Bounded HTTP timing audit. Runs only against a disposable loopback SQLite fixture.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict'),ts=require('typescript');
const {demoEnvironment,createAppLoader,ROOT}=require('./demo/runtime.cjs');
const output=path.join(ROOT,'docs','backend-reliability-audit-2026-10-15');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-api-perf-'));
const fixture=path.join(directory,'fixture.db');
let port=31876,server;
const env={...demoEnvironment(fixture,'test'),RYMA_PREVIEW_DB:fixture,RYMA_PREVIEW_PORT:String(port)};
Object.assign(process.env,env);
const api=path.join(ROOT,'src','app','api');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.name==='route.ts'?[path.join(dir,e.name)]:[]);}
function inventory(){return files(api).sort().flatMap(file=>{
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const route='/api/'+path.relative(api,path.dirname(file)).replace(/\\/g,'/');
  return ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&/^(GET|POST|PUT|PATCH|DELETE)$/.test(n.name?.text||'')).map(n=>({route,method:n.name.text,access:n.body?.getText(ast).includes('requireOwnerAnalytics(')?'owner':n.body?.getText(ast).includes('requireAdmin(')?'admin':route==='/api/whatsapp/jobs'?'job-secret':'public'}));
});}
function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)]??0;}
function stats(rows){const ms=rows.map(x=>x.ms),status={};for(const x of rows)status[x.status]=(status[x.status]||0)+1;const failed=rows.filter(x=>x.status>=400||x.status===0).length;return {requests:rows.length,success:rows.filter(x=>x.status>=200&&x.status<300).length,failed,httpErrorRate:rows.length?failed/rows.length:0,throughputRps:ms.length?rows.length/(ms.reduce((a,b)=>a+b,0)/1000):0,avgMs:ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:0,medianMs:percentile(ms,.5),p90Ms:percentile(ms,.9),p95Ms:percentile(ms,.95),p99Ms:percentile(ms,.99),maxMs:Math.max(0,...ms),statusCodes:status};}
async function freePort(){for(;port<31976;port++){try{await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});return port;}catch{}}throw Error('No free audit port');}
async function start(){
  port=await freePort();env.RYMA_PREVIEW_PORT=String(port);
  const db=createAppLoader()('@/lib/db');await require('./fixtures/services.cjs').seedTestServices(db);db.getDb().close();
  server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:ROOT,env:{...env,NODE_ENV:'production',ADMIN_PASSWORD_HASH:require('bcryptjs').hashSync('audit-only-admin',10),OWNER_ANALYTICS_PASSWORD_HASH:require('bcryptjs').hashSync('audit-only-owner',10)},stdio:['ignore',fs.openSync(path.join(directory,'server.log'),'w'),'ignore'],windowsHide:true});
  const base='http://127.0.0.1:'+port;
  for(let i=0;i<50;i++){if(server.exitCode!==null)throw Error('Isolated HTTP server exited; diagnostics retained in temp fixture');try{const r=await fetch(base+'/api/health');await r.arrayBuffer();if(r.status===200)return base;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw Error('Isolated HTTP server did not become ready');
}
function routeUrl(route){
  const actual=route.replace(/\[[^\]]+\]/g,'missing-audit-id');
  const url=new URL(actual,'http://127.0.0.1');
  const date=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
  if(route==='/api/slots')url.search=new URLSearchParams({date,service:'reeducation-posturale'}).toString();
  else if(route==='/api/admin/slots')url.search=new URLSearchParams({date}).toString();
  else if(route==='/api/admin/appointments'||route==='/api/admin/invoices')url.search=new URLSearchParams({page:'1',limit:'20'}).toString();
  else if(route==='/api/admin/patients')url.search=new URLSearchParams({directory:'1',limit:'20'}).toString();
  else if(route==='/api/admin/prescriptions')url.search=new URLSearchParams({patientPhone:'+351963000000'}).toString();
  else if(route==='/api/admin/patients/[id]/billing-sessions')url.search=new URLSearchParams({page:'1',limit:'20'}).toString();
  else if(route==='/api/admin/treatments')url.search='catalogueOnly=1';
  else if(route==='/api/admin/export')url.search='type=appointments';
  else if(route==='/api/admin/invoices/export')url.search='';
  return url.pathname+url.search;
}
async function main(){
  await start();const base='http://127.0.0.1:'+port;let cookie='';const rows=[];
  const request=async(url,method,body,auth=true)=>{
    const headers={Origin:base,...(auth&&cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})};
    const started=performance.now();
    try{
      const response=await fetch(base+url,{method,headers,...(body!==undefined?{body}:{}),redirect:'manual',signal:AbortSignal.timeout(12000)});
      if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
      if(url==='/api/admin/events'&&response.body){const reader=response.body.getReader();await Promise.race([reader.read(),new Promise(r=>setTimeout(r,1500))]);await reader.cancel().catch(()=>{});}
      else await response.arrayBuffer();
      return {status:response.status,ms:performance.now()-started};
    }catch{return {status:0,ms:performance.now()-started};}
  };
  const login=await request('/api/admin/login','POST',JSON.stringify({password:'audit-only-admin'}),false);assert.equal(login.status,200,'Synthetic admin login must succeed');rows.push({route:'/api/admin/login',method:'POST',...login});
  const owner=await request('/api/admin/analytics/verify','POST',JSON.stringify({password:'audit-only-owner'}));assert.equal(owner.status,200,'Synthetic owner step-up must succeed');rows.push({route:'/api/admin/analytics/verify',method:'POST',...owner});
  const routes=inventory();assert.equal(routes.length,55,'Route inventory changed; review probe coverage before using these results');
  const records=[];
  for(const item of routes){
    if(item.route==='/api/admin/login'||item.route==='/api/admin/analytics/verify'||item.route==='/api/admin/analytics/lock'||item.route==='/api/admin/logout')continue;
    const url=routeUrl(item.route);const samples=item.method==='GET'?10:1;const measurements=[];
    for(let i=0;i<samples;i++)measurements.push(await request(url,item.method,item.method==='GET'?undefined:'{}'));
    records.push({route:item.route,method:item.method,access:item.access,...stats(measurements),samples:measurements});
  }
  const bookingDate=new Date(Date.now()+30*86400000);while(bookingDate.getUTCDay()===0)bookingDate.setUTCDate(bookingDate.getUTCDate()+1);
  const bookingPayload=(phone,key,token)=>({patientName:'Performance Fixture',phone,service:'reeducation-posturale',date:bookingDate.toISOString().slice(0,10),startTime:'09:00',_form_rendered_at:Date.now()-5000,clientRequestId:key,...(token?{recaptchaToken:token}:{})});
  const bookingGate=[{case:'no-captcha-token',...await request('/api/appointments','POST',JSON.stringify(bookingPayload('+351963199001','audit-no-captcha-token')),false)}];
  // Bound every concurrency scenario to 100 read-only requests on the local fixture.
  const load=[];const core=[
    ['/api/health','public'],['/api/treatments','public'],['/api/practitioners','public'],['/api/reviews?limit=12','public'],
    ['/api/slots?date='+new Date(Date.now()+14*86400000).toISOString().slice(0,10)+'&service=reeducation-posturale','public'],
    ['/api/admin/appointments?page=1&limit=20','admin'],['/api/admin/patients?directory=1&limit=20','admin'],['/api/admin/invoices?page=1&limit=20','admin'],['/api/admin/me','admin'],
  ];
  for(const concurrency of [10,50,100])for(const [url,access] of core){
    const results=[];const total=100;const started=performance.now();
    for(let offset=0;offset<total;offset+=concurrency){const batch=Array.from({length:Math.min(concurrency,total-offset)},()=>request(url,'GET',undefined,access==='admin'));results.push(...await Promise.all(batch));}
    const elapsedMs=performance.now()-started;const summary=stats(results);load.push({url,access,concurrency,durationMs:elapsedMs,requests:total,success:summary.success,failed:summary.failed,httpErrorRate:summary.httpErrorRate,throughputRps:total/(elapsedMs/1000),avgMs:summary.avgMs,medianMs:summary.medianMs,p90Ms:summary.p90Ms,p95Ms:summary.p95Ms,p99Ms:summary.p99Ms,maxMs:summary.maxMs,statusCodes:summary.statusCodes});
  }
  const lock=await request('/api/admin/analytics/lock','POST','{}');rows.push({route:'/api/admin/analytics/lock',method:'POST',...lock});
  const logout=await request('/api/admin/logout','POST','{}');rows.push({route:'/api/admin/logout',method:'POST',...logout});
  const byKey=new Map();for(const row of rows){const k=row.route+' '+row.method;if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(row);}
  for(const item of routes){const k=item.route+' '+item.method;const samples=byKey.get(k)||[];if(samples.length)continue;
    const found=records.find(x=>x.route===item.route&&x.method===item.method);rows.push({route:item.route,method:item.method,...found});
  }
  fs.mkdirSync(output,{recursive:true});
  assert.equal(bookingGate[0].status,201,'Booking without CAPTCHA should succeed while verification is disabled');
  fs.writeFileSync(path.join(output,'endpoint-timings.json'),JSON.stringify({measuredAt:new Date().toISOString(),target:'isolated loopback Next.js production server; disposable SQLite fixture; synthetic credentials; external delivery disabled',runtime:process.version,next:require('next/package.json').version,routePaths:new Set(routes.map(x=>x.route)).size,handlerCount:routes.length,perEndpoint:records,load,bookingGate,oneOff:rows.filter(x=>['/api/admin/login','/api/admin/analytics/verify','/api/admin/analytics/lock','/api/admin/logout'].includes(x.route))},null,2));
  console.log(JSON.stringify({routePaths:new Set(routes.map(x=>x.route)).size,handlers:routes.length,timedHandlers:records.length+4,loadScenarios:load.length,bookingGate,perEndpoint:records.map(x=>`${x.method} ${x.route}: ${x.requests} req, ${Object.keys(x.statusCodes).join(',')} p95=${x.p95Ms.toFixed(1)}ms`),load:load.map(x=>`${x.concurrency} concurrency ${x.url}: ${x.requests} req/${x.durationMs.toFixed(0)}ms; p95=${x.p95Ms.toFixed(1)}ms; errors=${x.failed}`)},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>server.once('exit',resolve));}
  assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));assert(path.basename(directory).startsWith('ryma-api-perf-'));
  if(!process.exitCode)fs.rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100});
});
