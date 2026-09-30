const assert = require('node:assert/strict');
const C = require('./common.cjs');
const B = require('./browser.cjs');
async function main() {
  const {cookie} = await C.login('198.18.9.1', true);
  const checks = [];
  async function api(url, validate) {
    const r = await C.req(url, {headers: {cookie}});
    assert.equal(r.status, 200, url + ': ' + r.text?.slice(0,200));
    validate(r.json);
    checks.push({url, ms: r.ms, bytes: r.bytes, passed: true});
    return r.json;
  }
  const first = await api('/api/admin/appointments?page=1&limit=10&summary=1', x => {assert.equal(x.appointments.length, 10); assert.equal(x.stats.total, x.total);});
  const second = await api('/api/admin/appointments?page=2&limit=10', x => assert.equal(x.appointments.length, 10));
  assert(!first.appointments.some(a => second.appointments.some(b => a.id === b.id)), 'Appointment pages overlap');
  await api('/api/admin/appointments?page=1&limit=10&search=Patient%2009999', x => {assert.equal(x.total, 1); assert.equal(x.appointments[0].patientName, 'AUDIT Patient 09999');});
  await api('/api/admin/appointments?calendar=1&dateFrom='+C.dateOffset(-7)+'&dateTo='+C.today, x => assert(x.appointments.every(a => a.date >= C.dateOffset(-7) && a.date <= C.today)));
  assert.equal((await C.req('/api/admin/appointments?calendar=1&dateFrom=2000-01-01&dateTo=2030-01-01', {headers:{cookie}})).status, 400);
  const p1 = await api('/api/admin/patients?directory=1&limit=10&page=1', x => assert.equal(x.patients.length, 10));
  const p2 = await api('/api/admin/patients?directory=1&limit=10&page=2', x => assert.equal(x.patients.length, 10));
  assert(!p1.patients.some(a => p2.patients.some(b => a.id === b.id)), 'Patient pages overlap');
  await api('/api/admin/patients?directory=1&limit=10&search=Patient%2009999', x => {assert.equal(x.total,1); assert.equal(x.patients[0].patientName,'AUDIT Patient 09999');});
  await api('/api/admin/patients?phone='+encodeURIComponent(C.phone(9999)), x => assert.equal(x.patient.sessions.length,3));
  await api('/api/admin/invoices?page=1&limit=10&search=AUDIT-9999', x => {assert.equal(x.total,1); assert.equal(x.invoices[0].invoiceNumber,'AUDIT-9999');});
  // Legacy-only records must remain searchable and must not duplicate structured patients.
  const db = C.db();
  const legacyPhone = C.phone(800000);
  db.prepare('INSERT INTO patient_notes(phone,patientName,content,tags,updatedAt) VALUES(?,?,?,?,?)').run(legacyPhone,'AUDIT Legacy Directory','Legacy clinical note','legacy',new Date().toISOString());
  db.prepare('INSERT INTO patient_notes(phone,patientName,content,tags,updatedAt) VALUES(?,?,?,?,?)').run(C.phone(1),'AUDIT Patient 00001','Legacy duplicate','legacy',new Date().toISOString());
  db.close();
  try {
    await api('/api/admin/patients?directory=1&search=Legacy%20Directory', x => {assert.equal(x.total,1); assert.equal(x.patients[0].medicalHistory,'Legacy clinical note');});
    await api('/api/admin/patients?directory=1&search=Patient%2000001', x => assert.equal(x.total,1));
  } finally {const db=C.db();db.prepare('DELETE FROM patient_notes WHERE phone IN (?,?)').run(legacyPhone,C.phone(1));db.close();}
  const browser = await B.chromium.launch({headless:true, executablePath:B.executablePath});
  const context = await browser.newContext({viewport:{width:1440,height:900},userAgent:B.ua,timezoneId:'Europe/Lisbon'});
  await context.addCookies([{name:'ryma_admin_session',value:cookie.split('=').slice(1).join('='),url:C.base,httpOnly:true,secure:true,sameSite:'Lax'},{name:'ryma_lang',value:'en',url:C.base}]);
  await context.addInitScript(() => localStorage.setItem('ryma_lang','en'));
  await context.tracing.start({screenshots:true,snapshots:true});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/admin/'))requests.push(r.url());});
  async function step(name,fn){const started=performance.now();await fn();const row={name,ms:performance.now()-started,passed:true};checks.push(row);console.log(JSON.stringify(row));}
  try {
    // No fixed sleep or Live prerequisite: the first actionable click must work.
    for(let i=0;i<5;i++) await step('early-table-click-'+i,async()=>{
      await page.goto(C.base+'/admin?tab=appointments',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Table',exact:true}).click();
      await page.getByPlaceholder('Search patient, phone, service...').fill('AUDIT Patient 09999');
      await page.getByText('AUDIT Patient 09999',{exact:true}).filter({visible:true}).first().waitFor();
      assert(await page.locator('table').filter({visible:true}).count()>0,'Table click lost');
    });
    await step('patient-outside-first-page',async()=>{
      await page.getByRole('button',{name:/Patient Records/}).first().click();
      await page.getByPlaceholder('Search patient, phone...').fill('AUDIT Patient 09999');
      await page.getByText('AUDIT Patient 09999',{exact:true}).filter({visible:true}).first().click();
      await page.getByText('patient9999@example.invalid',{exact:false}).filter({visible:true}).first().waitFor();
      await page.getByRole('button',{name:/^History/}).filter({visible:true}).click();
      await page.getByText('Synthetic session 0',{exact:false}).filter({visible:true}).first().waitFor();
    });
    await step('invoice-outside-first-page',async()=>{
      await page.getByRole('button',{name:/Invoicing & Receipts/}).first().click();
      await page.getByPlaceholder('Search by Patient, NIF, Invoice # (e.g. FR 2026/0001) or Phone...').fill('AUDIT-9999');
      await page.getByText('AUDIT-9999',{exact:true}).filter({visible:true}).first().waitFor();
    });
    for(let i=0;i<5;i++) await step('rapid-tab-switch-'+i,async()=>{
      await page.getByRole('button',{name:/Patient Records/}).first().click();
      await page.getByPlaceholder('Search patient, phone...').waitFor();
      await page.getByRole('button',{name:/Invoicing & Receipts/}).first().click();
      await page.getByPlaceholder('Search by Patient, NIF, Invoice # (e.g. FR 2026/0001) or Phone...').waitFor();
      assert(new URL(page.url()).searchParams.get('tab')==='invoices');
    });
    assert.equal(errors.length,0,JSON.stringify(errors));
    assert(!requests.some(url=>/\/api\/admin\/(patients|appointments|invoices)$/.test(url)), 'Unbounded dashboard list request');
    await page.screenshot({path:C.path.join(C.out,'fixes-regression.png')});
  } finally {
    C.write('fixes-regression.json',{checks,errors,requests});
    await context.tracing.stop({path:C.path.join(C.out,'fixes-regression-trace.zip')});
    await context.close();await browser.close();
  }
}
main().catch(e=>{C.write('fixes-regression-fatal.json',{error:e.stack});console.error(e);process.exitCode=1;});
