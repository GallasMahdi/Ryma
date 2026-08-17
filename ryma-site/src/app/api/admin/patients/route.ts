import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  dbGetAllPatients,
  dbGetAllPatientNotes,
  dbUpsertPatient,
  dbDeletePatientRecord,
} from '@/lib/db';

// GET /api/admin/patients — list all structured patients & legacy notes
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const patients = await dbGetAllPatients();
  const notes = await dbGetAllPatientNotes();
  return NextResponse.json({ patients, notes });
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

  const phone = String(body.phone ?? '').trim().slice(0, 30);
  const patientName = String(body.patientName ?? '').trim().slice(0, 100);

  if (!phone || !patientName) {
    return NextResponse.json({ error: 'Nom et téléphone requis' }, { status: 422 });
  }

  const parsedSessions = Number(body.totalPrescribedSessions);
  const totalPrescribedSessions = !isNaN(parsedSessions) && parsedSessions > 0 ? parsedSessions : 10;

  const patient = await dbUpsertPatient({
    id: body.id ? String(body.id) : undefined,
    patientName,
    phone,
    email: body.email ? String(body.email).trim() : null,
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