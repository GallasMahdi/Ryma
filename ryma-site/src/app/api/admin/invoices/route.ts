import { localizeApiError } from '@/lib/api-i18n';
import { getLocalizedText } from '@/data/services';
import type { CoverageType } from '@/types/admin';
import { isJsonObject, pageNumber, COVERAGE_TYPES, invoiceFilters } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetInvoices,
  dbGetAppointmentById,
  dbGetInvoicesPaginated,
  dbCreateInvoice,
  dbGetInvoiceStats,
  dbIsOwnerStepUpActive,
  DocumentError,
} from '@/lib/db';
import { getTreatments } from '@/lib/treatments';
import { validateAndNormalizePhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/invoices ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  const { searchParams } = request.nextUrl;
  let filters;
  try { filters=invoiceFilters(searchParams); } catch { return NextResponse.json({error:localizeApiError('Invalid invoice filters', request)},{status:422}); }
  const pageParam     = searchParams.get('page');
  const limitParam    = searchParams.get('limit');

  const owner=!!auth.session.analyticsUnlockedUntil && Date.now()<auth.session.analyticsUnlockedUntil && await dbIsOwnerStepUpActive(auth.session.sessionId);
  let stats=null;
  let financialReviewRequired=false;
  if (owner) { try { stats=await dbGetInvoiceStats(); } catch(error) { if (!(error instanceof DocumentError)) throw error; financialReviewRequired=true; } }

  if (pageParam !== null || limitParam !== null) {
    const page = pageNumber(pageParam, 1);
    const limit = pageNumber(limitParam, 50, 100);
    const paginated = await dbGetInvoicesPaginated({
      ...filters,
      page,
      limit,
    });

    return NextResponse.json(
      {
        invoices: paginated.invoices,
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
        stats,
        financialReviewRequired,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      }
    );
  }

  const invoices = await dbGetInvoices(filters);

  return NextResponse.json(
    { invoices, stats, financialReviewRequired },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}

// ─── POST /api/admin/invoices ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  let body: Record<string, any>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
  } catch {
    return NextResponse.json({ error: localizeApiError('Invalid JSON body', request) }, { status: 400 });
  }

  if (!body.patientName || !body.patientPhone || !body.serviceSlug) {
    return NextResponse.json(
      { error: localizeApiError('Nome do paciente, contacto telefónico e serviço são obrigatórios.', request) },
      { status: 422 }
    );
  }

  const phoneValidation = validateAndNormalizePhone(body.patientPhone);
  if (!phoneValidation.isValid) {
    return NextResponse.json({ error: localizeApiError(phoneValidation.error, request), errorCode: phoneValidation.errorCode }, { status: 422 });
  }

  if (body.coverageType !== undefined && !COVERAGE_TYPES.includes(String(body.coverageType))) return NextResponse.json({ error: localizeApiError('Invalid coverage type', request) }, { status: 422 });
  const currentService = (await getTreatments()).find(s => s.slug === body.serviceSlug);
  const appointment = typeof body.appointmentId==='string' ? await dbGetAppointmentById(body.appointmentId) : null;
  const service = appointment?.serviceNameJson && appointment.service===body.serviceSlug ? {name:JSON.parse(appointment.serviceNameJson),price:appointment.servicePriceCents!=null?appointment.servicePriceCents/100:currentService?.price} : currentService;
  const serviceName = (typeof body.serviceName === 'string' ? body.serviceName.trim() : '') || (service ? getLocalizedText(service.name,'pt') : String(body.serviceSlug));
  
  // Validate Amount strictly > 0 and <= 50,000 EUR
  const rawAmount = body.amount !== undefined ? Number(body.amount) : (service?.price || 0);
  if (isNaN(rawAmount) || rawAmount <= 0 || rawAmount > 50000) {
    return NextResponse.json(
      { error: localizeApiError('O montante da fatura deve ser um valor válido (> 0 € e ≤ 50.000 €).', request) },
      { status: 422 }
    );
  }
  const amount = rawAmount;

  // Validate VAT Rate: must be in [0, 6, 13, 23]
  let vatRate = 0;
  if (body.vatRate !== undefined) {
    const parsedVat = Number(body.vatRate);
    if (![0, 6, 13, 23].includes(parsedVat)) {
      return NextResponse.json(
        { error: localizeApiError('Taxa de IVA inválida. As taxas autorizadas são 0%, 6%, 13% ou 23%.', request) },
        { status: 422 }
      );
    }
    vatRate = parsedVat;
  }

  // Validate Payment Method
  const validMethods = ['MULTIBANCO', 'MBWAY', 'CASH', 'CARD', 'TRANSFER'];
  const paymentMethod = body.paymentMethod ? String(body.paymentMethod).toUpperCase().trim() : 'MULTIBANCO';
  if (!validMethods.includes(paymentMethod)) {
    return NextResponse.json({ error: localizeApiError('Método de pagamento inválido.', request) }, { status: 422 });
  }

  // Validate Payment Status
  const validStatuses = ['PAID', 'PENDING'];
  const paymentStatus = body.paymentStatus ? String(body.paymentStatus).toUpperCase().trim() : 'PAID';
  if (!validStatuses.includes(paymentStatus)) {
    return NextResponse.json({ error: localizeApiError('Estado de pagamento inválido.', request) }, { status: 422 });
  }

  // Validate NIF (9 digits or fallback 999999990)
  let cleanNif = '999999990';
  if (body.patientNif && String(body.patientNif).trim().length > 0) {
    const candidate = String(body.patientNif).replace(/\s/g, '').trim();
    if (!/^\d{9}$/.test(candidate)) {
      return NextResponse.json(
        { error: localizeApiError('NIF inválido. O NIF deve conter exatamente 9 dígitos numéricos.', request) },
        { status: 422 }
      );
    }
    cleanNif = candidate;
  }

  const idempotencyKey = request.headers.get('idempotency-key') ||
                         request.headers.get('x-idempotency-key') ||
                         (body.clientRequestId as string | undefined);

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 200) return NextResponse.json({error: localizeApiError('A stable idempotency key is required to issue an invoice', request)}, {status: 422});

  try {
    const invoice = await dbCreateInvoice({
      practitionerId: typeof body.practitionerId === "string" ? body.practitionerId : undefined,
      appointmentId: typeof body.appointmentId === 'string' ? body.appointmentId.trim() : undefined,
      patientId: typeof body.patientId === 'string' ? body.patientId.trim() : undefined,
      patientName: String(body.patientName).trim().slice(0, 100),
      patientNif: cleanNif,
      patientEmail: body.patientEmail ? String(body.patientEmail).trim().slice(0, 254) : undefined,
      patientPhone: phoneValidation.normalized,
      patientAddress: body.patientAddress ? String(body.patientAddress).trim().slice(0, 250) : undefined,
      coverageType: body.coverageType as CoverageType | undefined,
      coverageProvider: typeof body.coverageProvider === 'string' ? body.coverageProvider.trim() : undefined,
      coverageNumber: typeof body.coverageNumber === 'string' ? body.coverageNumber.trim() : undefined,
      serviceSlug: String(body.serviceSlug).trim(),
      serviceName,
      practitioner: body.practitioner ? String(body.practitioner).trim().slice(0, 100) : undefined,
      amount,
      vatRate,
      vatExemptionReason: typeof body.vatExemptionReason === 'string' ? body.vatExemptionReason.trim() : undefined,
      paymentMethod: paymentMethod as any,
      paymentStatus: paymentStatus as any,
      notes: body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
    }, idempotencyKey || undefined);

    const responsePayload = { invoice };


    return NextResponse.json(responsePayload, { status: 201 });
  } catch (err: any) {
    if (/session_already_invoiced/.test(String(err))) return NextResponse.json({error:localizeApiError('This appointment has already been invoiced.', request),code:'ALREADY_INVOICED'},{status:409});
    if (err instanceof DocumentError) return NextResponse.json({error:localizeApiError(err.message, request)},{status:422});
    if (err.message === 'idempotency_conflict') return NextResponse.json({error: localizeApiError('Idempotency key already used for a different invoice', request)}, {status: 409});
    console.error('[API Create Invoice Error]');
    return NextResponse.json({ error: localizeApiError('Erro ao criar fatura/recibo', request) }, { status: 500 });
  }
}
