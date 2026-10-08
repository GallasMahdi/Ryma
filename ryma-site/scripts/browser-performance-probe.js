/* Local audit instrumentation only. Temporarily serve from public and include in
   the root layout during an isolated build. Remove both before the final build.
   Exposes aggregate diagnostics in a hidden DOM output; sends no telemetry. */
(() => {
  if (location.hostname !== '127.0.0.1') return;
  const data = {version:1, route:location.pathname, lcpMs:null, cls:0, events:[], longTasks:[], frameGaps:[], tabPaints:[], tabCommits:[]};
  const output = document.createElement('output');output.id='local-performance-audit';output.hidden=true;document.body.append(output);
  const publish = () => {const n=performance.getEntriesByType('navigation')[0];data.navigation=n?{ttfbMs:n.responseStart-n.requestStart,domReadyMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd}:null;data.paints=performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime}));output.textContent=JSON.stringify(data);};
  const watch = (type,callback,extra={}) => {try{new PerformanceObserver(list=>{list.getEntries().forEach(callback);publish();}).observe({type,buffered:true,...extra});}catch{}};
  watch('largest-contentful-paint',e=>data.lcpMs=e.startTime);
  let sessionStart=0,lastShift=0,sessionScore=0;
  watch('layout-shift',e=>{if(e.hadRecentInput)return;if(e.startTime-lastShift>1000||e.startTime-sessionStart>5000){sessionStart=e.startTime;sessionScore=0;}lastShift=e.startTime;sessionScore+=e.value;data.cls=Math.max(data.cls,sessionScore);});
  watch('longtask',e=>{if(data.longTasks.length<300)data.longTasks.push({start:e.startTime,ms:e.duration});});
  watch('event',e=>{if(e.interactionId&&data.events.length<500)data.events.push({type:e.name,ms:e.duration,inputDelayMs:e.processingStart-e.startTime,id:e.interactionId});},{durationThreshold:16});
  let until=0,previous=0,running=false;
  const frame = now => {if(document.visibilityState==='visible'&&previous&&data.frameGaps.length<10000)data.frameGaps.push(now-previous);previous=now;if(now<until)requestAnimationFrame(frame);else {running=false;previous=0;publish();}};
  const sample = () => {until=performance.now()+1200;if(!running){running=true;requestAnimationFrame(frame);}};
  document.addEventListener('click',event=>{
    sample();const button=event.target.closest('nav[aria-label] button');if(!button)return;
    const start=performance.now(),label=button.getAttribute('aria-label')||button.textContent.trim();
    const selected=()=>button.getAttribute('aria-current')==='page'||button.getAttribute('aria-expanded')==='true';
    if(!selected()) {
      const observer=new MutationObserver(()=>{if(selected()){data.tabCommits.push({label,ms:performance.now()-start});observer.disconnect();publish();}});
      observer.observe(button,{attributes:true,attributeFilter:['aria-current','aria-expanded']});
      setTimeout(()=>observer.disconnect(),5000);
    }
    const check=()=>{if(button.getAttribute('aria-current')==='page'||button.getAttribute('aria-expanded')==='true')requestAnimationFrame(()=>{data.tabPaints.push({label,ms:performance.now()-start});publish();});else if(performance.now()-start<2000)requestAnimationFrame(check);};requestAnimationFrame(check);
  },true);
  document.addEventListener('scroll',sample,{capture:true,passive:true});document.addEventListener('keydown',sample,true);
  document.addEventListener('visibilitychange',()=>{previous=0;});window.addEventListener('load',publish);setInterval(publish,1000);publish();
})();
