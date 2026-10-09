const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {pathToFileURL}=require('node:url'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'ryma-session-billing-'));
const libsql=process.env.RYMA_TEST_ADAPTER==='libsql';
Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(temp,'fixture.db'),WHATSAPP_ENABLED:'false',SMTP_HOST:''});
delete process.env.TURSO_DATABASE_URL;delete process.env.TURSO_AUTH_TOKEN;
if(libsql)process.env.TURSO_DATABASE_URL=pathToFileURL(path.join(temp,'libsql.db')).href;
const cache=new Map(),clients=[];let authorized=true;
class NextRequest extends Request {get nextUrl(){return new URL(this.url)}}
const mocks={
  '@libsql/client':{...require('@libsql/client'),createClient(options){assert.match(options.url,/^file:/);const c=require('@libsql/client').createClient(options);clients.push(c);return c;}},
  'next/server':{NextRequest,NextResponse:Response,after(){}},
  '@/lib/requireAdmin':{requireAdmin:async()=>authorized?{session:{sessionId:'billing-fixture'}}:Response.json({error:'Unauthorized'},{status:401}),requireOwnerAnalytics:async()=>authorized?{session:{sessionId:'billing-fixture'}}:Response.json({error:'Unauthorized'},{status:401})},
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
const db=load('@/lib/db'),billing=load('@/lib/session-billing');
const getRoute=load('@/app/api/admin/patients/[id]/billing-sessions/route'),postRoute=load('@/app/api/admin/invoices/sessions/route');
let index=0;
const patient=()=>db.dbUpsertPatient({patientName:'Billing fixture '+(++index),phone:'+35196997'+String(index).padStart(4,'0')});
const session=(p,service='reeducation-posturale',date='2020-01-06')=>db.dbAddPatientSession({patientId:p.id,practitionerId:'legacy',date,time:'09:00',serviceSlug:service,clinicalStatus:'COMPLETED'});
const list=p=>billing.getPatientBillingSessions(p.id,{page:1,limit:100});
const selection=(visit,price=5000,vatRate=0)=>({key:visit.key,version:visit.version,unitPriceCents:price,vatRate,vatExemptionReason:vatRate===0?'Fixture exemption':undefined});
const input=(p,sessions)=>({patientId:p.id,paymentMethod:'CASH',paymentStatus:'PENDING',sessions});
const post=(body,key='http-fixture')=>postRoute.POST(new NextRequest('http://fixture.invalid/api/admin/invoices/sessions',{method:'POST',headers:{'Idempotency-Key':key},body:typeof body==='string'?body:JSON.stringify(body)}));
let savedInvoice;
test.before(async()=>require('./fixtures/services.cjs').seedTestServices(db));

test(`Session billing with isolated ${libsql?'libSQL':'SQLite'}`,async t=>{
  await t.test('both endpoints require authentication and reject invalid input without writes',async()=>{
    authorized=false;
    assert.equal((await post({})).status,401);
    assert.equal((await getRoute.GET(new NextRequest('http://fixture.invalid/api/admin/patients/p/billing-sessions'),{params:Promise.resolve({id:'p'})})).status,401);
    authorized=true;
    assert.equal((await post('{')).status,400);assert.equal((await post([])).status,400);
    assert.equal((await post(' '.repeat(66000))).status,413);
    assert.equal((await post({})).status,422);
    assert.equal((await post({patientId:{id:'invalid'},sessions:[{}]})).status,422);
    assert.equal((await getRoute.GET(new NextRequest('http://fixture.invalid/api/admin/patients/p/billing-sessions?limit=999'),{params:Promise.resolve({id:'p'})})).status,422);
  });
  await t.test('only completed visits are listed; planned and archived sessions are excluded',async()=>{
    const p=await patient();await session(p);
    await db.dbAddPatientSession({patientId:p.id,practitionerId:'legacy',date:'2099-01-05',time:'09:00',serviceSlug:'reeducation-posturale',clinicalStatus:'PLANNED'});
    const archived=await session(p);await db.executeQuery('UPDATE patient_sessions SET archivedAt=? WHERE id=?',[new Date().toISOString(),archived.id]);
    const result=await list(p);assert.equal(result.sessions.length,1);assert.equal(result.sessions[0].unitPriceCents,null);assert(result.sessions[0].suggestedPriceCents>0);
  });
  await t.test('one document saves multiple sessions, exact amounts, mixed VAT and immutable display snapshots',async()=>{
    const p=await patient();await session(p);await session(p);await session(p,'massage-therapeutique','2020-01-07');
    const visits=(await list(p)).sessions;
    const body={...input(p,visits.map((v,i)=>selection(v,i===2?6150:5000,i===2?23:0))),externalReference:'EXTERNAL-123'};
    const response=await post(body,'multi-fixture');assert.equal(response.status,201,await response.clone().text());
    const invoice=(await response.json()).invoice;savedInvoice=invoice;
    assert.equal(invoice.items.length,3);assert.equal(invoice.amountCents,16150);assert.equal(invoice.amount,161.5);assert.equal(invoice.paidAt,null);assert.equal(invoice.documentKind,'INTERNAL');
    assert.equal((await list(p)).sessions.filter(s=>s.invoiceId===invoice.id).length,3);
    assert.deepEqual((await db.dbGetInvoiceById(invoice.id)).items,invoice.items);
    assert.equal((await db.dbGetInvoices({patientId:p.id}))[0].items.length,3);
    const display=load('@/lib/invoice-display').invoiceDisplayTotals(invoice);
    assert.equal(display.quantity,3);assert.equal(display.lines.length,2);assert.equal(display.lines[0].quantity,2);
    assert.equal(display.incidence,150);assert.equal(display.vatAmount,11.5);assert.equal(display.totalAmount,161.5);
    const html=load('@/lib/invoicePdf').generateInvoiceHtml(invoice);
    for(const token of ['2020-01-06','2020-01-07','EXTERNAL-123','sem valor fiscal','161.50'])assert(html.includes(token),token);
    assert(!html.includes('Válido para efeitos de dedução'));
    assert.equal((await post(body,'multi-fixture')).status,201);
    assert.equal((await post({...body,notes:'changed'},'multi-fixture')).status,409);
    assert.equal((await post(body,'different-key')).status,409);
  });
  await t.test('foreign-patient, duplicate selections, stale versions, excessive totals and invalid cents are rejected',async()=>{
    const p=await patient(),other=await patient();await session(p);const [visit]=(await list(p)).sessions;
    const valid=selection(visit);
    for(const [body,code] of [[input(other,[valid]),'SESSION_UNAVAILABLE'],[input(p,[valid,valid]),'INVALID_SELECTION'],[input(p,[{...valid,version:0}]),'SESSION_CHANGED'],[input(p,[{...valid,unitPriceCents:1.2}]),'INVALID_AMOUNT'],[input(p,[{...valid,unitPriceCents:5000001}]),'INVALID_AMOUNT'],[input(p,[{...valid,vatExemptionReason:''}]),'EXEMPTION_REQUIRED']])await assert.rejects(()=>billing.createSessionInvoice(body,'invalid-'+code),e=>e.code===code);
    assert.equal((await db.dbGetInvoices({patientId:p.id})).length,0);
  });
  await t.test('billing CSV exports mixed VAT, visit dates, quantity and external reference',async()=>{
    const route=load('@/app/api/admin/invoices/export/route');
    const response=await route.GET(new NextRequest('http://fixture.invalid/api/admin/invoices/export?search='+encodeURIComponent(savedInvoice.invoiceNumber)));
    assert.equal(response.status,200);
    const csv=await response.text();
    for(const value of ['"150.00"','"11.50"','"161.50"','"0 / 23%"',';3;','2020-01-06','2020-01-07','"EXTERNAL-123"','INTERNO - SEM VALOR FISCAL'])assert(csv.includes(value),value);
    authorized=false;assert.equal((await route.GET(new NextRequest('http://fixture.invalid/api/admin/invoices/export'))).status,401);authorized=true;
  });
  await t.test('simultaneous admins cannot invoice the same visit twice',async()=>{
    const p=await patient();await session(p);const body=input(p,(await list(p)).sessions.map(v=>selection(v)));
    const results=await Promise.allSettled([billing.createSessionInvoice(body,'race-a'),billing.createSessionInvoice(body,'race-b')]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'ALREADY_INVOICED');
    assert.equal((await db.dbGetInvoices({patientId:p.id})).length,1);
  });
  await t.test('parallel retries of the same request return one invoice',async()=>{
    const p=await patient();await session(p);const body=input(p,(await list(p)).sessions.map(v=>selection(v)));
    const [first,second]=await Promise.all([billing.createSessionInvoice(body,'same-race'),billing.createSessionInvoice(body,'same-race')]);
    assert.equal(first.id,second.id);assert.equal((await db.dbGetInvoices({patientId:p.id})).length,1);
  });
  await t.test('appointment and linked clinical record are one visit; older invoices block session billing',async()=>{
    const p=await patient();const future=new Date();future.setDate(future.getDate()+50);while(future.getDay()!==1)future.setDate(future.getDate()+1);
    const booked=await db.dbCreateAppointment({patientName:p.patientName,phone:p.phone,service:'reeducation-posturale',date:future.toISOString().slice(0,10),startTime:'09:00'});assert(booked.success);
    await db.executeQuery("UPDATE appointments SET date='2020-02-03',status='COMPLETED' WHERE id=?",[booked.appointment.id]);
    await db.dbAddPatientSession({patientId:p.id,appointmentId:booked.appointment.id,date:'2020-02-03',time:'09:00',serviceSlug:'reeducation-posturale',clinicalStatus:'COMPLETED'});
    const visits=(await list(p)).sessions;assert.equal(visits.length,1);assert(visits[0].sessionId);assert(visits[0].unitPriceCents>0);
    await assert.rejects(()=>billing.createSessionInvoice(input(p,[selection(visits[0],1)]),'price-change'),e=>e.code==='ADJUSTMENT_REQUIRED');
    await db.dbCreateInvoice({patientId:p.id,patientName:p.patientName,patientPhone:p.phone,appointmentId:booked.appointment.id,serviceSlug:'reeducation-posturale',amount:50,paymentMethod:'CASH'},'old-flow');
    assert((await list(p)).sessions[0].invoiceId);
    await assert.rejects(()=>billing.createSessionInvoice(input(p,[selection(visits[0],visits[0].unitPriceCents)]),'old-duplicate'),e=>e.code==='ALREADY_INVOICED');
  });
  await t.test('cancellation preserves lines and releases sessions for an explicit replacement',async()=>{
    const p=await patient();await session(p);const body=input(p,(await list(p)).sessions.map(v=>selection(v)));
    const first=await billing.createSessionInvoice(body,'cancel-a');await db.dbDeleteInvoice(first.id);
    const cancelled=await db.dbGetInvoiceById(first.id);assert.equal(cancelled.paymentStatus,'CANCELLED');assert(cancelled.items[0].releasedAt);
    assert.equal((await list(p)).sessions[0].invoiceId,null);
    const next=await billing.createSessionInvoice(body,'cancel-b');assert.notEqual(next.id,first.id);
    await assert.rejects(()=>db.dbUpdateInvoice(first.id,{paymentStatus:'PAID'}),/cancelled_invoice_immutable/);
  });
  await t.test('backup and restore retain session allocations and legacy one-line documents remain printable',async()=>{
    const backup=await db.dbExportFullDatabaseBackup();assert(backup.tables.invoice_items.length>0);
    await db.dbRestoreFullDatabaseBackup(backup);assert.deepEqual((await db.dbGetInvoiceById(savedInvoice.id)).items,savedInvoice.items);
    const display=load('@/lib/invoice-display').invoiceDisplayTotals({...savedInvoice,items:[],amount:12.3,amountCents:1230,vatRate:23});
    assert.equal(display.quantity,1);assert.equal(display.totalAmount,12.3);assert.equal(display.incidence+display.vatAmount,12.3);
  });
  await t.test('mixed treatment totals are allocated correctly in analytics and item snapshots cannot be edited',async()=>{
    const p=await patient();await session(p);await session(p,'cavitation');
    const visits=(await list(p)).sessions;
    const body={...input(p,visits.map(v=>selection(v,v.serviceSlug==='cavitation'?8000:5000))),paymentStatus:'PAID'};
    const beforeAll=await db.dbGetFilteredAnalyticsStats({range:'all'});
    const beforeKine=await db.dbGetFilteredAnalyticsStats({range:'all',pole:'kinesitherapie'});
    const beforeMinceur=await db.dbGetFilteredAnalyticsStats({range:'all',pole:'minceur'});
    const invoice=await billing.createSessionInvoice(body,'mixed-poles');
    const afterAll=await db.dbGetFilteredAnalyticsStats({range:'all'});
    const afterKine=await db.dbGetFilteredAnalyticsStats({range:'all',pole:'kinesitherapie'});
    const afterMinceur=await db.dbGetFilteredAnalyticsStats({range:'all',pole:'minceur'});
    assert.equal(afterAll.stats.totalPaid-beforeAll.stats.totalPaid,130);
    assert.equal(afterKine.stats.totalPaid-beforeKine.stats.totalPaid,50);
    assert.equal(afterMinceur.stats.totalPaid-beforeMinceur.stats.totalPaid,80);
    assert.equal(afterAll.stats.invoicesCount-beforeAll.stats.invoicesCount,1);
    const findPole=(r,pole)=>r.departmentData.poles.find(p=>p.pole===pole).revenue;
    assert.equal(findPole(afterAll,'minceur')-findPole(beforeAll,'minceur'),80);
    assert.equal(findPole(afterAll,'kinesitherapie')-findPole(beforeAll,'kinesitherapie'),50);
    assert((await db.dbGetInvoices({patientId:p.id,pole:'minceur'})).some(i=>i.id===invoice.id));
    await assert.rejects(()=>db.executeQuery('UPDATE invoice_items SET unitPriceCents=9999,totalCents=9999 WHERE invoiceId=?',[invoice.id]),/invoice_item_snapshot_immutable/);
  });
});
test.after(()=>{for(const c of clients)c.close();if(!libsql)db.getDb().close();});
