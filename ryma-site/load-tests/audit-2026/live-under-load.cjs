const C=require('./common.cjs'),B=require('./browser.cjs');
async function main(){
  const latest=JSON.parse(C.fs.readFileSync(C.path.join(C.out,'generator-resources.jsonl'),'utf8').trim().split('\n').at(-1));
  if(!latest.phase.startsWith('soak-')||Date.now()-Date.parse(latest.time)>15000)throw Error('Live browser verification requires an actively running soak');
  const backgroundPhase=latest.phase;
  const rows=[],startedAt=new Date().toISOString();
  const browser=await B.chromium.launch({headless:true,executablePath:B.executablePath});
  const ctx=await browser.newContext({viewport:{width:1440,height:900},userAgent:B.ua});
  const auth=await C.login('198.18.8.3'),writer=await C.login('198.18.8.4');
  await ctx.addCookies([{name:'ryma_admin_session',value:auth.cookie.split('=').slice(1).join('='),url:C.base,httpOnly:true,secure:true,sameSite:'Lax'},{name:'ryma_lang',value:'en',url:C.base}]);
  await ctx.tracing.start({screenshots:true,snapshots:true});
  const p=await ctx.newPage();p.setDefaultTimeout(20000);const responses=[],streamMessages=[],writes=[];
  const cdp=await ctx.newCDPSession(p);await cdp.send('Network.enable');
  cdp.on('Network.eventSourceMessageReceived',e=>{streamMessages.push({type:e.eventName,data:e.data,at:Date.now()})});
  p.on('response',r=>{if(r.url().includes('/api/admin/appointments'))responses.push({url:r.url(),status:r.status(),at:Date.now()})});
  let error;
  try{
    const nav=performance.now();await p.goto(C.base+'/admin',{waitUntil:'domcontentloaded'});
    const readyDeadline=Date.now()+15000;
    while(!streamMessages.some(e=>e.type==='connected')&&Date.now()<readyDeadline)await C.sleep(50);
    await p.getByText('Live',{exact:true}).filter({visible:true}).waitFor();
    await p.getByRole('button',{name:/Patient Records/}).first().click();
    await p.getByPlaceholder('Search patient, phone...').fill('AUDIT Patient 00001');
    await p.getByText('AUDIT Patient 00001',{exact:true}).filter({visible:true}).first().waitFor();
    await p.getByRole('button',{name:/^Appointments/}).first().click();
    await p.getByRole('button',{name:'Table',exact:true}).click();
    await p.waitForFunction(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Table')?.className.includes('bg-white'));
    await p.getByPlaceholder('Search patient, phone, service...').fill('AUDIT Soak R3');
    await C.sleep(1000);
    rows.push({name:'admin-dashboard-filter-during-soak',ms:performance.now()-nav,ok:true});
    for(let i=0;i<5;i++){
      const name='AUDIT Soak R3 '+i,body={...C.payload(57020+i,620+i),patientName:name};
      const start=performance.now();
      const r=await C.req('/api/admin/appointments',{method:'POST',headers:{cookie:writer.cookie},body:JSON.stringify(body)});
      if(r.status!==201)throw Error('Writer status '+r.status+': '+JSON.stringify(r.json));
      const d=C.db(),persisted=d.prepare('SELECT count(*) n FROM appointments WHERE phone=? AND date=? AND startTime=?').get(body.phone,body.date,body.startTime).n;d.close();
      if(persisted!==1)throw Error('Expected exactly one persisted booking');
      writes.push({name,body,status:r.status,persisted,at:Date.now()});
      await p.getByText(name,{exact:true}).filter({visible:true}).first().waitFor();
      const row={name:'second-session-persisted-visible-during-soak',ms:performance.now()-start,httpMs:r.ms,persisted,ok:persisted===1,time:new Date().toISOString()};rows.push(row);C.append('journey-samples.jsonl',row);
      await C.sleep(1000);
    }
    await p.screenshot({path:C.path.join(C.out,'live-under-load.png')});
  }catch(e){error=e.stack;process.exitCode=1;C.fs.writeFileSync(C.path.join(C.out,'live-under-load-body.txt'),await p.locator('body').innerText());await p.screenshot({path:C.path.join(C.out,'live-under-load-failure.png')});}
  finally{
    C.write('live-under-load.json',{startedAt,finishedAt:new Date().toISOString(),backgroundPhase,extraSyntheticWrites:writes.length,writes,rows,responses,streamMessages,error});
    await ctx.tracing.stop({path:C.path.join(C.out,'live-under-load-trace.zip')});await ctx.close();await browser.close();
  }
  console.log(JSON.stringify({rows,error}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
