const C=require('./common.cjs');
async function main(){
  C.fs.mkdirSync(C.path.join(C.out,'calibration'),{recursive:true});
  const previous=C.path.join(C.out,'authentication.json');
  if(C.fs.existsSync(previous))C.fs.copyFileSync(previous,C.path.join(C.out,'calibration','authentication-summed-latencies.json'));
  const rows=[];let cookie;const startedAt=new Date().toISOString(),start=performance.now();
  for(let i=0;i<20;i++){
    const r=await C.req('/api/admin/login',{method:'POST',headers:{'x-forwarded-for':'198.18.9.3'},body:JSON.stringify({password:C.secret.password})});
    const ok=r.status===200&&r.json?.success===true&&!!r.headers['set-cookie'];
    rows.push({ms:r.ms,status:r.status,bytes:r.bytes,ok});
    if(!ok)throw Error('Authentication verification failed');
    cookie=r.headers['set-cookie'].split(';')[0];
  }
  const elapsed=performance.now()-start;
  const check=await C.req('/api/admin/me',{headers:{cookie}});
  if(check.status!==200||!check.json?.authenticated)throw Error('Final cookie did not authenticate');
  const result={startedAt,finishedAt:new Date().toISOString(),samples:rows,summary:C.stats(rows,elapsed),budgetMs:1000,justification:'Interactive login with unchanged cost-12 bcrypt; n=20, no p95 claim.',validation:'All status/content/cookies valid; final cookie authenticated with /api/admin/me.',elapsedMethod:'Actual wall time around the sequential 20-login loop, not sum of request durations.'};
  C.write('authentication.json',result);console.log(JSON.stringify(result.summary));
}
main().catch(e=>{C.write('authentication-fatal.json',{error:e.stack});console.error(e);process.exitCode=1});
