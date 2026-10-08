// Read-only inspection of a named database; benchmarks use synthetic in-memory data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const Database = require('better-sqlite3');
const sourcePath = process.env.RYMA_SCHEMA_AUDIT_DB;
assert(sourcePath && fs.existsSync(sourcePath), 'Set RYMA_SCHEMA_AUDIT_DB to the database to inspect');
const source = new Database(sourcePath, {readonly:true, fileMustExist:true});
const fixture = new Database(':memory:');
const tables = ['appointments','practitioners','practitioner_services','patient_sessions','working_hours','schedule_exceptions','resources','service_resources','blocked_slots'];
try {
  const orphanQueries = {
    appointmentPractitioner: 'SELECT COUNT(*) n FROM appointments a LEFT JOIN practitioners p ON p.id=a.practitionerId WHERE p.id IS NULL',
    appointmentPatient: 'SELECT COUNT(*) n FROM appointments a LEFT JOIN patients p ON p.id=a.patientId WHERE a.patientId IS NOT NULL AND p.id IS NULL',
    sessionAppointment: 'SELECT COUNT(*) n FROM patient_sessions s LEFT JOIN appointments a ON a.id=s.appointmentId WHERE s.appointmentId IS NOT NULL AND a.id IS NULL',
    sessionPractitioner: 'SELECT COUNT(*) n FROM patient_sessions s LEFT JOIN practitioners p ON p.id=s.practitionerId WHERE s.practitionerId IS NOT NULL AND p.id IS NULL',
    hoursScope: "SELECT COUNT(*) n FROM working_hours h LEFT JOIN practitioners p ON p.id=h.practitionerId WHERE h.practitionerId!='*' AND p.id IS NULL",
    exceptionScope: "SELECT COUNT(*) n FROM schedule_exceptions e LEFT JOIN practitioners p ON p.id=e.practitionerId WHERE e.practitionerId!='*' AND p.id IS NULL",
    blockedScope: "SELECT COUNT(*) n FROM blocked_slots b LEFT JOIN practitioners p ON p.id=b.practitionerId WHERE b.practitionerId!='*' AND p.id IS NULL",
    servicePractitioner: 'SELECT COUNT(*) n FROM practitioner_services s LEFT JOIN practitioners p ON p.id=s.practitionerId WHERE p.id IS NULL',
    serviceResource: 'SELECT COUNT(*) n FROM service_resources s LEFT JOIN resources r ON r.id=s.resourceId WHERE r.id IS NULL',
    invoicePractitioner: 'SELECT COUNT(*) n FROM invoices i LEFT JOIN practitioners p ON p.id=i.practitionerId WHERE i.practitionerId IS NOT NULL AND p.id IS NULL',
    prescriptionPractitioner: 'SELECT COUNT(*) n FROM prescriptions r LEFT JOIN practitioners p ON p.id=r.practitionerId WHERE r.practitionerId IS NOT NULL AND p.id IS NULL',
    invalidResourceArray: "SELECT COUNT(*) n FROM appointments WHERE json_type(resourceIds)!='array'",
    appointmentResource: 'SELECT COUNT(*) n FROM appointments a,json_each(a.resourceIds) j LEFT JOIN resources r ON r.id=j.value WHERE r.id IS NULL',
  };
  const checks = Object.fromEntries(Object.entries(orphanQueries).map(([name,sql])=>[name,source.prepare(sql).get().n]));
  const queries = {
    availability: ["SELECT * FROM appointments WHERE status!='CANCELLED' AND date IN (?,?)", ['2026-10-22','2026-10-23']],
    practitionerAgenda: ['SELECT * FROM appointments WHERE practitionerId=? AND date=? ORDER BY date DESC,startTime,id', ['legacy','2026-10-22']],
    patientConflict: ["SELECT id FROM appointments WHERE phone=? AND date=? AND status!='CANCELLED'", ['+351960000000','2026-10-22']],
    blocks: ['SELECT * FROM blocked_slots WHERE date=?', ['2026-10-22']],
    sessionReassignment: ['SELECT * FROM patient_sessions WHERE appointmentId=?', ['audit-target']],
    recurringReplay: ['SELECT * FROM patient_sessions WHERE appointmentId IN (?,?) ORDER BY date,time', ['audit-target','audit-target-2']],
  };
  const plans = Object.fromEntries(Object.entries(queries).map(([name,[sql,args]])=>[name,source.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(r=>r.detail)]));

  fixture.pragma('foreign_keys=ON');
  fixture.exec('CREATE TABLE patients(id TEXT PRIMARY KEY)');
  fixture.prepare('INSERT INTO patients VALUES(?)').run('audit-patient');
  fixture.exec(source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='patient_sessions'").get().sql);
  for(const index of source.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='patient_sessions' AND sql IS NOT NULL").all()) fixture.exec(index.sql);
  // Always compare without/with the proposed index, even after deployment.
  fixture.exec('DROP INDEX IF EXISTS idx_patient_sessions_appointment');
  const insert = fixture.prepare('INSERT INTO patient_sessions(id,patientId,date,createdAt,appointmentId) VALUES(?,?,?,?,?)');
  fixture.transaction(()=>{for(let i=0;i<50000;i++)insert.run('audit-'+i,'audit-patient','2026-10-22','2026-10-07T00:00:00Z','audit-appointment-'+i);})();
  function measure() {
    const sql = 'SELECT * FROM patient_sessions WHERE appointmentId=?';
    const read = fixture.prepare(sql), args = ['audit-appointment-25000'];
    for(let i=0;i<20;i++) read.all(...args);
    const timings = [];
    for(let i=0;i<200;i++){const start=performance.now();assert.equal(read.all(...args).length,1);timings.push(performance.now()-start);}
    timings.sort((a,b)=>a-b);
    return {plan:fixture.prepare('EXPLAIN QUERY PLAN '+sql).all(...args).map(r=>r.detail),medianMs:timings[100],p95Ms:timings[189]};
  }
  const before = measure();
  fixture.exec('CREATE INDEX idx_patient_sessions_appointment ON patient_sessions(appointmentId) WHERE appointmentId IS NOT NULL');
  const after = measure();
  const report = {
    generatedAt:new Date().toISOString(), sourceOpenedReadOnly:true,
    integrity:source.pragma('integrity_check'), foreignKeyViolations:source.pragma('foreign_key_check'),
    supplementalReferenceChecks:checks,
    schema:tables.map(table=>({table,rows:source.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,indexes:source.pragma(`index_list(${table})`),foreignKeys:source.pragma(`foreign_key_list(${table})`)})),
    queryPlans:plans,
    sessionLookupBenchmark:{syntheticRows:50000,measuredIterations:200,before,after,medianSpeedup:before.medianMs/after.medianMs},
    observations:[
      'Availability, patient conflicts, blocked intervals and practitioner-filtered agendas use indexes.',
      'The appointmentId index avoids full clinical-session scans for reassignment, deletion and recurring replay.',
      'Several scheduling relationships are enforced by application checks and triggers rather than declared foreign keys; supplemental orphan checks are necessary.',
      'The blocked_slots explicit date/time/scope index duplicates its unique index; assess removal separately against all workloads.',
      'Calendar evaluation still scans in-memory scheduling rows repeatedly; large-clinic end-to-end profiling remains separate from this SQL benchmark.',
      'Local timings exclude remote Turso network latency and do not establish production capacity.'
    ]
  };
  const output = path.resolve(__dirname,'../../output/multi-practitioner/team-schema-audit.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({integrity:report.integrity,foreignKeyErrors:report.foreignKeyViolations.length,references:checks,plans,benchmark:report.sessionLookupBenchmark,report:output},null,2));
  assert.deepEqual(report.integrity,[{integrity_check:'ok'}]);assert.equal(report.foreignKeyViolations.length,0);
  for(const [name,count] of Object.entries(checks))assert.equal(count,0,name);
} finally {fixture.close();source.close();}
