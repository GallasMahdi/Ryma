const C=require('./common.cjs');const {req,db,write,append,login,seed,stats,payload,slot,phone,runId,out,fs,path}=C;
async function main(){
 if(!process.env.AUDIT_REMEASURE){
 const health=await req('/api/health');write('first-health.json',health);if(health.status!==200)throw Error('Production server health failed');
 const d=db();const tables=d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);const baseline={};for(const t of tables)baseline[t]=d.prepare(`SELECT rowid FROM ${t}`).all().map(r=>r.rowid);write('baseline-records.json',baseline);write('sqlite-environment.json',{databaseList:d.pragma('database_list'),journalMode:d.pragma('journal_mode'),sqliteVersion:d.prepare('select sqlite_version() v').get(),initialCounts:Object.fromEntries(tables.map(t=>[t,baseline[t].length]))});d.close();
 let {cookie}=await login('198.18.1.1',true);
 const loginRows=[];for(let i=0;i<20;i++){const r=await req('/api/admin/login',{method:'POST',body:JSON.stringify({password:C.secret.password}),headers:{'x-forwarded-for':'198.18.1.2'}});loginRows.push({ms:r.ms,status:r.status,bytes:r.bytes,ok:r.json?.success===true});}write('authentication.json',{samples:loginRows,summary:stats(loginRows,loginRows.reduce((n,r)=>n+r.ms,0)),budgetMs:1000,justification:'Interactive login; bcrypt cost 12 intentionally expensive.'});
 const b=payload(0,0);const t=performance.now();const booking=await req('/api/appointments',{method:'POST',headers:{'x-forwarded-for':'198.18.1.3'},body:JSON.stringify(b)});const verify=db();const rows=verify.prepare('SELECT * FROM appointments WHERE phone=? AND date=? AND startTime=?').all(b.phone,b.date,b.startTime);verify.close();const bookingEnd=performance.now()-t;write('smoke.json',{health:health.status,booking:{status:booking.status,response:booking.json,msThroughDatabaseVerification:bookingEnd,records:rows.length},passed:booking.status===201&&booking.json?.success===true&&rows.length===1});if(booking.status!==201||!booking.json?.success||rows.length!==1)throw Error('Write smoke failed');
 // Separate the small functional write from exact growth datasets; delete only its known ID.
 const clean=db();clean.prepare('DELETE FROM appointments WHERE id=?').run(rows[0].id);clean.prepare('DELETE FROM patient_notes WHERE phone=?').run(b.phone);const patientIds=clean.prepare('SELECT id FROM patients WHERE phone=?').all(b.phone);for(const p of patientIds)clean.prepare('DELETE FROM patients WHERE id=?').run(p.id);write('smoke-record-manifest.json',{appointments:rows.map(r=>({id:r.id,phone:r.phone,date:r.date,startTime:r.startTime,deleted:true})),patients:patientIds});clean.close();
 }
 let {cookie}=await login('198.18.1.1',true);
 const all=[];
 for(const size of [100,1000,10000]){
  seed(size);({cookie}=await login('198.18.1.1',true));
  const cases=[
   ['availability','/api/slots?date='+slot(100).date,r=>r.json?.slots?.length===15,100],
   ['month_availability','/api/slots?dates='+Array.from({length:28},(_,i)=>C.dateOffset(i+7)).join(','),r=>Object.keys(r.json?.availability||{}).length===28,100],
   ['appointments_page','/api/admin/appointments?page=1&limit=50',r=>r.json?.appointments?.length===50&&r.json?.total===size,100],
   ['appointments_filter','/api/admin/appointments?page=1&limit=50&search=Patient%2000001',r=>r.json?.appointments?.length===1,100],
   ['appointments_all','/api/admin/appointments',r=>r.json?.appointments?.length===size,20],
   ['patients_directory','/api/admin/patients?directory=1&page=1&limit=10',r=>r.json?.patients?.length===10&&r.json?.total===size&&r.json?.counts?.all===size&&r.json?.notes?.length===0,100],
   ['patients_directory_search','/api/admin/patients?directory=1&limit=10&search=Patient%2000001',r=>r.json?.patients?.length===1&&r.json?.total===1,100],
   ['appointments_dashboard','/api/admin/appointments?summary=1&page=1&limit=10',r=>r.json?.appointments?.length===10&&r.json?.stats?.total===size,100],
   ['patients_page','/api/admin/patients?page=1&limit=50',r=>r.json?.patients?.length===50&&r.json?.total===size,100],
   ['patients_search','/api/admin/patients?page=1&limit=50&search=Patient%2000001',r=>r.json?.patients?.length===1&&r.json?.patients[0].sessions?.length===3,100],
   ['patients_all','/api/admin/patients',r=>r.json?.patients?.length===size,20],
   ['patient_sessions_embedded','/api/admin/patients?page=1&limit=1&search=Patient%2000001',r=>r.json?.patients?.length===1&&r.json.patients[0].sessions?.length===3,100],
   ['invoices_page','/api/admin/invoices?page=1&limit=50',r=>r.json?.invoices?.length===50&&r.json?.total===size,100],
   ['invoices_all','/api/admin/invoices',r=>r.json?.invoices?.length===size,20],
   ['analytics','/api/admin/analytics?range=all&lang=en',r=>!!r.json&&!r.json.error&&!!r.json.expiresAt,100],
   ['export_patients','/api/admin/export?type=patients',r=>r.text?.includes('AUDIT Patient 00001')&&r.text.trim().split('\n').length===size+1,20],
   ['export_invoices','/api/admin/export?type=invoices',r=>r.text?.includes('AUDIT-1')&&r.text.trim().split('\n').length===size+1,20],
  ];
  for(const [name,url,validate,n]of cases){
    const warm=await req(url,{headers:{cookie}});if(warm.status!==200||!validate(warm)){append('validation-failures.jsonl',{size,name,status:warm.status,response:warm.json||warm.text?.slice(0,500)});throw Error('Endpoint validation failed: '+name);}
    const samples=[];const started=performance.now();for(let i=0;i<n;i++){const r=await req(url,{headers:{cookie}});const row={ms:r.ms,status:r.status,bytes:r.bytes,ok:r.status===200&&validate(r)};samples.push(row);append('api-samples.jsonl',{time:new Date().toISOString(),size,name,i,...row});}
    const summary={size,name,url,warmupStatus:warm.status,...stats(samples,performance.now()-started)};all.push(summary);write('api-summary.json',all);console.log(JSON.stringify(summary));
  }
 }
 const q=db();const plans=[
 ['patient_search','SELECT * FROM patients WHERE patientName LIKE ? OR phone LIKE ? OR pathologyTags LIKE ? OR coverageProvider LIKE ? OR referringDoctor LIKE ? ORDER BY updatedAt DESC LIMIT ? OFFSET ?',['%00001%','%00001%','%00001%','%00001%','%00001%',50,0]],
 ['patient_page','SELECT * FROM patients ORDER BY updatedAt DESC LIMIT 50 OFFSET 0',[]],
 ['sessions','SELECT * FROM patient_sessions WHERE patientId=? ORDER BY date DESC,createdAt DESC',[runId+'-patient-1']],
 ['availability',"SELECT date,startTime,status FROM appointments WHERE date IN (?) AND status != 'CANCELLED'",[slot(1).date]],
 ['invoice_stats',"SELECT SUM(amount) FROM invoices WHERE paymentStatus='PAID'",[]]
 ].map(([name,sql,args])=>{const stmt=q.prepare(sql),samples=[];for(let i=0;i<100;i++){const t=performance.now();stmt.all(...args);samples.push(performance.now()-t);}return{name,sql,args,plan:q.prepare('EXPLAIN QUERY PLAN '+sql).all(...args),directSqlMs:samples};});write('query-plans.json',plans);q.close();
 console.log('API and growth measurements finished.');
}
main().catch(e=>{console.error(e);write('api-fatal.json',{error:e.stack});process.exitCode=1});
