import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
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
    const page = Math.max(1, parseInt(pageParam || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '10', 10)));

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
  let email: string | null = null;
  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const trimmedEmail = body.email.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      email = trimmedEmail;
    } else {
      return NextResponse.json({ error: 'Endereço de email inválido.' }, { status: 422 });
    }
  }

  const parsedSessions = Number(body.totalPrescribedSessions);
  const totalPrescribedSessions = !isNaN(parsedSessions) && parsedSessions > 0
    ? Math.min(100, Math.max(1, Math.round(parsedSessions)))
    : 10;

  const patient = await dbUpsertPatient({
    id: body.id ? String(body.id) : undefined,
    patientName,
    phone,
    email,
    gender: body.gender ? String(body.gender) : null,
    dob: body.dob ? String(body.dob) : null,
    coverageType: body.coverageType ? String(body.coverageType) : (body.cnamStatus ? (body.cnamStatus === 'OUI' ? 'INSURANCE' : body.cnamStatus === 'EN_COURS' ? 'ADSE' : 'PARTICULAR') : 'PARTICULAR'),
    coverageProvider: body.coverageProvider ? String(body.coverageProvider) : null,
    coverageNumber: body.coverageNumber ? String(body.coverageNumber) : (body.cnamNumber ? String(body.cnamNumber) : null),
    referringDoctor: body.referringDoctor ? String(body.referringDoctor) : null,
    pathologyTags: body.pathologyTags ? String(body.pathologyTags) : String(body.tags ?? ''),
    medicalHistory: body.medicalHistory ? String(body.medicalHistory) : String(body.content ?? ''),
    totalPrescribedSessions,
  });

  return NextResponse.json({ patient, note: { phone: patient.phone, patientName: patient.patientName, content: patient.medicalHistory, tags: patient.pathologyTags, updatedAt: patient.updatedAt } });
}

// DELETE /api/admin/patients?id=xxx OR ?phone=xxx
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
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