const C=require('./common.cjs');
const rows=C.fs.readFileSync(C.path.join(C.out,'browser-samples.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const classified=rows.map(row=>{
  const canceledRsc=row.failedRequests.filter(r=>r.error==='net::ERR_ABORTED'&&new URL(r.url).searchParams.has('_rsc'));
  return {label:row.label,consoleErrors:row.consoleErrors.length,rawRequestFailures:row.failedRequests.length,canceledRsc:canceledRsc.length,otherRequestFailures:row.failedRequests.filter(r=>!canceledRsc.includes(r))};
});
const result={samples:rows.length,passed:rows.length===66&&classified.every(r=>r.consoleErrors===0&&r.otherRequestFailures.length===0),method:'Raw request failures are preserved. ERR_ABORTED on _rsc requests is reported separately as canceled background RSC traffic. Captured HAR headers identify next-router-prefetch=1 for these requests; successful real navigation is independently checked by journeys. Counts in successive visits are cumulative within each browser context, not unique request totals.',classified};
C.write('browser-quality.json',result);
console.log(JSON.stringify({samples:result.samples,passed:result.passed,cumulativeCanceledRsc:classified.reduce((sum,r)=>sum+r.canceledRsc,0)}));
if(!result.passed)process.exitCode=1;
