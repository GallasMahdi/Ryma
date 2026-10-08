const assert = require('node:assert/strict');

// Destructive and injected-failure cases run only inside the isolated adapter harness.
module.exports = async (t, { db, schedule, load, input, date, request, practitionerA, practitionerB }) => {
  await t.test('simultaneous public requests cannot exceed the per-phone booking allowance', async () => {
    const route = load('@/app/api/appointments/route');
    const details = input({ practitionerId: practitionerA, _form_rendered_at: Date.now() - 5000 });
    const responses = await Promise.all(Array.from({ length: 6 }, (_, i) => route.POST(request('/api/appointments', {
      ...details, date: date(70 + i), clientRequestId: `parallel-limit-${i}`,
    }))));
    assert.equal(responses.filter(r => r.status === 201).length, 3);
    assert.equal(responses.filter(r => r.status === 429).length, 3);
    assert.equal((await db.executeQuery('SELECT * FROM appointments WHERE phone=?', [details.phone])).length, 3);
  });

  await t.test('deleting a patient does not allow their retained confirmed appointment to overlap', async () => {
    const details = input({ date: date(77), practitionerId: practitionerA, status: 'CONFIRMED' });
    const first = await db.dbCreateAppointment(details);
    assert(first.success);
    // Simulate a legacy orphan directly in the isolated fixture; normal deletion is now blocked.
    await db.executeQuery('DELETE FROM patients WHERE id=?',[first.appointment.patientId]);
    assert.equal((await db.dbGetAppointmentById(first.appointment.id)).status, 'CONFIRMED');
    const second = await db.dbCreateAppointment({ ...details, practitionerId: practitionerB });
    assert.equal(second.success, false);
    assert.equal(await db.dbGetPatientByPhone(details.phone), null);
  });

  await t.test('appointment archival preserves its linked clinical session', async () => {
    const result = await db.dbCreateMultipleAppointments({ ...input({ practitionerId: practitionerA }), sessions: [{ date: date(78), startTime: '09:00' }] });
    assert(result.success);
    assert.equal(await db.dbDeleteAppointment(result.appointments[0].id), true);
    assert(await db.dbGetPatientSessionById(result.patientSessions[0].id));
    assert.equal(await db.dbGetAppointmentById(result.appointments[0].id), null);
    assert((await db.dbGetAppointmentById(result.appointments[0].id,true)).archivedAt);
    assert.equal(await db.dbDeleteAppointment(result.appointments[0].id), false);
  });

  await t.test('a database failure midway through recurring creation rolls back every write', async () => {
    const details = input({ practitionerId: practitionerA });
    const original = schedule.commitScheduling;
    const before = await schedule.getSchedulingConfiguration();
    schedule.commitScheduling = (state, statements, guard) => original(state, [...statements, { sql: 'INSERT INTO nonexistent_fault_fixture VALUES(1)', args: [] }], guard);
    try {
      await assert.rejects(() => db.dbCreateMultipleAppointments({ ...details, sessions: [{ date: date(79), startTime: '09:00' }, { date: date(80), startTime: '09:00' }] }), /nonexistent_fault_fixture/);
    } finally { schedule.commitScheduling = original; }
    assert.equal(await db.dbGetPatientByPhone(details.phone), null);
    assert.equal((await db.executeQuery('SELECT * FROM appointments WHERE phone=?', [details.phone])).length, 0);
    assert.equal((await schedule.getSchedulingConfiguration()).revision, before.revision);
  });

  await t.test('a lost commit acknowledgement recovers the booking with one rate-limit charge', async () => {
    const route = load('@/app/api/appointments/route');
    const details = input({ date: date(81), practitionerId: practitionerA, clientRequestId: 'lost-commit', _form_rendered_at: Date.now() - 5000 });
    const original = schedule.commitScheduling;
    schedule.commitScheduling = async (...args) => { const committed = await original(...args); if (committed) throw Error('Injected lost commit acknowledgement'); return committed; };
    let response;
    try { response = await route.POST(request('/api/appointments', details)); }
    finally { schedule.commitScheduling = original; }
    assert.equal(response.status, 201, await response.clone().text());
    const replay = await route.POST(request('/api/appointments', details));
    assert.equal((await replay.json()).confirmation.id, (await response.json()).confirmation.id);
    const charges = await db.executeQuery("SELECT * FROM rate_limit_log WHERE ip=? AND action='booking_phone'", ['phone:' + details.phone]);
    assert.equal(charges.length, 1);
  });

  await t.test('an obsolete response-cache failure cannot turn a committed booking into an error', async () => {
    const original = db.dbSaveIdempotencyKey;
    db.dbSaveIdempotencyKey = async () => { throw Error('Injected cache unavailable'); };
    try {
      const details = input({ date: date(84), practitionerId: practitionerA, clientRequestId: 'response-cache-down', _form_rendered_at: Date.now() - 5000 });
      const response = await load('@/app/api/appointments/route').POST(request('/api/appointments', details));
      assert.equal(response.status, 201, await response.clone().text());
    } finally { db.dbSaveIdempotencyKey = original; }
  });

  await t.test('recurring APIs reject malformed practitioner preferences and patient names', async () => {
    const route = load('@/app/api/admin/appointments/multiple/route');
    for (const changes of [{ practitionerId: 123 }, { practitionerId: {} }, { practitionerId: null }, { patientName: {} }, { patientName: '=1+1' }]) {
      const response = await route.POST(request('/api/admin/appointments/multiple', { ...input(), ...changes, sessions: [{ date: date(85), startTime: '09:00' }] }));
      assert.equal(response.status, 422, JSON.stringify(changes));
    }
  });

  await t.test('retrying a recurring plan after a lost acknowledgement returns exactly the committed plan', async () => {
    const details = { ...input({ practitionerId: practitionerA }), bookingRequestId: 'interrupted-plan', sessions: [{ date: date(86), startTime: '09:00' }, { date: date(87), startTime: '09:00' }] };
    const original = schedule.commitScheduling;
    schedule.commitScheduling = async (...args) => { const committed = await original(...args); if (committed) throw Error('Injected lost plan acknowledgement'); return committed; };
    let first;
    try { first = await db.dbCreateMultipleAppointments(details); }
    finally { schedule.commitScheduling = original; }
    assert(first.success);
    const replay = await db.dbCreateMultipleAppointments(details);
    assert(replay.success);
    assert.deepEqual(replay.appointments.map(a => a.id), first.appointments.map(a => a.id));
    assert.equal((await db.executeQuery('SELECT * FROM appointments WHERE phone=?', [details.phone])).length, 2);
    assert.equal((await db.dbCreateMultipleAppointments({ ...details, patientName: 'Changed' })).success, false);
  });

  await t.test('patient deletion during booking cannot create a dangling patient reference', async () => {
    const details = input({ date: date(88), practitionerId: practitionerA });
    const patient = await db.dbUpsertPatient(details);
    const original = schedule.loadScheduleState;
    let injected = false;
    schedule.loadScheduleState = async (...args) => { if (!injected) { injected = true; await db.dbDeletePatientRecord(patient.id); } return original(...args); };
    let result;
    try { result = await db.dbCreateAppointment(details); }
    finally { schedule.loadScheduleState = original; }
    assert(result.success);
    assert(await db.dbGetPatientById(result.appointment.patientId));
  });

  await t.test('racing reschedules of different appointments have exactly one winner', async () => {
    const results = [];
    for (const startTime of ['09:00', '10:00']) {
      const result = await db.dbCreateAppointment(input({ date: date(91), startTime, practitionerId: practitionerA }));
      assert(result.success); results.push(result.appointment);
    }
    const changes = await Promise.allSettled(results.map(a => db.dbUpdateAppointment(a.id, { startTime: '11:00', expectedVersion: a.version })));
    assert.equal(changes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(changes.filter(r => r.status === 'rejected' && r.reason.code === 'SLOT_CONFLICT').length, 1);
  });

  await t.test('restore failure after deletes rolls back data and the schedule revision', async () => {
    const backup = await db.dbExportFullDatabaseBackup();
    const revision = (await schedule.getSchedulingConfiguration()).revision;
    await db.executeQuery("CREATE TRIGGER injected_restore_failure BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT,'injected_restore_failure'); END");
    const broken = structuredClone(backup);
    // The failing table is near the end of the restore, after replacing clinical data.
    broken.tables.reviews.push({ ...backup.tables.reviews[0], id: 'injected-review', patientName: 'Fixture', rating: 5, comment: 'Fixture', status: 'PENDING', createdAt: new Date().toISOString() });
    try { await assert.rejects(() => db.dbRestoreFullDatabaseBackup(broken), /injected_restore_failure/); }
    finally { await db.executeQuery('DROP TRIGGER injected_restore_failure'); }
    assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables, backup.tables);
    assert.equal((await schedule.getSchedulingConfiguration()).revision, revision);
  });

  await t.test('deletion failure preserves both the appointment and its linked clinical session', async () => {
    const result = await db.dbCreateMultipleAppointments({ ...input({ practitionerId: practitionerA }), sessions: [{ date: date(92), startTime: '09:00' }] });
    assert(result.success);
    await db.executeQuery("CREATE TRIGGER injected_delete_failure BEFORE UPDATE OF archivedAt ON appointments BEGIN SELECT RAISE(ABORT,'injected_delete_failure'); END");
    try { await assert.rejects(() => db.dbDeleteAppointment(result.appointments[0].id), /injected_delete_failure/); }
    finally { await db.executeQuery('DROP TRIGGER injected_delete_failure'); }
    assert(await db.dbGetAppointmentById(result.appointments[0].id));
    assert(await db.dbGetPatientSessionById(result.patientSessions[0].id));
  });

  await t.test('simultaneous IP requests cannot overrun an atomic rate-limit window', async () => {
    const result=await Promise.all(Array.from({length:20},()=>db.dbConsumeRateLimit('isolated-ip-race','booking_ip',5,3600)));
    assert.equal(result.filter(Boolean).length,5);
    await db.executeQuery("UPDATE rate_limit_log SET timestamp=? WHERE ip='isolated-ip-race'",[Date.now()-3600001]);
    assert.equal(await db.dbConsumeRateLimit('isolated-ip-race','booking_ip',5,3600),true);
  });

  await t.test('SQL guards prevent a patient-phone collision after their profile is removed', async () => {
    const details=input({date:date(93),practitionerId:practitionerA,status:'CONFIRMED'});
    const first=await db.dbCreateAppointment(details);assert(first.success);
    // Simulate a legacy orphan directly in the isolated fixture; normal deletion is now blocked.
    await db.executeQuery('DELETE FROM patients WHERE id=?',[first.appointment.patientId]);
    await assert.rejects(()=>db.executeQuery('INSERT INTO appointments(id,patientName,phone,service,date,startTime,status,createdAt,updatedAt,practitionerId,durationMinutes) VALUES(?,?,?,?,?,?,?,?,?,?,?)',[
      'direct-phone-conflict',details.patientName,details.phone,details.service,details.date,'09:30','PENDING',new Date().toISOString(),new Date().toISOString(),practitionerB,50,
    ]),/slot_taken/);
  });

  await t.test('recurring request keys survive restore and refuse recreation of a removed session', async () => {
    const details={...input({practitionerId:practitionerA}),bookingRequestId:'restored-plan',sessions:[{date:date(94),startTime:'09:00'},{date:date(95),startTime:'09:00'}]};
    const results=await Promise.all(Array.from({length:4},()=>db.dbCreateMultipleAppointments(details)));
    assert(results.every(r=>r.success));
    assert.equal(new Set(results.map(r=>r.appointments[0].id)).size,1);
    const backup=await db.dbExportFullDatabaseBackup();
    await db.dbRestoreFullDatabaseBackup(backup);
    assert.equal((await db.dbCreateMultipleAppointments(details)).replayed,true);
    await db.dbDeleteAppointment(results[0].appointments[0].id);
    assert.equal((await db.dbCreateMultipleAppointments(details)).success,false);
  });

  await t.test('malformed scheduling references in backups fail without writes', async () => {
    const backup=await db.dbExportFullDatabaseBackup();
    for(const change of [
      b=>b.tables.working_hours[0].practitionerId='missing',
      b=>b.tables.schedule_exceptions.push({id:'bad-date',practitionerId:'*',date:'2027-02-30',startMinute:0,endMinute:1440,kind:'closed',label:''}),
      b=>b.tables.appointments[0].date='2027-02-30',
    ]) {
      const broken=structuredClone(backup);change(broken);
      await assert.rejects(()=>db.dbRestoreFullDatabaseBackup(broken),/Invalid/);
      assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables,backup.tables);
    }
  });

  await t.test('twenty concurrent bookings on independent days do not report false capacity conflicts', async () => {
    const results=await Promise.all(Array.from({length:20},(_,i)=>db.dbCreateAppointment(input({date:date(98+i*7),practitionerId:practitionerA}))));
    assert.equal(results.filter(r=>r.success).length,20,JSON.stringify(results.filter(r=>!r.success)));
  });

  await t.test('exhausted contention returns retryable 503 and the same request can recover', async () => {
    const details=input({date:date(96),practitionerId:practitionerA,clientRequestId:'busy-recovery',_form_rendered_at:Date.now()-5000});
    const original=schedule.commitScheduling;
    schedule.commitScheduling=async()=>false;
    let busy;
    try { busy=await load('@/app/api/appointments/route').POST(request('/api/appointments',details)); }
    finally { schedule.commitScheduling=original; }
    assert.equal(busy.status,503);
    assert.equal(busy.headers.get('Retry-After'),'1');
    assert.equal(await db.dbGetPatientByPhone(details.phone),null);
    const recovered=await load('@/app/api/appointments/route').POST(request('/api/appointments',details));
    assert.equal(recovered.status,201);
    assert.equal((await db.executeQuery('SELECT * FROM appointments WHERE phone=?',[details.phone])).length,1);
  });

  await t.test('notification transport failure cannot roll back a successful reservation', async () => {
    const email=load('@/lib/email'),original=email.sendAppointmentConfirmationEmail;
    email.sendAppointmentConfirmationEmail=async()=>{throw Error('Injected SMTP outage');};
    const details=input({date:date(99),practitionerId:practitionerA,clientRequestId:'smtp-outage',_form_rendered_at:Date.now()-5000});
    try {
      const response=await load('@/app/api/appointments/route').POST(request('/api/appointments',details));
      assert.equal(response.status,201);
      assert.equal((await db.executeQuery('SELECT * FROM appointments WHERE phone=?',[details.phone])).length,1);
    } finally { email.sendAppointmentConfirmationEmail=original; }
  });
};
