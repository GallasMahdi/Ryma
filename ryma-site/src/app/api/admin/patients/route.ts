import { isJsonObject, pageNumber } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireOwnerAnalytics } from '@/lib/requireAdmin';
import {
  dbGetAllPatients,
  dbGetPatientsPaginated,
  dbGetAllPatientNotes,
  dbUpsertPatient,
  dbDeletePatientRecord,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { validateAndNormalizePhone } from '@/lib/phone';

// GET /api/admin/patients — list all or paginated patients & legacy notes
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const url = request.nextUrl;
  const pageParam = url.searchParams.get('page');
  const limitParam = url.searchParams.get('limit');
  const searchParam = url.searchParams.get('search') || url.searchParams.get('q') || '';
  const coverageParam = url.searchParams.get('coverage') || 'ALL';

  if (pageParam !== null || limitParam !== null || searchParam || coverageParam !== 'ALL') {
    const page = pageNumber(pageParam, 1);
    const limit = pageNumber(limitParam, 10, 100);

    const result = await dbGetPatientsPaginated({
      page,
      limit,
      search: searchParam,
      coverageType: coverageParam,
    });

    const notes = await dbGetAllPatientNotes();

    return NextResponse.json(
      {
        patients: result.patients,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        notes,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
      }
    );
  }

  // Default: returns all patients (compatible with legacy callers)
  const patients = await dbGetAllPatients();
  const notes = await dbGetAllPatientNotes();
  return NextResponse.json(
    {
      patients,
      total: patients.length,
      page: 1,
      limit: patients.length,
      totalPages: 1,
      notes,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}

// POST /api/admin/patients — upsert a structured patient record
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!isJsonObject(body)) return NextResponse.json({ error: 'JSON object required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawPhone = String(body.phone ?? '').trim().slice(0, 30);
  const patientName = String(body.patientName ?? '').trim().slice(0, 100);

  if (!rawPhone || !patientName) {
    return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 422 });
  }

  if (/[<>]|javascript:|data:/i.test(patientName)) {
    return NextResponse.json({ error: 'O nome do utente contém caracteres ou formatação inválida.' }, { status: 422 });
  }
  if (/^[=\+\-@\t\r]/.test(patientName.trim())) {
    return NextResponse.json({ error: 'O nome do utente não pode iniciar com símbolos de fórmula (=, @, +, -).' }, { status: 422 });
  }

  const phoneValidation = validateAndNormalizePhone(rawPhone);
  const phone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone.replace(/[^\d+]/g, '');

  if (!phone || phone.replace(/\D/g, '').length < 6) {
    return NextResponse.json({ error: 'Número de telefone inválido.' }, { status: 422 });
  }

  // Validate optional email
  let email: string | null | undefined = body.email === undefined ? undefined : null;
  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const trimmedEmail = body.email.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      email = trimmedEmail;
    } else {
      return NextResponse.json({ error: 'Endereço de email inválido.' }, { status: 422 });
    }
  }

  const parsedSessions = Number(body.totalPrescribedSessions);
  const totalPrescribedSessions = body.totalPrescribedSessions === undefined ? undefined : !isNaN(parsedSessions) && parsedSessions > 0
    ? Math.min(100, Math.max(1, Math.round(parsedSessions)))
    : 10;

  const patient = await dbUpsertPatient({
    id: body.id ? String(body.id) : undefined,
    patientName,
    phone,
    email,
    gender: body.gender === undefined ? undefined : body.gender ? String(body.gender) : null,
    dob: body.dob === undefined ? undefined : body.dob ? String(body.dob) : null,
    coverageType: body.coverageType === undefined && body.cnamStatus === undefined ? undefined : body.coverageType ? String(body.coverageType) : (body.cnamStatus ? (body.cnamStatus === 'OUI' ? 'INSURANCE' : body.cnamStatus === 'EN_COURS' ? 'ADSE' : 'PARTICULAR') : 'PARTICULAR'),
    coverageProvider: body.coverageProvider === undefined ? undefined : body.coverageProvider ? String(body.coverageProvider) : null,
    coverageNumber: body.coverageNumber === undefined && body.cnamNumber === undefined ? undefined : body.coverageNumber ? String(body.coverageNumber) : (body.cnamNumber ? String(body.cnamNumber) : null),
    referringDoctor: body.referringDoctor === undefined ? undefined : body.referringDoctor ? String(body.referringDoctor) : null,
    pathologyTags: body.pathologyTags === undefined && body.tags === undefined ? undefined : String(body.pathologyTags ?? body.tags ?? ''),
    medicalHistory: body.medicalHistory === undefined && body.content === undefined ? undefined : String(body.medicalHistory ?? body.content ?? ''),
    totalPrescribedSessions,
  });

  return NextResponse.json({ patient, note: { phone: patient.phone, patientName: patient.patientName, content: patient.medicalHistory, tags: patient.pathologyTags, updatedAt: patient.updatedAt } });
}

// DELETE /api/admin/patients?id=xxx OR ?phone=xxx
export async function DELETE(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const id = request.nextUrl.searchParams.get('id');
  const phone = request.nextUrl.searchParams.get('phone');
  const target = id || phone;

  if (!target) {
    return NextResponse.json({ error: 'ID ou téléphone requises' }, { status: 422 });
  }

  await dbDeletePatientRecord(target);
  return NextResponse.json({ ok: true });
}