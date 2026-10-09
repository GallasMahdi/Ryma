import { localizeApiError } from '@/lib/api-i18n';
import { isJsonObject, pageNumber, patientProfileError } from '@/lib/admin-validation';
import { getLisbonDateTime } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireOwnerAnalytics } from '@/lib/requireAdmin';
import {
  dbGetAllPatients,
  dbGetPatientDirectory,
  dbGetPatientByPhone,
  dbGetPatientById,
  dbGetPatientNote,
  dbGetPatientsPaginated,
  dbGetAllPatientNotes,
  dbUpsertPatient,
  dbDeletePatientRecord,
  PatientWriteError,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { validateAndNormalizePhone } from '@/lib/phone';

// GET /api/admin/patients — list all or paginated patients & legacy notes
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const url = request.nextUrl;
  const id = url.searchParams.get('id');
  if (id) {
    const patient = await dbGetPatientById(id);
    if (!patient) return NextResponse.json({error:localizeApiError('Patient not found', request)}, {status:404});
    return NextResponse.json({patient, note:{patientId:patient.id,phone:patient.phone,patientName:patient.patientName,content:patient.medicalHistory,tags:patient.pathologyTags,updatedAt:patient.updatedAt}}, {headers:{'Cache-Control':'no-store'}});
  }
  const phone = url.searchParams.get('phone');
  if (phone) {
    const [patient, note] = await Promise.all([dbGetPatientByPhone(phone), dbGetPatientNote(phone)]);
    return NextResponse.json({patient, note:note ? {...note,patientId:patient?.id} : null}, {headers: {'Cache-Control': 'no-store'}});
  }
  if (url.searchParams.get('directory') === '1') {
    const result = await dbGetPatientDirectory({page: pageNumber(url.searchParams.get('page'), 1), limit: pageNumber(url.searchParams.get('limit'), 10, 100), search: url.searchParams.get('search') || '', coverageType: url.searchParams.get('coverage') || 'ALL'});
    return NextResponse.json(result, {headers: {'Cache-Control': 'no-store'}});
  }
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
    if (!isJsonObject(body)) return NextResponse.json({ error: localizeApiError('JSON object required', request) }, { status: 400 });
  } catch {
    return NextResponse.json({ error: localizeApiError('Invalid JSON body', request) }, { status: 400 });
  }

  const rawPhone = body.phone;
  const profileError=patientProfileError(body,getLisbonDateTime().todayStr);
  if (profileError) return NextResponse.json({error:localizeApiError(profileError, request)},{status:422});
  const patientName = String(body.patientName ?? '').trim().slice(0, 100);

  if (!rawPhone || !patientName) {
    return NextResponse.json({ error: localizeApiError('Nome e telefone são obrigatórios', request) }, { status: 422 });
  }

  if (/[<>]|javascript:|data:/i.test(patientName)) {
    return NextResponse.json({ error: localizeApiError('O nome do utente contém caracteres ou formatação inválida.', request) }, { status: 422 });
  }
  if (/^[=\+\-@\t\r]/.test(patientName.trim())) {
    return NextResponse.json({ error: localizeApiError('O nome do utente não pode iniciar com símbolos de fórmula (=, @, +, -).', request) }, { status: 422 });
  }

  const phoneValidation = validateAndNormalizePhone(rawPhone);
  if (!phoneValidation.isValid) {
    return NextResponse.json({ error: localizeApiError(phoneValidation.error, request), errorCode: phoneValidation.errorCode }, { status: 422 });
  }
  const phone = phoneValidation.normalized;
  let legacyPhone: string | undefined;
  if (body.legacyPhone) {
    const validation = validateAndNormalizePhone(body.legacyPhone);
    if (!validation.isValid) return NextResponse.json({error:localizeApiError(validation.error, request)}, {status:422});
    legacyPhone = validation.normalized;
  }

  // Validate optional email
  let email: string | null | undefined = body.email === undefined ? undefined : null;
  if (body.email && typeof body.email === 'string' && body.email.trim().length > 0) {
    const trimmedEmail = body.email.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      email = trimmedEmail;
    } else {
      return NextResponse.json({ error: localizeApiError('Endereço de email inválido.', request) }, { status: 422 });
    }
  }

  const parsedSessions = Number(body.totalPrescribedSessions);
  const totalPrescribedSessions = body.totalPrescribedSessions === undefined ? undefined : !isNaN(parsedSessions) && parsedSessions > 0
    ? Math.min(100, Math.max(1, Math.round(parsedSessions)))
    : 10;

  let patient;
  try { patient = await dbUpsertPatient({
    id: body.id ? String(body.id) : undefined,
    legacyPhone,
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
  }); } catch (error) {
    if (error instanceof PatientWriteError) return NextResponse.json({error:localizeApiError(error.message, request),code:error.code}, {status:error.code==='PATIENT_NOT_FOUND'?404:409});
    throw error;
  }

  return NextResponse.json({ patient, note: { patientId:patient.id, phone: patient.phone, patientName: patient.patientName, content: patient.medicalHistory, tags: patient.pathologyTags, updatedAt: patient.updatedAt } });
}

// DELETE /api/admin/patients?id=xxx OR ?phone=xxx
export async function DELETE(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const id = request.nextUrl.searchParams.get('id');
  const phone = request.nextUrl.searchParams.get('phone');
  const target = id || phone;

  if (!target) {
    return NextResponse.json({ error: localizeApiError('ID ou téléphone requises', request) }, { status: 422 });
  }

  try { await dbDeletePatientRecord(target); } catch (error) {
    if (error instanceof PatientWriteError) return NextResponse.json({error:localizeApiError(error.message, request),code:error.code},{status:409});
    throw error;
  }
  return NextResponse.json({ ok: true });
}
