const C=require('./common.cjs');
const read=n=>JSON.parse(C.fs.readFileSync(C.path.join(C.out,n),'utf8'));
const profile=read('analytics.cpuprofile'),requests=read('profile-samples.json');
const sql=C.fs.readFileSync(C.path.join(C.out,'profile-sql.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const frames=new Map(profile.nodes.map(n=>[n.id,n.callFrame])),totals=new Map();
for(let i=0;i<profile.samples.length;i++){
  const frame=frames.get(profile.samples[i]),key=JSON.stringify(frame);totals.set(key,(totals.get(key)||0)+profile.timeDeltas[i]);
}
const topFrames=[...totals].map(([key,selfTimeMicroseconds])=>({frame:JSON.parse(key),selfTimeMicroseconds})).sort((a,b)=>b.selfTimeMicroseconds-a.selfTimeMicroseconds);
const totalSampledMicroseconds=profile.timeDeltas.reduce((a,b)=>a+b,0);
// The profile is sequential and each analytics request starts with its revocation check.
// Split on those query boundaries so equal millisecond timestamps cannot double-count SQL.
const relevant=sql.filter(r=>r.time>=requests[0].start&&r.time<=requests.at(-1).end);
const groups=[];for(const q of relevant){if(q.sql.startsWith('SELECT COUNT(*) as cnt FROM revoked_sessions'))groups.push([]);if(groups.length)groups.at(-1).push(q);}
if(groups.length!==requests.length)throw Error('Unexpected analytic request/query grouping');
const result={topFrames:topFrames.slice(0,30),totalSampledMicroseconds,requests:requests.map((r,i)=>({...r,queries:groups[i],queryCount:groups[i].length,sqlMs:groups[i].reduce((a,q)=>a+q.ms,0)})),interpretation:{topFunction:topFrames[0]?.frame.functionName,evidence:'Observed highest self-time frame. Compiled source coordinates and all top frames are retained; no attribution is inferred from the previous audit.',topSelfShareOfAllSamples:topFrames[0].selfTimeMicroseconds/totalSampledMicroseconds,queryCorrelation:'Sequential groups begin at the authorization revocation query; no inclusive timestamp boundary double-counting.'}};
C.write('profile-analysis.json',result);console.log(JSON.stringify({top:topFrames[0],share:result.interpretation.topSelfShareOfAllSamples,requests:result.requests.map(r=>({ms:r.ms,queries:r.queryCount,sqlMs:r.sqlMs}))},null,2));
