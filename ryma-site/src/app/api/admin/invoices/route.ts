import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireOwnerAnalytics } from '@/lib/requireAdmin';
import {
  dbGetInvoices,
  dbGetInvoicesPaginated,
  dbCreateInvoice,
  dbGetInvoiceStats,
  dbGetIdempotencyKey,
  dbSaveIdempotencyKey,
} from '@/lib/db';
import { SERVICES } from '@/data/services';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/invoices ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  const { searchParams } = request.nextUrl;
  const status        = searchParams.get('status') ?? undefined;
  const search        = searchParams.get('search') ?? undefined;
  const dateFrom      = searchParams.get('dateFrom') ?? undefined;
  const dateTo        = searchParams.get('dateTo') ?? undefined;
  const patientPhone  = searchParams.get('patientPhone') ?? undefined;
  const paymentMethod = searchParams.get('paymentMethod') ?? undefined;
  const pageParam     = searchParams.get('page');
  const limitParam    = searchParams.get('limit');

  // Determine whether caller holds Owner Analytics step-up privilege
  const ownerAuth = await requireOwnerAnalytics(request);
  const isOwner = Boolean('ok' in ownerAuth && (ownerAuth as any).ok === true && !(ownerAuth instanceof NextResponse));

  // Role-Based Protection: If not owner, restrict unrestricted queries to current month
  // to allow daily reception billing operations while preventing lifetime turnover scraping
  let effectiveDateFrom = dateFrom;
  if (!isOwner && !dateFrom && !search && !patientPhone) {
    const d = new Date();
    effectiveDateFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  const rawStats = await dbGetInvoiceStats();

  // Owner Separation: Non-owner staff cannot see clinic revenue totals
  const stats = isOwner
    ? rawStats
    : {
        totalRevenue: 0,
        totalPaid: 0,
        totalPending: 0,
        countPaid: rawStats.countPaid,
        countPending: rawStats.countPending,
        countTotal: rawStats.countTotal,
        avgTicket: 0,
        insuranceShare: rawStats.insuranceShare,
        isOwnerCensored: true,
      };

  if (pageParam !== null || limitParam !== null) {
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '50', 10)));
    const paginated = await dbGetInvoicesPaginated({
      status,
      search,
      dateFrom: effectiveDateFrom,
      dateTo,
      patientPhone,
      paymentMethod,
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
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      }
    );
  }

  const invoices = await dbGetInvoices({ status, search, dateFrom: effectiveDateFrom, dateTo, patientPhone, paymentMethod });

  return NextResponse.json(
    { invoices, stats },
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
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.patientName || !body.patientPhone || !body.serviceSlug) {
    return NextResponse.json(
      { error: 'Nome do paciente, contacto telefónico e serviço são obrigatórios.' },
      { status: 422 }
    );
  }

  const service = SERVICES.find(s => s.slug === body.serviceSlug);
  const serviceName = body.serviceName || (service ? (service.name.pt || service.name.fr) : body.serviceSlug);
  
  // Validate Amount strictly > 0 and <= 50,000 EUR
  const rawAmount = body.amount !== undefined ? Number(body.amount) : (service?.price || 0);
  if (isNaN(rawAmount) || rawAmount <= 0 || rawAmount > 50000) {
    return NextResponse.json(
      { error: 'O montante da fatura deve ser um valor válido (> 0 € e ≤ 50.000 €).' },
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
        { error: 'Taxa de IVA inválida. As taxas autorizadas são 0%, 6%, 13% ou 23%.' },
        { status: 422 }
      );
    }
    vatRate = parsedVat;
  }

  // Validate Payment Method
  const validMethods = ['MULTIBANCO', 'MBWAY', 'CASH', 'CARD', 'TRANSFER'];
  const paymentMethod = body.paymentMethod ? String(body.paymentMethod).toUpperCase().trim() : 'MULTIBANCO';
  if (!validMethods.includes(paymentMethod)) {
    return NextResponse.json({ error: 'Método de pagamento inválido.' }, { status: 422 });
  }

  // Validate Payment Status
  const validStatuses = ['PAID', 'PENDING'];
  const paymentStatus = body.paymentStatus ? String(body.paymentStatus).toUpperCase().trim() : 'PAID';
  if (!validStatuses.includes(paymentStatus)) {
    return NextResponse.json({ error: 'Estado de pagamento inválido.' }, { status: 422 });
  }

  // Validate NIF (9 digits or fallback 999999990)
  let cleanNif = '999999990';
  if (body.patientNif && String(body.patientNif).trim().length > 0) {
    const candidate = String(body.patientNif).replace(/\s/g, '').trim();
    if (!/^\d{9}$/.test(candidate)) {
      return NextResponse.json(
        { error: 'NIF inválido. O NIF deve conter exatamente 9 dígitos numéricos.' },
        { status: 422 }
      );
    }
    cleanNif = candidate;
  }

  const idempotencyKey = request.headers.get('idempotency-key') ||
                         request.headers.get('x-idempotency-key') ||
                         (body.clientRequestId as string | undefined);

  if (idempotencyKey) {
    const cached = await dbGetIdempotencyKey(idempotencyKey, 'admin_invoice');
    if (cached) {
      return NextResponse.json(cached.responseBody, {
        status: cached.statusCode,
        headers: { 'X-Cache-Lookup': 'HIT_IDEMPOTENT' },
      });
    }
  }

  try {
    const invoice = await dbCreateInvoice({
      appointmentId: body.appointmentId,
      patientId: body.patientId,
      patientName: String(body.patientName).trim().slice(0, 100),
      patientNif: cleanNif,
      patientEmail: body.patientEmail ? String(body.patientEmail).trim().slice(0, 254) : undefined,
      patientPhone: String(body.patientPhone).trim().slice(0, 30),
      patientAddress: body.patientAddress ? String(body.patientAddress).trim().slice(0, 250) : undefined,
      coverageType: body.coverageType,
      coverageProvider: body.coverageProvider,
      coverageNumber: body.coverageNumber,
      serviceSlug: String(body.serviceSlug).trim(),
      serviceName,
      practitioner: body.practitioner ? String(body.practitioner).trim().slice(0, 100) : undefined,
      amount,
      vatRate,
      vatExemptionReason: body.vatExemptionReason,
      paymentMethod: paymentMethod as any,
      paymentStatus: paymentStatus as any,
      notes: body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
    });

    const responsePayload = { invoice };
    if (idempotencyKey) {
      await dbSaveIdempotencyKey(idempotencyKey, 'admin_invoice', 201, responsePayload);
    }

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (err: any) {
    console.error('[API Create Invoice Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar fatura/recibo' }, { status: 500 });
  }
}
