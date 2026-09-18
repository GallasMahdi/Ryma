import { isJsonObject } from '@/lib/admin-validation';
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
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
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

  if (items.length > 50 || items.some(it => !isJsonObject(it) || typeof it.title !== 'string' || !it.title.trim() || it.title.length > 200 || typeof it.instructions !== 'string' || it.instructions.length > 2000 || (it.category !== undefined && !['care_product', 'ergonomic_equipment', 'lifestyle_habit'].includes(String(it.category))))) return NextResponse.json({ error: 'Invalid prescription items' }, { status: 422 });
  const prescription = await dbCreatePrescription({
    patientId: typeof body.patientId === 'string' ? body.patientId.trim().slice(0, 2000) : undefined,
    patientPhone: String(patientPhone).trim(),
    patientName: String(patientName).trim(),
    practitioner: typeof body.practitioner === 'string' ? body.practitioner.trim().slice(0, 2000) : undefined,
    diagnosisOrGoal: typeof body.diagnosisOrGoal === 'string' ? body.diagnosisOrGoal.trim().slice(0, 2000) : undefined,
    items: items.map(it => ({
      category: it.category || 'care_product',
      title: String(it.title || '').trim(),
      instructions: String(it.instructions || '').trim(),
      productRef: it.productRef,
    })),
    generalNotes: typeof body.generalNotes === 'string' ? body.generalNotes.trim().slice(0, 2000) : undefined,
  });

  return NextResponse.json({ prescription }, { status: 201 });
}
