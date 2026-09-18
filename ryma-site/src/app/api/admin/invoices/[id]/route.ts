import type { PaymentMethod, InvoicePaymentStatus, CoverageType } from '@/types/admin';
import { isJsonObject, invoiceUpdateError } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireOwnerAnalytics } from '@/lib/requireAdmin';
import {
  dbGetInvoiceById,
  dbUpdateInvoice,
  dbDeleteInvoice,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/invoices/[id] ───────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  const invoice = await dbGetInvoiceById(id);
  if (!invoice) {
    return NextResponse.json({ error: 'Recibo não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ invoice }, { status: 200 });
}

// ─── PUT /api/admin/invoices/[id] ───────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  const existing = await dbGetInvoiceById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Recibo não encontrado' }, { status: 404 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationError = invoiceUpdateError(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 422 });
  if (existing.paymentStatus === 'CANCELLED') return NextResponse.json({ error: 'Cancelled invoices cannot be edited' }, { status: 409 });

  const updated = await dbUpdateInvoice(id, {
    patientName: body.patientName !== undefined ? String(body.patientName).trim() : undefined,
    patientNif: body.patientNif !== undefined ? String(body.patientNif).trim() : undefined,
    patientEmail: body.patientEmail !== undefined ? String(body.patientEmail).trim() : undefined,
    patientAddress: body.patientAddress !== undefined ? String(body.patientAddress).trim() : undefined,
    paymentMethod: body.paymentMethod as PaymentMethod | undefined,
    paymentStatus: body.paymentStatus as InvoicePaymentStatus | undefined,
    coverageType: body.coverageType as CoverageType | undefined,
    coverageProvider: body.coverageProvider as string | undefined,
    coverageNumber: body.coverageNumber as string | undefined,
    notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
  });

  return NextResponse.json({ invoice: updated }, { status: 200 });
}

// ─── DELETE /api/admin/invoices/[id] ────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const { id } = await params;
  const existing = await dbGetInvoiceById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Recibo não encontrado' }, { status: 404 });
  }

  await dbDeleteInvoice(id);
  return NextResponse.json({ success: true, message: 'Recibo anulado com sucesso' }, { status: 200 });
}
