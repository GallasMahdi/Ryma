const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='http://127.0.0.1:3118',out=path.resolve(__dirname,'../corrections');let cookie='';const rows=[];
async function req(url,method='GET',body){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
async function main(){
  assert.equal((await req('/api/admin/login','POST',{password:'fix-admin-test'})).status,200);
  const profile={patientName:'Audit Correction Patient',phone:'+351969974001',medicalHistory:'Fictitious preserved history',pathologyTags:'Audit only'};
  const created=await req('/api/admin/patients','POST',profile);assert.equal(created.status,200);const patient=created.data.patient;
  const d=new Date();d.setDate(d.getDate()+35);while(d.getDay()!==1)d.setDate(d.getDate()+1);const date=d.toISOString().slice(0,10);
  const series=await req('/api/admin/appointments/multiple','POST',{patientId:patient.id,patientName:patient.patientName,phone:patient.phone,service:'reeducation-posturale',practitionerId:'legacy',sessions:[{date,startTime:'09:00',evaPainScore:8,notes:'Clinical note retained after archival'}]});assert.equal(series.status,201);const appointment=series.data.appointments[0];
  const invoice=await req('/api/admin/invoices','POST',{patientId:patient.id,appointmentId:appointment.id,patientName:patient.patientName,patientPhone:patient.phone,serviceSlug:'reeducation-posturale',amount:60.25});assert.equal(invoice.status,201);
  const rx=await req('/api/admin/prescriptions','POST',{patientId:patient.id,patientName:patient.patientName,patientPhone:patient.phone,practitionerId:'legacy',items:[{category:'lifestyle_habit',title:'Fixture exercise',instructions:'Fictitious prescription retained'}]});assert.equal(rx.status,201);
  const duplicate=await req('/api/admin/patients','POST',{...profile,patientName:'Different person'});assert.equal(duplicate.status,409);rows.push({test:'Duplicate patient creation',status:'PASS',http:duplicate.status,code:duplicate.data.code});
  const changed=await req('/api/admin/patients','POST',{id:patient.id,patientName:patient.patientName,phone:'+351969974002'});assert.equal(changed.status,200);
  for(const [route,key] of [['appointments','appointments'],['invoices','invoices'],['prescriptions','prescriptions']]){const r=await req('/api/admin/'+route+'?patientId='+patient.id);assert.equal(r.status,200);assert.equal(r.data[key].length,1);rows.push({test:route+' after phone change',status:'PASS',count:r.data[key].length});}
  const removed=await req('/api/admin/appointments/'+appointment.id,'DELETE');assert.equal(removed.status,200);assert.equal(removed.data.archived,true);
  const active=await req('/api/admin/appointments?patientId='+patient.id);assert.equal(active.data.appointments.length,0);
  const history=await req('/api/admin/appointments?patientId='+patient.id+'&includeArchived=1');assert.equal(history.data.appointments.length,1);assert(history.data.appointments[0].archivedAt);
  const detail=await req('/api/admin/patients?id='+patient.id);assert.equal(detail.data.patient.sessions.length,1);assert.equal(detail.data.patient.sessions[0].notes,'Clinical note retained after archival');
  rows.push({test:'Archive preserves patient history and session',status:'PASS',active:0,archived:1,sessions:1});
  const body={context:'Development server using isolated fixture, integrations disabled; production build blocked by font network access',patientId:patient.id,appointmentId:appointment.id,phone:changed.data.patient.phone,rows};
  fs.writeFileSync(path.join(out,'http-results.json'),JSON.stringify(body,null,2));console.log(JSON.stringify(body));
}
main().catch(e=>{console.error(e);process.exitCode=1});
