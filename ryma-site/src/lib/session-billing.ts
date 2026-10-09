import type { Lang } from '@/lib/locales';
import { createHash, randomUUID } from 'node:crypto';
import { dbGenerateInvoiceNumber, dbGetInvoiceById, executeConditionalBatch, executeQuery } from './db';
import { getTreatments } from './treatments';
import { getLocalizedText } from '@/data/services';
import { getLisbonDateTime } from './validation';
import type { BillableSession, CreateSessionInvoiceInput, Invoice, InvoiceItem } from '@/types/admin';

export class BillingError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message); }
}

const VISITS = `
 SELECT 'appointment:'||a.id AS key,a.id AS appointmentId,s.id AS sessionId,a.version,a.date,a.startTime,
 a.service AS serviceSlug,a.serviceNameJson,a.servicePole,a.practitionerId,a.practitionerName AS practitioner,a.servicePriceCents AS unitPriceCents
 FROM appointments a LEFT JOIN patient_sessions s ON s.appointmentId=a.id
 WHERE a.patientId=? AND a.status='COMPLETED' AND a.archivedAt IS NULL
 AND (a.date<? OR (a.date=? AND a.startTime<=?))
 UNION ALL
 SELECT 'session:'||s.id,NULL,s.id,s.version,s.date,s.time,s.serviceSlug,NULL,NULL,s.practitionerId,COALESCE(s.practitioner,''),NULL
 FROM patient_sessions s WHERE s.patientId=? AND s.appointmentId IS NULL AND s.clinicalStatus='COMPLETED'
 AND s.completedAt IS NOT NULL AND s.archivedAt IS NULL AND (s.date<? OR (s.date=? AND s.time IS NOT NULL AND s.time<=?))`;

async function readVisits(patientId: string, options: { dateFrom?: string; dateTo?: string; limit?: number; offset?: number; keys?: string[] } = {}, lang: Lang = 'pt') {
  const { todayStr, currentHHMM } = getLisbonDateTime();
  const args: (string | number)[] = [patientId,todayStr,todayStr,currentHHMM,patientId,todayStr,todayStr,currentHHMM];
  let where = '';
  if (options.dateFrom) { where += ' AND v.date>=?'; args.push(options.dateFrom); }
  if (options.dateTo) { where += ' AND v.date<=?'; args.push(options.dateTo); }
  if (options.keys) { where += ` AND v.key IN (${options.keys.map(() => '?').join(',')})`; args.push(...options.keys); }
  args.push(options.limit ?? 51, options.offset ?? 0);
  const rows = await executeQuery<BillableSession & { serviceNameJson: string | null }>(`WITH visits AS (${VISITS}), billed AS (
    SELECT v.*,COALESCE(
      (SELECT invoiceId FROM invoice_items x WHERE x.releasedAt IS NULL AND (x.appointmentId=v.appointmentId OR x.sessionId=v.sessionId) LIMIT 1),
      (SELECT id FROM invoices i WHERE i.appointmentId=v.appointmentId AND i.paymentStatus!='CANCELLED' ORDER BY i.createdAt LIMIT 1)
    ) AS invoiceId FROM visits v WHERE 1=1 ${where}
  ) SELECT billed.*,(SELECT invoiceNumber FROM invoices WHERE id=billed.invoiceId) AS invoiceNumber FROM billed ORDER BY date,startTime,key LIMIT ? OFFSET ?`, args);
  const catalogue = await getTreatments();
  return rows.map(row => {
    const treatment = catalogue.find(t => t.slug === row.serviceSlug);
    let name = treatment?.name;
    if (row.serviceNameJson) { try { name = JSON.parse(row.serviceNameJson); } catch { /* Preserve the service identifier if legacy text is invalid. */ } }
    const { serviceNameJson: _snapshot, ...visit } = row;
    return { ...visit, serviceName: name ? getLocalizedText(name, lang) : row.serviceSlug,
      servicePole: row.servicePole ?? treatment?.pole ?? null,
      suggestedPriceCents: row.unitPriceCents ?? treatment?.priceCents ?? null };
  });
}

export async function getPatientBillingSessions(patientId: string, options: { dateFrom?: string; dateTo?: string; page: number; limit: number }, lang: Lang = 'pt') {
  const [patient] = await executeQuery('SELECT id,patientName,phone,email,coverageType,coverageProvider,coverageNumber FROM patients WHERE id=?', [patientId]);
  if (!patient) throw new BillingError('PATIENT_NOT_FOUND', 'Patient not found.', 404);
  const rows = await readVisits(patientId, { ...options, offset: (options.page - 1) * options.limit, limit: options.limit + 1 }, lang);
  return { patient, sessions: rows.slice(0, options.limit), hasMore: rows.length > options.limit, page: options.page };
}

export async function createSessionInvoice(input: CreateSessionInvoiceInput, requestKey: string, lang: Lang = 'pt'): Promise<Invoice> {
  if (typeof requestKey !== 'string' || !requestKey.trim() || requestKey.length > 200) throw new BillingError('REQUEST_KEY_REQUIRED', 'A stable request key is required.');
  if (typeof input.patientId !== 'string' || !input.patientId.trim() || input.patientId.length > 160 || !Array.isArray(input.sessions) || input.sessions.length < 1 || input.sessions.length > 100) throw new BillingError('INVALID_SELECTION', 'Select a patient and between 1 and 100 completed sessions.');
  if (!['PENDING','PAID'].includes(input.paymentStatus) || !['MULTIBANCO','MBWAY','CASH','CARD','TRANSFER'].includes(input.paymentMethod)) throw new BillingError('INVALID_PAYMENT', 'Choose a valid payment status and method.');
  for (const [key, limit] of Object.entries({patientNif:9,patientAddress:250,externalReference:200,notes:1000})) {
    const value = input[key as keyof CreateSessionInvoiceInput];
    if (value !== undefined && (typeof value !== 'string' || value.length > limit)) throw new BillingError('INVALID_INPUT', `Invalid ${key}.`);
  }
  if (input.patientNif && !/^\d{9}$/.test(input.patientNif)) throw new BillingError('INVALID_NIF', 'NIF must contain nine digits.');
  const keys = input.sessions.map(s => s?.key);
  if (keys.some(key => typeof key !== 'string' || !/^(appointment|session):.{1,160}$/.test(key)) || new Set(keys).size !== keys.length) throw new BillingError('INVALID_SELECTION', 'Each session must be selected once.');
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const dedupeKey = 'session-invoice:' + requestKey;
  const replay = async () => {
    const [row] = await executeQuery<{responseBody:string}>('SELECT responseBody FROM idempotency_keys WHERE key=? AND scope=?', [dedupeKey,'admin_session_invoice']);
    if (!row) return null;
    const saved = JSON.parse(row.responseBody);
    if (saved.requestHash !== hash) throw new BillingError('REQUEST_CONFLICT', 'This request key was already used for another document.', 409);
    const invoice = await dbGetInvoiceById(saved.invoiceId);
    if (!invoice) throw new BillingError('INVOICE_MISSING', 'The saved document could not be found.', 409);
    return invoice;
  };
  const previous = await replay(); if (previous) return previous;
  const [patient] = await executeQuery('SELECT * FROM patients WHERE id=?', [input.patientId]);
  if (!patient) throw new BillingError('PATIENT_NOT_FOUND', 'Patient not found.', 404);
  const visits = await readVisits(input.patientId, { keys, limit: 100 }, lang);
  if (visits.length !== keys.length) throw new BillingError('SESSION_UNAVAILABLE', 'A selected session is not completed, belongs to another patient or is unavailable.', 409);
  if (visits.some(visit => visit.invoiceId)) {
    const saved = await replay(); if (saved) return saved;
    throw new BillingError('ALREADY_INVOICED', 'A selected session has already been invoiced.', 409);
  }
  const id = 'inv_' + randomUUID(), now = new Date().toISOString();
  const items: InvoiceItem[] = input.sessions.map(selection => {
    const visit = visits.find(v => v.key === selection.key)!;
    if (visit.invoiceId) throw new BillingError('ALREADY_INVOICED', 'A selected session has already been invoiced.', 409);
    if (!Number.isSafeInteger(selection.version) || selection.version !== visit.version) throw new BillingError('SESSION_CHANGED', 'A selected session changed. Refresh the session list.', 409);
    if (!Number.isSafeInteger(selection.unitPriceCents) || selection.unitPriceCents <= 0 || selection.unitPriceCents > 5000000 || ![0,6,13,23].includes(selection.vatRate)) throw new BillingError('INVALID_AMOUNT', 'Check the session price and VAT rate.');
    for (const value of [selection.vatExemptionReason, selection.priceAdjustmentReason]) if (value !== undefined && (typeof value !== 'string' || value.length > 250)) throw new BillingError('INVALID_INPUT', 'Line notes must contain at most 250 characters.');
    if (selection.vatRate === 0 && !selection.vatExemptionReason?.trim()) throw new BillingError('EXEMPTION_REQUIRED', 'Enter the reason for the zero VAT rate.');
    if (visit.unitPriceCents !== null && selection.unitPriceCents !== visit.unitPriceCents && !selection.priceAdjustmentReason?.trim()) throw new BillingError('ADJUSTMENT_REQUIRED', 'Explain a change to the recorded session price.');
    return { id:'line_'+randomUUID(), invoiceId:id, appointmentId:visit.appointmentId, sessionId:visit.sessionId,
      serviceSlug:visit.serviceSlug, serviceName:visit.serviceName, servicePole:visit.servicePole, date:visit.date, startTime:visit.startTime,
      practitionerId:visit.practitionerId, practitioner:visit.practitioner, quantity:1, unitPriceCents:selection.unitPriceCents,totalCents:selection.unitPriceCents,
      vatRate:selection.vatRate,vatExemptionReason:selection.vatExemptionReason?.trim()||null,priceAdjustmentReason:selection.priceAdjustmentReason?.trim()||null,releasedAt:null };
  });
  const total = items.reduce((sum,item) => sum + item.totalCents,0);
  if (total > 5000000) throw new BillingError('INVALID_AMOUNT', 'The document total must not exceed €50,000.');
  const oneService = new Set(items.map(item => item.serviceSlug)).size === 1;
  const onePractitioner = new Set(items.map(item => item.practitionerId)).size === 1;
  const onePole = new Set(items.map(item => item.servicePole)).size === 1;
  const oneRate = new Set(items.map(item => item.vatRate)).size === 1;
  const number = await dbGenerateInvoiceNumber();
  const statements = [{ sql:`INSERT INTO invoices(id,invoiceNumber,patientId,patientName,patientNif,patientEmail,patientPhone,patientAddress,coverageType,coverageProvider,coverageNumber,serviceSlug,serviceName,servicePole,practitioner,practitionerId,amount,amountCents,vatRate,vatExemptionReason,paymentMethod,paymentStatus,paidAt,notes,createdAt,updatedAt,documentKind,externalReference)
    VALUES(${Array(28).fill('?').join(',')})`,args:[id,number,patient.id,patient.patientName,input.patientNif||'999999990',patient.email,patient.phone,input.patientAddress?.trim()||'',patient.coverageType,patient.coverageProvider,patient.coverageNumber,
      oneService?items[0].serviceSlug:'multiple-sessions',`${items.length} ${lang === 'es' ? 'sesiones' : lang === 'en' || lang === 'fr' ? 'sessions' : 'sessões'} · ${[...new Set(items.map(item=>item.serviceName))].join(', ')}`,onePole?items[0].servicePole:'mixed',
      [...new Set(items.map(item=>item.practitioner))].filter(Boolean).join(', '),onePractitioner?items[0].practitionerId:null,total/100,total,oneRate?items[0].vatRate:0,oneRate?items[0].vatExemptionReason:null,
      input.paymentMethod,input.paymentStatus,input.paymentStatus==='PAID'?now:null,input.notes?.trim()||null,now,now,'INTERNAL',input.externalReference?.trim()||null] }];
  for (const item of items) {
    const columns = Object.keys(item) as (keyof InvoiceItem)[];
    statements.push({sql:`INSERT INTO invoice_items(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`,args:columns.map(key=>item[key])});
  }
  statements.push({sql:'INSERT INTO idempotency_keys(key,scope,statusCode,responseBody,createdAt,expiresAt) VALUES(?,?,?,?,?,?)',args:[dedupeKey,'admin_session_invoice',201,JSON.stringify({invoiceId:id,requestHash:hash}),Date.now(),Date.now()+86400000]});
  const guards = ['EXISTS(SELECT 1 FROM patients WHERE id=? AND updatedAt=?)'];
  const guardArgs: (string|number)[] = [patient.id,patient.updatedAt];
  for (const visit of visits) {
    guards.push(visit.appointmentId
      ? "EXISTS(SELECT 1 FROM appointments WHERE id=? AND version=? AND patientId=? AND status='COMPLETED' AND archivedAt IS NULL)"
      : "EXISTS(SELECT 1 FROM patient_sessions WHERE id=? AND version=? AND patientId=? AND appointmentId IS NULL AND clinicalStatus='COMPLETED' AND completedAt IS NOT NULL AND archivedAt IS NULL)");
    guardArgs.push(visit.appointmentId ?? visit.sessionId!,visit.version,patient.id);
  }
  try {
    if (!await executeConditionalBatch({sql:'SELECT 1 WHERE '+guards.join(' AND '),args:guardArgs},statements)) throw new BillingError('SESSION_CHANGED','The patient or selected sessions changed. Refresh before saving.',409);
  } catch (error) {
    const saved = await replay(); if (saved) return saved;
    if (/session_already_invoiced|UNIQUE constraint failed: invoice_items/i.test(String(error))) throw new BillingError('ALREADY_INVOICED','A selected session has just been invoiced. Refresh the session list.',409);
    throw error;
  }
  return (await dbGetInvoiceById(id))!;
}
