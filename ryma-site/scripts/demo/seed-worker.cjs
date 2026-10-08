const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ROOT, VERSION, createAppLoader } = require('./runtime.cjs');
const { treatments, patient } = require('./data.cjs');

async function populate() {
  const target = path.resolve(process.env.DATABASE_PATH || '');
  const relative = path.relative(path.join(ROOT, '.demo'), target);
  if (!/^[a-z0-9-]+[\\/]seed-[a-f0-9-]+\.db$/.test(relative) || fs.existsSync(target) || process.env.TURSO_DATABASE_URL) {
    throw Error('The seed worker requires a new, isolated staging database. Use npm run demo:seed.');
  }
  global.fetch = async () => { throw Error('Network calls are disabled during demo generation.'); };
  const load = createAppLoader(), db = load('@/lib/db'), scheduling = load('@/lib/scheduling'), catalogue = load('@/lib/treatments');
  const sqlite = db.getDb();
  const baseDate = load('@/lib/validation').getLisbonDateTime().todayStr;
  const day = offset => new Date(Date.parse(baseDate + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
  const weekday = date => new Date(date + 'T12:00:00Z').getUTCDay();
  const at = (date, time = '12:00') => `${date}T${time}:00.000Z`;
  const count = table => sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
  const hours = (days, start = 510, end = 1050) => days.flatMap(dayOfWeek => [
    { dayOfWeek, startMinute: start, endMinute: 750 }, { dayOfWeek, startMinute: 840, endMinute: end },
  ]);
  const saveSchedule = async body => scheduling.saveSchedulingConfiguration({ ...body, revision: (await scheduling.getSchedulingConfiguration()).revision });
  const saveTreatment = async (treatment, practitionerIds, status = treatment.status) => {
    const config = await scheduling.getSchedulingConfiguration();
    return catalogue.saveTreatment({ ...treatment, status, practitionerIds, revision: config.revision, version: config.treatments.find(t => t.slug === treatment.slug)?.version || 0 }, 'demo-generator');
  };
  const scenarios = {};
  try {
    // Start from the application's migrations, then use current write services.
    await saveSchedule({ action: 'clinic-hours', hours: hours([1, 2, 3, 4, 5, 6]) });
    const people = [
      { id: 'legacy', name: 'Inês Rodrigues [DEMO]', profession: 'Fisioterapeuta · reabilitação funcional', color: '#2563eb', days: [1, 2, 3, 4, 5, 6] },
      { name: 'Miguel Costa [DEMO]', profession: 'Fisioterapeuta · musculoesquelética', color: '#059669', days: [1, 2, 3, 4, 5] },
      { name: 'Beatriz Matos [DEMO]', profession: 'Fisioterapeuta · saúde da mulher e estética', color: '#9333ea', days: [2, 3, 4, 5, 6] },
      { name: 'Leonor Martins [DEMO]', profession: 'Fisioterapeuta · perfil inativo', color: '#64748b', days: [] },
    ];
    const team = [];
    for (const [index, person] of people.entries()) {
      const { days, ...identity } = person;
      const config = await saveSchedule({ action: 'practitioner', practitioner: { ...identity, active: index < 3 ? 1 : 0, bookable: index < 3 ? 1 : 0, priority: index }, services: [], hours: hours(days, index === 1 ? 540 : 510) });
      team.push(config.practitioners.find(p => p.name === person.name));
    }
    const assignedIds = treatment => team.slice(0, 3).filter((_, i) => i === 0 || (i === 1 ? treatment.pole !== 'minceur' || treatment.slug === 'pressotherapie' : treatment.pole !== 'kinesitherapie' || ['drainage-lymphatique', 'reeducation-post-partum', 'massage-therapeutique'].includes(treatment.slug))).map(p => p.id);
    for (const t of treatments) await saveTreatment(t, assignedIds(t), t.status === 'ARCHIVED' ? 'PUBLISHED' : t.status);
    for (const p of team.slice(0, 3)) {
      const config = await scheduling.getSchedulingConfiguration();
      await saveSchedule({ action: 'practitioner', practitioner: p, hours: config.hours.filter(h => h.practitionerId === p.id), services: config.services.filter(s => s.practitionerId === p.id).map(s => ({ ...s,
        durationMinutes: p.id === team[1].id && s.service === 'reeducation-posturale' ? 60 : null,
        bufferAfter: ['massage-therapeutique', 'radiofrequence', 'cryolipolyse'].includes(s.service) ? 10 : 0,
        bufferBefore: s.service === 'cryolipolyse' ? 5 : 0,
      })) });
    }
    await saveSchedule({ action: 'resource', resource: { name: 'Equipamento corporal A [DEMO]', active: 1 }, services: ['cavitation', 'radiofrequence', 'laser-lipo', 'cryolipolyse'] });
    await saveSchedule({ action: 'resource', resource: { name: 'Pressoterapia A [DEMO]', active: 1 }, services: ['pressotherapie'] });
    await saveSchedule({ action: 'resource', resource: { name: 'Equipamento em manutenção [DEMO]', active: 0 }, services: [] });
    let monday = 7; while (weekday(day(monday)) !== 1) monday++;
    scenarios.clinicClosure = day(monday + 4);
    scenarios.practitionerAbsence = { date: day(monday + 1), practitionerId: team[2].id };
    await saveSchedule({ action: 'exception', exception: { practitionerId: '*', date: scenarios.clinicClosure, startMinute: 0, endMinute: 1440, kind: 'closed', label: 'Formação da equipa [DEMO]' } });
    await saveSchedule({ action: 'exception', exception: { ...scenarios.practitionerAbsence, startMinute: 840, endMinute: 1140, kind: 'closed', label: 'Ausência programada [DEMO]' } });
    await saveSchedule({ action: 'exception', exception: { practitionerId: team[1].id, date: day(monday + 5), startMinute: 540, endMinute: 720, kind: 'open', label: 'Sábado extraordinário [DEMO]' } });
    await db.dbBulkBlockSlots(day(monday + 2), ['11:00', '11:30'], 'block', '*');
    await db.dbBulkBlockSlots(day(monday + 3), ['16:00'], 'block', team[0].id);
    scenarios.blockedSlots = { date: day(monday + 2), times: ['11:00', '11:30'] };

    async function findSlot(p, service, earliest, latest, practitionerId) {
      for (let offset = earliest; offset <= latest; offset++) {
        const date = day(offset), state = await scheduling.loadScheduleState([date]);
        for (const time of load('@/types/scheduling').TIME_GRID) {
          const slot = scheduling.evaluateSlot(state, date, time, service, { practitionerId, patientId: p.id, patientPhone: p.phone, publicOnly: true, includePast: offset < 0 });
          if (slot.available) return { date, startTime: time, assignment: slot.candidates[0], offset };
        }
      }
      throw Error(`No valid demo slot for ${p.patientName}, ${service} between ${day(earliest)} and ${day(latest)}.`);
    }
    async function historicalAppointment(p, service, slot, status, index) {
      // Public booking correctly rejects the past. Import history with the same slot
      // evaluator and DB conflict guards; never disable constraints or migrations.
      const assignment = scheduling.assignmentColumns(slot.assignment), id = `apt_demo_${randomUUID()}`;
      const columns = ['id', 'patientId', 'patientName', 'phone', 'email', 'service', 'date', 'startTime', 'status', 'source', 'notes', 'coverageType', 'coverageProvider', 'coverageNumber', 'createdAt', 'updatedAt'];
      const values = [id, p.id, p.patientName, p.phone, p.email, service, slot.date, slot.startTime, status, ['website', 'dashboard', 'whatsapp'][index % 3], '[DEMO] Histórico sintético de consulta.', p.coverageType, p.coverageProvider, p.coverageNumber, at(day(slot.offset - 5)), at(slot.date), ...assignment.values];
      await db.executeQuery(`INSERT INTO appointments(${columns.join(',')},${assignment.columns}) VALUES(${values.map(() => '?').join(',')})`, values);
      return db.dbGetAppointmentById(id);
    }
    const patients = [];
    for (let i = 0; i < 100; i++) {
      const fixture = patient(i), record = await db.dbUpsertPatient(fixture);
      await db.executeQuery('UPDATE patients SET createdAt=? WHERE id=?', [at(day(-95 + i % 20)), record.id]);
      patients.push({ ...record, service: fixture.service });
    }
    scenarios.patientWithHistory = { id: patients[0].id, name: patients[0].patientName };
    const historical = [];
    for (const [i, p] of patients.entries()) {
      const ids = assignedIds(treatments.find(t => t.slug === p.service));
      const practitionerId = ids[i % ids.length];
      let earliest = -84 + i % 55;
      for (let visit = 0; visit < 3; visit++) {
        const slot = await findSlot(p, p.service, earliest, -1, practitionerId);
        const status = visit === 2 && i % 17 === 0 ? 'NO_SHOW' : visit === 2 && i % 13 === 0 ? 'CANCELLED' : 'CONFIRMED';
        const appointment = await historicalAppointment(p, p.service, slot, status, i + visit);
        if (status === 'CONFIRMED') {
          const session = await db.dbAddPatientSession({ patientId: p.id, appointmentId: appointment.id, date: slot.date, time: slot.startTime, serviceSlug: p.service, practitionerId, clinicalStatus: 'COMPLETED',
            sessionType: ['MANUAL', 'ONLINE', 'PAPER'][i % 3], evaPainScore: i % 10 === 0 ? null : Math.max(0, 7 - visit * 2 - i % 3), notes: `[DEMO] Visita ${visit + 1}/3. Objetivos funcionais revistos; evolução registada para testar a ficha clínica.` });
          await db.executeQuery('UPDATE patient_sessions SET createdAt=?,completedAt=? WHERE id=?', [at(slot.date), at(slot.date), session.id]);
          const invoice = await db.dbCreateInvoice({ appointmentId: appointment.id, patientId: p.id, patientName: p.patientName, patientPhone: p.phone, patientEmail: p.email,
            serviceSlug: p.service, serviceName: JSON.parse(appointment.serviceNameJson).pt, amount: appointment.servicePriceCents / 100, coverageType: p.coverageType,
            coverageProvider: p.coverageProvider || undefined, coverageNumber: p.coverageNumber || undefined, paymentMethod: ['MULTIBANCO', 'MBWAY', 'CASH', 'CARD', 'TRANSFER'][i % 5],
            paymentStatus: ['PAID', 'PAID', 'PAID', 'PENDING', 'REFUNDED', 'CANCELLED'][(i + visit) % 6], notes: '[DEMO] Documento de teste, sem valor fiscal.' });
          // Keep invoice numbers and the generated sequence in their actual issue year.
          const issued = slot.date.slice(0, 4) === baseDate.slice(0, 4) ? at(slot.date) : at(baseDate);
          await db.executeQuery('UPDATE invoices SET createdAt=?,updatedAt=?,paidAt=? WHERE id=?', [issued, issued, invoice.paymentStatus === 'PAID' ? issued : null, invoice.id]);
          await db.executeQuery('UPDATE appointments SET updatedAt=? WHERE id=?', [at(slot.date), appointment.id]);
          historical.push({ appointment, session, p });
        }
        earliest = slot.offset + 7;
      }
      if (i % 2 === 0) await db.dbCreatePrescription({ patientId: p.id, patientName: p.patientName, patientPhone: p.phone, practitionerId,
        diagnosisOrGoal: `[DEMO] Acompanhamento de ${p.pathologyTags.split(';')[0].toLowerCase()}`,
        items: [
          { category: 'lifestyle_habit', title: 'Registo de evolução [DEMO]', instructions: 'Exemplo de orientação personalizada; conteúdo fictício para testar o documento.' },
          { category: 'ergonomic_equipment', title: 'Avaliação do posto de trabalho [DEMO]', instructions: 'Exemplo de campo de equipamento. A adequação depende da avaliação individual.' },
          { category: 'care_product', title: 'Material de apoio [DEMO]', instructions: 'Exemplo de campo de produto, sem prescrição real.', productRef: 'DEMO-APOIO' },
        ], generalNotes: '[DEMO] Documento fictício para testar criação, consulta e impressão. Não é uma recomendação clínica.' });
    }
    // Audit history, archived encounters, and legacy measurements awaiting review.
    for (const entry of historical.slice(0, 6)) await db.dbUpdatePatientSession(entry.session.id, { notes: entry.session.notes + ' [DEMO] Revisão da nota clínica.', expectedVersion: entry.session.version, actorSessionId: 'demo-clinician' }, entry.p.id);
    for (const entry of historical.slice(-3)) await db.dbDeletePatientSession(entry.session.id, entry.p.id, 'demo-clinician');
    for (const p of patients.slice(0, 3)) {
      const session = await db.dbAddPatientSession({ patientId: p.id, date: day(-90), serviceSlug: p.service, practitionerId: team[0].id, clinicalStatus: 'PLANNED', sessionType: 'PAPER', notes: '[DEMO] Registo importado; medição histórica por rever.' });
      await db.executeQuery("UPDATE patient_sessions SET clinicalStatus='LEGACY_REVIEW',legacyEvaPainScore=5,createdAt=? WHERE id=?", [at(day(-90)), session.id]);
    }
    const oldTreatment = treatments.at(-1), oldSlot = await findSlot(patients[0], oldTreatment.slug, -15, -1, team[0].id);
    const oldAppointment = await historicalAppointment(patients[0], oldTreatment.slug, oldSlot, 'CONFIRMED', 0);
    await db.dbAddPatientSession({ patientId: patients[0].id, appointmentId: oldAppointment.id, date: oldSlot.date, time: oldSlot.startTime, clinicalStatus: 'COMPLETED', evaPainScore: 2, notes: '[DEMO] Tratamento posteriormente arquivado; histórico preservado.' });
    await saveTreatment(oldTreatment, assignedIds(oldTreatment));
    // Price revisions must preserve the snapshots on historical appointments/invoices.
    await saveTreatment({ ...treatments[0], priceCents: 6750 }, assignedIds(treatments[0]));

    for (const [i, p] of patients.entries()) {
      const slot = await findSlot(p, p.service, i < 12 ? 0 : 1 + i % 28, 45);
      const result = await db.dbCreateAppointment({ patientName: p.patientName, phone: p.phone, email: p.email, service: p.service, practitionerId: slot.assignment.practitionerId, date: slot.date, startTime: slot.startTime,
        status: i % 3 === 0 ? 'PENDING' : 'CONFIRMED', source: ['website', 'dashboard', 'whatsapp'][i % 3], coverageType: p.coverageType,
        coverageProvider: p.coverageProvider || undefined, coverageNumber: p.coverageNumber || undefined, notes: '[DEMO] Consulta futura para testar confirmação e reagendamento.' });
      if (!result.success) throw Error(`Future booking failed: ${result.error}`);
      if (i === 0) scenarios.pendingAppointment = result.appointment.id;
      await db.dbAddPatientSession({ patientId: p.id, appointmentId: result.appointment.id, date: slot.date, time: slot.startTime, clinicalStatus: 'PLANNED', sessionType: 'ONLINE', notes: '[DEMO] Sessão planeada; EVA ainda não medida.' });
    }
    for (const [i, p] of patients.slice(0, 10).entries()) {
      const practitionerId = team[0].id, sessions = [];
      for (let n = 0; n < 3; n++) {
        const slot = await findSlot(p, p.service, 35 + n * 7 + i % 3, 42 + n * 7 + i % 3, practitionerId);
        sessions.push({ date: slot.date, startTime: slot.startTime, notes: `[DEMO] Plano recorrente · sessão ${n + 1}/3` });
      }
      const result = await db.dbCreateMultipleAppointments({ patientId: p.id, patientName: p.patientName, phone: p.phone, email: p.email, practitionerId, service: p.service,
        coverageType: p.coverageType, coverageProvider: p.coverageProvider || undefined, coverageNumber: p.coverageNumber || undefined, sessions, bookingRequestId: `demo-plan-${i}` });
      if (!result.success) throw Error(`Treatment plan failed: ${result.message}`);
      if (i === 0) scenarios.recurringPlan = result.appointments.map(a => a.id);
    }
    for (const [i, p] of patients.slice(0, 36).entries()) {
      const review = await db.dbCreateReview({ patientName: p.patientName, patientEmail: p.email, serviceSlug: p.service, rating: 3 + i % 3, status: ['APPROVED', 'APPROVED', 'PENDING', 'REJECTED'][i % 4],
        verified: false, isFeatured: i % 8 === 0, location: ['Lisboa', 'Oeiras', 'Cascais', 'Almada'][i % 4],
        comment: '[DEMO — avaliação fictícia] ' + ['O acompanhamento foi organizado e os objetivos ficaram claros.', 'A marcação foi simples e recebi explicações sobre o plano.', 'Gostaria de ter mais opções de horário disponíveis.'][i % 3] });
      await db.executeQuery('UPDATE reviews SET createdAt=?,updatedAt=? WHERE id=?', [at(day(-1 - i * 2)), at(day(-1 - i * 2)), review.id]);
    }
    // Store completed/expired bot examples only: there is nothing queued to send.
    await load('@/lib/whatsapp/store').ensureWhatsappSchema();
    for (const [i, p] of patients.slice(0, 6).entries()) {
      const phone = p.phone.slice(1), now = Date.now();
      const appointment = (await db.dbGetAppointments({})).find(a => a.patientId === p.id && a.date >= baseDate);
      const state = { lang: ['pt', 'en', 'fr'][i % 3], step: 'done', name: p.patientName, service: p.service, practitionerId: appointment.practitionerId,
        practitionerName: appointment.practitionerName, date: appointment.date, time: appointment.startTime, requestId: `demo-wa-${i}`, choices: [], expiresAt: now - 1 };
      await db.executeAtomicBatch([
        { sql: 'INSERT INTO whatsapp_conversations(phone,state,updatedAt) VALUES(?,?,?)', args: [phone, JSON.stringify(state), now] },
        { sql: 'INSERT INTO whatsapp_inbox(id,phone,payload,sentAt,receivedAt,processedAt) VALUES(?,?,?,?,?,?)', args: [`demo-wa-${i}`, phone, '{}', now - 2000, now - 1000, now] },
        { sql: 'INSERT INTO whatsapp_outbox(id,phone,payload,createdAt,expiresAt,status,errorCode) VALUES(?,?,?,?,?,?,?)', args: [`demo-wa-${i}:0`, phone, '{}', now - 1000, now - 1, 'expired', 'DEMO_NOT_SENT'] },
      ]);
    }
    await db.dbLogSecurityAudit('demo_seed_completed', '127.0.0.1', 'demo-generator', { synthetic: true, patients: patients.length });
    // Fail before publishing a fixture that violates scheduling or clinical links.
    if (sqlite.pragma('integrity_check', { simple: true }) !== 'ok' || sqlite.pragma('foreign_key_check').length) throw Error('Demo database integrity check failed.');
    const dates = sqlite.prepare('SELECT DISTINCT date FROM appointments').all().map(r => r.date);
    const state = await scheduling.loadScheduleState(dates);
    for (const a of state.appointments) {
      if (!scheduling.evaluateSlot(state, a.date, a.startTime, a.service, { includePast: true, excludeId: a.id, practitionerId: a.practitionerId, patientId: a.patientId, patientPhone: a.phone, snapshot: a }).available) throw Error(`Invalid seeded booking: ${a.id}`);
    }
    const totals = Object.fromEntries(['patients', 'practitioners', 'treatment_catalog', 'appointments', 'patient_sessions', 'invoices', 'prescriptions', 'reviews', 'resources', 'schedule_exceptions', 'blocked_slots', 'clinical_session_revisions', 'treatment_revisions', 'whatsapp_conversations'].map(table => [table, count(table)]));
    const report = { synthetic: true, generatedAt: new Date().toISOString(), baseDate, totals, scenarios,
      appointmentStatuses: sqlite.prepare('SELECT status,count(*) AS count FROM appointments WHERE archivedAt IS NULL GROUP BY status').all(),
      paymentStatuses: sqlite.prepare('SELECT paymentStatus,count(*) AS count FROM invoices GROUP BY paymentStatus').all(),
      notifications: 'SMTP and WhatsApp disabled; no pending messages', productionChanged: false };
    sqlite.exec('CREATE TABLE ryma_demo_seed(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,report TEXT NOT NULL)');
    sqlite.prepare('INSERT INTO ryma_demo_seed VALUES(1,?,?)').run(VERSION, JSON.stringify(report));
    sqlite.pragma('wal_checkpoint(TRUNCATE)');
    sqlite.pragma('journal_mode = DELETE');
    return report;
  } finally { sqlite.close(); }
}

populate().then(report => console.log(JSON.stringify(report))).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
