const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/audit/dynamic-services'),base='http://127.0.0.1:3119';
const fixture=path.resolve(root,'../tmp/dashboard-fixes-20261007/project/dynamic-services-verified-fixture.db');
// Reads and writes below are confined to the sanitized synthetic preview launcher.
let cookie='',config,appointment,invoice;const results=[],stamp=Date.now(),slug='qa-http-treatment-'+stamp;
const day=new Date(Date.now()+25*86400000);while(day.getUTCDay()!==1)day.setUTCDate(day.getUTCDate()+1);const date=day.toISOString().slice(0,10);
const payload={slug,name:{pt:'QA Fisioterapia '+stamp,en:'QA Treatment '+stamp,fr:'QA Soin '+stamp},shortDesc:{pt:'Apenas dados sintéticos',en:'Synthetic test data only',fr:'Données de test uniquement'},longDesc:{pt:'Tratamento de teste'},pole:'kinesitherapie',status:'DRAFT',durationMinutes:45,priceCents:6550,version:0,practitionerIds:['legacy']};
async function req(url,method='GET',body,options={}){
  const r=await fetch(base+url,{method,redirect:'manual',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),Origin:base,...(!options.anonymous&&cookie?{Cookie:cookie}:{}),...options.headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if(options.login)cookie=r.headers.get('set-cookie')?.split(';')[0]??'';
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=null}return {status:r.status,text,data};
}
async function check(title,fn){try{await fn();results.push({title,status:'PASS'});console.log('PASS '+title);}catch(e){results.push({title,status:'FAIL',error:e.message});console.error('FAIL '+title,e.message);throw e;}finally{fs.writeFileSync(path.join(out,'http-results.json'),JSON.stringify(results,null,2));}}
async function current(){config=(await req('/api/admin/treatments')).data;return config.treatments.find(t=>t.slug===slug);}
async function save(changes={}){const treatment=await current();return req('/api/admin/treatments','POST',{...payload,...treatment,revision:config.revision,...changes});}
const booking={patientName:'QA HTTP Treatment Patient',phone:'+351969'+String(stamp).slice(-6),service:slug,date,startTime:'09:00',clientRequestId:'qa-http-'+stamp,_form_rendered_at:Date.now()-6000};
(async()=>{
  await check('anonymous catalogue management is denied',async()=>{for(const method of ['GET','POST'])assert.equal((await req('/api/admin/treatments',method,method==='POST'?payload:undefined,{anonymous:true})).status,401);});
  await check('fixture login and Treatments route are available',async()=>{assert.equal((await req('/api/admin/login','POST',{password:'fix-admin-test'},{login:true})).status,200);assert(cookie);assert.equal((await req('/admin?tab=treatments')).status,200);});
  await check('lightweight admin catalogue reads are protected and omit unrelated scheduling data',async()=>{assert.equal((await req('/api/admin/treatments?catalogueOnly=1','GET',undefined,{anonymous:true})).status,401);const r=await req('/api/admin/treatments?catalogueOnly=1');assert.equal(r.status,200);assert(Array.isArray(r.data.treatments));assert.equal(r.data.practitioners,undefined);assert.equal(r.data.hours,undefined);});

  await check('fresh installation has no seeded treatments or practitioner service assignments',async()=>{
    const c=(await req('/api/admin/treatments')).data;assert(fs.existsSync(fixture));assert.deepEqual(c.treatments,[]);assert.deepEqual(c.services,[]);assert.deepEqual((await req('/api/treatments')).data.services,[]);assert.deepEqual((await req('/api/reviews')).data.reviews,[]);
    for(const url of ['/','/services','/tarifs','/rendez-vous','/avis']){const r=await req(url);assert.equal(r.status,200,url);assert(!r.text.includes('pack-minceur-starter'),url);assert(!r.text.includes('Infinity'),url);assert(!r.text.includes('/services/reeducation-posturale'),url);}
    assert.equal((await req('/services/reeducation-posturale')).status,404);assert(!(await req('/sitemap.xml')).text.includes('/services/reeducation-posturale'));assert(!(await req('/rendez-vous')).text.includes('Descobrir a avaliação'));
  });
  await check('unknown and formerly built-in services cannot be booked, selected or reviewed',async()=>{
    for(const old of ['reeducation-posturale','kinesitherapie-generale','never-configured']){
      assert.equal((await req('/api/slots?date='+date+'&service='+old)).status,400);
      const bookingResult=await req('/api/appointments','POST',{...booking,service:old,clientRequestId:old+'-'+stamp},{anonymous:true});assert.equal(bookingResult.status,409,bookingResult.text);
    }
    const review=await req('/api/reviews','POST',{patientName:'QA Review',rating:5,comment:'Synthetic feedback only',serviceSlug:'never-configured'},{anonymous:true});assert.equal(review.status,422);
  });
  await check('create draft through protected API and read it back',async()=>{const r=await save();assert.equal(r.status,200,r.text);assert.equal((await current()).status,'DRAFT');});
  await check('draft is absent from public catalogue, direct detail and sitemap',async()=>{assert(!(await req('/api/treatments')).data.services.some(s=>s.slug===slug));const detail=await req('/services/'+slug);assert.equal(detail.status,404);assert(!(await req('/sitemap.xml')).text.includes(slug));});
  await check('publish once updates public catalogue, detail, prices, booking and sitemap',async()=>{
    const r=await save({status:'PUBLISHED'});assert.equal(r.status,200,r.text);
    const s=(await req('/api/treatments')).data.services.find(s=>s.slug===slug);assert.equal(s.price,65.5);assert.equal(s.duration,'45 min');assert.equal(s.status,undefined);
    for(const url of ['/services/'+slug,'/services','/tarifs','/rendez-vous','/']){const r=await req(url);assert.equal(r.status,200,url);assert(r.text.includes(payload.name.pt),url);}
    assert((await req('/sitemap.xml')).text.includes('/services/'+slug));
  });

  await check('administrator-owned care goals, body areas and clinical content reach the public service',async()=>{
    const r=await save({careGoals:['drainage'],bodyZones:['arms','back'],sessionFlow:{en:['Custom session step']},indications:{en:['Custom indication']},contraindications:{en:['Custom precaution']},keywords:['unique care alias'],faq:[{q:{en:'Custom question?'},a:{en:'Custom answer.'}}]});assert.equal(r.status,200,r.text);
    const service=(await req('/api/treatments')).data.services.find(s=>s.slug===slug);assert.deepEqual(service.bodyZones,['arms','back']);assert.deepEqual(service.careGoals,['drainage']);assert.deepEqual(service.keywords,['unique care alias']);
    const html=(await req('/services/'+slug)).text;for(const text of ['Custom session step','Custom indication','Custom precaution','Custom question?','Custom answer.'])assert(html.includes(text),text);
  });
  await check('an English-only assessment and zero fee display without a code-defined translation or price',async()=>{
    const c=(await req('/api/admin/treatments')).data,second={...payload,slug:'qa-http-assessment-'+stamp,name:{en:'QA English Assessment '+stamp},shortDesc:{en:'English only custom description'},longDesc:{en:''},pole:'bilan',status:'PUBLISHED',priceCents:0,version:0,revision:c.revision};
    const created=await req('/api/admin/treatments','POST',second);assert.equal(created.status,200,created.text);
    for(const url of ['/services/'+second.slug,'/services','/tarifs','/rendez-vous']){const r=await req(url);assert.equal(r.status,200);assert(r.text.includes(second.name.en),url);}
    const prices=await req('/tarifs');assert(prices.text.includes('0 €')||prices.text.includes('0<!-- --> €'));
    const next=(await req('/api/admin/treatments')).data;assert.equal((await req('/api/admin/treatments','POST',{...second,...created.data.treatment,status:'ARCHIVED',revision:next.revision})).status,200);
  });
  await check('assigned practitioner and duration-aware availability are live',async()=>{assert((await req('/api/practitioners?service='+slug)).data.practitioners.some(p=>p.id==='legacy'));assert((await req('/api/slots?date='+date+'&service='+slug)).data.slots.some(s=>s.time==='09:00'&&s.available));});
  await check('public booking accepts custom treatment and returns committed exact cents',async()=>{const r=await req('/api/appointments','POST',booking,{anonymous:true});assert.equal(r.status,201,r.text);appointment=r.data.confirmation;assert(appointment);assert.equal(appointment.servicePriceCents,6550);assert.equal(appointment.durationMinutes,45);assert.equal(appointment.serviceName.pt,payload.name.pt);});
  await check('the 45-minute reservation blocks the overlapping half-hour',async()=>{const slots=(await req('/api/slots?date='+date+'&service='+slug)).data.slots;assert.equal(slots.find(s=>s.time==='09:30').available,false);assert.equal(slots.find(s=>s.time==='10:00').available,true);});
  await check('price and duration edits preserve booking and invoice defaults',async()=>{
    assert.equal((await save({priceCents:9350,durationMinutes:60,name:{pt:'Novo nome QA '+stamp,fr:'Nouveau nom QA '+stamp}})).status,200);
    const stored=(await req('/api/admin/appointments?search='+encodeURIComponent(booking.patientName))).data.appointments.find(a=>a.id===appointment.id);assert.equal(stored.servicePriceCents,6550);assert.equal(stored.durationMinutes,45);
    const r=await req('/api/admin/invoices','POST',{patientName:booking.patientName,patientPhone:booking.phone,appointmentId:appointment.id,serviceSlug:slug,clientRequestId:'invoice-'+stamp});assert.equal(r.status,201,r.text);invoice=r.data.invoice;assert.equal(invoice.amountCents,6550);assert.equal(invoice.serviceName,payload.name.pt);
  });
  await check('stale writers and cross-origin writes are rejected',async()=>{const old=await current(),revision=config.revision;assert.equal((await save({priceCents:9400})).status,200);assert.equal((await req('/api/admin/treatments','POST',{...payload,...old,revision})).status,409);assert.equal((await req('/api/admin/treatments','POST',{}, {headers:{Origin:'https://foreign.test'}})).status,403);});
  await check('invalid price and unavailable duration fail without mutation',async()=>{const old=await current();for(const changes of [{priceCents:12.3},{durationMinutes:720},{practitionerIds:[]},{pole:['minceur']},{status:['PUBLISHED']}])assert.equal((await save(changes)).status,422);assert.deepEqual(await current(),old);});
  await check('plain text in treatment content cannot inject HTML',async()=>{const text='<img src=x onerror=alert(1)>';assert.equal((await save({name:{pt:text,fr:text}})).status,200);const page=await req('/services/'+slug);assert.equal(page.status,200);assert(!page.text.includes(text));assert(page.text.includes('&lt;img')||page.text.includes('\\u003cimg'));});
  await check('archive removes direct and public access, retains the original reservation and invoice',async()=>{
    assert.equal((await save({status:'ARCHIVED'})).status,200);assert(!(await req('/api/treatments')).data.services.some(s=>s.slug===slug));assert.equal((await req('/services/'+slug)).status,404);assert(!(await req('/sitemap.xml')).text.includes(slug));
    const rejected=await req('/api/appointments','POST',{...booking,phone:'+351968'+String(stamp).slice(-6),patientName:'QA Rejected Patient',startTime:'11:00',clientRequestId:'rejected-'+stamp},{anonymous:true});assert.equal(rejected.status,409,rejected.text);
    const replay=await req('/api/appointments','POST',booking,{anonymous:true});assert.equal(replay.status,201,replay.text);assert.equal(replay.data.confirmation.id,appointment.id);
    const detail=await req('/api/admin/invoices/'+invoice.id);assert.equal(detail.status,200);assert.equal(detail.data.invoice.amountCents,6550);
  });
  await check('safe fixture cleanup leaves the treatment archived and removes capacity from the test appointment',async()=>{
    const r=await req('/api/admin/appointments/'+appointment.id,'DELETE');assert.equal(r.status,200,r.text);
    // Replace the inert XSS sample with a readable label in this synthetic preview only.
    let c=(await req('/api/admin/treatments')).data;
    for(const t of c.treatments.filter(t=>t.slug.startsWith('qa-http-treatment-')&&t.status==='ARCHIVED'&&t.name.pt?.startsWith('<img '))){
      const result=await req('/api/admin/treatments','POST',{...t,revision:c.revision,practitionerIds:c.services.filter(s=>s.service===t.slug).map(s=>s.practitionerId),name:{pt:'QA · Tratamento arquivado',en:'QA · Archived treatment',fr:'QA · Soin archivé'}});assert.equal(result.status,200,result.text);c=(await req('/api/admin/treatments')).data;
    }
  });

  await check('archiving the last treatment returns every public surface to a clean empty catalogue',async()=>{
    assert.deepEqual((await req('/api/treatments')).data.services,[]);
    for(const url of ['/','/services','/tarifs','/rendez-vous'])assert.equal((await req(url)).status,200);
    const c=(await req('/api/admin/treatments')).data;assert(c.treatments.every(t=>t.status==='ARCHIVED'));assert.equal((await req('/services/'+slug)).status,404);
  });
  console.log(JSON.stringify({tests:results.length,pass:results.length,fail:0}));
})().catch(()=>{process.exitCode=1});


