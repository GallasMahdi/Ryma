import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbCreatePrescription, dbGetPrescriptionsByPatientPhone } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── GET /api/admin/prescriptions ───────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const patientPhone = searchParams.get('patientPhone');

  if (!patientPhone) {
    return NextResponse.json({ error: 'patientPhone query parameter is required' }, { status: 400 });
  }

  const prescriptions = await dbGetPrescriptionsByPatientPhone(patientPhone);
  return NextResponse.json({ prescriptions }, { status: 200 });
}

// ─── POST /api/admin/prescriptions ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { patientPhone, patientName, items } = body;

  if (!patientPhone || !String(patientPhone).trim()) {
    return NextResponse.json({ error: 'Telefone do utente é obrigatório' }, { status: 400 });
  }
  if (!patientName || !String(patientName).trim()) {
    return NextResponse.json({ error: 'Nome do utente é obrigatório' }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Selecione pelo menos uma recomendação ou produto' }, { status: 400 });
  }

  const prescription = await dbCreatePrescription({
    patientId: body.patientId,
    patientPhone: String(patientPhone).trim(),
    patientName: String(patientName).trim(),
    practitioner: body.practitioner,
    diagnosisOrGoal: body.diagnosisOrGoal,
    items: items.map(it => ({
      category: it.category || 'care_product',
      title: String(it.title || '').trim(),
      instructions: String(it.instructions || '').trim(),
      productRef: it.productRef,
    })),
    generalNotes: body.generalNotes,
  });

  return NextResponse.json({ prescription }, { status: 201 });
}
