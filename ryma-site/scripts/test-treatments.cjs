const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-patient-integrity-'));
const libsql=process.env.RYMA_TEST_ADAPTER==='libsql';
Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(temp,'fixture.db'),WHATSAPP_ENABLED:'false',SMTP_HOST:''});
delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
if(libsql)process.env.TURSO_DATABASE_URL=pathToFileURL(path.join(temp,'libsql.db')).href;
const cache=new Map(),clients=[];let authorized=true;
class NextRequest extends Request {get nextUrl(){return new URL(this.url)}}
const mocks={
  '@libsql/client':{...require('@libsql/client'),createClient(options){assert.match(options.url,/^file:/);const c=require('@libsql/client').createClient(options);clients.push(c);return c;}},
  'next/server':{NextRequest,NextResponse:Response,after(){}},
  '@/lib/requireAdmin':{requireAdmin:async()=>authorized?{session:{sessionId:'integrity-fixture'}}:Response.json({error:'Unauthorized'},{status:401})},
  '@/lib/email':{sendAppointmentConfirmationEmail:async()=>({}),sendAdminNewBookingNotification:async()=>({})},
};
function load(id,parent=root){
  if(Object.hasOwn(mocks,id))return mocks[id];if(!id.startsWith('@/')&&!id.startsWith('.'))return require(id);
  const base=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(parent,id);
  const file=['.ts','.tsx',''].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());assert(file,id);
  if(cache.has(file))return cache.get(file).exports;const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(child=>load(child,path.dirname(file)),mod,mod.exports);return mod.exports;
}
const db=load('@/lib/db');
const request=(route,method='GET',body)=>new NextRequest('http://clinic.test/api/admin/'+route,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const route=name=>load('@/app/api/admin/'+name+'/route');
const monday=new Date();monday.setUTCDate(monday.getUTCDate()+30);while(monday.getUTCDay()!==1)monday.setUTCDate(monday.getUTCDate()+1);
const date=n=>new Date(+monday+n*86400000).toISOString().slice(0,10);
let person=0;const profile=()=>({patientName:'Integrity fixture '+(++person),phone:'+35196998'+String(person).padStart(4,'0'),medicalHistory:'Clinical history São'});
const book=(p,n=0)=>db.dbCreateMultipleAppointments({patientId:p.id,patientName:p.patientName,phone:p.phone,practitionerId:'legacy',service:'reeducation-posturale',sessions:[{date:date(n),startTime:'09:00',notes:'Retain this clinical note'}]});

const catalog=load('@/lib/treatments'),schedule=load('@/lib/scheduling');
const base={slug:'qa-custom-treatment',name:{pt:'Tratamento São João',en:'Custom treatment',fr:'Soin personnalisé'},shortDesc:{pt:'Um cuidado personalizado.',en:'A tailored treatment.',fr:'Un soin personnalisé.'},longDesc:{pt:'Descrição detalhada.'},pole:'kinesitherapie',status:'DRAFT',durationMinutes:45,priceCents:6550,practitionerIds:['legacy']};
async function input(slug=base.slug,changes={}){const c=await schedule.getSchedulingConfiguration(),t=c.treatments.find(t=>t.slug===slug);return {...base,...t,slug,practitionerIds:c.services.filter(s=>s.service===slug).map(s=>s.practitionerId),version:t?.version??0,revision:c.revision,...changes};}
const save=async(changes={},slug=base.slug)=>catalog.saveTreatment(await input(slug,changes),'synthetic-actor');
test(`Treatments lifecycle on isolated ${libsql?'libSQL':'SQLite'}`,async t=>{
  await t.test('fresh database has no treatments or service mappings; first admin creation updates the revision',async()=>{
    const c=await schedule.getSchedulingConfiguration();assert.deepEqual(c.treatments,[]);assert.deepEqual(c.services,[]);assert.deepEqual(await catalog.getPublicServices(),[]);
    assert.deepEqual(await db.dbGetApprovedReviews(),[]);assert.deepEqual(await db.executeQuery('SELECT * FROM reviews'),[]);
    assert.equal((await db.executeQuery('SELECT * FROM catalogue_migrations')).length,1);
    await save({practitionerIds:['legacy']});assert((await schedule.getSchedulingConfiguration()).revision>c.revision);
    assert.equal((await catalog.getTreatments()).filter(t=>t.slug===base.slug).length,1);
  });
  await t.test('drafts stay out of public catalogue and cannot receive website or dashboard bookings',async()=>{
    assert(!(await catalog.getPublicServices()).some(s=>s.slug===base.slug));
    for(const source of ['website','dashboard','whatsapp']){const p=profile();assert.equal((await db.dbCreateAppointment({...p,service:base.slug,date:date(0),startTime:'09:00',source})).success,false);assert.equal(await db.dbGetPatientByPhone(p.phone),null);}
  });
  await t.test('publishing requires an eligible practitioner and valid working hours',async()=>{
    await assert.rejects(()=>save({status:'PUBLISHED',practitionerIds:[]}),e=>e.code==='INVALID_INPUT');
    await assert.rejects(()=>save({status:'PUBLISHED',durationMinutes:720}),e=>e.code==='INVALID_INPUT');
    await db.executeQuery("UPDATE practitioners SET bookable=0 WHERE id='legacy'");
    await assert.rejects(()=>save({status:'PUBLISHED'}),e=>e.code==='INVALID_INPUT');
    await db.executeQuery("UPDATE practitioners SET bookable=1 WHERE id='legacy'");
    const result=await save({status:'PUBLISHED'});assert.equal(result.status,'PUBLISHED');
    const publicList=await load('@/app/api/treatments/route').GET();assert.equal(publicList.status,200);const service=(await publicList.json()).services.find(s=>s.slug===base.slug);assert.equal(service.price,65.5);assert.equal(service.duration,'45 min');
    for(const key of ['version','status','practitionerIds','actor','updatedAt'])assert.equal(service[key],undefined);
    const providers=await load('@/app/api/practitioners/route').GET(new NextRequest('http://clinic.test/api/practitioners?service='+base.slug));assert.equal(providers.status,200);
  });
  let original;
  await t.test('custom treatment books with exact price, name and full duration snapshots',async()=>{
    const p=profile(),result=await db.dbCreateAppointment({...p,service:base.slug,date:date(0),startTime:'09:00',source:'website',bookingRequestId:'custom-intent'});assert(result.success);original=result.appointment;
    assert.equal(original.durationMinutes,45);assert.equal(original.servicePriceCents,6550);assert.equal(JSON.parse(original.serviceNameJson).pt,base.name.pt);
    assert.equal((await db.dbCheckSlotAvailability(date(0),'09:30',base.slug)).available,false);assert.equal((await db.dbCheckSlotAvailability(date(0),'10:00',base.slug)).available,true);
  });
  await t.test('catalogue updates preserve existing bookings and historical revenue',async()=>{
    const before=await db.dbGetAppointmentSummary();
    await save({priceCents:8925,durationMinutes:60,name:{fr:'Nouveau nom',pt:'Novo nome'}});
    assert.deepEqual(await db.dbGetAppointmentById(original.id),original);assert.deepEqual(await db.dbGetAppointmentSummary(),before);
    const p=profile(),next=await db.dbCreateAppointment({...p,service:base.slug,date:date(1),startTime:'09:00',source:'website'});assert(next.success);assert.equal(next.appointment.servicePriceCents,8925);assert.equal(next.appointment.durationMinutes,60);
    await db.dbUpdateAppointment(original.id,{status:'CONFIRMED'});const stats=await db.dbGetFilteredAnalyticsStats({range:'all'});assert(stats.stats);assert.equal((await db.dbGetAppointmentSummary()).revenue,65.5);
  });
  await t.test('future appointments prevent removing practitioner assignments',async()=>{
    await assert.rejects(()=>save({status:'ARCHIVED',practitionerIds:[]}),e=>e.code==='EXISTING_BOOKINGS'&&e.conflicts.some(a=>a.id===original.id));
    assert((await schedule.getSchedulingConfiguration()).services.some(s=>s.service===base.slug&&s.practitionerId==='legacy'));
  });
  await t.test('archive removes public access, keeps existing care editable and allows confirmed-request replay',async()=>{
    await save({status:'ARCHIVED'});
    assert(!(await catalog.getPublicServices()).some(s=>s.slug===base.slug));
    const p=profile();assert.equal((await db.dbCreateAppointment({...p,service:base.slug,date:date(2),startTime:'09:00'})).success,false);
    const moved=await db.dbUpdateAppointment(original.id,{date:date(7),expectedVersion:(await db.dbGetAppointmentById(original.id)).version});assert.equal(moved.date,date(7));assert.equal(moved.durationMinutes,45);assert.equal(moved.servicePriceCents,6550);
    const replay=await db.dbCreateAppointment({patientName:original.patientName,phone:original.phone,service:base.slug,date:date(0),startTime:'09:00',source:'website',bookingRequestId:'custom-intent'});assert(replay.success);assert(replay.replayed);
    const api=await load('@/app/api/slots/route').GET(new NextRequest('http://clinic.test/api/slots?date='+date(1)+'&service='+base.slug));assert.equal(api.status,400);
  });
  await t.test('existing archived-treatment appointment can still be invoiced',async()=>{
    const invoice=await db.dbCreateInvoice({appointmentId:original.id,patientName:original.patientName,patientPhone:original.phone,serviceSlug:base.slug,amount:65.5,serviceName:base.name.pt});assert.equal(invoice.amountCents,6550);assert.equal(invoice.serviceName,base.name.pt);
    await save({pole:'minceur'});assert.equal((await db.dbGetInvoiceById(invoice.id)).servicePole,'kinesitherapie');
    assert((await db.dbGetInvoices({pole:'kinesitherapie'})).some(i=>i.id===invoice.id));assert(!(await db.dbGetInvoices({pole:'minceur'})).some(i=>i.id===invoice.id));
    const duplicate=await route('invoices').POST(request('invoices','POST',{appointmentId:original.id,patientName:original.patientName,patientPhone:original.phone,serviceSlug:base.slug,clientRequestId:'historical-duplicate'}));assert.equal(duplicate.status,409);
    await db.dbDeleteInvoice(invoice.id); // Explicit replacement keeps the old snapshot and releases the visit.
    const response=await route('invoices').POST(request('invoices','POST',{appointmentId:original.id,patientName:original.patientName,patientPhone:original.phone,serviceSlug:base.slug,clientRequestId:'historical-defaults'}));assert.equal(response.status,201);const created=(await response.json()).invoice;assert.equal(created.amountCents,6550);assert.equal(created.serviceName,base.name.pt);assert.equal(created.servicePole,'kinesitherapie');
    await save({pole:'kinesitherapie'});
  });
  await t.test('parallel editors reject stale updates instead of overwriting',async()=>{
    const payload=await input();const results=await Promise.allSettled([catalog.saveTreatment({...payload,priceCents:1111},'a'),catalog.saveTreatment({...payload,priceCents:2222},'b')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'SCHEDULE_CHANGED');
  });
  await t.test('duplicate creation and edits using an old version cannot replace a treatment',async()=>{
    await assert.rejects(()=>save({version:0}),e=>e.code==='SCHEDULE_CHANGED');
    const payload=await input();await save({priceCents:3333});await assert.rejects(()=>catalog.saveTreatment(payload,'actor'),e=>e.code==='SCHEDULE_CHANGED');
  });
  await t.test('invalid fields and malicious shapes leave the entire database unchanged',async()=>{
    for(const change of [{slug:'../bad'},{priceCents:-1},{priceCents:1.5},{priceCents:5000001},{priceCents:'100'},{durationMinutes:4},{durationMinutes:721},{durationMinutes:12.5},{name:{fr:''}},{name:{fr:'x'.repeat(121)}},{shortDesc:{fr:'x'.repeat(401)}},{longDesc:{fr:'x'.repeat(6001)}},{pole:'unknown'},{pole:['minceur']},{status:['PUBLISHED']},{status:'DELETE'},{practitionerIds:['missing']},{practitionerIds:['legacy','legacy']}]){
      const before=await db.dbExportFullDatabaseBackup();await assert.rejects(()=>save(change),e=>['INVALID_INPUT','SCHEDULE_CHANGED'].includes(e.code));const after=await db.dbExportFullDatabaseBackup();assert.deepEqual(after.tables,before.tables,JSON.stringify(change));
    }
  });
  await t.test('transaction failure rolls back treatment, mappings and audit history together',async()=>{
    const before=await db.dbExportFullDatabaseBackup();await db.executeQuery("CREATE TRIGGER reject_treatment_audit BEFORE INSERT ON treatment_revisions BEGIN SELECT RAISE(ABORT,'audit_unavailable'); END");
    try {await assert.rejects(()=>save({priceCents:4000}),/audit_unavailable/);}finally{await db.executeQuery('DROP TRIGGER reject_treatment_audit');}
    assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,before.tables);
  });
  await t.test('Team and resource assignment accept a custom treatment and preserve duration overrides',async()=>{
    await db.executeQuery('UPDATE practitioner_services SET durationMinutes=75,bufferBefore=5,bufferAfter=10 WHERE service=?',[base.slug]);
    await save({status:'PUBLISHED'});const c=await schedule.getSchedulingConfiguration(),p=c.practitioners.find(p=>p.id==='legacy');
    await schedule.saveSchedulingConfiguration({revision:c.revision,action:'practitioner',practitioner:p,services:c.services.filter(s=>s.practitionerId===p.id),hours:c.hours.filter(h=>h.practitionerId===p.id)});
    const mapping=(await schedule.getSchedulingConfiguration()).services.find(s=>s.service===base.slug);assert.equal(mapping.durationMinutes,75);assert.equal(mapping.bufferBefore,5);
    const booking=await db.dbCreateAppointment({...profile(),service:base.slug,date:date(14),startTime:'09:00'});assert(booking.success);assert.equal(booking.appointment.durationMinutes,75);
  });
  await t.test('recurring custom treatment plans reserve and record the correct service',async()=>{
    const p=await db.dbUpsertPatient(profile());const series=await db.dbCreateMultipleAppointments({...p,patientId:p.id,service:base.slug,sessions:[{date:date(21),startTime:'09:00'},{date:date(28),startTime:'09:00'}]});assert(series.success);assert.equal(series.appointments.length,2);assert(series.patientSessions.every(s=>s.serviceSlug===base.slug&&s.clinicalStatus==='PLANNED'));
  });
  await t.test('new backup format restores custom catalogue, assignments, snapshots and revisions',async()=>{
    const snapshot=await db.dbExportFullDatabaseBackup();assert.equal(snapshot.version,'3.0.0');assert(snapshot.tables.treatment_revisions.length);
    await save({priceCents:4500,status:'ARCHIVED'});await db.dbRestoreFullDatabaseBackup(snapshot);
    assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,snapshot.tables);
    const malformed=structuredClone(snapshot);malformed.tables.treatment_catalog.find(t=>t.slug===base.slug).priceCents=-5;await assert.rejects(()=>db.dbRestoreFullDatabaseBackup(malformed));assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,snapshot.tables);
  });
  await t.test('admin API requires authentication, validates JSON and records hashed actor identity',async()=>{
    const r=route('treatments');authorized=false;try{assert.equal((await r.GET(request('treatments'))).status,401);assert.equal((await r.POST(request('treatments','POST',{}))).status,401);}finally{authorized=true;}
    assert.equal((await r.POST(request('treatments','POST',[]))).status,400);
    assert.equal((await r.POST(new NextRequest('http://clinic.test/api/admin/treatments',{method:'POST',body:'{'}))).status,400);
    assert.equal((await r.POST(new NextRequest('http://clinic.test/api/admin/treatments',{method:'POST',headers:{Origin:'https://foreign.test'},body:JSON.stringify(await input())}))).status,403);
    const local=await r.POST(new NextRequest('http://localhost:3119/api/admin/treatments',{method:'POST',headers:{Host:'127.0.0.1:3119',Origin:'http://127.0.0.1:3119'},body:JSON.stringify(await input(base.slug,{priceCents:4522}))}));assert.equal(local.status,200);
    assert.equal((await r.POST(request('treatments','POST',{...await input(),longDesc:{fr:'x'.repeat(65000)}}))).status,413);
    const response=await r.POST(request('treatments','POST',await input(base.slug,{priceCents:4555})));assert.equal(response.status,200);
    const rows=await db.executeQuery('SELECT actor FROM treatment_revisions ORDER BY rowid DESC LIMIT 1');assert.equal(rows[0].actor.length,64);assert(!rows[0].actor.includes('integrity-fixture'));
  });
  await t.test('WhatsApp menus include published custom services and recover when selection is archived',async()=>{
    const advance=load('@/lib/whatsapp/conversation').advanceConversation;let result=await advance(null,{from:'351969980888',text:'Custom treatment'});
    // Resolve by immutable identifier even after a display-name edit.
    result=await advance(null,{from:'351969980888',text:base.slug});assert.equal(result.state.service,base.slug);
    await save({status:'ARCHIVED'});const stale={...result.state,step:'confirm',name:'Fixture',date:date(35),time:'09:00',requestId:'wa-fixture',choices:[],expiresAt:Date.now()+60000};
    result=await advance(stale,{from:'351969980888',text:'?'});assert.equal(result.state.step,'service');assert(!result.state.choices.some(c=>c.action.value===base.slug));
  });
  await t.test('empty published catalogue returns an empty list and a useful WhatsApp reply',async()=>{
    const backup=await db.dbExportFullDatabaseBackup();await db.executeQuery("UPDATE treatment_catalog SET status='ARCHIVED'");
    assert.deepEqual(await catalog.getPublicServices(),[]);const result=await load('@/lib/whatsapp/conversation').advanceConversation(null,{from:'351969980889',text:'book'});assert.equal(result.replies[0].type,'text');
    await db.dbRestoreFullDatabaseBackup(backup);
  });
  await t.test('migration reruns preserve archives, custom services and intentionally empty catalogues',async()=>{
    const migration=load('@/lib/scheduling-schema');
    const repeat=async()=>{if(libsql){const client=mocks['@libsql/client'].createClient({url:process.env.TURSO_DATABASE_URL});await migration.migrateSchedulingDatabase(client);}else{const sqlite=new (require('better-sqlite3'))(process.env.DATABASE_PATH);try{migration.migrateSchedulingSqlite(sqlite);}finally{sqlite.close();}}};
    const backup=await db.dbExportFullDatabaseBackup();await repeat();assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,backup.tables);
    await db.executeQuery('DELETE FROM treatment_catalog');await repeat();assert.deepEqual(await catalog.getPublicServices(),[]);await db.dbRestoreFullDatabaseBackup(backup);
  });

  await t.test('optional clinical content, goals and areas round-trip, preserve omissions and clear explicitly',async()=>{
    const slug='qa-editor-content';
    const content={status:'DRAFT',name:{en:'English first'},shortDesc:{en:'English summary'},longDesc:{en:''},practitionerIds:[],careGoals:['drainage','postpartum'],bodyZones:['arms','back'],sessionFlow:{en:['Step one','Step two']},indications:{en:['An indication']},contraindications:{en:['A contraindication']},keywords:['custom alias'],faq:[{q:{en:'A question?'},a:{en:'An answer.'}}]};
    let r=await save(content,slug);const localize=load('@/data/services');assert.equal(localize.getLocalizedText(r.name,'fr'),'English first');assert.deepEqual(localize.getLocalizedList(r.sessionFlow,'pt'),['Step one','Step two']);
    const edited=await input(slug,{name:{en:'Updated English'}});for(const key of ['careGoals','bodyZones','sessionFlow','indications','contraindications','keywords','faq'])delete edited[key];
    r=await catalog.saveTreatment(edited,'actor');assert.equal(localize.getLocalizedText(r.name,'fr'),'Updated English');assert.deepEqual(r.careGoals,content.careGoals);assert.deepEqual(r.sessionFlow.en,['Step one','Step two']);
    r=await save({careGoals:[],bodyZones:[],sessionFlow:{fr:[]},indications:{fr:[]},contraindications:{fr:[]},keywords:[],faq:[]},slug);assert.deepEqual(r.careGoals,[]);assert.deepEqual(localize.getLocalizedList(r.sessionFlow,'en'),[]);assert.deepEqual(r.faq,[]);
  });
  await t.test('malformed discovery and clinical fields reject atomically, including inherited object keys',async()=>{
    for(const change of [{careGoals:['unknown']},{careGoals:['drainage','drainage']},{careGoals:'drainage'},{careGoals:null},{bodyZones:[{}]},{bodyZones:['head']},{bodyZones:null},{keywords:[null]},{keywords:['x'.repeat(101)]},{sessionFlow:{en:'not-an-array'}},{indications:[]},{contraindications:null},{faq:[{q:{en:'Question'},a:{en:''}}]},{faq:Array(21).fill({q:{en:'Q'},a:{en:'A'}})}]){
      const before=await db.dbExportFullDatabaseBackup();await assert.rejects(()=>save(change,'qa-editor-content'),e=>e.code==='INVALID_INPUT');assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,before.tables,JSON.stringify(change));
    }
    const body=await input('qa-editor-content');body.name=JSON.parse('{"__proto__":{"polluted":true},"en":"Safe"}');await catalog.saveTreatment(body,'actor');assert.equal({}.polluted,undefined);
  });
  await t.test('zero price and numeric boundaries persist exactly without invented charges',async()=>{
    const slug='qa-free-care';await save({status:'PUBLISHED',priceCents:0,durationMinutes:5,practitionerIds:['legacy']},slug);
    const result=await db.dbCreateAppointment({...profile(),service:slug,date:date(42),startTime:'09:00',source:'website'});assert(result.success);assert.equal(result.appointment.servicePriceCents,0);assert.equal(result.appointment.durationMinutes,5);
    await save({priceCents:5000000,durationMinutes:720,status:'DRAFT'},slug);assert.equal((await catalog.getTreatments()).find(t=>t.slug===slug).price,50000);assert.equal((await db.dbGetAppointmentById(result.appointment.id)).servicePriceCents,0);
    const response=await route('invoices').POST(request('invoices','POST',{appointmentId:result.appointment.id,patientName:result.appointment.patientName,patientPhone:result.appointment.phone,serviceSlug:slug,clientRequestId:'zero-fee-invoice'}));assert.equal(response.status,422);assert.equal((await db.dbGetInvoices({})).filter(i=>i.appointmentId===result.appointment.id).length,0);
  });
  await t.test('every publication-state transition enforces public availability and supports republishing',async()=>{
    const slug='qa-state-matrix';await save({practitionerIds:['legacy']},slug);
    for(const from of ['DRAFT','PUBLISHED','ARCHIVED'])for(const to of ['DRAFT','PUBLISHED','ARCHIVED']){
      await save({status:from},slug);const r=await save({status:to},slug);assert.equal(r.status,to);assert.equal(await catalog.isKnownTreatment(slug,true),to==='PUBLISHED');
      assert.equal((await db.dbCheckSlotAvailability(date(43),'09:00',slug)).available,to==='PUBLISHED');
    }
  });
  await t.test('a new practitioner with no selected treatments handles none; selecting three handles only those three',async()=>{
    const slugs=['qa-assigned-one','qa-assigned-two','qa-assigned-three','qa-not-assigned'];
    for(const slug of slugs)await save({status:'PUBLISHED',practitionerIds:['legacy']},slug);
    const c=await schedule.getSchedulingConfiguration();let next=await schedule.saveSchedulingConfiguration({action:'practitioner',revision:c.revision,practitioner:{name:'Explicit Selection',profession:'Therapist',color:'#123456',active:1,bookable:1,priority:3},services:[],hours:load('@/types/scheduling').DEFAULT_HOURS});
    const p=next.practitioners.find(p=>p.name==='Explicit Selection');for(const slug of slugs)assert.equal((await db.dbCheckSlotAvailability(date(44),'09:00',slug,{practitionerId:p.id})).available,false);
    next=await schedule.saveSchedulingConfiguration({action:'practitioner',revision:next.revision,practitioner:p,services:slugs.slice(0,3).map(service=>({service,durationMinutes:null,bufferBefore:0,bufferAfter:0})),hours:load('@/types/scheduling').DEFAULT_HOURS});
    for(const [i,slug] of slugs.entries())assert.equal((await db.dbCheckSlotAvailability(date(44),'09:00',slug,{practitionerId:p.id})).available,i<3);
    await save({status:'PUBLISHED',practitionerIds:['legacy']},'qa-added-later');assert.equal((await db.dbCheckSlotAvailability(date(44),'09:00','qa-added-later',{practitionerId:p.id})).available,false);
  });
  await t.test('recurring preview and commit use the custom duration rather than the old 30-minute fallback',async()=>{
    const slug='qa-long-custom';await save({status:'PUBLISHED',durationMinutes:90,practitionerIds:['legacy']},slug);
    const sessions=[{date:date(49),startTime:'09:00'},{date:date(49),startTime:'10:00'}];
    const response=await route('appointments/multiple/preview').POST(request('appointments/multiple/preview','POST',{serviceSlug:slug,practitionerId:'legacy',explicitSessions:sessions}));assert.equal(response.status,200);const preview=await response.json();assert.equal(preview.summary.conflictCount,2);assert.equal(preview.summary.validCount,0);
    const result=await db.dbCreateMultipleAppointments({...profile(),service:slug,practitionerId:'legacy',sessions});assert.equal(result.success,false);assert.equal((await db.dbGetAppointments({date:date(49)})).length,0);
  });
  await t.test('reviews and clinical records require a real treatment instead of substituting a static default',async()=>{
    const review=load('@/app/api/reviews/route'),baseReview={patientName:'Service review fixture',rating:5,comment:'Useful synthetic feedback.'};
    for(const serviceSlug of [undefined,'unknown-service','kinesitherapie-generale']){const r=await review.POST(new NextRequest('http://clinic.test/api/reviews',{method:'POST',body:JSON.stringify({...baseReview,serviceSlug})}));assert.equal(r.status,422);}
    const accepted=await review.POST(new NextRequest('http://clinic.test/api/reviews',{method:'POST',body:JSON.stringify({...baseReview,serviceSlug:base.slug})}));assert.equal(accepted.status,201);assert.equal((await accepted.json()).review.status,'PENDING');
    const p=await db.dbUpsertPatient(profile());await assert.rejects(()=>db.dbAddPatientSession({patientId:p.id,date:'2020-01-06'}),e=>e.code==='INVALID_SERVICE');
    const clinical=await db.dbAddPatientSession({patientId:p.id,serviceSlug:base.slug,date:'2020-01-06'});assert.equal(clinical.serviceSlug,base.slug);
    assert.equal(await catalog.isKnownTreatment('kinesitherapie-generale'),false);
    await assert.rejects(()=>db.dbCreateInvoice({patientId:p.id,patientName:p.patientName,patientPhone:p.phone,practitionerId:'legacy',serviceSlug:'unconfigured-invoice-service',amount:25}),db.DocumentError);
  });
  await t.test('legacy-only mapping backups remain restorable without making those treatments bookable',async()=>{
    const snapshot=await db.dbExportFullDatabaseBackup();const legacy=structuredClone(snapshot);legacy.tables.practitioner_services.push({practitionerId:'legacy',service:'historical-unlisted',durationMinutes:47,bufferBefore:0,bufferAfter:0});
    await db.dbRestoreFullDatabaseBackup(legacy);assert.equal(await catalog.isKnownTreatment('historical-unlisted'),false);assert.equal((await db.dbCheckSlotAvailability(date(50),'09:00','historical-unlisted')).available,false);
    const c=await schedule.getSchedulingConfiguration();await schedule.saveSchedulingConfiguration({revision:c.revision,action:'practitioner',practitioner:c.practitioners.find(p=>p.id==='legacy'),services:c.services.filter(s=>s.practitionerId==='legacy'),hours:c.hours.filter(h=>h.practitionerId==='legacy')});
    const old=structuredClone(legacy);old.version='2.0.0';delete old.tables.treatment_catalog;delete old.tables.treatment_revisions;const before=await catalog.getTreatments();await db.dbRestoreFullDatabaseBackup(old);assert.deepEqual(await catalog.getTreatments(),before);await db.dbRestoreFullDatabaseBackup(snapshot);
  });
  await t.test('SQL duration guards use the persisted catalogue even for direct legacy writers',async()=>{
    const slug='qa-raw-duration';await save({status:'PUBLISHED',durationMinutes:75,practitionerIds:['legacy']},slug);
    const first=await db.dbCreateAppointment({...profile(),service:slug,date:date(51),startTime:'09:00'});assert(first.success);
    const clone={...first.appointment,id:'raw-duration-fixture',phone:profile().phone,patientId:null,startTime:'11:00',durationMinutes:null,bookingRequestId:null,bookingRequestHash:null};const keys=Object.keys(clone);await db.executeQuery('INSERT INTO appointments('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')',keys.map(k=>clone[k]));assert.equal((await db.dbGetAppointmentById(clone.id)).durationMinutes,75);
    assert.equal((await db.dbCreateAppointment({...profile(),service:slug,date:date(51),startTime:'12:00'})).success,false);
  });

  await t.test('catalogue outages return retryable JSON without internal database details',async()=>{
    const originalQuery=db.executeQuery;db.executeQuery=async(sql,...args)=>{if(sql.includes('treatment_catalog'))throw Error('private-database-detail');return originalQuery(sql,...args);};
    try{for(const id of ['treatments','practitioners','slots']){const r=await load('@/app/api/'+id+'/route').GET(new NextRequest('http://clinic.test/api/'+id+'?service='+base.slug+'&date='+date(1)));assert.equal(r.status,503);assert(!(await r.text()).includes('private-database-detail'));}}finally{db.executeQuery=originalQuery;}
  });
});
test.after(()=>{for(const c of clients)c.close();});
