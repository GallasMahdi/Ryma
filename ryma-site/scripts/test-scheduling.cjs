const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const ts=require('typescript');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-scheduling-'));
const libsql=process.env.RYMA_TEST_ADAPTER==='libsql';
Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(temp,'test.db')});
delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
if(libsql)process.env.TURSO_DATABASE_URL=pathToFileURL(path.join(temp,'libsql.db')).href;
const root=path.resolve(__dirname,'..'),cache=new Map(),clients=[];
let authorized=true;
class NextRequest extends Request { get nextUrl(){return new URL(this.url);} }
const mocks={
  '@libsql/client':{...require('@libsql/client'),createClient(options){assert.match(options.url,/^file:/,'Remote database prohibited');const client=require('@libsql/client').createClient(options);clients.push(client);return client;}},
  'next/server':{NextRequest,NextResponse:Response,after(){}},
  '@/lib/requireAdmin':{requireAdmin:async()=>authorized?{session:{sessionId:'fixture'}}:Response.json({error:'Unauthorized'},{status:401}),requireOwnerAnalytics:async()=>authorized?{session:{sessionId:'fixture'}}:Response.json({error:'Unauthorized'},{status:401})},
  '@/lib/email':{sendAppointmentConfirmationEmail:async()=>({}),sendAdminNewBookingNotification:async()=>({})},
};
function load(id,parent=root){
  if(Object.hasOwn(mocks,id))return mocks[id];
  if(!id.startsWith('@/')&&!id.startsWith('.'))return require(id);
  const base=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(parent,id);
  const file=['.ts','.tsx',''].map(ext=>base+ext).find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());assert(file,id);
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(child=>load(child,path.dirname(file)),mod,mod.exports);return mod.exports;
}
const db=load('@/lib/db'),schedule=load('@/lib/scheduling'),{DEFAULT_HOURS}=load('@/types/scheduling');
const {SERVICES}=require('./fixtures/services.cjs');
const base=new Date();base.setUTCDate(base.getUTCDate()+30);while(base.getUTCDay()!==1)base.setUTCDate(base.getUTCDate()+1);
const date=n=>new Date(+base+n*86400000).toISOString().slice(0,10);
let phoneCounter=100000;
const input=(overrides={})=>({patientName:'Schedule Test',phone:'+35196'+String(++phoneCounter).padStart(7,'0'),service:'reeducation-posturale',date:date(0),startTime:'09:00',...overrides});
const save=async body=>schedule.saveSchedulingConfiguration({...body,revision:(await schedule.getSchedulingConfiguration()).revision});
const request=(url,body,method='POST')=>new NextRequest('https://clinic.test'+url,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
let practitionerA='legacy',practitionerB,practitionerC;
const services=()=>SERVICES.map(s=>({service:s.slug,durationMinutes:null,bufferBefore:0,bufferAfter:0}));
test.before(async()=>require('./fixtures/services.cjs').seedTestServices(db));
test(`Team scheduling on isolated ${libsql?'libSQL':'SQLite'}`,async t=>{
  await t.test('intentional review reset stays empty on admin and public reads',async()=>{
    await db.executeQuery("INSERT INTO security_settings(key,value,updatedAt) VALUES('reviews_seed_disabled','1',?)",[new Date().toISOString()]);
    assert.deepEqual(await db.dbGetApprovedReviews(),[]);
    assert.deepEqual(await db.dbGetAllReviewsAdmin(),[]);
    assert.equal((await db.executeQuery('SELECT COUNT(*) AS count FROM reviews'))[0].count,0);
  });
  await t.test('migration seeds one practitioner and is recorded once',async()=>{const config=await schedule.getSchedulingConfiguration();assert.equal(config.practitioners.length,1);assert.equal(config.hours.length,24);assert.equal((await db.executeQuery('SELECT * FROM schema_migrations')).length,2);assert.equal((await db.executeQuery("SELECT name FROM sqlite_master WHERE name='idx_appointments_active_slot'")).length,0);});
  await t.test('admin can create practitioners with services and split shifts',async()=>{for(const name of ['Practitioner B','Practitioner C'])await save({action:'practitioner',practitioner:{name,profession:'Physiotherapist',color:'#123456',active:1,bookable:1,priority:1},services:services(),hours:DEFAULT_HOURS});const config=await schedule.getSchedulingConfiguration();practitionerB=config.practitioners.find(p=>p.name==='Practitioner B').id;practitionerC=config.practitioners.find(p=>p.name==='Practitioner C').id;assert.equal(config.practitioners.length,3);});
  await t.test('two practitioners can book the same time; partial overlap on one is rejected',async()=>{assert((await db.dbCreateAppointment(input({practitionerId:practitionerA}))).success);assert((await db.dbCreateAppointment(input({practitionerId:practitionerB}))).success);assert.equal((await db.dbCreateAppointment(input({practitionerId:practitionerA,startTime:'09:30'}))).success,false);assert((await db.dbCreateAppointment(input({practitionerId:practitionerA,startTime:'10:00'}))).success);});
  await t.test('duration is persisted, and one patient cannot book two practitioners simultaneously',async()=>{const details=input({date:date(1),practitionerId:practitionerA});const result=await db.dbCreateAppointment(details);assert(result.success);assert.equal(result.appointment.durationMinutes,50);assert.equal((await db.dbCreateAppointment({...details,practitionerId:practitionerB})).success,false);});
  await t.test('parallel earliest requests fill capacity without duplicates',async()=>{const results=await Promise.all(Array.from({length:8},()=>db.dbCreateAppointment(input({date:date(2),source:'website'}))));const successes=results.filter(r=>r.success);assert.equal(successes.length,3);assert.equal(new Set(successes.map(r=>r.appointment.practitionerId)).size,3);});
  await t.test('parallel retry has exactly one assignment and rejects a changed payload',async()=>{const details=input({date:date(3),source:'website',bookingRequestId:'test-unique-request'});const results=await Promise.all(Array.from({length:5},()=>db.dbCreateAppointment(details)));assert(results.every(r=>r.success));assert.equal(new Set(results.map(r=>r.appointment.id)).size,1);assert.equal((await db.dbCreateAppointment({...details,startTime:'10:00'})).success,false);});
  await t.test('full treatment must fit inside working hours and lunch breaks',async()=>{for(const startTime of ['12:00','17:00','07:00'])assert.equal((await db.dbCreateAppointment(input({date:date(4),startTime,practitionerId:practitionerA}))).success,false);assert.equal((await db.dbCreateAppointment(input({date:date(6),practitionerId:practitionerA}))).success,false);});
  await t.test('practitioner blocks preserve other practitioners and cover partial intervals',async()=>{await db.dbToggleBlockSlot(date(7),'09:30',practitionerA);assert.equal((await db.dbCheckSlotAvailability(date(7),'09:00','reeducation-posturale',{practitionerId:practitionerA})).available,false);assert.equal((await db.dbCheckSlotAvailability(date(7),'09:00','reeducation-posturale',{practitionerId:practitionerB})).available,true);await db.dbToggleBlockSlot(date(7),'09:30',practitionerA);assert.equal((await db.dbCheckSlotAvailability(date(7),'09:00','reeducation-posturale',{practitionerId:practitionerA})).available,true);});
  await t.test('leave closes only one practitioner and clinic closure closes everyone',async()=>{await save({action:'exception',exception:{practitionerId:practitionerA,date:date(8),startMinute:0,endMinute:1440,kind:'closed',label:'Leave'}});assert.equal((await db.dbCheckSlotAvailability(date(8),'09:00','reeducation-posturale',{practitionerId:practitionerA})).available,false);assert.equal((await db.dbCheckSlotAvailability(date(8),'09:00','reeducation-posturale',{practitionerId:practitionerB})).available,true);await save({action:'exception',exception:{practitionerId:'*',date:date(9),startMinute:0,endMinute:1440,kind:'closed',label:'Closed'}});assert.equal((await db.dbCheckSlotAvailability(date(9),'09:00','reeducation-posturale')).available,false);});
  await t.test('schedule changes cannot strand future appointments',async()=>{await assert.rejects(()=>save({action:'exception',exception:{practitionerId:practitionerA,date:date(0),startMinute:0,endMinute:1440,kind:'closed',label:'Conflict'}}),e=>e.code==='EXISTING_BOOKINGS'&&e.conflicts.length>0);});
  await t.test('stale configuration revision is rejected',async()=>{const revision=(await schedule.getSchedulingConfiguration()).revision;await db.dbToggleBlockSlot(date(10),'15:00',practitionerB);await assert.rejects(()=>schedule.saveSchedulingConfiguration({action:'clinic-hours',hours:DEFAULT_HOURS,revision}),e=>e.code==='SCHEDULE_CHANGED');});
  await t.test('shared equipment prevents simultaneous reservations across practitioners',async()=>{await save({action:'resource',resource:{name:'Shared machine',active:1},services:['cavitation']});const first=await db.dbCreateAppointment(input({date:date(11),service:'cavitation',practitionerId:practitionerA}));assert(first.success);assert.equal((await db.dbCreateAppointment(input({date:date(11),service:'cavitation',practitionerId:practitionerB}))).success,false);});
  await t.test('raw database writers cannot bypass interval and resource collision guards',async()=>{const original=(await db.dbGetAppointments({date:date(11)}))[0];const clone={...original,id:'raw-conflict',phone:'+351969999999',practitionerId:practitionerB,patientId:null,bookingRequestId:null};const keys=Object.keys(clone);await assert.rejects(()=>db.executeQuery(`INSERT INTO appointments(${keys.join(',')}) VALUES(${keys.map(()=>'?')})`,keys.map(k=>clone[k])),/slot_taken/);});
  await t.test('recurring sessions maintain one practitioner and commit atomically',async()=>{const details=input();const result=await db.dbCreateMultipleAppointments({...details,practitionerId:practitionerB,sessions:[{date:date(14),startTime:'09:00'},{date:date(15),startTime:'09:00'}]});assert(result.success);assert(result.appointments.every(a=>a.practitionerId===practitionerB));assert(result.patientSessions.every(s=>s.practitionerId===practitionerB&&s.appointmentId));const before=(await db.dbGetAppointments({date:date(16)})).length;const conflict=await db.dbCreateMultipleAppointments({...input(),practitionerId:practitionerB,sessions:[{date:date(16),startTime:'09:00'},{date:date(14),startTime:'09:00'}]});assert.equal(conflict.success,false);assert.equal((await db.dbGetAppointments({date:date(16)})).length,before);});
  await t.test('reassignment checks conflicts and edit version',async()=>{const a=(await db.dbGetAppointments({date:date(0),practitionerId:practitionerA})).find(a=>a.startTime==='09:00');await assert.rejects(()=>db.dbUpdateAppointment(a.id,{practitionerId:practitionerB,expectedVersion:a.version}),/unavailable/);const moved=await db.dbUpdateAppointment(a.id,{practitionerId:practitionerC,expectedVersion:a.version});assert.equal(moved.practitionerId,practitionerC);assert.equal(moved.version,a.version+1);assert.equal(moved.durationMinutes,50);await assert.rejects(()=>db.dbUpdateAppointment(a.id,{notes:'stale',expectedVersion:a.version}),/another user/);});
  await t.test('admin slot API marks all occupied intervals',async()=>{const route=load('@/app/api/admin/slots/route');const res=await route.GET(request(`/api/admin/slots?date=${date(0)}&practitionerId=${practitionerB}`,null,'GET'));assert.equal(res.status,200);const body=await res.json();assert.equal(body.slots.find(s=>s.time==='09:30').reason,'booked');});
  await t.test('public availability and profile APIs never return patient details',async()=>{const slots=load('@/app/api/slots/route'),profiles=load('@/app/api/practitioners/route');const res=await slots.GET(request(`/api/slots?date=${date(0)}&service=reeducation-posturale&practitionerId=${practitionerB}`,null,'GET'));assert.equal(res.status,200);const text=await res.text();assert(!text.includes('patientName'));assert(!text.includes('Schedule Test'));assert(!text.includes('candidates'));const list=await profiles.GET(request('/api/practitioners?service=reeducation-posturale',null,'GET'));assert.equal((await list.json()).practitioners.length,3);});
  await t.test('management endpoints require authentication',async()=>{authorized=false;const route=load('@/app/api/admin/practitioners/route');assert.equal((await route.GET(request('/api/admin/practitioners',null,'GET'))).status,401);assert.equal((await route.POST(request('/api/admin/practitioners',{action:'clinic-hours',hours:[]}))).status,401);authorized=true;});
  await t.test('manual future entries reserve practitioner; past entries only record history',async()=>{const patient=await db.dbUpsertPatient({patientName:'Manual Patient',phone:'+351969900001'});const future=await db.dbAddPatientSession({patientId:patient.id,date:date(18),time:'09:00',serviceSlug:'reeducation-posturale',practitionerId:practitionerA});assert(future.appointmentId);const past=await db.dbAddPatientSession({patientId:patient.id,date:'2020-01-01',time:'09:00',serviceSlug:'reeducation-posturale',practitionerId:practitionerA});assert.equal(await db.dbGetAppointmentById('apt_'+past.id),null);});
  await t.test('documents preserve practitioner identity and reject ambiguous authors',async()=>{
    const a=(await db.dbGetAppointments({date:date(0),practitionerId:practitionerB}))[0];
    const invoice=await db.dbCreateInvoice({appointmentId:a.id,patientName:a.patientName,patientPhone:a.phone,serviceSlug:a.service,amount:50});
    assert.equal(invoice.practitionerId,practitionerB);assert.equal(invoice.practitioner,a.practitionerName);
    await assert.rejects(()=>db.dbCreateInvoice({patientName:a.patientName,patientPhone:a.phone,serviceSlug:a.service,amount:50}),/Choose an active practitioner/);
    const rx=await db.dbCreatePrescription({practitionerId:practitionerB,patientName:a.patientName,patientPhone:a.phone,items:[{category:'lifestyle_habit',title:'Fixture',instructions:'Fixture'}]});
    assert.equal(rx.practitionerId,practitionerB);assert.equal((await db.dbGetPrescriptionsByPatientPhone(a.phone))[0].practitionerId,practitionerB);
  });
  await t.test('bulk blocks are scoped, preserve booked intervals and commit the complete range',async()=>{
    const route=load('@/app/api/admin/slots/bulk/route');const res=await route.POST(request('/api/admin/slots/bulk',{date:date(0),scope:'custom',times:['09:00','09:30','14:00'],practitionerId:practitionerB}));assert.equal(res.status,200);
    const blocks=await db.executeQuery('SELECT * FROM blocked_slots WHERE date=? AND practitionerId=?',[date(0),practitionerB]);assert.deepEqual(blocks.map(b=>b.time),['14:00']);
    assert.equal((await db.dbCheckSlotAvailability(date(0),'14:00','reeducation-posturale',{practitionerId:practitionerC})).available,true);
  });
  await t.test('concurrent edits reject a stale appointment version',async()=>{
    const created=await db.dbCreateAppointment(input({date:date(21),practitionerId:practitionerB}));assert(created.success);
    const results=await Promise.allSettled(['one','two'].map(notes=>db.dbUpdateAppointment(created.appointment.id,{notes,expectedVersion:1})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  });
  await t.test('backup restores team configuration and every assignment atomically',async()=>{
    const backup=await db.dbExportFullDatabaseBackup();assert.equal(backup.version,'3.0.0');
    const revision=(await schedule.getSchedulingConfiguration()).revision;
    await db.dbRestoreFullDatabaseBackup(backup);
    const restored=await db.dbExportFullDatabaseBackup();
    for(const table of Object.keys(backup.tables))assert.deepEqual(restored.tables[table],backup.tables[table],table);
    assert((await schedule.getSchedulingConfiguration()).revision>revision);
    const malformed=structuredClone(backup);malformed.tables.practitioners=undefined;
    await assert.rejects(()=>db.dbRestoreFullDatabaseBackup(malformed),/Missing or invalid/);
    const collision=structuredClone(backup);collision.tables.appointments.push({...collision.tables.appointments[0],id:'backup-conflict',bookingRequestId:null});
    await assert.rejects(()=>db.dbRestoreFullDatabaseBackup(collision),/slot_taken|UNIQUE/);
    assert.equal((await db.dbGetAppointments()).length,backup.tables.appointments.length);
  });
  await t.test('duration overrides, buffers, cancellation and dated Sunday opening agree',async()=>{
    const config=await schedule.getSchedulingConfiguration(),p=config.practitioners.find(p=>p.id===practitionerC);
    const customized=services().map(s=>s.service==='radiofrequence'?{...s,durationMinutes:60,bufferBefore:15,bufferAfter:15}:s);
    await save({action:'practitioner',practitioner:p,services:customized,hours:DEFAULT_HOURS});
    const res=await db.dbCreateAppointment(input({date:date(22),service:'radiofrequence',practitionerId:practitionerC}));assert(res.success);assert.equal(res.appointment.durationMinutes,60);
    assert.equal((await db.dbCreateAppointment(input({date:date(22),startTime:'10:00',practitionerId:practitionerC}))).success,false);
    assert.equal((await db.dbCheckSlotAvailability(date(22),'10:30','radiofrequence',{practitionerId:practitionerC})).available,true);
    await db.dbUpdateAppointment(res.appointment.id,{status:'CANCELLED',expectedVersion:1});
    assert.equal((await db.dbCheckSlotAvailability(date(22),'09:00','radiofrequence',{practitionerId:practitionerC})).available,true);
    for(const practitionerId of ['*',practitionerC])await save({action:'exception',exception:{practitionerId,date:date(27),kind:'open',startMinute:540,endMinute:720,label:'Sunday opening'}});
    assert.equal((await db.dbCheckSlotAvailability(date(27),'09:00','reeducation-posturale',{practitionerId:practitionerC})).available,true);
    assert.equal((await db.dbCheckSlotAvailability(date(27),'09:00','reeducation-posturale',{practitionerId:practitionerA})).available,false);
  });
  await t.test('populated single-practitioner migration preserves historical data',async()=>{
    const fixture=path.join(temp,'legacy.db'),schema=load('@/lib/scheduling-schema');
    const sql=[
      'CREATE TABLE appointments(id TEXT PRIMARY KEY,phone TEXT,service TEXT,date TEXT,startTime TEXT,status TEXT)',
      'CREATE TABLE patients(id TEXT PRIMARY KEY,phone TEXT)',
      'CREATE TABLE patient_sessions(id TEXT PRIMARY KEY,practitioner TEXT,patientId TEXT,date TEXT,time TEXT,serviceSlug TEXT,evaPainScore INTEGER NOT NULL DEFAULT 5,sessionType TEXT,notes TEXT,createdAt TEXT)',
      'CREATE TABLE invoices(id TEXT PRIMARY KEY,appointmentId TEXT,practitioner TEXT,amount REAL)',
      'CREATE TABLE prescriptions(id TEXT PRIMARY KEY,practitioner TEXT)',
      'CREATE TABLE blocked_slots(id TEXT PRIMARY KEY,date TEXT,time TEXT,UNIQUE(date,time))',
      "CREATE UNIQUE INDEX idx_appointments_active_slot ON appointments(date,startTime) WHERE status!='CANCELLED'",
      "INSERT INTO patients VALUES('p-old','+351912345678')",
      "INSERT INTO appointments VALUES('apt_s-old','+351912345678','reeducation-posturale','2020-01-06','09:00','COMPLETED')",
      "INSERT INTO patient_sessions VALUES('s-old','Historical clinician','p-old','2020-01-06','09:00','reeducation-posturale',5,'MANUAL','Legacy note','2020-01-06T09:00:00Z')",
      "INSERT INTO invoices VALUES('i-old','apt_s-old','Historical clinician',10.01)",
      "INSERT INTO prescriptions VALUES('r-old','Historical clinician')",
      "INSERT INTO blocked_slots VALUES('b-old','2020-01-07','09:00')",
    ];
    let store;if(libsql){store=require('@libsql/client').createClient({url:pathToFileURL(fixture).href});for(const q of sql)await store.execute(q);await schema.migrateSchedulingDatabase(store);}else {store=new (require('better-sqlite3'))(fixture);for(const q of sql)store.exec(q);schema.migrateSchedulingSqlite(store);}
    const rows=async q=>libsql?(await store.execute(q)).rows:store.prepare(q).all();
    try {const old=(await rows('SELECT * FROM appointments'))[0];assert.equal(old.practitionerId,'legacy');assert.equal(old.durationMinutes,30);assert.equal(old.patientId,'p-old');assert.equal(old.status,'COMPLETED');assert.equal((await rows('SELECT * FROM blocked_slots'))[0].practitionerId,'*');const session=(await rows('SELECT * FROM patient_sessions'))[0];assert.equal(session.practitioner,'Historical clinician');assert.equal(session.appointmentId,'apt_s-old');assert.equal(session.evaPainScore,null);assert.equal(session.legacyEvaPainScore,5);assert.equal(session.clinicalStatus,'LEGACY_REVIEW');assert.equal((await rows('SELECT * FROM invoices'))[0].practitionerId,'legacy');}finally{store.close();}
  });
  await t.test('clinic blocks are distinguished from practitioner blocks in the admin UI data',async()=>{
    await db.dbToggleBlockSlot(date(28),'09:00');const route=load('@/app/api/admin/slots/route');const res=await route.GET(request('/api/admin/slots?date='+date(28)+'&practitionerId='+practitionerA,null,'GET'));const slot=(await res.json()).slots.find(s=>s.time==='09:00');assert.equal(slot.inheritedBlock,true);assert.equal(slot.available,false);
  });
  await t.test('CSV headers align with practitioner and duration fields',async()=>{
    for(const url of ['/api/admin/export?type=appointments','/api/admin/export?type=invoices']){
      const res=await load('@/app/api/admin/export/route').GET(request(url,null,'GET'));assert.equal(res.status,200);
      const rows=(await res.text()).trim().split('\n');assert(rows[0].includes('Profissional'));
      assert.equal(rows[0].split(';').length,rows[1].split(';').length);
    }
  });
  await require('./scheduling-exceptions.cjs')(t,{db,schedule,load,save,input,date,request,services,DEFAULT_HOURS,practitionerA,practitionerB});
  await require('./scheduling-adversarial.cjs')(t,{db,schedule,load,input,date,request,practitionerA,practitionerB});
  await require('./team-assignment-audit.cjs')(t,{db,schedule,load,save,input,date,request,services,DEFAULT_HOURS,practitionerA,practitionerB});
  await t.test('migration is idempotent after parallel bookings exist',async()=>{const schema=load('@/lib/scheduling-schema');if(libsql){const client=require('@libsql/client').createClient({url:process.env.TURSO_DATABASE_URL});try{await schema.migrateSchedulingDatabase(client);}finally{client.close();}}else schema.migrateSchedulingSqlite(db.getDb());assert.equal((await db.executeQuery('SELECT * FROM schema_migrations')).length,2);assert.equal((await db.dbGetAppointments({date:date(2)})).length,3);});
});
test.after(async()=>{if(!libsql)db.getDb().close();for(const client of clients)client.close();assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));assert(path.basename(temp).startsWith('ryma-scheduling-'));try{await fs.promises.rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch(e){if(!libsql||!['EPERM','EBUSY'].includes(e.code))throw e;}});
