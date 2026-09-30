const C=require('./common.cjs');
const read=n=>JSON.parse(C.fs.readFileSync(C.path.join(C.out,n),'utf8'));
const lines=n=>C.fs.readFileSync(C.path.join(C.out,n),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const stages=read('load-summary.json'),gen=lines('generator-resources.jsonl'),server=lines('server-resources.jsonl'),rows=lines('load-samples.jsonl');
const interruption=C.path.join(C.out,'execution-interruption.json');
const invalid=new Set(C.fs.existsSync(interruption)?read('execution-interruption.json').invalidPhases:[]);
const p=(arr,q)=>{const a=arr.filter(Number.isFinite).sort((x,y)=>x-y);return a[Math.max(0,Math.ceil(q*a.length)-1)]??null};
const result=stages.map(s=>{
  const samples=rows.filter(r=>r.phase===s.phase),g=gen.filter(r=>r.phase===s.phase);
  const resources=s.startedAt&&s.finishedAt?server.filter(r=>r.time>=s.startedAt&&r.time<=s.finishedAt):[];
  let maxGap=0;for(let i=1;i<g.length;i++)maxGap=Math.max(maxGap,Date.parse(g[i].time)-Date.parse(g[i-1].time));
  const correct=samples.every(r=>r.error!=='Response/DB mismatch');const op={};
  for(const name of new Set(samples.map(r=>r.name))){
    const rr=samples.filter(r=>r.name===name);const limit=['public_home','public_booking','admin_update'].includes(name)?1000:500;
    const value=rr.length>=100?p(rr.map(r=>r.verifiedMs),.95):Math.max(...rr.map(r=>r.verifiedMs));
    op[name]={n:rr.length,budgetMs:limit,metric:rr.length>=100?'p95 verified completion':'maximum (small n)',ms:value,pass:value<=limit,unexpected:rr.filter(r=>!r.ok&&![409,429].includes(r.status)).length};
  }
  const isValid=!invalid.has(s.phase)&&maxGap<15000;
  const completedPlannedHold=!s.stopReason&&(!s.plannedSeconds||(s.elapsedSeconds>=s.plannedSeconds-.2&&s.elapsedSeconds<s.plannedSeconds+20));
  const arrival=/^arrival-\d+$/.test(s.phase)?{targetIterations:(s.plannedSeconds||60)*s.offeredRps,actuallyOffered:s.offered,capacityDropped:s.dropped,schedulerMissed:Math.max(0,(s.plannedSeconds||60)*s.offeredRps-s.offered),totalUnstarted:s.dropped+Math.max(0,(s.plannedSeconds||60)*s.offeredRps-s.offered),completed:s.n}:null;
  const slope=(values)=>{if(values.length<2)return null;const x=values.map(r=>(Date.parse(r.time)-Date.parse(values[0].time))/60000),y=values.map(r=>r.rss/2**20),xm=x.reduce((a,b)=>a+b)/x.length,ym=y.reduce((a,b)=>a+b)/y.length;return x.reduce((a,v,i)=>a+(v-xm)*(y[i]-ym),0)/x.reduce((a,v)=>a+(v-xm)**2,0)};
  return{phase:s.phase,valid:isValid,completedPlannedHold,eligibleForCapacity:isValid&&completedPlannedHold&&correct&&Object.values(op).every(o=>o.pass)&&s.unexpected/s.n<.01&&s.throttled===0&&s.conflicts===0,maxGeneratorSampleGapMs:maxGap,correctDatabaseResponses:correct,perOperation:op,latencyBudgetsMet:Object.values(op).every(o=>o.pass),successfulFraction:s.successes/s.n,arrival,server:{samples:resources.length,rssStart:resources[0]?.rss,rssEnd:resources.at(-1)?.rss,rssMax:Math.max(0,...resources.map(r=>r.rss)),rssSlopeMiBPerMinute:slope(resources),cpuP50:p(resources.map(r=>r.cpuOneCorePct),.5),cpuP95:p(resources.map(r=>r.cpuOneCorePct),.95),eventLoopP99Max:Math.max(0,...resources.map(r=>r.eventLoopP99Ms)),gcTotalMs:resources.reduce((a,r)=>a+r.gcMs,0)},generator:{samples:g.length,cpuP50:p(g.map(r=>r.cpuOneCorePct),.5),cpuP95:p(g.map(r=>r.cpuOneCorePct),.95),rssMax:Math.max(0,...g.map(r=>r.rss)),eventLoopMax:Math.max(0,...g.map(r=>r.eventLoopMaxMs))}};
});
const sse=lines('sse-load.jsonl');
const sseSummary=Object.fromEntries([...new Set(sse.map(r=>r.phase))].map(phase=>{
  const e=sse.filter(r=>r.phase===phase&&r.event!=='connected');const expected=rows.filter(r=>r.phase===phase&&r.ok&&['admin_update','public_booking'].includes(r.name)).length;
  return[phase,{expectedWrites:expected,session0:e.filter(r=>r.session===0).length,session1:e.filter(r=>r.session===1).length,p50DelayMs:p(e.map(r=>r.delayMs),.5),p95DelayMs:e.length>=100?p(e.map(r=>r.delayMs),.95):null,maxDelayMs:Math.max(0,...e.map(r=>r.delayMs))}];
}));
C.write('load-quality.json',{phases:result,sse:sseSummary});
console.log(JSON.stringify(result.map(r=>({phase:r.phase,valid:r.valid,completedPlannedHold:r.completedPlannedHold,eligibleForCapacity:r.eligibleForCapacity,latencyBudgetsMet:r.latencyBudgetsMet,correct:r.correctDatabaseResponses,arrival:r.arrival})),null,2));
