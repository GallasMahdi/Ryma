const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-patient-integrity-'));
const libsql=process.env.RYMA_TEST_ADAPTER==='libsql';
Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(temp,'fixture.db'),WHATSAPP_ENABLED:'false',SMTP_HOST:''});
delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
if(libsql)process.env.TURSO_DATABASE_URL=pathToFileURL(path.join(temp,'libsql.db')).href;
const cache=new Map(),clients=[];let authorized=true;let ownerUntil=0;
class NextRequest extends Request {get nextUrl(){return new URL(this.url)}}
const mocks={
  '@libsql/client':{...require('@libsql/client'),createClient(options){assert.match(options.url,/^file:/);const c=require('@libsql/client').createClient(options);clients.push(c);return c;}},
  'next/server':{NextRequest,NextResponse:Response,after(){}},
  '@/lib/requireAdmin':{requireOwnerAnalytics:async()=>authorized&&ownerUntil>Date.now()?{session:{sessionId:'integrity-fixture',analyticsUnlockedUntil:ownerUntil}}:Response.json({error:'Owner authorization required'},{status:403}),requireAdmin:async()=>authorized?{session:{sessionId:'integrity-fixture',analyticsUnlockedUntil:ownerUntil}}:Response.json({error:'Unauthorized'},{status:401})},
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


// Audit-specific regressions follow.
const params=id=>({params:Promise.resolve({id})});
const sessionRoute=()=>route('patients/[id]/sessions');
const invoiceInput=p=>({patientId:p.id,patientName:p.patientName,patientPhone:p.phone,serviceSlug:'reeducation-posturale',practitionerId:'legacy',amount:10.25,paymentMethod:'CASH',paymentStatus:'PAID'});
const rxInput=p=>({patientId:p.id,patientName:p.patientName,patientPhone:p.phone,practitionerId:'legacy',items:[{category:'lifestyle_habit',title:'Fixture exercise',instructions:'No actual clinical advice'}]});
test.before(async()=>require('./fixtures/services.cjs').seedTestServices(db));
test(`Audit remediation on isolated ${libsql?'libSQL':'SQLite'}`,async t=>{
  await t.test('QA-03 booking never silently assigns a different person to a known contact',async()=>{
    const p=await db.dbUpsertPatient(profile());
    const result=await db.dbCreateAppointment({patientName:'Different person',phone:p.phone,service:'reeducation-posturale',date:date(0),startTime:'09:00'});
    assert.equal(result.success,false);assert.equal(result.error,'invalid_data');assert.equal((await db.dbGetAppointments({patientId:p.id})).length,0);
  });
  await t.test('QA-03 ambiguous unassigned legacy documents cannot be claimed by another identity',async()=>{
    const input=profile();const inv=await db.dbCreateInvoice({...invoiceInput({id:undefined,...input})});assert.equal(inv.patientId,null);
    await assert.rejects(()=>db.dbUpsertPatient({...input,patientName:'Another identity'}),e=>e.code==='PATIENT_PHONE_CONFLICT');
    await assert.rejects(()=>db.dbCreatePrescription({...rxInput({id:undefined,...input}),patientName:'Another identity'}),db.DocumentError);
    const p=await db.dbUpsertPatient(input);assert.equal((await db.dbGetInvoices({patientId:p.id}))[0].id,inv.id);
  });
  await t.test('QA-20 patient deletion preserves histories and only removes empty records',async()=>{
    const p=await db.dbUpsertPatient(profile()),s=await db.dbAddPatientSession({patientId:p.id,serviceSlug:'reeducation-posturale',date:'2020-01-06',evaPainScore:4,notes:'Protected'});
    ownerUntil=Date.now()+60000;
    const r=await route('patients').DELETE(request('patients?id='+p.id,'DELETE'));assert.equal(r.status,409);assert.equal((await r.json()).code,'PATIENT_HAS_HISTORY');
    assert(await db.dbGetPatientById(p.id));assert.deepEqual(await db.dbGetPatientSessionById(s.id),s);
    const empty=await db.dbUpsertPatient({...profile(),medicalHistory:''});await db.dbDeletePatientRecord(empty.id);assert.equal(await db.dbGetPatientById(empty.id),null);ownerUntil=0;
  });
  await t.test('QA-04 planned sessions and cancellation do not create measured pain or completed care',async()=>{
    const p=await db.dbUpsertPatient(profile()),plan=await book(p);assert(plan.success);
    const s=plan.patientSessions[0];assert.equal(s.evaPainScore,null);assert.equal(s.completedAt,null);assert.equal(s.clinicalStatus,'PLANNED');
    await db.dbUpdateAppointment(s.appointmentId,{startTime:'10:00'});
    const moved=await db.dbGetPatientSessionById(s.id);assert.equal(moved.version,s.version+1);assert.equal(moved.evaPainScore,null);assert.equal(moved.time,'10:00');
    assert.equal((await sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,notes:'Stale before move',expectedVersion:s.version}),params(p.id))).status,409);
    const clinical=load('@/lib/clinical');assert.equal(clinical.completedSessions([s]).length,0);assert.equal(clinical.measuredSessions([s]).length,0);
    const attempt=await sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,clinicalStatus:'COMPLETED',expectedVersion:moved.version}),params(p.id));assert.equal(attempt.status,422);
    await db.dbUpdateAppointment(s.appointmentId,{status:'CANCELLED'});assert.equal(clinical.completedSessions((await db.dbGetPatientById(p.id)).sessions).length,0);
    const invalid=await db.dbCreateMultipleAppointments({patientId:p.id,patientName:p.patientName,phone:p.phone,service:'reeducation-posturale',sessions:[{date:date(7),startTime:'09:00',evaPainScore:5}]});assert.equal(invalid.success,false);
  });
  await t.test('QA-07/09/10 clinical updates validate, roll back, retain revisions and reject stale writers',async()=>{
    const p=await db.dbUpsertPatient(profile());const s=await db.dbAddPatientSession({patientId:p.id,serviceSlug:'reeducation-posturale',date:'2020-01-06',evaPainScore:2,notes:'Before'});
    assert.equal(s.clinicalStatus,'COMPLETED');assert(s.completedAt);
    for(const value of [-1,11,4.5,'5',{},true])assert.equal((await sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,expectedVersion:s.version,evaPainScore:value}),params(p.id))).status,422);
    assert.equal((await sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,notes:'No version'}),params(p.id))).status,428);
    await db.executeQuery("CREATE TRIGGER clinical_failure BEFORE UPDATE OF notes ON patient_sessions WHEN NEW.id='"+s.id+"' BEGIN SELECT RAISE(ABORT,'clinical_failure'); END");
    try {await assert.rejects(()=>db.dbUpdatePatientSession(s.id,{evaPainScore:9,notes:'After',expectedVersion:s.version},p.id),/clinical_failure/);}finally{await db.executeQuery('DROP TRIGGER clinical_failure');}
    assert.deepEqual(await db.dbGetPatientSessionById(s.id),s);
    const results=await Promise.all([0,10].map(evaPainScore=>sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,expectedVersion:s.version,evaPainScore,notes:'Consistent'}),params(p.id))));
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
    const updated=await db.dbGetPatientSessionById(s.id);assert.equal(updated.version,s.version+1);assert.equal(updated.notes,'Consistent');
    const revisions=await db.executeQuery('SELECT * FROM clinical_session_revisions WHERE sessionId=?',[s.id]);assert.equal(revisions.length,1);assert.equal(JSON.parse(revisions[0].beforeJson).evaPainScore,2);assert(!revisions[0].actor.includes('integrity-fixture'));
    const clear=await db.dbUpdatePatientSession(s.id,{evaPainScore:null,expectedVersion:updated.version},p.id);assert.equal(clear.evaPainScore,null);
    const a=await db.dbUpsertPatient(profile());assert.equal((await sessionRoute().PATCH(request('x','PATCH',{sessionId:s.id,expectedVersion:clear.version,notes:'Wrong person'}),params(a.id))).status,404);
  });
  await t.test('QA-01/15 existing appointments get one linked clinical record and archives retain it',async()=>{
    const p=await db.dbUpsertPatient(profile()),other=await db.dbUpsertPatient(profile());
    const booking=await db.dbCreateAppointment({patientName:p.patientName,phone:p.phone,service:'reeducation-posturale',date:date(21),startTime:'09:00'});assert(booking.success);
    await db.executeQuery('UPDATE appointments SET date=? WHERE id=?',['2020-01-06',booking.appointment.id]);
    const body={appointmentId:booking.appointment.id,date:'2020-01-06',time:'09:00',serviceSlug:'reeducation-posturale',clinicalStatus:'COMPLETED',evaPainScore:8,notes:'Preserve clinical record'};
    assert.equal((await sessionRoute().POST(request('x','POST',body),params(other.id))).status,422);
    const r=await sessionRoute().POST(request('x','POST',body),params(p.id));assert.equal(r.status,201);const s=(await r.json()).session;
    assert.equal((await db.dbGetAppointments({patientId:p.id})).length,1);assert.equal(s.appointmentId,booking.appointment.id);
    assert.equal((await sessionRoute().POST(request('x','POST',body),params(p.id))).status,409);
    await assert.rejects(()=>db.dbUpdateAppointment(booking.appointment.id,{date:date(22)}),/documented consultation/);
    await db.dbDeleteAppointment(booking.appointment.id,'fixture-actor');assert.deepEqual(await db.dbGetPatientSessionById(s.id),s);
    const snapshot=await db.dbExportFullDatabaseBackup();await db.dbRestoreFullDatabaseBackup(snapshot);assert.deepEqual(await db.dbGetPatientSessionById(s.id),s);
  });
  await t.test('QA-04 a missing time cannot complete a same-day future appointment',async()=>{
    const p=await db.dbUpsertPatient(profile()),booking=await db.dbCreateAppointment({patientName:p.patientName,phone:p.phone,service:'reeducation-posturale',date:date(28),startTime:'09:00'});assert(booking.success);
    const today=load('@/lib/validation').getLisbonDateTime().todayStr;
    await db.executeQuery('UPDATE appointments SET date=?,startTime=? WHERE id=?',[today,'23:59',booking.appointment.id]);
    await assert.rejects(()=>db.dbAddPatientSession({patientId:p.id,appointmentId:booking.appointment.id,date:today,clinicalStatus:'COMPLETED'}),e=>e.code==='FUTURE_SESSION');
  });
  await t.test('QA-05 API requires stable intent keys and deduplicates parallel retries',async()=>{
    const p=await db.dbUpsertPatient(profile()),input=invoiceInput(p);
    assert.equal((await route('invoices').POST(request('invoices','POST',input))).status,422);
    const responses=await Promise.all([1,2].map(()=>route('invoices').POST(request('invoices','POST',{...input,clientRequestId:'same-intent'}))));
    assert.deepEqual(responses.map(r=>r.status),[201,201]);const bodies=await Promise.all(responses.map(r=>r.json()));assert.equal(bodies[0].invoice.id,bodies[1].invoice.id);
    assert.equal((await route('invoices').POST(request('invoices','POST',{...input,amount:12,clientRequestId:'same-intent'}))).status,409);
    const distinct=await route('invoices').POST(request('invoices','POST',{...input,clientRequestId:'next-intent'}));assert.equal(distinct.status,201);assert.notEqual((await distinct.json()).invoice.id,bodies[0].invoice.id);
  });
  await t.test('QA-06 document identities and appointment service/practitioner are checked',async()=>{
    const p=await db.dbUpsertPatient(profile()),other=await db.dbUpsertPatient(profile()),booking=await db.dbCreateAppointment({patientName:p.patientName,phone:p.phone,service:'reeducation-posturale',date:date(14),startTime:'09:00'});assert(booking.success);
    const input={...invoiceInput(p),appointmentId:booking.appointment.id};
    for(const patch of [{patientId:other.id},{patientName:other.patientName},{patientPhone:other.phone},{serviceSlug:'cavitation'},{practitionerId:'missing'}])await assert.rejects(()=>db.dbCreateInvoice({...input,...patch}),db.DocumentError);
    for(const patch of [{patientId:other.id},{patientName:other.patientName},{patientPhone:other.phone}])await assert.rejects(()=>db.dbCreatePrescription({...rxInput(p),...patch}),db.DocumentError);
    const valid=await db.dbCreateInvoice(input);assert.equal(valid.patientId,p.id);assert.equal(valid.patientName,p.patientName);
  });
  await t.test('QA-08 exact cents, VAT, payment groups and averages agree',async()=>{
    const p=await db.dbUpsertPatient(profile());await assert.rejects(()=>db.dbCreateInvoice({...invoiceInput(p),amount:10.005}),db.DocumentError);
    const rows=[];for(const amount of [0.1,0.2,10.25]){const inv=await db.dbCreateInvoice({...invoiceInput(p),amount});await db.executeQuery('UPDATE invoices SET createdAt=?,paidAt=? WHERE id=?',['2040-07-01T12:00:00Z','2040-07-01T12:00:00Z',inv.id]);rows.push(inv);assert.equal(inv.amountCents,Math.round(amount*100));}
    const result=await db.dbGetFilteredAnalyticsStats({range:'custom',startDate:'2040-07-01',endDate:'2040-07-01'});assert.equal(result.stats.revenue,10.55);assert.equal(result.stats.avgTicket,3.52);
    assert.equal(load('@/lib/money').sumMoney(rows.map(r=>r.amount)),10.55);
    for(const rate of [0,6,13,23]){const vat=load('@/types/admin').calculateVatBreakdown(10.55,rate);assert.equal(load('@/lib/money').sumMoney([vat.incidence,vat.vatAmount]),10.55);}
    await assert.rejects(()=>db.executeQuery('UPDATE invoices SET amount=? WHERE id=?',[10.005,rows[0].id]),/invalid_invoice_cents/);
    await db.executeQuery('UPDATE invoices SET moneyReview=1,amountCents=NULL,amount=10.005 WHERE id=?',[rows[0].id]);
    try{await assert.rejects(()=>db.dbGetInvoiceStats(),/reconciliation/);}finally{await db.executeQuery('UPDATE invoices SET amount=0.1,amountCents=10,moneyReview=0 WHERE id=?',[rows[0].id]);}
  });
  await t.test('QA-11 financial aggregates are absent until step-up and disappear after locking',async()=>{
    const query=()=>route('invoices').GET(request('invoices?page=1'));
    assert.equal((await (await query()).json()).stats,null);
    assert(!Object.hasOwn((await (await route('appointments').GET(request('appointments?summary=1'))).json()).stats,'revenue'));
    ownerUntil=Date.now()+60000;await db.dbGrantOwnerStepUp('integrity-fixture',ownerUntil);
    assert((await (await query()).json()).stats.totalRevenue>0);
    await db.dbRevokeOwnerStepUp('integrity-fixture');assert.equal((await (await query()).json()).stats,null);ownerUntil=0;
  });
  await t.test('QA-12 invalid patient profile fields reject before any mutation; clearing and omission remain explicit',async()=>{
    const p=await db.dbUpsertPatient({...profile(),gender:'F',dob:'2000-02-29'});
    for(const patch of [{dob:'2026-02-31'},{dob:'2099-01-01'},{gender:'arbitrary'},{coverageType:'INVALID'},{totalPrescribedSessions:1.5},{email:123}]){const r=await route('patients').POST(request('patients','POST',{...p,...patch}));assert.equal(r.status,422);}
    const update=await route('patients').POST(request('patients','POST',{id:p.id,patientName:p.patientName,phone:p.phone,dob:null}));assert.equal(update.status,200);const saved=(await update.json()).patient;assert.equal(saved.dob,null);assert.equal(saved.gender,'F');
  });
  await t.test('QA-13 export filters match lists, empty periods and Lisbon date boundaries',async()=>{
    ownerUntil=Date.now()+60000;
    const p=await db.dbUpsertPatient(profile()),one=await db.dbCreateInvoice({...invoiceInput(p),paymentMethod:'CASH'}),two=await db.dbCreateInvoice({...invoiceInput(p),paymentMethod:'CARD'});
    for(const i of [one,two])await db.executeQuery('UPDATE invoices SET createdAt=?,paidAt=? WHERE id=?',['2041-06-30T23:00:00.000Z','2041-07-02T12:00:00.000Z',i.id]);
    const filter='patientId='+p.id+'&dateFrom=2041-07-01&dateTo=2041-07-01&paymentMethod=CASH';
    const list=await db.dbGetInvoices(load('@/lib/admin-validation').invoiceFilters(new URLSearchParams(filter)));assert.deepEqual(list.map(i=>i.id),[one.id]);
    const csv=await (await route('invoices/export').GET(request('invoices/export?'+filter))).text();assert(csv.includes(one.invoiceNumber));assert(!csv.includes(two.invoiceNumber));
    const empty=await (await route('export').GET(request('export?type=invoices&startDate=1990-01-01&endDate=1990-01-02'))).text();assert.equal(empty.trim().split('\n').length,1);
    const paid=await (await route('export').GET(request('export?type=invoices&dateBasis=payment&patientId='+p.id+'&startDate=2041-07-02&endDate=2041-07-02'))).text();assert(paid.includes(one.invoiceNumber)&&paid.includes(two.invoiceNumber));ownerUntil=0;
  });
  await t.test('QA-17 production accepts explicit password hashes and rejects missing or malformed credentials',async()=>{
    const keys=['ADMIN_PASSWORD_HASH','OWNER_ANALYTICS_PASSWORD_HASH','SESSION_SECRET'];
    const previous={mode:process.env.NODE_ENV,values:Object.fromEntries(keys.map(key=>[key,process.env[key]]))};
    try {
      const credentials=load('@/lib/env').env;
      process.env.NODE_ENV='production';
      for(const [key,password] of [['ADMIN_PASSWORD_HASH','ryma2024admin'],['OWNER_ANALYTICS_PASSWORD_HASH','ryma2024owner']]) {
        process.env[key]=require('bcryptjs').hashSync(password,4);
        assert(require('bcryptjs').compareSync(password,credentials[key]));
        process.env[key]='invalid-hash';assert.throws(()=>credentials[key],new RegExp(key));
        delete process.env[key];assert.throws(()=>credentials[key],new RegExp(key));
      }
      process.env.NODE_ENV='development';delete process.env.SESSION_SECRET;
      const developmentSecret=credentials.SESSION_SECRET;
      process.env.NODE_ENV='production';process.env.SESSION_SECRET=developmentSecret;
      assert.throws(()=>credentials.SESSION_SECRET,/SESSION_SECRET/);
      process.env.SESSION_SECRET=require('node:crypto').randomBytes(32).toString('hex');
      assert.equal(credentials.SESSION_SECRET,process.env.SESSION_SECRET);
    } finally {
      process.env.NODE_ENV=previous.mode;
      for(const key of keys){if(previous.values[key]===undefined)delete process.env[key];else process.env[key]=previous.values[key];}
    }
  });
  await t.test('QA-18 email logs omit recipients and transport exception details',async()=>{
    delete mocks['@/lib/email'];let fail=false;mocks.nodemailer={createTransport:()=>({sendMail:async()=>{if(fail)throw Error('sensitive@example.test Secret note +351912345678');return {messageId:'sensitive@example.test'};}})};
    const email=load('@/lib/email'),lines=[],prior={log:console.log,error:console.error,user:process.env.SMTP_USER,pass:process.env.SMTP_PASS};
    const fixture={patientName:'Private fixture name',email:'sensitive@example.test',phone:'+351912345678',service:'reeducation-posturale',date:date(0),startTime:'09:00'};
    try{console.log=(...a)=>lines.push(a.join(' '));console.error=(...a)=>lines.push(a.join(' '));delete process.env.SMTP_USER;delete process.env.SMTP_PASS;await email.sendAppointmentConfirmationEmail(fixture);process.env.SMTP_USER='fixture';process.env.SMTP_PASS='fixture';await email.sendAppointmentConfirmationEmail(fixture);fail=true;await email.sendAppointmentConfirmationEmail(fixture);assert.equal(lines.length,3);assert(!lines.join('\n').match(/sensitive@example|Secret note|351912345678|Private fixture/));}finally{console.log=prior.log;console.error=prior.error;if(prior.user===undefined)delete process.env.SMTP_USER;else process.env.SMTP_USER=prior.user;if(prior.pass===undefined)delete process.env.SMTP_PASS;else process.env.SMTP_PASS=prior.pass;}
  });
});
test.after(()=>{for(const c of clients)c.close();});
