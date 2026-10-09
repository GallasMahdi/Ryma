const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createAppLoader, ROOT } = require('./demo/runtime.cjs');
const { staticAudit, catalogueAudit, compare } = require('./i18n-audit.cjs');
const load = createAppLoader();

test('all four dictionaries, full articles and localized records have Spanish coverage', () => {
  const result = staticAudit();
  assert.deepEqual(result.issues, []);
  assert.equal(result.articles, 8);
  assert(result.localizedRecords > 150);
});

test('audit catches missing array elements and incomplete administrator-authored content', () => {
  const issues = [];
  compare({ steps: ['One', 'Two'] }, { steps: ['Uno'] }, 'es', issues);
  assert.deepEqual(issues, ['es.steps.1: missing text']);
  const catalogue = require('./demo/data.cjs').treatments;
  assert.deepEqual(catalogueAudit(catalogue), []);
  const missing = structuredClone(catalogue[0]); delete missing.faq[0].a.es;
  assert(catalogueAudit([missing]).some(i => i.includes('faq.0.a.es')));
});

test('Spanish errors follow cookie preference, preserve codes and interpolate validation limits', () => {
  const { requestLanguage, localizeApiError, spanishError } = load('@/lib/api-i18n');
  const req = new Request('http://fixture.invalid', { headers: { cookie: 'other=1; ryma_lang=es', 'accept-language': 'fr-FR' } });
  assert.equal(requestLanguage(req), 'es');
  assert.equal(requestLanguage(new Request('http://fixture.invalid', { headers: { 'accept-language': 'es-ES,pt;q=0.9' } })), 'es');
  assert.equal(localizeApiError('Unauthorized', req), 'Acceso no autorizado.');
  assert.equal(spanishError('Name: maximum 120 characters.'), 'Nombre: máximo 120 caracteres.');
  assert.equal(localizeApiError('INVALID_INPUT', req), 'INVALID_INPUT');
  assert.equal(localizeApiError('Unauthorized'), 'Unauthorized');
  const result = load('@/lib/validation').validateAppointmentInput({ lang: 'es', patientName: '' });
  assert.equal(result.errorCode, 'PATIENT_NAME_REQUIRED');
  assert.match(result.error, /nombre del paciente/);
});

test('Spanish-only treatment text, lists and FAQs survive validation and public display', () => {
  const { validateTreatment, publicTreatment } = load('@/lib/treatments');
  const source = { slug: 'tratamiento-es', pole: 'kinesitherapie', status: 'DRAFT', durationMinutes: 45, priceCents: 6550,
    name: { es: 'Masaje terapéutico' }, shortDesc: { es: 'Atención individual' }, longDesc: { es: 'Descripción completa.' },
    sessionFlow: { es: ['Evaluación', 'Sesión individual'] }, indications: { es: ['Evaluación previa'] }, contraindications: { es: ['Consultar al profesional'] },
    faq: [{ q: { es: '¿Cómo reservar?' }, a: { es: 'Seleccione una fecha.' } }], careGoals: ['posture'], bodyZones: ['back'] };
  const validated = validateTreatment(source);
  assert.equal(validated.name.es, source.name.es);
  assert.deepEqual(validated.sessionFlow.es, source.sessionFlow.es);
  assert.equal(validated.faq[0].a.es, source.faq[0].a.es);
  const { getLocalizedText, getLocalizedList } = load('@/data/services');
  assert.equal(getLocalizedText(publicTreatment(validated).name, 'es'), 'Masaje terapéutico');
  assert.deepEqual(getLocalizedList(validated.sessionFlow, 'es'), source.sessionFlow.es);
});

const invoice = { id: 'fixture', invoiceNumber: 'INT-ES-001', patientName: '<script>paciente</script>', patientPhone: '+351969000001', serviceSlug: 'es', serviceName: 'Masaje terapéutico',
  amount: 65.5, amountCents: 6550, vatRate: 0, paymentMethod: 'CASH', paymentStatus: 'PENDING', createdAt: '2026-10-09T12:00:00Z', practitioner: 'Profesional de prueba', items: [] };

test('Spanish printed documents and shared billing messages translate labels and escape patient input', () => {
  const html = load('@/lib/invoicePdf').generateInvoiceHtml(invoice, 'es');
  for (const text of ['lang="es"', 'Documento interno', 'sin validez fiscal', 'Efectivo', 'PENDIENTE DE PAGO', '&lt;script&gt;paciente&lt;/script&gt;']) assert(html.includes(text), text);
  assert(!html.includes('<script>paciente</script>'));
  assert(!html.includes('Descrição do Ato'));
  const prescription = load('@/lib/prescriptionPdf').generatePrescriptionHtml({ patientName: invoice.patientName, patientPhone: invoice.patientPhone, date: '2026-10-09', items: [{ category: 'care_product', title: 'Producto de prueba', instructions: '<b>Texto del profesional</b>' }] }, 'es');
  for (const text of ['lang="es"', 'Recomendaciones clínicas', 'Pauta / aplicación:', '&lt;b&gt;Texto del profesional&lt;/b&gt;']) assert(prescription.includes(text), text);
  const message = load('@/lib/invoice-message').spanishInvoiceMessage(invoice);
  assert.match(message, /65,50/); assert.match(message, /Pendiente/);
});

test('Spanish calendar exports retain Lisbon time and correct event status', () => {
  const { appointmentIcs, googleCalendarUrl } = load('@/lib/appointment-calendar');
  const event = { service: 'Evaluación', date: '2026-08-10', time: '10:00', duration: 45, location: 'Lisboa', description: 'Solicitud pendiente', lang: 'es', uid: 'es-fixture', status: 'TENTATIVE' };
  const ics = appointmentIcs(event);
  assert.match(ics, /SUMMARY:Cita: Evaluación/);
  assert.match(ics, /DTSTART:20260810T090000Z/);
  assert.match(ics, /STATUS:TENTATIVE/);
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.searchParams.get('text'), 'Cita: Evaluación — Digital Clínica');
  assert.equal(url.searchParams.get('ctz'), 'Europe/Lisbon');
});

test('CSV display labels are Spanish without altering canonical payment codes', () => {
  const { exportLabel, exportHeader } = load('@/lib/export-i18n');
  assert.equal(exportHeader('Nome Utente;Telefone;Metodo Pagamento\n', 'es'), 'Nombre del paciente;Teléfono;Método de pago\n');
  assert.equal(exportLabel('CASH', 'es'), 'Efectivo');
  assert.equal(exportLabel('CASH', 'pt'), 'CASH');
});

test('patient and admin emails use Spanish, including pending bookings and calendar links; transport is mocked', async () => {
  const sent = [], cache = new Map();
  function mockedLoad(id, parent = ROOT) {
    if (id === 'nodemailer') return { createTransport: () => ({ sendMail: async m => { sent.push(m); return { accepted: ['fixture@example.invalid'] }; }, close() {} }) };
    if (id === '@/lib/treatments') return { getTreatments: async () => [] };
    if (!id.startsWith('@/') && !id.startsWith('.')) return require(id);
    const base = id.startsWith('@/') ? path.join(ROOT, 'src', id.slice(2)) : path.resolve(parent, id);
    const file = ['.ts', '.tsx', ''].map(ext => base + ext).find(f => fs.existsSync(f));
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(child => mockedLoad(child, path.dirname(file)), mod, mod.exports);
    return mod.exports;
  }
  const oldUser = process.env.SMTP_USER, oldPass = process.env.SMTP_PASS, oldAdmin = process.env.ADMIN_NOTIFICATION_EMAIL;
  process.env.SMTP_USER = 'fixture@example.invalid'; process.env.SMTP_PASS = 'mock-only';
  process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.invalid';
  try {
    const email = mockedLoad('@/lib/email');
    const appointment = { patientName: '<Paciente>', phone: '+351969000001', email: 'fixture@example.invalid', service: 'fixture', serviceNameJson: JSON.stringify({ es: 'Evaluación' }), servicePriceCents: 5000, date: '2026-10-12', startTime: '09:00', status: 'PENDING' };
    await email.sendAppointmentConfirmationEmail(appointment, 'es');
    assert.match(sent[0].subject, /Reserva recibida/); assert.match(sent[0].html, /Detalles de la cita/); assert.match(sent[0].html, /&lt;Paciente&gt;/);
    assert.match(sent[0].html, /Solicitud\+de\+cita\+pendiente/);
    await email.sendAdminNewBookingNotification(appointment, 'es');
    assert.match(sent[1].subject, /Nueva cita/); assert.match(sent[1].html, /Tratamiento solicitado/); assert.match(sent[1].html, /Contactar con el paciente/);
    await email.sendContactMessage({ name: 'Prueba', email: 'fixture@example.invalid', phone: '', subject: '', message: 'Consulta de prueba' }, 'es');
    assert.match(sent[2].subject, /Información/); assert.match(sent[2].text, /Nombre: Prueba/);
  } finally {
    if (oldUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = oldUser;
    if (oldPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = oldPass;
    if (oldAdmin === undefined) delete process.env.ADMIN_NOTIFICATION_EMAIL; else process.env.ADMIN_NOTIFICATION_EMAIL = oldAdmin;
  }
});
