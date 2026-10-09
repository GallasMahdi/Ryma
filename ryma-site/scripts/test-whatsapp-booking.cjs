const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {createHmac, randomUUID} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const ts = require('typescript');

// Isolated real database; no .env files, patient data, SMTP, or network calls.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ryma-whatsapp-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(temp, 'test.db');
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
const cloudAdapter = process.env.RYMA_TEST_ADAPTER === 'libsql';
if (cloudAdapter) process.env.TURSO_DATABASE_URL = pathToFileURL(path.join(temp, 'libsql.db')).href;
Object.assign(process.env, {WHATSAPP_ENABLED: 'true', WHATSAPP_PHONE_NUMBER_ID: '123456', WHATSAPP_ACCESS_TOKEN: 'test-token', WHATSAPP_APP_SECRET: 'test-secret', WHATSAPP_VERIFY_TOKEN: 'verify-test', WHATSAPP_GRAPH_VERSION: 'v23.0', WHATSAPP_JOB_SECRET: 'test-job', WHATSAPP_AUTO_CONFIRM: 'false', WHATSAPP_ALLOWED_SENDERS: ''});
const root = path.resolve(__dirname, '..');
const cache = new Map();
const sent = [];
const clients = [];
let failSend = false;
let adminAllowed = true;
class NextRequest extends Request { get nextUrl() { return new URL(this.url); } }
const mocks = {
  '@libsql/client': {...require('@libsql/client'), createClient(options) {
    assert.match(options.url, /^file:/, 'Tests must never connect to a remote database');
    const client = require('@libsql/client').createClient(options); clients.push(client); return client;
  }},
  'next/server': {NextRequest, NextResponse: Response, after() {}},
  '@/lib/requireAdmin': {requireAdmin: async () => adminAllowed ? {session: {sessionId: 'fixture-admin'}} : Response.json({error: 'Unauthorized'}, {status: 401})},
  '@/lib/session-policy': {isAdminSessionValid: () => true},
};
function load(id, parent = root) {
  if (Object.hasOwn(mocks, id)) return mocks[id];
  if (!id.startsWith('@/') && !id.startsWith('.')) return require(id);
  const base = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(parent, id);
  const filename = ['.ts', '.tsx', ''].map(ext => base + ext).find(file => fs.existsSync(file) && fs.statSync(file).isFile());
  assert(filename, `Missing ${id}`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = {exports: {}}; cache.set(filename, mod);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true}}).outputText;
  const context = vm.createContext({console, process, Buffer, URL, URLSearchParams, Request, Response, AbortSignal, setTimeout, clearTimeout, setInterval, clearInterval, TextEncoder, TextDecoder, ReadableStream,
    fetch: async (url, options) => {
      assert.match(String(url), /^https:\/\/graph\.facebook\.com\/v23\.0\/123456\/messages$/);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      if (failSend) return Response.json({error: {code: 2}}, {status: 500});
      const body = JSON.parse(options.body);
      assert.equal(body.messaging_product, 'whatsapp');
      const action = body.interactive?.action;
      if (action?.sections) {
        const rows = action.sections.flatMap(section => section.rows);
        assert(rows.length <= 10); assert(rows.every(row => row.title.length <= 24));
      }
      if (action?.buttons) { assert(action.buttons.length <= 3); assert(action.buttons.every(button => button.reply.title.length <= 20)); }
      sent.push(body);
      return Response.json({messages: [{id: `sent-${randomUUID()}`}]});
    },
  });
  vm.runInThisContext(`(function(require, module, exports, fetch) {${compiled}\n})`)((child) => load(child, path.dirname(filename)), mod, mod.exports, context.fetch);
  return mod.exports;
}
const db = load('@/lib/db');
const config = load('@/lib/whatsapp/config');
const webhook = load('@/app/api/whatsapp/webhook/route');
const worker = load('@/lib/whatsapp/worker');
const store = load('@/lib/whatsapp/store');
const conversation = load('@/lib/whatsapp/conversation');
const parser = load('@/lib/whatsapp/webhook');
const jobs = load('@/app/api/whatsapp/jobs/route');
const admin = load('@/app/api/admin/whatsapp/route');
const phone = '351961234567';
let tick = Math.floor(Date.now() / 1000) - 100;
function payload(message, phoneId = '123456') {
  return {object: 'whatsapp_business_account', entry: [{changes: [{field: 'messages', value: {metadata: {phone_number_id: phoneId}, messages: [message]}}]}]};
}
async function send(text, choice, from = phone, id = `wamid.${randomUUID()}`, drain = true) {
  const message = {id, from, timestamp: String(++tick), type: choice ? 'interactive' : 'text', ...(choice ? {interactive: {type: 'list_reply', list_reply: {id: choice}}} : {text: {body: text}})};
  const raw = JSON.stringify(payload(message));
  const signature = 'sha256=' + createHmac('sha256', 'test-secret').update(raw).digest('hex');
  const response = await webhook.POST(new NextRequest('https://clinic.test/api/whatsapp/webhook', {method: 'POST', body: raw, headers: {'x-hub-signature-256': signature}}));
  assert.equal(response.status, 200);
  if (drain) await worker.runWhatsappWorker();
  return message;
}
async function state(from = phone) {
  const rows = await db.executeQuery('SELECT state FROM whatsapp_conversations WHERE phone = ?', [from]);
  return JSON.parse(rows[0].state);
}
async function select(kind, value, from = phone) {
  const current = await state(from);
  const choice = current.choices.find(c => c.action.kind === kind && (value === undefined || c.action.value === value));
  assert(choice, `Missing choice ${kind} ${value}`);
  await send('', choice.id, from);
  return choice;
}
async function prepareBooking(from = phone) {
  await send('Hello, book an appointment', undefined, from);
  await select('service', 'massage-therapeutique', from);
  await select('date', undefined, from);
  await select('time', undefined, from);
  await send('Test Patient', undefined, from);
  assert.equal((await state(from)).step, 'confirm');
}

test.before(async()=>require('./fixtures/services.cjs').seedTestServices(db));
test(`WhatsApp booking integration against isolated ${cloudAdapter ? 'libSQL' : 'SQLite'}`, async t => {
  await t.test('webhook verifies exact raw signatures and challenge tokens', async () => {
    assert(config.validWebhookSignature('{}', 'sha256=' + createHmac('sha256', 'test-secret').update('{}').digest('hex'), 'test-secret'));
    assert(!config.validWebhookSignature('{ }', 'sha256=' + createHmac('sha256', 'test-secret').update('{}').digest('hex'), 'test-secret'));
    assert.equal((await webhook.GET(new NextRequest('https://clinic.test?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=42'))).status, 200);
    assert.equal(await (await webhook.GET(new NextRequest('https://clinic.test?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=42'))).text(), '42');
    assert.equal((await webhook.GET(new NextRequest('https://clinic.test?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=42'))).status, 403);
    assert.equal((await webhook.POST(new NextRequest('https://clinic.test', {method: 'POST', body: '{}'}))).status, 403);
  });
  await t.test('other phone IDs, delivery notifications and non-allowlisted senders do not book', () => {
    const message = {id: 'test', from: phone, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: {body: 'hello'}};
    assert.equal(parser.parseWhatsappMessages(payload(message, 'wrong'), '123456').length, 0);
    assert.equal(parser.parseWhatsappMessages(payload(message), '123456', ['351969999999']).length, 0);
    assert.equal(parser.parseWhatsappMessages({object: 'whatsapp_business_account', entry: [{changes: [{field: 'messages', value: {statuses: [{status: 'delivered'}]}}]}]}, '123456').length, 0);
  });
  await t.test('complete conversation saves one pending appointment visible to dashboard queries', async () => {
    await prepareBooking();
    const before = Number((await db.executeQuery('SELECT revision FROM booking_sync WHERE id = 1'))[0].revision);
    await select('confirm');
    const appointments = await db.dbGetAppointments({phone: `+${phone}`});
    assert.equal(appointments.length, 1);
    assert.equal(appointments[0].source, 'whatsapp');
    assert.equal(appointments[0].status, 'PENDING');
    assert.match(sent.at(-1).text.body, /awaiting clinic approval/);
    assert(Number((await db.executeQuery('SELECT revision FROM booking_sync WHERE id = 1'))[0].revision) > before);
    assert((await db.executeQuery("SELECT payload FROM whatsapp_outbox WHERE status = 'sent'")).every(row => row.payload === '{}'));
  });
  await t.test('duplicate webhook deliveries do not create duplicate replies', async () => {
    const id = `wamid.${randomUUID()}`;
    await send('menu', undefined, phone, id);
    const before = sent.length;
    await send('menu', undefined, phone, id);
    assert.equal(sent.length, before);
    assert.equal((await db.dbGetAppointments({phone: `+${phone}`})).length, 1);
  });
  await t.test('stale confirmation buttons cannot reserve a different selection', async () => {
    await prepareBooking('351962345678');
    const old = (await state('351962345678')).choices.find(c => c.action.kind === 'confirm').id;
    await send('menu', undefined, '351962345678');
    await send('', old, '351962345678');
    assert.equal((await db.dbGetAppointments({phone: '+351962345678'})).length, 0);
  });
  await t.test('a crash after booking but before conversation commit recovers the same appointment', async () => {
    const from = '351963456789';
    await prepareBooking(from);
    const current = await state(from);
    const incoming = {id: 'crash-recovery', from, timestamp: Date.now(), choice: current.choices.find(c => c.action.kind === 'confirm').id};
    const first = await conversation.advanceConversation(current, incoming);
    const second = await conversation.advanceConversation(current, incoming);
    const recoveredAfterExpiry = await conversation.advanceConversation({...current, expiresAt: 1}, incoming);
    assert.equal((await db.dbGetAppointments({phone: `+${from}`})).length, 1);
    assert.equal(first.replies[0].text.body, second.replies[0].text.body);
    assert.equal(first.replies[0].text.body, recoveredAfterExpiry.replies[0].text.body);
  });
  await t.test('delivery failure retains the booking and retries the saved reply', async () => {
    const from = '351964567890';
    await prepareBooking(from);
    failSend = true;
    await select('confirm', undefined, from);
    assert.equal((await db.dbGetAppointments({phone: `+${from}`})).length, 1);
    assert.equal((await db.executeQuery("SELECT status FROM whatsapp_outbox WHERE phone = ? AND status = 'pending'", [from])).length, 1);
    failSend = false;
    await db.executeQuery('UPDATE whatsapp_outbox SET nextAttemptAt = 0 WHERE phone = ?', [from]);
    await worker.runWhatsappWorker();
    assert.match(sent.at(-1).text.body, /awaiting clinic approval/);
    assert.equal((await db.dbGetAppointments({phone: `+${from}`})).length, 1);
  });
  await t.test('treatment overlaps and blocked intervals are enforced for every database writer', async () => {
    const input = {patientName: 'Duration Test', phone: '+351965678901', service: 'radiofrequence', date: '2040-01-02', startTime: '14:00'};
    const result = await db.dbCreateAppointment(input);
    assert(result.success);
    assert.equal((await db.dbCheckSlotAvailability(input.date, '14:30', 'ultrasons')).available, false);
    assert.equal((await db.dbCheckSlotAvailability(input.date, '15:00', 'ultrasons')).available, true);
    await assert.rejects(db.executeQuery("INSERT INTO appointments (id, patientName, phone, service, date, startTime, status, createdAt, updatedAt) VALUES ('race', 'Race', '+351965678902', 'ultrasons', '2040-01-02', '14:30', 'PENDING', 'now', 'now')"), /slot_taken/);
    await assert.rejects(db.executeQuery("INSERT INTO blocked_slots (id, date, time) VALUES ('block', '2040-01-02', '14:30')"), /slot_taken/);
    assert.equal((await db.dbCheckSlotAvailability(input.date, '12:00', 'radiofrequence')).available, false);
    await db.dbUpdateAppointment(result.appointment.id, {status: 'CANCELLED'});
    assert.equal((await db.dbCheckSlotAvailability(input.date, '14:30', 'ultrasons')).available, true);
  });
  await t.test('per-conversation leases prevent concurrent processing and stale commits', async () => {
    const lock = await store.lockConversation('351966789012');
    assert(lock);
    assert.equal(await store.lockConversation('351966789012'), null);
    assert.equal(await store.commitConversation('351966789012', 'wrong-token', {id: 'wrong', from: '351966789012', timestamp: Date.now()}, {lang: 'pt', step: 'done', choices: [], expiresAt: 0}, []), false);
    await store.unlockConversation('351966789012', lock.token);
  });
  await t.test('Portuguese, French and Spanish conversations understand service, tomorrow and afternoon', async () => {
    for (const [text, lang] of [['Olá, massagem terapêutica amanhã à tarde', 'pt'], ['Bonjour, massage thérapeutique demain après-midi', 'fr'], ['Hola, masaje terapéutico mañana por la tarde', 'es']]) {
      const result = await conversation.advanceConversation(null, {id: randomUUID(), from: phone, timestamp: Date.now(), text});
      assert.equal(result.state.lang, lang);
      assert.equal(result.state.service, 'massage-therapeutique');
      assert.equal(result.state.period, 'afternoon');
      assert(result.state.choices.filter(c => c.action.kind === 'time').every(c => c.action.value >= '13:00'));
    }
  });
  await t.test('automatic confirmation is explicit and expiry cannot make a new booking', async () => {
    process.env.WHATSAPP_AUTO_CONFIRM = 'true';
    await prepareBooking('351967890123');
    await select('confirm', undefined, '351967890123');
    assert.equal((await db.dbGetAppointments({phone: '+351967890123'}))[0].status, 'CONFIRMED');
    assert.match(sent.at(-1).text.body, /Appointment confirmed/);
    process.env.WHATSAPP_AUTO_CONFIRM = 'false';
    await prepareBooking('351968901234');
    const current = await state('351968901234');
    const result = await conversation.advanceConversation({...current, expiresAt: 1}, {id: randomUUID(), from: '351968901234', timestamp: Date.now(), choice: current.choices.find(c => c.action.kind === 'confirm').id});
    assert.equal(result.state.step, 'service');
    assert.equal((await db.dbGetAppointments({phone: '+351968901234'})).length, 0);
  });
  await t.test('jobs and configuration status require separate authorization', async () => {
    assert.equal((await jobs.POST(new Request('https://clinic.test'))).status, 401);
    adminAllowed = false;
    assert.equal((await admin.GET(new NextRequest('https://clinic.test'))).status, 401);
    adminAllowed = true;
    const status = await (await admin.GET(new NextRequest('https://clinic.test'))).json();
    assert.equal(status.configured, true);
    assert(!JSON.stringify(status).includes('test-secret'));
    assert(!JSON.stringify(status).includes('test-token'));
  });
  await t.test('dashboard stream detects a database change without a process-local event', async () => {
    const events = load('@/app/api/admin/events/route');
    const abort = new AbortController();
    const response = await events.GET(new NextRequest('https://clinic.test/api/admin/events', {signal: abort.signal}));
    const reader = response.body.getReader();
    try {
      assert.match(new TextDecoder().decode((await reader.read()).value), /event: connected/);
      await db.executeQuery('UPDATE booking_sync SET revision = revision + 1 WHERE id = 1');
      let timeout;
      try {
        const chunk = await Promise.race([reader.read(), new Promise((_, reject) => {timeout = setTimeout(() => reject(Error('Dashboard did not receive persisted revision')), 7000);})]);
        assert.match(new TextDecoder().decode(chunk.value), /event: appointments:changed/);
      } finally {clearTimeout(timeout);}
    } finally {abort.abort(); await reader.cancel();}
  });
  await t.test('disabled integration does not accept incoming messages', async () => {
    process.env.WHATSAPP_ENABLED = 'false';
    assert.equal((await webhook.POST(new NextRequest('https://clinic.test', {method: 'POST', body: '{}'}))).status, 503);
    assert.deepEqual(JSON.parse(JSON.stringify(await worker.runWhatsappWorker())), {processed: 0, sent: 0});
  });
});
test.after(async () => {
  if (!cloudAdapter) db.getDb().close();
  for (const client of clients) client.close();
  assert.equal(path.dirname(path.resolve(temp)), path.resolve(os.tmpdir()));
  assert(path.basename(temp).startsWith('ryma-whatsapp-'));
  try { await fs.promises.rm(temp, {recursive: true, force: true, maxRetries: 5, retryDelay: 100}); }
  catch (error) {
    // Some Windows libSQL builds keep native handles until process exit.
    if (!cloudAdapter || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
    console.warn(`Disposable libSQL fixture retained until native handles close: ${temp}`);
  }
});
