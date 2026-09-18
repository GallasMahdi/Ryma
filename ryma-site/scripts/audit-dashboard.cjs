/** Regression suite: synthetic records in an isolated temporary SQLite database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const ts = require('typescript');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ryma-dashboard-audit-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(temp, 'fixture.db');
for (const key of ['TURSO_DATABASE_URL','TURSO_AUTH_TOKEN','VERCEL','AWS_LAMBDA_FUNCTION_NAME','NETLIFY','SMTP_HOST','SMTP_USER','SMTP_PASS']) delete process.env[key];
process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('test-only-password', 4);
process.env.OWNER_ANALYTICS_PASSWORD_HASH = require('bcryptjs').hashSync('test-only-owner-password', 4);
const jar = new Map();
const cookieStore = { get: name => jar.has(name) ? {value:jar.get(name)} : undefined, set: (...args) => { const value = typeof args[0] === 'object' ? args[0] : { name:args[0],value:args[1] }; jar.set(value.name,value.value); }, delete: name => jar.delete(name) };
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...rest) {return resolve.call(this, name.startsWith('@/') ? path.join(root,'src',name.slice(2)) : name, ...rest);};
const load = Module._load;
Module._load = function(name,...args) { if(name === 'next/headers') return {cookies:async()=>cookieStore}; return load.call(this,name,...args); };
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true }}).outputText,file);
const { NextRequest } = require('next/server');
const { sealData } = require('iron-session');
const db = require('../src/lib/db.ts');
const policy = require('../src/lib/session-policy.ts');
const validation = require('../src/lib/admin-validation.ts');
const bookingValidation = require('../src/lib/validation.ts');
const routes = p => require(path.join(root,'src/app/api/admin',p,'route.ts'));
const request = (url, method='GET', body) => new NextRequest('http://localhost:3000/api/admin/'+url,{method, ...(body !== undefined ? {body:JSON.stringify(body),headers:{'Content-Type':'application/json'}} : {})});
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
const freshSession = () => ({sessionId:crypto.randomUUID(),isAdmin:true,loginAt:Date.now()});
async function login(session=freshSession()){jar.set('ryma_admin_session',await sealData(session,{password:process.env.SESSION_SECRET}));return session;}
const patientInput={patientName:'Audit Fixture',phone:'+351912000001',email:'fixture@example.invalid',gender:'F',dob:'1990-02-20',medicalHistory:'Preserve clinical history',pathologyTags:'fixture',referringDoctor:'Fixture doctor',totalPrescribedSessions:24,coverageType:'INSURANCE',coverageProvider:'Fixture provider'};
const date='2099-01-05';
async function main(){
await test('calendar validation rejects rollover dates and accepts leap dates',async()=>{assert.equal(validation.isCalendarDate('2099-02-31'),false);assert.equal(validation.isCalendarDate('2100-02-29'),false);assert.equal(validation.isCalendarDate('2096-02-29'),true);});
await test('absolute eight-hour session expiry cannot be renewed by resealing',async()=>{assert.equal(policy.isAdminSessionValid({...freshSession(),loginAt:Date.now()-8*3600000}),false);assert.equal(policy.isAdminSessionValid({...freshSession(),loginAt:Date.now()+60000}),false);assert.equal(policy.isAdminSessionValid(freshSession()),true);});
await test('every protected admin read rejects unauthenticated requests',async()=>{jar.clear();for(const p of ['appointments','patients','invoices','reviews','slots','analytics','me','events','export','invoices/export','prescriptions'])assert.equal((await routes(p).GET(request(p+'?date='+date))).status,401,p);});
await test('expired cookie rejected by admin and owner verification',async()=>{await login({...freshSession(),loginAt:Date.now()-9*3600000});assert.equal((await routes('me').GET(request('me'))).status,401);assert.equal((await routes('analytics/verify').POST(request('analytics/verify','POST',{password:'test-only-owner-password'}))).status,401);});
await test('revoked sessions cannot unlock owner analytics',async()=>{const session=await login();await db.dbRevokeSession(session.sessionId,Date.now()+8*3600000);assert.equal((await routes('analytics/verify').POST(request('analytics/verify','POST',{password:'test-only-owner-password'}))).status,401);});
await login();
await test('admin access alone does not authorize owner exports',async()=>{assert.equal((await routes('export').GET(request('export'))).status,403);assert.equal((await routes('analytics').GET(request('analytics'))).status,403);});
await test('JSON null rejected across mutation endpoints',async()=>{for(const p of ['appointments','appointments/multiple','appointments/multiple/preview','patients','invoices','prescriptions','slots','slots/bulk','analytics/verify','login'])assert.equal((await routes(p).POST(request(p,'POST',null))).status,400,p);});
let patient;
await test('repeat booking preserves clinical profile and legacy note',async()=>{patient=await db.dbUpsertPatient(patientInput);const res=await db.dbCreateAppointment({patientName:'Booking display name',phone:patientInput.phone,service:'cavitation',date,startTime:'09:00',notes:'Appointment-only note'});assert.equal(res.success,true);const after=await db.dbGetPatientById(patient.id);for(const key of ['patientName','email','gender','dob','medicalHistory','pathologyTags','referringDoctor','totalPrescribedSessions','coverageType','coverageProvider'])assert.equal(after[key],patientInput[key],key);assert.equal((await db.dbGetPatientNote(patient.phone)).content,patientInput.medicalHistory);});
await test('saving notes preserves omitted patient profile fields',async()=>{const res=await routes('patients').POST(request('patients','POST',{phone:patientInput.phone,patientName:patientInput.patientName,content:'Updated history',tags:'updated'}));assert.equal(res.status,200);const after=await db.dbGetPatientById(patient.id);assert.equal(after.email,patientInput.email);assert.equal(after.gender,'F');assert.equal(after.totalPrescribedSessions,24);assert.equal(after.coverageProvider,patientInput.coverageProvider);assert.equal(after.medicalHistory,'Updated history');});
await test('explicitly clearing coverage is respected',async()=>{await db.dbUpsertPatient({...patientInput,id:patient.id,coverageProvider:null});assert.equal((await db.dbGetPatientById(patient.id)).coverageProvider,null);});
await test('invalid calendar dates and arbitrary time slots cannot be booked',async()=>{assert.equal((await db.dbCheckSlotAvailability('2099-02-31','09:00')).reason,'invalid_date');assert.equal((await db.dbCheckSlotAvailability(date,'02:17')).reason,'invalid_time');});
await test('clinical session and calendar appointment commit together',async()=>{const session=await db.dbAddPatientSession({patientId:patient.id,date,time:'10:00',serviceSlug:'cavitation'});assert.ok(await db.dbGetAppointmentById('apt_'+session.id));const before=await db.executeQuery('SELECT COUNT(*) AS n FROM patient_sessions');await assert.rejects(()=>db.dbAddPatientSession({patientId:patient.id,date,time:'10:00',serviceSlug:'cavitation'}));assert.equal((await db.executeQuery('SELECT COUNT(*) AS n FROM patient_sessions'))[0].n,before[0].n);await db.dbDeletePatientSession(session.id,patient.id);assert.equal(await db.dbGetAppointmentById('apt_'+session.id),null);});
await test('concurrent session writers cannot leave orphan clinical records',async()=>{const results=await Promise.allSettled([1,2].map(()=>db.dbAddPatientSession({patientId:patient.id,date,time:'10:30',serviceSlug:'cavitation'})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await db.executeQuery('SELECT COUNT(*) AS n FROM patient_sessions WHERE date=? AND time=?',[date,'10:30']))[0].n,1);});
await test('recurring plan records share a deletion-safe appointment link',async()=>{const result=await db.dbCreateMultipleAppointments({patientName:patient.patientName,phone:patient.phone,patientId:patient.id,service:'cavitation',sessions:[{date,startTime:'11:00'},{date,startTime:'11:30'}]});assert.equal(result.success,true);const sess=result.patientSessions[0];assert.ok(await db.dbGetAppointmentById('apt_'+sess.id));await db.dbDeletePatientSession(sess.id,patient.id);assert.equal(await db.dbGetAppointmentById('apt_'+sess.id),null);});
await test('recurring plan cannot attach sessions to another patient id',async()=>{const result=await db.dbCreateMultipleAppointments({patientName:patient.patientName,phone:patient.phone,patientId:'missing-patient',service:'cavitation',sessions:[{date,startTime:'12:00'}]});assert.equal(result.success,false);assert.equal(result.error,'invalid_input');});
await test('database guards block reschedules into blocked slots and blocks over bookings',async()=>{await db.dbToggleBlockSlot(date,'14:00');const appt=(await db.dbGetAppointments({date}))[0];await assert.rejects(()=>db.dbUpdateAppointment(appt.id,{startTime:'14:00'}),/slot_blocked/);await assert.rejects(()=>db.dbToggleBlockSlot(appt.date,appt.startTime),/slot_taken/);});
await test('bulk blocking rejects invalid actions, times and truncated ranges',async()=>{for(const data of [{date,action:'typo'},{date,scope:'custom',times:['25:00']},{startDate:date,endDate:'2099-12-31'},{startDate:date,endDate:'2098-01-01'}])assert.equal((await routes('slots/bulk').POST(request('slots/bulk','POST',data))).status,422);});
await test('invalid pagination falls back to finite values',async()=>{const res=await routes('appointments').GET(request('appointments?page=NaN&limit=garbage'));assert.equal(res.status,200);const data=await res.json();assert.equal(data.page,1);assert.equal(data.limit,50);});
let invoice;
await test('invoice updates validate enums and cannot bypass owner cancellation',async()=>{invoice=await db.dbCreateInvoice({patientName:patient.patientName,patientPhone:patient.phone,serviceSlug:'cavitation',amount:80,paymentMethod:'CASH',paymentStatus:'PENDING'});for(const data of [{paymentStatus:'CANCELLED'},{paymentStatus:'INVALID'},{paymentMethod:'INVALID'},{patientNif:'123'}]){const res=await routes('invoices/[id]').PUT(request('invoices/'+invoice.id,'PUT',data),{params:Promise.resolve({id:invoice.id})});assert.equal(res.status,422);}});
await test('payment date is stable for PAID and cleared for PENDING',async()=>{await db.dbUpdateInvoice(invoice.id,{paymentStatus:'PAID'});await db.executeQuery('UPDATE invoices SET paidAt=? WHERE id=?',['2026-01-01T00:00:00.000Z',invoice.id]);assert.equal((await db.dbUpdateInvoice(invoice.id,{paymentStatus:'PAID'})).paidAt,'2026-01-01T00:00:00.000Z');assert.equal((await db.dbUpdateInvoice(invoice.id,{paymentStatus:'PENDING'})).paidAt,null);});
await test('cancelled invoices cannot be reactivated by ordinary updates',async()=>{await db.dbDeleteInvoice(invoice.id);const res=await routes('invoices/[id]').PUT(request('invoices/'+invoice.id,'PUT',{paymentStatus:'PAID'}),{params:Promise.resolve({id:invoice.id})});assert.equal(res.status,409);});
await test('review and prescription payloads fail validation before DB writes',async()=>{assert.equal((await routes('reviews').PATCH(request('reviews','PATCH',{id:'fixture',status:'BAD'}))).status,422);assert.equal((await routes('prescriptions').POST(request('prescriptions','POST',{patientName:'Fixture',patientPhone:patient.phone,items:[null]}))).status,422);});
await test('SSE cancellation releases listener and revoked sessions receive no events',async()=>{const session=await login();const bus=require('../src/lib/events.ts').adminEventBus;const count=bus.listenerCount('admin_event');const res=await routes('events').GET(request('events'));const reader=res.body.getReader();await reader.read();assert.equal(bus.listenerCount('admin_event'),count+1);await db.dbRevokeSession(session.sessionId,Date.now()+8*3600000);bus.emit('admin_event',{type:'appointment:created',data:{id:'fixture-only'}});assert.equal((await reader.read()).done,true);assert.equal(bus.listenerCount('admin_event'),count);await login();const res2=await routes('events').GET(request('events'));await res2.body.cancel();assert.equal(bus.listenerCount('admin_event'),count);});
await test('concurrent invoice retries create exactly one financial record',async()=>{
  const input={patientName:patient.patientName,patientPhone:patient.phone,serviceSlug:'cavitation',amount:35,paymentMethod:'CASH',paymentStatus:'PAID'};
  const results=await Promise.all([db.dbCreateInvoice(input,'fixture-retry'),db.dbCreateInvoice(input,'fixture-retry')]);
  assert.equal(results[0].id,results[1].id);
  await assert.rejects(()=>db.dbCreateInvoice({...input,amount:70},'fixture-retry'),/idempotency_conflict/);
});
await test('analytics sums real payments on the payment date and preserves cents',async()=>{
  for(const amount of [10.25,20.50]) {
    const inv=await db.dbCreateInvoice({patientName:patient.patientName,patientPhone:patient.phone,serviceSlug:'cavitation',amount,paymentMethod:'CASH',paymentStatus:'PAID'});
    await db.executeQuery('UPDATE invoices SET createdAt=?, paidAt=? WHERE id=?',['2097-01-01T12:00:00.000Z','2098-06-15T12:00:00.000Z',inv.id]);
  }
  const result=await db.dbGetFilteredAnalyticsStats({range:'custom',startDate:'2098-06-15',endDate:'2098-06-15'});
  assert.equal(result.stats.revenue,30.75);
  assert.equal(result.timeline.points.reduce((sum,p)=>sum+p.revenue,0),30.75);
});
await test('Lisbon day boundaries account for summer time',async()=>{
  assert.equal(validation.lisbonDayStart('2026-07-01'),'2026-06-30T23:00:00.000Z');
  assert.equal(validation.lisbonDayStart('2026-01-01'),'2026-01-01T00:00:00.000Z');
});
await test('duplicate recurrence preview is rejected',async()=>{
  await login();
  const response=await routes('appointments/multiple/preview').POST(request('appointments/multiple/preview','POST',{sessions:[{date,startTime:'16:00'},{date,startTime:'16:00'}]}));
  assert.equal(response.status,422);
});
await test('real login creates a usable session and wrong passwords fail',async()=>{
  jar.clear();
  assert.equal((await routes('login').POST(request('login','POST',{password:'wrong-fixture-password'}))).status,401);
  assert.equal((await routes('login').POST(request('login','POST',{password:'test-only-password'}))).status,200);
  assert.equal((await routes('me').GET(request('me'))).status,200);
});
await test('prescription create, patient lookup, and deletion complete',async()=>{
  const res=await routes('prescriptions').POST(request('prescriptions','POST',{patientName:patient.patientName,patientPhone:patient.phone,items:[{title:'Fixture exercise',instructions:'Synthetic test only',category:'lifestyle_habit'}]}));
  assert.equal(res.status,201);
  const {prescription}=await res.json();
  const list=await routes('prescriptions').GET(request('prescriptions?patientPhone='+encodeURIComponent(patient.phone)));
  assert.ok((await list.json()).prescriptions.some(p=>p.id===prescription.id));
  assert.equal((await routes('prescriptions/[id]').DELETE(request('prescriptions/'+prescription.id,'DELETE'),{params:Promise.resolve({id:prescription.id})})).status,200);
  assert.equal((await db.dbGetPrescriptionsByPatientPhone(patient.phone)).some(p=>p.id===prescription.id),false);
});
await test('review moderation and removal persist',async()=>{
  const review=await db.dbCreateReview({patientName:'QA only',rating:5,serviceSlug:'cavitation',comment:'Synthetic review',status:'PENDING'});
  assert.equal((await routes('reviews').PATCH(request('reviews','PATCH',{id:review.id,status:'APPROVED',isFeatured:true}))).status,200);
  assert.ok((await db.dbGetAllReviewsAdmin()).some(r=>r.id===review.id&&r.status==='APPROVED'&&r.isFeatured));
  assert.equal((await routes('reviews').DELETE(request('reviews?id='+review.id,'DELETE'))).status,200);
  assert.equal((await db.dbGetAllReviewsAdmin()).some(r=>r.id===review.id),false);
});
await test('owner unlock enables analytics and CSV exports, locking revokes access',async()=>{
  assert.equal((await routes('analytics/verify').POST(request('analytics/verify','POST',{password:'test-only-owner-password'}))).status,200);
  assert.equal((await routes('analytics').GET(request('analytics?range=30d'))).status,200);
  for(const endpoint of ['export?type=appointments','export?type=patients','export?type=invoices','invoices/export']) {
    const response=await routes(endpoint.split('?')[0]).GET(request(endpoint));
    assert.equal(response.status,200,endpoint);
    assert.match(response.headers.get('content-type'),/text\/csv/);
    assert.ok((await response.text()).length>20);
  }
  assert.equal((await routes('analytics/lock').POST(request('analytics/lock','POST'))).status,200);
  assert.equal((await routes('analytics').GET(request('analytics'))).status,403);
});
await test('logout clears cookie and invalidates a replayed session',async()=>{
  const prior=jar.get('ryma_admin_session');
  assert.equal((await routes('logout').POST(request('logout','POST'))).status,200);
  assert.equal(jar.has('ryma_admin_session'),false);
  jar.set('ryma_admin_session',prior);
  assert.equal((await routes('me').GET(request('me'))).status,401);
});
await test('owner password rotation revokes all existing owner grants',async()=>{
  await db.executeQuery('INSERT INTO owner_step_up_grants (sessionId, unlockedAt, expiresAt) VALUES (?, ?, ?)',['fixture-grant',Date.now(),Date.now()+60000]);
  await db.dbSetOwnerAnalyticsPasswordHash(require('bcryptjs').hashSync('rotated-fixture-password',4));
  assert.equal((await db.executeQuery('SELECT COUNT(*) AS n FROM owner_step_up_grants'))[0].n,0);
});
await test('production rejects shared defaults and accepts unique fixture credentials',async()=>{
  const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/env.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const original=process.env.SESSION_SECRET;
  try {
    process.env.NODE_ENV='production';
    new Function('exports',code)({});
    delete process.env.SESSION_SECRET;
    assert.throws(()=>new Function('exports',code)({}),/Production requires/);
    assert.throws(()=>db.getDb(),/Persistent database/);
  } finally {process.env.NODE_ENV='test';process.env.SESSION_SECRET=original;}
});
console.log(`\n${passed} dashboard regression checks passed. No live database or email used.`);
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>{try{db.getDb().close();}catch{};for(const name of ['fixture.db','fixture.db-wal','fixture.db-shm']){const file=path.join(temp,name);if(fs.existsSync(file))fs.unlinkSync(file);}fs.rmdirSync(temp);});
