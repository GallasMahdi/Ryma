const assert = require('node:assert/strict');

// Runs inside the isolated real-database harness, once for each database adapter.
module.exports = async function exceptions(t, { db, schedule, load, save, input, date, request, services, DEFAULT_HOURS, practitionerA, practitionerB }) {
  const params = id => ({ params: Promise.resolve({ id }) });
  const create = async overrides => {
    const result = await db.dbCreateAppointment(input(overrides));
    assert(result.success, JSON.stringify(result));
    return result.appointment;
  };
  const profile = async name => {
    await save({ action: 'practitioner', practitioner: { name, profession: 'Physiotherapist', color: '#123456', active: 1, bookable: 1, priority: 50 }, services: services(), hours: DEFAULT_HOURS });
    return (await schedule.getSchedulingConfiguration()).practitioners.find(p => p.name === name);
  };

  await t.test('invalid configuration is rejected without partial changes', async () => {
    const p = await profile('Validation fixture');
    const valid = { action: 'practitioner', practitioner: p, services: services(), hours: DEFAULT_HOURS };
    const invalid = [
      { ...valid, practitioner: { ...p, name: ' ' } },
      { ...valid, practitioner: { ...p, active: 2 } },
      { ...valid, practitioner: { ...p, priority: -1 } },
      { ...valid, practitioner: { ...p, color: 'red' } },
      { ...valid, services: [services()[0], services()[0]] },
      { ...valid, services: [{ ...services()[0], durationMinutes: 0 }] },
      { ...valid, services: [{ ...services()[0], bufferBefore: 121 }] },
      { ...valid, hours: [{ dayOfWeek: 1, startMinute: 600, endMinute: 600 }] },
      { ...valid, hours: [{ dayOfWeek: 1, startMinute: 540, endMinute: 660 }, { dayOfWeek: 1, startMinute: 600, endMinute: 720 }] },
      { action: 'exception', exception: { practitionerId: p.id, date: '2027-02-30', startMinute: 0, endMinute: 1440, kind: 'closed', label: '' } },
      { action: 'delete-exception', id: 'missing' },
      { action: 'unknown' },
    ];
    const before = await schedule.getSchedulingConfiguration();
    for (const body of invalid) await assert.rejects(() => save(body), e => e.code === 'INVALID_INPUT');
    assert.deepEqual(await schedule.getSchedulingConfiguration(), before);
  });

  await t.test('private and archived practitioners never become public fallback assignments', async () => {
    const p = await profile('Private fixture');
    await save({ action: 'practitioner', practitioner: { ...p, bookable: 0 }, services: services(), hours: DEFAULT_HOURS });
    const publicList = await load('@/app/api/practitioners/route').GET(request('/api/practitioners?service=reeducation-posturale', null, 'GET'));
    assert(!(await publicList.json()).practitioners.some(row => row.id === p.id));
    assert.equal((await db.dbCreateAppointment(input({ date: date(35), practitionerId: p.id, source: 'website' }))).success, false);
    const a = await create({ date: date(35), practitionerId: p.id });
    await assert.rejects(() => save({ action: 'practitioner', practitioner: { ...p, active: 0 }, services: services(), hours: DEFAULT_HOURS }), e => e.code === 'EXISTING_BOOKINGS');
    await db.dbUpdateAppointment(a.id, { status: 'CANCELLED' });
    await save({ action: 'practitioner', practitioner: { ...p, active: 0 }, services: services(), hours: DEFAULT_HOURS });
    assert.equal((await db.dbCreateAppointment(input({ date: date(35), practitionerId: p.id }))).success, false);
    assert.equal((await db.dbGetAppointmentById(a.id)).practitionerName, p.name);
  });

  await t.test('an explicitly ineligible practitioner is never silently substituted', async () => {
    const p = await profile('Eligibility fixture');
    await save({ action: 'practitioner', practitioner: p, services: [], hours: DEFAULT_HOURS });
    assert.equal((await db.dbCreateAppointment(input({ date: date(36), practitionerId: p.id, source: 'website' }))).success, false);
    assert.equal((await db.dbCheckSlotAvailability(date(36), '09:00', 'reeducation-posturale', { practitionerId: 'missing' })).available, false);
  });

  await t.test('cancelled reassignment updates the saved name and linked session', async () => {
    const details = input();
    const result = await db.dbCreateMultipleAppointments({ ...details, practitionerId: practitionerA, sessions: [{ date: date(37), startTime: '09:00' }] });
    assert(result.success);
    const a = result.appointments[0];
    await db.dbUpdateAppointment(a.id, { status: 'CANCELLED' });
    const moved = await db.dbUpdateAppointment(a.id, { practitionerId: practitionerB });
    const p = (await schedule.getSchedulingConfiguration()).practitioners.find(p => p.id === practitionerB);
    assert.equal(moved.practitionerName, p.name);
    const session = (await db.executeQuery('SELECT * FROM patient_sessions WHERE appointmentId=?', [a.id]))[0];
    assert.equal(session.practitionerId, p.id);
    assert.equal(session.practitioner, p.name);
  });

  await t.test('reopening a cancelled appointment checks its old reservation again', async () => {
    const a = await create({ date: date(38), practitionerId: practitionerA });
    await db.dbUpdateAppointment(a.id, { status: 'CANCELLED' });
    const replacement = await create({ date: date(38), practitionerId: practitionerA });
    await assert.rejects(() => db.dbUpdateAppointment(a.id, { status: 'CONFIRMED' }), e => e.code === 'SLOT_CONFLICT');
    assert.equal((await db.dbGetAppointmentById(a.id)).status, 'CANCELLED');
    await db.dbUpdateAppointment(replacement.id, { status: 'CANCELLED' });
    assert.equal((await db.dbUpdateAppointment(a.id, { status: 'CONFIRMED' })).status, 'CONFIRMED');
  });

  await t.test('retry keys reject changes to notes, coverage and status', async () => {
    const details = input({ date: date(39), practitionerId: practitionerA, bookingRequestId: 'material-fields', notes: 'Original', coverageType: 'PARTICULAR' });
    assert((await db.dbCreateAppointment(details)).success);
    for (const changes of [{ notes: 'Changed' }, { coverageType: 'INSURANCE', coverageProvider: 'Fixture' }, { status: 'CONFIRMED' }]) {
      assert.equal((await db.dbCreateAppointment({ ...details, ...changes })).success, false, JSON.stringify(changes));
    }
  });

  await t.test('public retries do not exhaust the three-booking patient allowance', async () => {
    const route = load('@/app/api/appointments/route');
    const details = input({ date: date(42), practitionerId: practitionerA, clientRequestId: 'public-repeat', _form_rendered_at: Date.now() - 5000 });
    const ids = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await route.POST(request('/api/appointments', details));
      assert.equal(res.status, 201, await res.clone().text());
      ids.push((await res.json()).confirmation.id);
    }
    assert.equal(new Set(ids).size, 1);
    assert.equal((await db.dbGetAppointments({ phone: details.phone })).length, 1);
    for (const [index, nextDate] of [date(43), date(44)].entries()) {
      assert.equal((await route.POST(request('/api/appointments', { ...details, date: nextDate, clientRequestId: 'public-new-' + index }))).status, 201);
    }
    assert.equal((await route.POST(request('/api/appointments', { ...details, date: date(45), clientRequestId: 'public-over-limit' }))).status, 429);
    assert.equal((await route.POST(request('/api/appointments', details))).status, 201, 'Existing booking can still be recovered after reaching the new-booking limit');
  });

  await t.test('booking APIs reject malformed practitioner preferences instead of choosing someone else', async () => {
    for (const url of ['/api/appointments', '/api/admin/appointments']) {
      for (const practitionerId of [123, {}, [], null]) {
        const res = await load('@' + url.replace('/api/', '/app/api/') + '/route').POST(request(url, input({ date: date(43), practitionerId })));
        assert.equal(res.status, 422, url + ' ' + JSON.stringify(practitionerId));
      }
    }
  });

  await t.test('patch rejects null/empty date, time and invalid versions without changing a booking', async () => {
    const a = await create({ date: date(44), startTime: '11:00', practitionerId: practitionerA });
    const route = load('@/app/api/admin/appointments/[id]/route');
    for (const fields of [{ date: null }, { date: '' }, { startTime: null }, { startTime: '' }, { expectedVersion: 0 }, { expectedVersion: -1 }]) {
      const res = await route.PATCH(request('/api/admin/appointments/' + a.id, fields, 'PATCH'), params(a.id));
      assert.equal(res.status, 422, JSON.stringify(fields));
    }
    assert.equal((await db.dbGetAppointmentById(a.id)).version, a.version);
    assert.equal((await route.GET(request('/api/admin/appointments/missing', null, 'GET'), params('missing'))).status, 404);
  });

  await t.test('recurrence preview rejects fractional counts and partially malformed patterns', async () => {
    const route = load('@/app/api/admin/appointments/multiple/preview/route');
    const body = { startDate: date(45), serviceSlug: 'reeducation-posturale', totalSessions: 2, scheduleSlots: [{ dayOfWeek: 1, startTime: '09:00' }] };
    for (const totalSessions of [0, -1, 2.5, 51, 'wrong']) assert.equal((await route.POST(request('/preview', { ...body, totalSessions }))).status, 422, String(totalSessions));
    assert.equal((await route.POST(request('/preview', { ...body, scheduleSlots: [...body.scheduleSlots, { dayOfWeek: 9, startTime: '09:00' }] }))).status, 422);
  });

  await t.test('overlapping recurring sessions fail atomically in preview and commit', async () => {
    const sessions = [{ date: date(46), startTime: '09:00' }, { date: date(46), startTime: '09:30' }];
    const preview = await load('@/app/api/admin/appointments/multiple/preview/route').POST(request('/preview', { explicitSessions: sessions, serviceSlug: 'reeducation-posturale', practitionerId: practitionerA }));
    assert.equal((await preview.json()).summary.allAvailable, false);
    const before = (await db.dbGetAppointments({ date: date(46) })).length;
    assert.equal((await db.dbCreateMultipleAppointments({ ...input(), practitionerId: practitionerA, sessions })).success, false);
    assert.equal((await db.dbGetAppointments({ date: date(46) })).length, before);
  });

  await t.test('existing appointments retain duration snapshots after service settings change', async () => {
    const p = await profile('Snapshot fixture');
    const a = await create({ date: date(49), practitionerId: p.id });
    await save({ action: 'practitioner', practitioner: p, services: services().map(s => s.service === a.service ? { ...s, durationMinutes: 90 } : s), hours: DEFAULT_HOURS });
    assert.equal((await db.dbGetAppointmentById(a.id)).durationMinutes, 50);
    const moved = await db.dbUpdateAppointment(a.id, { startTime: '10:00' });
    assert.equal(moved.durationMinutes, 50);
    assert.equal((await create({ date: date(50), practitionerId: p.id })).durationMinutes, 90);
  });

  await t.test('resource deactivation cannot invalidate reserved equipment', async () => {
    const config = await schedule.getSchedulingConfiguration();
    const resource = config.resources.find(r => r.name === 'Shared machine');
    await assert.rejects(() => save({ action: 'resource', resource: { ...resource, active: 0 }, services: ['cavitation'] }), e => e.code === 'EXISTING_BOOKINGS');
    assert.equal((await schedule.getSchedulingConfiguration()).resources.find(r => r.id === resource.id).active, 1);
  });

  await t.test('deleting a special Sunday opening cannot strand a reservation', async () => {
    const a = await create({ date: date(27), practitionerId: (await schedule.getSchedulingConfiguration()).practitioners.find(p => p.name === 'Practitioner C').id });
    const exception = (await schedule.getSchedulingConfiguration()).exceptions.find(e => e.date === a.date && e.practitionerId === a.practitionerId && e.kind === 'open');
    await assert.rejects(() => save({ action: 'delete-exception', id: exception.id }), e => e.code === 'EXISTING_BOOKINGS');
  });

  await t.test('restore rejects malformed resource allocations without corrupting the live snapshot', async () => {
    const backup = await db.dbExportFullDatabaseBackup();
    try {
      for (const resourceIds of ['{}', 'null', '[123]', '["missing-resource"]']) {
        const corrupt = structuredClone(backup);
        corrupt.tables.appointments[0].resourceIds = resourceIds;
        await assert.rejects(() => db.dbRestoreFullDatabaseBackup(corrupt), /Invalid|resource/i, resourceIds);
      }
    } finally { await db.dbRestoreFullDatabaseBackup(backup); }
    assert.deepEqual((await db.dbExportFullDatabaseBackup()).tables, backup.tables);
  });

  await t.test('invalid bulk actions and ranges do not write any blocks', async () => {
    const route = load('@/app/api/admin/slots/bulk/route');
    const before = await db.executeQuery('SELECT * FROM blocked_slots ORDER BY id');
    for (const fields of [{ scope: 'custom', times: ['09:15'] }, { scope: 'custom', times: [] }, { action: 'remove-all' }, { endDate: date(0) }, { endDate: date(140) }, { practitionerId: 'missing' }]) {
      assert.equal((await route.POST(request('/bulk', { date: date(51), ...fields }))).status, 422);
    }
    assert.deepEqual(await db.executeQuery('SELECT * FROM blocked_slots ORDER BY id'), before);
  });

  await t.test('interval boundaries match an independent minute-by-minute oracle', async () => {
    const { practitionerIntervals } = load('@/lib/schedule-math');
    const p = await profile('Boundary fixture');
    const state = await schedule.loadScheduleState([date(52)]);
    const windows = practitionerIntervals(state, p.id, date(52));
    for (const durationMinutes of [5, 20, 30, 50, 90, 720]) for (const bufferBefore of [0, 15, 120]) for (const bufferAfter of [0, 15, 120]) {
      const copy = structuredClone(state);
      copy.services = copy.services.map(s => s.practitionerId === p.id && s.service === 'reeducation-posturale' ? { ...s, durationMinutes, bufferBefore, bufferAfter } : s);
      for (let start = 0; start < 1440; start += 30) {
        const time = String(Math.floor(start / 60)).padStart(2, '0') + ':' + String(start % 60).padStart(2, '0');
        const expected = Array.from({ length: durationMinutes + bufferBefore + bufferAfter }, (_, i) => start - bufferBefore + i).every(minute => windows.some(([a, b]) => minute >= a && minute < b));
        assert.equal(schedule.evaluateSlot(copy, date(52), time, 'reeducation-posturale', { practitionerId: p.id }).available, expected, `${time}/${durationMinutes}/${bufferBefore}/${bufferAfter}`);
      }
    }
  });

  await t.test('calendar exports preserve Lisbon summer/winter time, pending status and UTF-8 lines', () => {
    const calendar = load('@/lib/appointment-calendar');
    for (const [day, utc] of [['2027-01-18', '090000'], ['2027-07-19', '080000']]) {
      const event = { date: day, time: '09:00', duration: 50, service: 'Consulta', description: 'Clínica;\n' + 'á'.repeat(100), location: 'Lisboa', lang: 'pt', uid: 'fixture', status: 'TENTATIVE' };
      const ics = calendar.appointmentIcs(event);
      assert(ics.includes(`DTSTART:${day.replaceAll('-', '')}T${utc}Z`));
      assert(ics.includes('STATUS:TENTATIVE'));
      assert(ics.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75));
      const dates = new URL(calendar.googleCalendarUrl(event)).searchParams.get('dates');
      assert(dates.includes(`T${utc}Z/`));
    }
  });

  await t.test('database integrity and foreign keys survive all failure scenarios', async () => {
    assert.deepEqual(await db.executeQuery('PRAGMA integrity_check'), [{ integrity_check: 'ok' }]);
    assert.equal((await db.executeQuery('PRAGMA foreign_key_check')).length, 0);
  });
  await t.test('failed single and recurring bookings never leave empty patient profiles', async () => {
    await create({ date: date(56), practitionerId: practitionerA });
    const single = input({ date: date(56), practitionerId: practitionerA });
    assert.equal((await db.dbCreateAppointment(single)).success, false);
    assert.equal(await db.dbGetPatientByPhone(single.phone), null);
    const series = input({ practitionerId: practitionerA });
    assert.equal((await db.dbCreateMultipleAppointments({ ...series, sessions: [{ date: date(57), startTime: '09:00' }, { date: date(56), startTime: '09:00' }] })).success, false);
    assert.equal(await db.dbGetPatientByPhone(series.phone), null);
  });
};
