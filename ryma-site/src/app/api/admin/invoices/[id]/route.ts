import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
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
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updated = await dbUpdateInvoice(id, {
    patientName: body.patientName !== undefined ? String(body.patientName).trim() : undefined,
    patientNif: body.patientNif !== undefined ? String(body.patientNif).trim() : undefined,
    patientEmail: body.patientEmail !== undefined ? String(body.patientEmail).trim() : undefined,
    patientAddress: body.patientAddress !== undefined ? String(body.patientAddress).trim() : undefined,
    paymentMethod: body.paymentMethod,
    paymentStatus: body.paymentStatus,
    coverageType: body.coverageType,
    coverageProvider: body.coverageProvider,
    coverageNumber: body.coverageNumber,
    notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
  });

  return NextResponse.json({ invoice: updated }, { status: 200 });
}

// ─── DELETE /api/admin/invoices/[id] ────────────────────────────────────────
export async function DELETE(
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

  await dbDeleteInvoice(id);
  return NextResponse.json({ success: true, message: 'Recibo anulado com sucesso' }, { status: 200 });
}
