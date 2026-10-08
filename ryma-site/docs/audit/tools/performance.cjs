const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module');
const root=path.resolve(__dirname,'../../..'),project=path.resolve(root,'../tmp/dashboard-audit-20261007/project'),out=path.join(root,'docs/audit/evidence');
const temp=fs.mkdtempSync(path.resolve(root,'../tmp/dashboard-audit-perf-'));
for(const key of Object.keys(process.env))if(/^(TURSO|SMTP|WHATSAPP|VERCEL|AWS_|NETLIFY|DATABASE_)/.test(key))delete process.env[key];
Object.assign(process.env,{NODE_ENV:'test',DATABASE_PATH:path.join(temp,'performance.db'),WHATSAPP_ENABLED:'false'});
const ts=require(path.join(root,'node_modules/typescript')),resolve=Module._resolveFilename;
Module._resolveFilename=function(name,...args){return resolve.call(this,name.startsWith('@/')?path.join(project,'src',name.slice(2)):name,...args)};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,file);
const db=require(path.join(project,'src/lib/db.ts'));
const results=[];
const pct=(xs,p)=>xs.slice().sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*p))];
async function bench(name,fn,n=20){await fn();const samples=[];let bytes=0;for(let i=0;i<n;i++){const t=performance.now();const data=await fn();samples.push(performance.now()-t);bytes=Buffer.byteLength(JSON.stringify(data,(_,v)=>v instanceof Map?Object.fromEntries(v):v));}return {name,samples:n,medianMs:+pct(samples,.5).toFixed(2),p95Ms:+pct(samples,.95).toFixed(2),responseBytes:bytes};}
async function main(){const sql=db.getDb(),now='2026-10-07T12:00:00.000Z';let insertedPatients=0,insertedAppointments=0;const day=new Date('2021-01-04T12:00:00Z'),times=['08:30','09:30','10:30','11:30','14:00','15:00','16:00'];
const pi=sql.prepare('INSERT INTO patients(id,patientName,phone,email,medicalHistory,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)');
const ai=sql.prepare('INSERT INTO appointments(id,patientName,phone,service,date,startTime,status,createdAt,updatedAt,patientId,practitionerId,practitionerName,durationMinutes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)');
const ni=sql.prepare('INSERT INTO patient_notes(phone,patientName,content,tags,updatedAt) VALUES(?,?,?,?,?)');
for(const [patients,appointments] of [[100,500],[1000,10000]]){
const t=performance.now();sql.transaction(()=>{for(let i=insertedPatients;i<patients;i++){pi.run('perf-'+i,'Audit Performance '+i,'+35196'+String(4000000+i),'perf@example.invalid','Notes fictives '.repeat(20),now,now);ni.run('+35196'+String(4000000+i),'Audit Performance '+i,'Notes fictives '.repeat(20),'test',now);}for(let i=insertedAppointments;i<appointments;i++){if(i>0&&i%times.length===0){day.setUTCDate(day.getUTCDate()+1);if(day.getUTCDay()===0)day.setUTCDate(day.getUTCDate()+1);}const p=i%patients;ai.run('perf-a-'+i,'Audit Performance '+p,'+35196'+String(4000000+p),'reeducation-posturale',day.toISOString().slice(0,10),times[i%times.length],i%5===0?'CANCELLED':'COMPLETED',now,now,'perf-'+p,'legacy','Audit Praticien',50);}})();insertedPatients=patients;insertedAppointments=appointments;const seedMs=performance.now()-t;
const measurements=[];
measurements.push(await bench('appointments_page_50_summary',async()=>({page:await db.dbGetAppointmentsPaginated({page:1,limit:50}),stats:await db.dbGetAppointmentSummary()})));
measurements.push(await bench('appointments_search',()=>db.dbGetAppointmentsPaginated({page:1,limit:50,search:'Performance 99'})));
measurements.push(await bench('calendar_week',()=>db.dbGetAppointments({dateFrom:'2021-01-04',dateTo:'2021-01-10'})));
measurements.push(await bench('patients_directory_10',()=>db.dbGetPatientDirectory({page:1,limit:10,search:'',coverageType:'ALL'})));
measurements.push(await bench('patients_legacy_unpaginated',()=>db.dbGetAllPatients(),5));
measurements.push(await bench('slots_single_day',()=>db.dbCheckMultipleDatesAvailability(['2027-02-01'],undefined,'reeducation-posturale')));
measurements.push(await bench('analytics_30d',()=>db.dbGetFilteredAnalyticsStats({range:'30d'}),5));
measurements.push(await bench('analytics_all',()=>db.dbGetFilteredAnalyticsStats({range:'all'}),5));
measurements.push(await bench('all_appointments_for_export',()=>db.dbGetAppointments(),5));
measurements.push(await bench('create_and_delete_booking',async()=>{const a=await db.dbCreateAppointment({patientName:'Audit Perf Mutation',phone:'+351969800001',service:'reeducation-posturale',date:'2027-02-01',startTime:'09:00',practitionerId:'legacy'});if(!a.success)throw Error(JSON.stringify(a));await db.dbDeleteAppointment(a.appointment.id);return {created:true}},10));
results.push({patients,appointments,seedMs:Math.round(seedMs),measurements});
}
const plans={agenda:sql.prepare('EXPLAIN QUERY PLAN SELECT * FROM appointments WHERE date>=? AND date<=? ORDER BY date DESC,startTime ASC,id ASC').all('2026-10-01','2026-10-07'),phone:sql.prepare('EXPLAIN QUERY PLAN SELECT * FROM appointments WHERE phone=? ORDER BY date DESC').all('+351964000001'),session:sql.prepare('EXPLAIN QUERY PLAN SELECT * FROM patient_sessions WHERE appointmentId=?').all('x')};
fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify({environment:{node:process.version,platform:os.platform(),cpu:os.cpus()[0].model,logicalCores:os.cpus().length,memoryGiB:Math.round(os.totalmem()/1024**3),adapter:'better-sqlite3',journalMode:sql.pragma('journal_mode',{simple:true}),busyTimeout:sql.pragma('busy_timeout',{simple:true}),method:'one warm-up then sequential database-function calls; no browser/network; synthetic fixtures; local machine'},results,plans,integrity:sql.pragma('integrity_check')},null,2));sql.close();console.log(JSON.stringify(results,null,2));}
main().catch(e=>{console.error(e);process.exitCode=1});
