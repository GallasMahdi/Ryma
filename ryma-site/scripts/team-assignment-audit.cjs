const assert = require('node:assert/strict');

// Additional fault injection and adversarial checks run on both isolated adapters.
module.exports = async function teamAudit(t, {db, schedule, load, save, input, date, request, services, DEFAULT_HOURS, practitionerA, practitionerB}) {
  const profile = {name:'Team audit',profession:'Physiotherapist',color:'#123456',active:1,bookable:1,priority:50};
  const body = {action:'practitioner',practitioner:profile,services:services(),hours:DEFAULT_HOURS};
  const route = load('@/app/api/admin/practitioners/route');

  await t.test('linked clinical sessions use the appointment index for lookup and reassignment', async () => {
    for (const sql of [
      'SELECT * FROM patient_sessions WHERE appointmentId=?',
      'UPDATE patient_sessions SET practitionerId=? WHERE appointmentId=?',
      'DELETE FROM patient_sessions WHERE appointmentId=?',
      'SELECT * FROM patient_sessions WHERE appointmentId IN (?,?) ORDER BY date,time',
    ]) {
      const plan = await db.executeQuery('EXPLAIN QUERY PLAN '+sql,Array.from(sql.matchAll(/\?/g),()=> 'audit-placeholder'));
      assert(plan.some(row=>String(row.detail).includes('idx_patient_sessions_appointment')),JSON.stringify(plan));
      assert(!plan.some(row=>String(row.detail).includes('SCAN patient_sessions')),JSON.stringify(plan));
    }
  });

  await t.test('malformed team identifiers cannot accidentally create new records', async () => {
    for (const id of [null, false, 0, [], {}]) {
      const before = await schedule.getSchedulingConfiguration();
      const changes = [
        {...body,practitioner:{...profile,id}},
        {action:'resource',resource:{id,name:'Audit room',active:1},services:[]},
        {action:'exception',exception:{id,practitionerId:practitionerA,date:date(210),kind:'closed',startMinute:0,endMinute:1440,label:''}},
      ];
      for (const change of changes) {
        const response = await route.POST(request('/api/admin/practitioners',{...change,revision:before.revision}));
        assert.equal(response.status,422,JSON.stringify(change));
        assert.deepEqual(await schedule.getSchedulingConfiguration(),before);
      }
    }
  });
  await t.test('coercible color arrays return validation errors instead of database errors', async () => {
    const before = await schedule.getSchedulingConfiguration();
    const response = await route.POST(request('/api/admin/practitioners',{...body,revision:before.revision,practitioner:{...profile,color:['#123456']}}));
    assert.equal(response.status,422);
    assert.deepEqual(await schedule.getSchedulingConfiguration(),before);
  });
  await t.test('configuration read outages produce retryable JSON without database details', async () => {
    const original = schedule.getSchedulingConfiguration;
    schedule.getSchedulingConfiguration = async () => {throw Error('private-db-location unavailable');};
    try {
      for (const path of ['/api/admin/practitioners','/api/practitioners']) {
        const response = await load('@/app'+path+'/route').GET(request(path,null,'GET'));
        assert.equal(response.status,503);assert.equal(response.headers.get('Retry-After'),'1');
        assert(!JSON.stringify(await response.json()).includes('private-db-location'));
      }
    } finally {schedule.getSchedulingConfiguration = original;}
  });
  await t.test('a failure inside a team write rolls back the profile, services, hours and revision', async () => {
    const before = await schedule.getSchedulingConfiguration(), original = db.executeConditionalBatch;
    db.executeConditionalBatch = (guard, statements) => original(guard,[...statements,{sql:'INSERT INTO team_audit_missing_table VALUES(1)',args:[]}]);
    try {await assert.rejects(()=>save(body),/team_audit_missing_table/);}
    finally {db.executeConditionalBatch = original;}
    assert.deepEqual(await schedule.getSchedulingConfiguration(),before);
  });
  await t.test('two simultaneous team edits have one winner and no partial losing profile', async () => {
    const before = await schedule.getSchedulingConfiguration();
    const results = await Promise.allSettled(['Team race A','Team race B'].map(name=>schedule.saveSchedulingConfiguration({...body,revision:before.revision,practitioner:{...profile,name}})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='SCHEDULE_CHANGED').length,1);
    const config = await schedule.getSchedulingConfiguration();
    assert.equal(config.practitioners.length,before.practitioners.length+1);
  });
  await t.test('a booking arriving during team editing prevents a stale archive atomically', async () => {
    await save({...body,practitioner:{...profile,name:'Archive race'}});
    const before = await schedule.getSchedulingConfiguration(), p = before.practitioners.find(p=>p.name==='Archive race');
    const original = db.executeConditionalBatch;
    let injected = false;
    db.executeConditionalBatch = async (guard, statements) => {
      if (!injected) {
        injected = true;
        const result = await db.dbCreateAppointment(input({date:date(211),practitionerId:p.id}));
        assert(result.success);
      }
      return original(guard,statements);
    };
    try {await assert.rejects(()=>schedule.saveSchedulingConfiguration({...body,revision:before.revision,practitioner:{...p,active:0}}),e=>e.code==='SCHEDULE_CHANGED');}
    finally {db.executeConditionalBatch = original;}
    const config = await schedule.getSchedulingConfiguration();assert.equal(config.practitioners.find(row=>row.id===p.id).active,1);
    await assert.rejects(()=>save({...body,practitioner:{...p,active:0}}),e=>e.code==='EXISTING_BOOKINGS');
  });
  await t.test('rescheduling availability still protects patients after their profile is recreated', async () => {
    const details = input({date:date(212),practitionerId:practitionerA,status:'CONFIRMED'});
    const first = await db.dbCreateAppointment(details);assert(first.success);
    // Simulate a legacy orphan directly in the isolated fixture; normal deletion is now blocked.
    await db.executeQuery('DELETE FROM patients WHERE id=?',[first.appointment.patientId]);
    const second = await db.dbCreateAppointment({...details,startTime:'10:00',practitionerId:practitionerB});assert(second.success);
    const response = await load('@/app/api/admin/slots/route').GET(request(`/api/admin/slots?date=${details.date}&service=${details.service}&practitionerId=${practitionerA}&excludeId=${first.appointment.id}`,null,'GET'));
    assert.equal(response.status,200);
    assert.equal((await response.json()).slots.find(s=>s.time==='10:00').available,false);
    const current = await db.dbGetAppointmentById(first.appointment.id);
    await assert.rejects(()=>db.dbUpdateAppointment(first.appointment.id,{startTime:'10:00',expectedVersion:current.version}),e=>e.code==='SLOT_CONFLICT');
  });
  await t.test('rescheduling a deleted appointment fails explicitly instead of offering slots', async () => {
    const response = await load('@/app/api/admin/slots/route').GET(request(`/api/admin/slots?date=${date(213)}&excludeId=missing-appointment`,null,'GET'));
    assert.equal(response.status,404);
  });
  await t.test('public availability rejects impossible calendar dates', async () => {
    for (const query of ['date=2027-02-30','dates=2027-02-30']) {
      assert.equal((await load('@/app/api/slots/route').GET(request('/api/slots?'+query,null,'GET'))).status,400);
    }
  });
  await t.test('a reassignment transaction failure preserves both agenda and clinical session', async () => {
    const result = await db.dbCreateMultipleAppointments({...input(),practitionerId:practitionerA,sessions:[{date:date(214),startTime:'09:00'}]});assert(result.success);
    const original = db.executeConditionalBatch, a = result.appointments[0];
    db.executeConditionalBatch = (guard,statements)=>original(guard,[...statements,{sql:'INSERT INTO team_audit_missing_table VALUES(1)',args:[]}]);
    try {await assert.rejects(()=>db.dbUpdateAppointment(a.id,{practitionerId:practitionerB,expectedVersion:a.version}),/team_audit_missing_table/);}
    finally {db.executeConditionalBatch = original;}
    assert.deepEqual(await db.dbGetAppointmentById(a.id),a);
    assert.equal((await db.dbGetPatientSessionById(result.patientSessions[0].id)).practitionerId,practitionerA);
  });
};
