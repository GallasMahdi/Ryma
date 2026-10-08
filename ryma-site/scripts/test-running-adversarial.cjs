// Real HTTP stress checks, restricted to the local synthetic preview fixture.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const Database=require('better-sqlite3');
const fixture=path.resolve(process.env.RYMA_PREVIEW_DB||'');
assert(fixture.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(fixture)==='fixture.db'&&fs.existsSync(fixture),'Use the running isolated preview fixture');
const port=Number(process.env.RYMA_PREVIEW_PORT||3007);
assert(Number.isInteger(port)&&port>=1024&&port<=65535,'Invalid preview port');
const base='http://127.0.0.1:'+port,checks=[];
let cookie='';
async function call(url,body,admin=false){
  const response=await fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(admin?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json(),headers:response.headers};
}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
  const health=await call('/api/health');assert.equal(health.status,200);
  const login=await call('/api/admin/login',{password:'team-preview-only',rememberMe:true});assert.equal(login.status,200);
  cookie=login.headers.get('set-cookie').split(';')[0];
  const configuration=(await call('/api/admin/practitioners',null,true)).body;
  const config=configuration.configuration||configuration;
  const a=config.practitioners.find(p=>p.name==='Dr. Teste A'),b=config.practitioners.find(p=>p.name==='Fisioterapeuta Teste B');assert(a&&b);
  const start=new Date();start.setUTCDate(start.getUTCDate()+30);while(start.getUTCDay()!==1)start.setUTCDate(start.getUTCDate()+1);
  const date=n=>new Date(+start+n*86400000).toISOString().slice(0,10);
  const marker=crypto.randomUUID();
  const input={patientName:'HTTP Adversarial Fixture',phone:'+351963109000',service:'reeducation-posturale',startTime:'09:00',_form_rendered_at:Date.now()-5000};
  await check('parallel public bookings obey the patient limit and verified replays remain available',async()=>{
    const bodies=Array.from({length:6},(_,i)=>({...input,date:date(i*7),practitionerId:b.id,clientRequestId:marker+'-phone-'+i}));
    const responses=await Promise.all(bodies.map(body=>call('/api/appointments',body)));
    assert.equal(responses.filter(r=>r.status===201).length,3,JSON.stringify(responses));
    assert.equal(responses.filter(r=>r.status===429).length,3);
    const first=responses.findIndex(r=>r.status===201),replay=await call('/api/appointments',bodies[first]);
    assert.equal(replay.status,201);assert.equal(replay.body.confirmation.id,responses[first].body.confirmation.id);
  });
  await check('20 simultaneous independent HTTP bookings all succeed without false slot conflicts',async()=>{
    const results=await Promise.all(Array.from({length:20},(_,i)=>call('/api/admin/appointments',{...input,phone:'+351963109'+String(i+10).padStart(3,'0'),date:date(i*7),practitionerId:a.id,clientRequestId:marker+'-load-'+i},true)));
    assert.equal(results.filter(r=>r.status===201).length,20,JSON.stringify(results.filter(r=>r.status!==201)));
    assert.equal(new Set(results.map(r=>r.body.appointment.id)).size,20);
  });
  await check('parallel recurring retries return the same complete plan',async()=>{
    const body={...input,phone:'+351963109100',practitionerId:b.id,clientRequestId:marker+'-plan',sessions:[{date:date(147),startTime:'09:00'},{date:date(154),startTime:'09:00'}]};
    const results=await Promise.all(Array.from({length:3},()=>call('/api/admin/appointments/multiple',body,true)));
    assert(results.every(r=>r.status===201),JSON.stringify(results));
    assert.equal(new Set(results.map(r=>r.body.appointments[0].id)).size,1);
    const changed=await call('/api/admin/appointments/multiple',{...body,patientName:'Changed Fixture'},true);assert.equal(changed.status,422);
  });
  await check('malformed recurring identities and request keys return validation errors',async()=>{
    for(const changes of [{practitionerId:123},{practitionerId:null},{clientRequestId:{}},{patientName:'=1+1'}]) {
      const response=await call('/api/admin/appointments/multiple',{...input,...changes,sessions:[{date:date(161),startTime:'09:00'}]},true);assert.equal(response.status,422);
    }
  });
  await check('database integrity, clinical links and collision invariants survive HTTP stress',async()=>{
    const db=new Database(fixture,{readonly:true});
    try {
      assert.equal(db.pragma('integrity_check')[0].integrity_check,'ok');assert.equal(db.pragma('foreign_key_check').length,0);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM patient_sessions s LEFT JOIN appointments a ON a.id=s.appointmentId WHERE s.appointmentId IS NOT NULL AND a.id IS NULL').get().n,0);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM appointments a LEFT JOIN patients p ON p.id=a.patientId WHERE a.patientId IS NOT NULL AND p.id IS NULL').get().n,0);
      const active=db.prepare("SELECT * FROM appointments WHERE status!='CANCELLED'").all(),minute=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
      for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
        const x=active[i],y=active[j];if(x.date!==y.date)continue;
        if(x.practitionerId!==y.practitionerId&&x.phone!==y.phone&&!JSON.parse(x.resourceIds).some(r=>JSON.parse(y.resourceIds).includes(r)))continue;
        assert(!(minute(x.startTime)-x.bufferBefore<minute(y.startTime)+y.durationMinutes+y.bufferAfter&&minute(y.startTime)-y.bufferBefore<minute(x.startTime)+x.durationMinutes+x.bufferAfter),'Overlapping reservations');
      }
    } finally { db.close(); }
  });
  const destination=path.resolve(__dirname,'../../output/multi-practitioner/running-adversarial-tests.json');
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,JSON.stringify({date:new Date().toISOString(),checksPassed:checks.length,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
