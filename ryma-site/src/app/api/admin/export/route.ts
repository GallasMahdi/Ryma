import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetAppointments, dbGetAllPatients } from '@/lib/db';
import { getServicePrice } from '@/types/admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'appointments';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (type === 'patients') {
    const patients = await dbGetAllPatients();
    
    let csv = 'ID;Nom Patient;Telephone;Email;Prise en charge CNAM;Numero CNAM;Medecin Traitant;Seances Prescrites;Deficit/Effetuées;Pathologies;Date Creation\n';
    
    patients.forEach(p => {
      const completed = p.sessions?.length ?? 0;
      const row = [
        p.id,
        `"${p.patientName.replace(/"/g, '""')}"`,
        `"${p.phone}"`,
        `"${p.email ?? ''}"`,
        p.cnamStatus ?? 'NON',
        `"${p.cnamNumber ?? ''}"`,
        `"${p.referringDoctor ?? ''}"`,
        p.totalPrescribedSessions ?? 10,
        completed,
        `"${(p.pathologyTags ?? '').replace(/"/g, '""')}"`,
        p.createdAt,
      ];
      csv += row.join(';') + '\n';
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ryma_patients_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // Default: Appointments & Financial Export
  let appointments = await dbGetAppointments();

  if (startDate) {
    appointments = appointments.filter(a => a.date >= startDate);
  }
  if (endDate) {
    appointments = appointments.filter(a => a.date <= endDate);
  }

  let csv = 'ID;Date;Heure;Nom Patient;Telephone;Service;Statut;Montant TND;Notes\n';

  appointments.forEach(a => {
    const price = getServicePrice(a.service);
    const row = [
      a.id,
      a.date,
      a.startTime,
      `"${a.patientName.replace(/"/g, '""')}"`,
      `"${a.phone}"`,
      `"${a.service}"`,
      a.status,
      price,
      `"${(a.notes ?? '').replace(/"/g, '""')}"`,
    ];
    csv += row.join(';') + '\n';
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ryma_export_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
