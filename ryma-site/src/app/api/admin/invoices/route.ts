import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetInvoices,
  dbCreateInvoice,
  dbGetInvoiceStats,
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

  const [invoices, stats] = await Promise.all([
    dbGetInvoices({ status, search, dateFrom, dateTo, patientPhone, paymentMethod }),
    dbGetInvoiceStats(),
  ]);

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
  
  // Validate Amount strictly > 0
  const rawAmount = body.amount !== undefined ? Number(body.amount) : (service?.price || 0);
  if (isNaN(rawAmount) || rawAmount <= 0) {
    return NextResponse.json(
      { error: 'O montante da fatura deve ser um valor estritamente positivo (> 0 €).' },
      { status: 422 }
    );
  }
  const amount = rawAmount;

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
      vatRate: body.vatRate !== undefined ? Number(body.vatRate) : undefined,
      vatExemptionReason: body.vatExemptionReason,
      paymentMethod: body.paymentMethod || 'MULTIBANCO',
      paymentStatus: body.paymentStatus || 'PAID',
      notes: body.notes ? String(body.notes).trim().slice(0, 1000) : undefined,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: any) {
    console.error('[API Create Invoice Error]:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar fatura/recibo' }, { status: 500 });
  }
}
