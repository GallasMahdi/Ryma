const C=require('./common.cjs');const {req,login,db,payload,slot,stats,append,write,sleep,runId,os,fs,path,out}=C;
const {monitorEventLoopDelay}=require('node:perf_hooks');
const sessions=[];let writeIndex=1000,sequence=0;const hist=monitorEventLoopDelay({resolution:20});hist.enable();
const streamControllers=[];
const mix=JSON.parse(process.env.AUDIT_MIX_JSON||'[20,40,10,10,10,8,2]');
if(!Array.isArray(mix)||mix.length!==7||mix.some(v=>!Number.isInteger(v)||v<0)||mix.reduce((a,b)=>a+b,0)!==100)throw Error('AUDIT_MIX_JSON requires seven nonnegative integer weights totaling 100');
const cuts=mix.map((_,i)=>mix.slice(0,i+1).reduce((a,b)=>a+b,0));
async function observeStream(index){const controller=new AbortController();streamControllers.push(controller);const response=await fetch(C.base+'/api/admin/events',{headers:{cookie:sessions[index].cookie},signal:controller.signal});if(response.status!==200)throw Error('SSE authentication failed');const reader=response.body.getReader();(async()=>{let buffer='';try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=new TextDecoder().decode(value);let end;while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const text=block.split('\n').find(l=>l.startsWith('data: '))?.slice(6);if(!text)continue;const e=JSON.parse(text);append('sse-load.jsonl',{time:new Date().toISOString(),phase,session:index,event:e.type||e.status,id:e.data?.id,delayMs:e.timestamp?Date.now()-Date.parse(e.timestamp):null});}}}catch(e){if(!controller.signal.aborted)append('sse-load-errors.jsonl',{session:index,error:e.message});}})();}
let phase='setup',all=[],phaseRows=[],stopped=false,reason='',badSince=0,slowSince=0;
let cpu=process.cpuUsage(),last=performance.now();
const timer=setInterval(()=>{const now=performance.now(),delta=process.cpuUsage(cpu);cpu=process.cpuUsage();const sample={time:new Date().toISOString(),phase,rss:process.memoryUsage().rss,heapUsed:process.memoryUsage().heapUsed,freeMemory:os.freemem(),cpuOneCorePct:100*(delta.user+delta.system)/1000/(now-last),eventLoopP99Ms:hist.percentile(99)/1e6,eventLoopMaxMs:hist.max/1e6};last=now;hist.reset();append('generator-resources.jsonl',sample);
 const recent=phaseRows.filter(r=>r.finished>Date.now()-10000);const bad=recent.filter(r=>!r.ok&&r.status!==429&&r.status!==409).length/Math.max(1,recent.length);const sorted=recent.map(r=>r.ms).sort((a,b)=>a-b);const p99=sorted[Math.ceil(sorted.length*.99)-1]||0;
 badSince=bad>.05?(badSince||Date.now()):0;slowSince=p99>5000?(slowSince||Date.now()):0;
 if((badSince&&Date.now()-badSince>=30000)||(slowSince&&Date.now()-slowSince>=60000)||sample.freeMemory<500*1024**2){stopped=true;reason=sample.freeMemory<500*1024**2?'Free RAM below 500 MiB':badSince&&Date.now()-badSince>=30000?'Unexpected error rate >5% for 30s':'Rolling empirical p99 >5s for 60s';}
},5000);timer.unref();
// Deterministic PRNG; fixed workload proportions in every block of 100 operations.
let randomState=9282026;function rand(){randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/2**32;}
async function operation(vu){const pick=(sequence++*37)%100,headers={cookie:sessions[vu].cookie,'x-forwarded-for':`198.18.10.${vu+1}`};let url,name,options={headers},validate,verify;
 if(pick<cuts[0]){name='public_home';url='/';validate=r=>r.status===200&&r.text.includes('<h1');}
 else if(pick<cuts[1]){name='availability';url='/api/slots?date='+slot(600).date;validate=r=>r.status===200&&r.json?.slots?.length===15;}
 else if(pick<cuts[2]){name='admin_appointments';url='/api/admin/appointments?summary=1&page=1&limit=10';validate=r=>r.status===200&&r.json?.appointments?.length===10&&r.json.total>=1000&&r.json.stats?.total>=1000;}
 else if(pick<cuts[3]){name='admin_patients';url='/api/admin/patients?directory=1&page=1&limit=10';validate=r=>r.status===200&&r.json?.patients?.length===10&&r.json.total>=1000&&r.json.counts?.all>=1000;}
 else if(pick<cuts[4]){name='admin_invoices';url='/api/admin/invoices?page=1&limit=10';validate=r=>r.status===200&&r.json?.invoices?.length===10&&r.json.total===1000;}
 else if(pick<cuts[5]){name='admin_update';url='/api/admin/appointments/'+runId+'-appointment-'+vu;const notes=`${runId} load ${sequence}`;options={headers,method:'PATCH',body:JSON.stringify({notes})};validate=r=>r.status===200&&r.json?.appointment?.notes===notes;verify=d=>d.prepare('SELECT notes FROM appointments WHERE id=?').get(runId+'-appointment-'+vu)?.notes===notes;}
 else{name='public_booking';const i=writeIndex++,body=payload(i,100+i);url='/api/appointments';options={headers,method:'POST',body:JSON.stringify(body)};validate=r=>r.status===201&&r.json?.success===true&&r.json.confirmation?.date===body.date;verify=d=>d.prepare('SELECT COUNT(*) n FROM appointments WHERE phone=? AND date=? AND startTime=?').get(body.phone,body.date,body.startTime).n===1;}
 const t=performance.now();const r=await req(url,options);let ok=validate(r);if(ok&&verify){const d=db();ok=verify(d);d.close();}const row={phase,vu,name,status:r.status,ms:r.ms,verifiedMs:performance.now()-t,bytes:r.bytes,ok,finished:Date.now()};if(!ok&&r.status!==429&&r.status!==409)row.error=r.json?.error||r.error||'Response/DB mismatch';phaseRows.push(row);append('load-samples.jsonl',row);return row;
}
async function hold(name,vus,duration,think=true){phase=name;phaseRows=[];badSince=slowSince=0;const started=Date.now();const start=performance.now();await Promise.all(Array.from({length:vus},async(_,vu)=>{while(Date.now()-started<duration&&!stopped){await operation(vu);if(think)await sleep(1000+rand()*2000);}}));const elapsed=performance.now()-start;const summary={phase:name,vus,plannedSeconds:duration/1000,startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),...stats(phaseRows,elapsed),operations:Object.fromEntries([...new Set(phaseRows.map(r=>r.name))].map(n=>[n,stats(phaseRows.filter(r=>r.name===n),elapsed)])),stopReason:stopped?reason:null};all.push(summary);write('load-summary.json',all);console.log(JSON.stringify(summary));return summary;}
async function warm(vus){await hold('warmup-'+vus,vus,15000);}
async function arrival(rps,duration=60000,maxInflight=100){
 phase='arrival-'+rps;phaseRows=[];badSince=slowSince=0;let active=0,dropped=0,offered=0,peakInflight=0,nextVu=0;const tasks=[],busy=new Set(),lags=[];
 const startedAt=new Date().toISOString(),start=performance.now(),expected=Math.floor(duration*rps/1000);
 while(offered<expected&&performance.now()-start<duration&&!stopped){
  const target=start+offered*1000/rps,delay=target-performance.now();if(delay>0)await sleep(delay);if(performance.now()-start>=duration)break;
  lags.push(Math.max(0,performance.now()-target));offered++;if(active>=maxInflight){dropped++;continue;}
  active++;peakInflight=Math.max(peakInflight,active);const vu=Array.from({length:sessions.length},(_,i)=>(i+nextVu)%sessions.length).find(i=>!busy.has(i));nextVu=(vu+1)%sessions.length;busy.add(vu);
  tasks.push(operation(vu).finally(()=>{active--;busy.delete(vu);}));
 }
 const offeredWindowMs=performance.now()-start;await Promise.all(tasks);lags.sort((a,b)=>a-b);
 const result={phase,startedAt,finishedAt:new Date().toISOString(),plannedSeconds:duration/1000,offered,offeredRps:rps,offeredWindowMs,dropped,schedulerMissed:expected-offered,maxInflight,peakInflight,schedulerLagP95Ms:lags[Math.ceil(lags.length*.95)-1],schedulerLagMaxMs:lags.at(-1),...stats(phaseRows,performance.now()-start),stopReason:stopped?reason:null};
 all.push(result);write('load-summary.json',all);console.log(JSON.stringify(result));
}
async function main(){
 const repeat=process.argv.includes('--repeat-baseline'),arrivalRecovery=process.argv.includes('--bounded-arrival');
 if(!repeat&&!arrivalRecovery)write('load-configuration.json',{mix,workloadAssumption:'60% public: 20% HTML home, 40% availability; 30% authenticated admin reads: 10% each paginated appointments/patient directory/invoices as revised dashboard (10 rows); appointments include global summary; 10% writes: 8% appointment note update, 2% public booking. No production analytics available.',thinkTimeMs:[1000,3000],seed:9282026,rateLimits:'Unmodified. Each VU uses a fixed benchmark-only IP via x-forwarded-for; no per-request rotation. Booking phones unique; 100/IP/hour can throttle.',auth:'One real login per VU before measurements; no login per operation. Arrival scheduling rotates fairly among the existing idle VUs; each retains its fixed cookie and IP, with unchanged rate limits.',baselineSeconds:120,sustainedSeconds:180,warmupSeconds:15,soakSeconds:1800,stopRules:{unexpectedRate:'.05 continuously 30s',rollingP99:'5000ms continuously 60s',freeMemory:'500 MiB'},percentiles:'p90 >=50, p95 >=100, p99 >=1000; rolling safety percentile is an empirical alarm only.',sameHostGenerator:true});
 for(let i=0;i<(repeat?5:arrivalRecovery?50:200);i++){sessions.push(await login(`198.18.10.${i+1}`));if((i+1)%25===0)console.log('Authenticated sessions '+(i+1));}
 await observeStream(0);await observeStream(1);
 if(arrivalRecovery){
 all=JSON.parse(fs.readFileSync(path.join(out,'load-summary.json')));const d=db();const names=d.prepare('SELECT patientName FROM appointments WHERE patientName LIKE ?').all('AUDIT '+runId+' %');d.close();writeIndex=Math.max(1000,...names.map(r=>Number(r.patientName.split(' ').at(-1))+1).filter(Number.isFinite));
 write('arrival-configuration.json',{mix,offeredRps:[10,20],durationSeconds:60,maxInflight:50,reason:'Reduced-load follow-up after stress stop; offered rate below observed 50-VU stable throughput, in-flight ceiling at the demonstrated stable concurrency. No further stress escalation.',startedAt:new Date().toISOString()});
 await arrival(10,60000,50);if(!stopped)await arrival(20,60000,50);const stopRecord=stopped?reason:null;stopped=false;reason='';await hold('arrival-recovery',5,60000);
 write('arrival-outcome.json',{stopRecord,recoveryStop:stopped?reason:null,finishedAt:new Date().toISOString()});for(const c of streamControllers)c.abort();clearInterval(timer);hist.disable();return;
 }
 if(repeat){all=JSON.parse(fs.readFileSync(path.join(out,'load-summary.json')));const d=db();const names=d.prepare('SELECT patientName FROM appointments WHERE patientName LIKE ?').all('AUDIT '+runId+' %');d.close();writeIndex=Math.max(1000,...names.map(r=>Number(r.patientName.split(' ').at(-1))+1).filter(Number.isFinite));await hold('baseline-repeat',1,120000);await hold('warmup-5-repeat',5,15000);await hold('sustained-5-repeat',5,180000);write('load-repeat-outcome.json',{stopped,reason,finishedAt:new Date().toISOString()});for(const c of streamControllers)c.abort();clearInterval(timer);hist.disable();return;}
 const smoke=await hold('load-smoke',1,10000);if(smoke.unexpected||smoke.successes===0)throw Error('Functional load smoke failed');
 await hold('baseline',1,120000);let stable=1;
 for(const vus of [5,10,25,50]){if(stopped)break;await warm(vus);if(stopped)break;const s=await hold(vus<=50?'sustained-'+vus:'stress-'+vus,vus,vus<=50?180000:120000);const readOkay=['availability','admin_appointments','admin_patients','admin_invoices'].every(n=>!s.operations[n]||(s.operations[n].p95??s.operations[n].max)<=500);const writeOkay=['admin_update','public_booking'].every(n=>!s.operations[n]||(s.operations[n].p95??s.operations[n].max)<=1000);if(!stopped&&s.unexpected/s.n<.01&&s.throttled===0&&readOkay&&writeOkay)stable=vus;}
 if(!stopped){await hold('spike-before',5,20000);const start=Date.now();phase='spike-ramp';phaseRows=[];await Promise.all(Array.from({length:100},async(_,vu)=>{await sleep(vu*80);if(Date.now()-start<10000)await operation(vu);}));all.push({phase:'spike-ramp',rampMs:Date.now()-start,...stats(phaseRows,Date.now()-start)});await hold('spike-peak',100,60000);}
 if(!stopped){await hold('spike-recovery',5,60000);}
 for(const vus of [100,200]) {if(stopped)break; await warm(vus); if(stopped)break; await hold('stress-'+vus,vus,120000);}
 // Recovery is observed even after a stop; no further escalation after a stop rule.
 const stopRecord=stopped?{reason,time:new Date().toISOString()}:null;stopped=false;reason='';await hold('recovery',5,60000);
 if(!stopRecord&&!stopped){await arrival(50);if(!stopped)await arrival(100);}
 const arrivalStop=stopped?{reason,time:new Date().toISOString()}:null;stopped=false;reason='';
 // Soak uses a previously demonstrated stable low level; it does not escalate load.
 const soakVus=Math.min(stable,10);await hold('soak-'+soakVus,soakVus,1800000);
 write('load-outcome.json',{stableCandidate:stable,soakVus,stopRecord,arrivalStop,soakStop:stopped?reason:null,finishedAt:new Date().toISOString()});for(const c of streamControllers)c.abort();clearInterval(timer);hist.disable();
}
main().catch(e=>{write('load-fatal.json',{error:e.stack,phase});console.error(e);for(const c of streamControllers)c.abort();clearInterval(timer);hist.disable();process.exitCode=1;});
