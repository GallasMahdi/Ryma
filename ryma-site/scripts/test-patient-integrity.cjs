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

test.before(async()=>require('./fixtures/services.cjs').seedTestServices(db));
test(`Patient integrity on isolated ${libsql?'libSQL':'SQLite'}`,async t=>{
  await t.test('duplicate creation and changing to another patient phone are explicit conflicts',async()=>{
    const a=await db.dbUpsertPatient(profile()),b=await db.dbUpsertPatient(profile());
    for(const body of [{patientName:'Different person',phone:a.phone},{...b,phone:a.phone}]){
      const r=await route('patients').POST(request('patients','POST',body));assert.equal(r.status,409);assert.equal((await r.json()).code,'PATIENT_PHONE_CONFLICT');
    }
    assert.equal((await db.dbGetPatientById(a.id)).patientName,a.patientName);assert.equal((await db.dbGetPatientById(b.id)).phone,b.phone);
    const r=await route('patients').POST(request('patients','POST',{...profile(),id:'missing'}));assert.equal(r.status,404);
  });
  await t.test('concurrent creation never overwrites an existing patient',async()=>{
    const input=profile();const results=await Promise.all([route('patients').POST(request('patients','POST',input)),route('patients').POST(request('patients','POST',{...input,patientName:'Competing person'}))]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await db.executeQuery('SELECT id FROM patients WHERE phone=?',[input.phone])).length,1);
  });
  await t.test('legacy-only records require an explicit promotion and keep their historical contact links',async()=>{
    const input=profile();await db.dbUpsertPatientNote(input.phone,input.patientName,'Legacy history','Legacy tags');
    await assert.rejects(()=>db.dbUpsertPatient({...input,patientName:'Different person'}),e=>e.code==='PATIENT_PHONE_CONFLICT');
    const rx=await db.dbCreatePrescription({patientName:input.patientName,patientPhone:input.phone,practitionerId:'legacy',items:[{category:'lifestyle_habit',title:'Legacy',instructions:'Retain'}]});
    const r=await route('patients').POST(request('patients','POST',{patientName:input.patientName,legacyPhone:input.phone,phone:profile().phone}));assert.equal(r.status,200);
    const p=(await r.json()).patient;assert.equal(p.medicalHistory,'Legacy history');assert.equal(await db.dbGetPatientNote(input.phone),null);assert.equal((await db.dbGetPrescriptionsByPatientId(p.id))[0].id,rx.id);
  });
  await t.test('contact changes retain ID-based histories and immutable document snapshots',async()=>{
    const a=await db.dbUpsertPatient(profile()),b=await db.dbUpsertPatient(profile());const series=await book(a);assert(series.success);
    const invoice=await db.dbCreateInvoice({patientName:a.patientName,patientPhone:a.phone,appointmentId:series.appointments[0].id,serviceSlug:'reeducation-posturale',amount:60});
    const rx=await db.dbCreatePrescription({patientName:a.patientName,patientPhone:a.phone,practitionerId:'legacy',items:[{category:'lifestyle_habit',title:'Exercise',instructions:'Retain snapshot'}]});
    const foreign=await db.dbCreatePrescription({patientId:b.id,patientName:b.patientName,patientPhone:b.phone,practitionerId:'legacy',items:[{category:'lifestyle_habit',title:'Foreign record',instructions:'Do not claim'}]});
    await db.executeQuery('UPDATE prescriptions SET patientPhone=? WHERE id=?',[a.phone,foreign.id]);
    const changed=await db.dbUpsertPatient({...a,phone:profile().phone});
    assert.equal(changed.id,a.id);assert.equal(await db.dbGetPatientNote(a.phone),null);assert.equal((await db.dbGetPatientNote(changed.phone)).content,a.medicalHistory);
    assert.equal((await db.dbGetInvoiceById(invoice.id)).patientPhone,a.phone);
    for(const [url,key,ids] of [
      ['appointments?patientId='+a.id,'appointments',[series.appointments[0].id]],
      ['invoices?patientId='+a.id+'&page=1','invoices',[invoice.id]],
      ['prescriptions?patientId='+a.id,'prescriptions',[rx.id]],
    ]){const r=await route(url.split('?')[0]).GET(request(url));assert.equal(r.status,200);assert.deepEqual((await r.json())[key].map(x=>x.id),ids);}
    assert.equal((await db.executeQuery('SELECT patientId FROM prescriptions WHERE id=?',[foreign.id]))[0].patientId,b.id);
    const reused=await db.dbUpsertPatient({patientName:'New owner of old contact',phone:a.phone});
    assert.equal((await db.dbGetAppointments({patientId:reused.id})).length,0);assert.equal((await db.dbGetInvoices({patientId:reused.id})).length,0);assert.equal((await db.dbGetPrescriptionsByPatientId(reused.id)).length,0);
    const detail=await route('patients').GET(request('patients?id='+a.id));assert.equal((await detail.json()).note.patientId,a.id);
  });
  await t.test('failure saving the new contact mirror rolls back profile and legacy links',async()=>{
    const p=await db.dbUpsertPatient(profile());const newPhone=profile().phone;
    await db.executeQuery("CREATE TRIGGER fail_contact BEFORE INSERT ON patient_notes WHEN NEW.phone='"+newPhone+"' BEGIN SELECT RAISE(ABORT,'contact_failure'); END");
    try{await assert.rejects(()=>db.dbUpsertPatient({...p,phone:newPhone}),/contact_failure/)}finally{await db.executeQuery('DROP TRIGGER fail_contact')}
    assert.equal((await db.dbGetPatientById(p.id)).phone,p.phone);assert(await db.dbGetPatientNote(p.phone));assert.equal(await db.dbGetPatientNote(newPhone),null);
  });
  await t.test('archive retains clinical data and document links while releasing active capacity',async()=>{
    const p=await db.dbUpsertPatient(profile()),series=await book(p,7);assert(series.success);const a=series.appointments[0],s=series.patientSessions[0];
    const before=await db.dbGetAppointmentSummary();const analyticsBefore=await db.dbGetFilteredAnalyticsStats({range:'all'});
    const r=await route('appointments/[id]').DELETE(request('appointments/'+a.id,'DELETE'),{params:Promise.resolve({id:a.id})});assert.equal(r.status,200);assert.equal((await r.json()).archived,true);
    assert.deepEqual(await db.dbGetPatientSessionById(s.id),s);assert.equal(await db.dbGetAppointmentById(a.id),null);
    const archived=await db.dbGetAppointmentById(a.id,true);assert(archived.archivedAt);assert.equal(archived.archivedStatus,'CONFIRMED');assert.equal(archived.status,'CANCELLED');
    assert.equal((await db.dbGetAppointmentSummary()).total,before.total-1);assert.equal((await db.dbGetAppointmentsPaginated({patientId:p.id})).total,0);
    const history=await route('appointments').GET(request('appointments?patientId='+p.id+'&includeArchived=1'));assert.equal((await history.json()).appointments[0].archivedAt,archived.archivedAt);
    assert.equal((await db.dbCheckSlotAvailability(a.date,a.startTime,a.service,{practitionerId:'legacy'})).available,true);
    const audit=await db.executeQuery("SELECT details FROM security_audit_logs WHERE eventType='appointment_archived'");assert.equal(audit.length,1);assert(!audit[0].details.includes('integrity-fixture'));
    assert.equal(await db.dbDeleteAppointment(a.id),false);assert.equal(await db.dbUpdateAppointment(a.id,{status:'CONFIRMED'}),null);
    await assert.rejects(()=>db.executeQuery("UPDATE appointments SET status='CONFIRMED' WHERE id=?",[a.id]),/archived_appointment_inactive/);
    const after=await db.dbGetFilteredAnalyticsStats({range:'all'});assert.equal(after.stats.total,analyticsBefore.stats.total-1);
    const snapshot=await db.dbExportFullDatabaseBackup();await db.dbRestoreFullDatabaseBackup(snapshot);assert.equal((await db.dbGetAppointmentById(a.id,true)).archivedAt,archived.archivedAt);assert(await db.dbGetPatientSessionById(s.id));
  });
  await t.test('failure to write archive audit rolls back the archive and keeps capacity occupied',async()=>{
    const p=await db.dbUpsertPatient(profile()),series=await book(p,14);assert(series.success);const a=series.appointments[0];
    await db.executeQuery("CREATE TRIGGER fail_archive_audit BEFORE INSERT ON security_audit_logs WHEN NEW.eventType='appointment_archived' BEGIN SELECT RAISE(ABORT,'audit_failure'); END");
    try{await assert.rejects(()=>db.dbDeleteAppointment(a.id),/audit_failure/)}finally{await db.executeQuery('DROP TRIGGER fail_archive_audit')}
    assert.equal((await db.dbGetAppointmentById(a.id)).status,'CONFIRMED');assert(await db.dbGetPatientSessionById(series.patientSessions[0].id));
    assert.equal((await db.dbCheckSlotAvailability(a.date,a.startTime,a.service,{practitionerId:'legacy'})).available,false);
  });
  await t.test('patient ID reads and archive mutations remain authenticated',async()=>{
    authorized=false;try{for(const url of ['patients?id=x','appointments?patientId=x&includeArchived=1','invoices?patientId=x','prescriptions?patientId=x'])assert.equal((await route(url.split('?')[0]).GET(request(url))).status,401);
      assert.equal((await route('appointments/[id]').DELETE(request('appointments/x','DELETE'),{params:Promise.resolve({id:'x'})})).status,401);
    }finally{authorized=true}
  });
});
test.after(()=>{for(const c of clients)c.close();});
