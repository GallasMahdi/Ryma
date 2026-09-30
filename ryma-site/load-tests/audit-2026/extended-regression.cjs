const assert=require('node:assert/strict'),C=require('./common.cjs'),B=require('./browser.cjs');
async function main(){
 const {cookie}=await C.login('198.18.9.8');const checks=[];
 const d=C.db(),ids=[1,2,3].map(i=>C.runId+'-patient-'+i);
 const previous=ids.map(id=>d.prepare('SELECT id,coverageType,coverageProvider FROM patients WHERE id=?').get(id));
 d.prepare("UPDATE patients SET coverageType='INSURANCE' WHERE id=?").run(ids[0]);d.prepare("UPDATE patients SET coverageType='ADSE' WHERE id=?").run(ids[1]);d.prepare("UPDATE patients SET coverageProvider='AUDIT Provider' WHERE id=?").run(ids[2]);d.close();
 try{
  const result=await C.req('/api/admin/patients?directory=1&coverage=INSURANCE',{headers:{cookie}});
  assert.equal(result.status,200);assert.equal(result.json.total,3);assert.equal(result.json.counts.insurance,3);assert(result.json.patients.every(p=>ids.includes(p.id)));
  checks.push({name:'insurance-ADSE-provider-filter',passed:true});
 }finally{const db=C.db();for(const row of previous)db.prepare('UPDATE patients SET coverageType=?,coverageProvider=? WHERE id=?').run(row.coverageType,row.coverageProvider,row.id);db.close();}
 const browser=await B.chromium.launch({headless:true,executablePath:B.executablePath});const ctx=await browser.newContext({viewport:{width:1440,height:900},userAgent:B.ua,timezoneId:'Europe/Lisbon'});
 await ctx.addCookies([{name:'ryma_admin_session',value:cookie.split('=').slice(1).join('='),url:C.base,httpOnly:true,secure:true,sameSite:'Lax'},{name:'ryma_lang',value:'en',url:C.base}]);await ctx.addInitScript(()=>localStorage.setItem('ryma_lang','en'));await ctx.tracing.start({screenshots:true,snapshots:true});const p=await ctx.newPage();p.setDefaultTimeout(20000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 async function step(name,fn){await fn();checks.push({name,passed:true});console.log(name+' passed');}
 const responseFor=(path,test)=>p.waitForResponse(r=>{const u=new URL(r.url());return u.pathname===path&&r.request().method()==='GET'&&r.status()===200&&test(u.searchParams);});
 try{
  await p.goto(C.base+'/admin?tab=appointments',{waitUntil:'domcontentloaded'});
  await step('calendar-next-week-even-when-empty',async()=>{await p.getByTitle('Next week',{exact:true}).waitFor();const response=responseFor('/api/admin/appointments',q=>q.get('calendar')==='1'&&q.get('dateFrom')>C.today);await p.getByTitle('Next week',{exact:true}).click();const data=await(await response).json();assert(data.appointments.every(a=>a.date>C.today));await p.getByTitle('Previous week',{exact:true}).waitFor();});
  await step('patient-page-two',async()=>{await p.getByRole('button',{name:/Patient Records/}).first().click();await p.getByTitle('Página seguinte',{exact:true}).filter({visible:true}).waitFor();const response=responseFor('/api/admin/patients',q=>q.get('page')==='2');await p.getByTitle('Página seguinte',{exact:true}).filter({visible:true}).click();const data=await(await response).json();assert.equal(data.page,2);assert.equal(data.patients.length,10);await p.getByText(data.patients[0].patientName,{exact:true}).filter({visible:true}).first().waitFor();});
  await step('clinical-note-save-outside-initial-page',async()=>{
   await p.getByPlaceholder('Search patient, phone...').fill('AUDIT Patient 09999');await p.getByText('AUDIT Patient 09999',{exact:true}).filter({visible:true}).first().click();await p.getByText('patient9999@example.invalid',{exact:false}).filter({visible:true}).first().waitFor();
   await p.getByRole('button',{name:/^Notes/}).filter({visible:true}).click();const marker='AUDIT persisted note '+C.runId;await p.locator('textarea').filter({visible:true}).fill(marker);
   const saved=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/patients'&&r.request().method()==='POST');await p.getByRole('button',{name:'Save Notes',exact:true}).click();assert.equal((await saved).status(),200);
   const db=C.db();const row=db.prepare('SELECT medicalHistory FROM patients WHERE id=?').get(C.runId+'-patient-9999');db.close();assert.equal(row.medicalHistory,marker);await p.getByRole('button',{name:'Save Notes',exact:true}).waitFor();assert.equal(await p.locator('textarea').filter({visible:true}).inputValue(),marker);
  });
  await step('invoice-page-two',async()=>{await p.getByRole('button',{name:/Invoicing & Receipts/}).first().click();await p.getByTitle('Next page',{exact:true}).filter({visible:true}).waitFor();const response=responseFor('/api/admin/invoices',q=>q.get('page')==='2');await p.getByTitle('Next page',{exact:true}).filter({visible:true}).click();const data=await(await response).json();assert.equal(data.page,2);await p.getByText(data.invoices[0].invoiceNumber,{exact:true}).filter({visible:true}).first().waitFor();});
  await step('invoice-modal-global-patient-search',async()=>{await p.getByRole('button',{name:'Issue Receipt',exact:true}).click();await p.getByPlaceholder('Search patient name, phone, NIF...').fill('AUDIT Patient 09998');await p.getByText('AUDIT Patient 09998',{exact:true}).filter({visible:true}).first().click();assert.equal(await p.getByPlaceholder('Ex: Maria Santos Silva').inputValue(),'AUDIT Patient 09998');assert.equal(await p.getByPlaceholder('+351 912 345 678').inputValue(),C.phone(9998));});
  assert.equal(errors.length,0);await p.screenshot({path:C.path.join(C.out,'extended-regression.png')});
 }finally{C.write('extended-regression.json',{checks,errors});await ctx.tracing.stop({path:C.path.join(C.out,'extended-regression-trace.zip')});await ctx.close();await browser.close();}
}
main().catch(e=>{console.error(e);C.write('extended-regression-fatal.json',{error:e.stack});process.exitCode=1;});
