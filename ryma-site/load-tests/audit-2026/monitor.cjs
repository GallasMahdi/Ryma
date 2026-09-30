const fs=require('node:fs'),os=require('node:os'),{monitorEventLoopDelay,PerformanceObserver}=require('node:perf_hooks');
if(process.env.AUDIT_METRICS){
  const hist=monitorEventLoopDelay({resolution:20}); hist.enable();let cpu=process.cpuUsage(),last=performance.now(),gc=0,gcCount=0;
  new PerformanceObserver(list=>{for(const e of list.getEntries()){gc+=e.duration;gcCount++}}).observe({entryTypes:['gc']});
  setInterval(()=>{const now=performance.now(),delta=process.cpuUsage(cpu);cpu=process.cpuUsage();const data={time:new Date().toISOString(),pid:process.pid,rss:process.memoryUsage().rss,heapUsed:process.memoryUsage().heapUsed,freeMemory:os.freemem(),cpuOneCorePct:100*(delta.user+delta.system)/1000/(now-last),eventLoopP99Ms:hist.percentile(99)/1e6,eventLoopMaxMs:hist.max/1e6,gcMs:gc,gcCount};last=now;hist.reset();gc=0;gcCount=0;fs.appendFileSync(process.env.AUDIT_METRICS,JSON.stringify(data)+'\n');},5000).unref();
}
