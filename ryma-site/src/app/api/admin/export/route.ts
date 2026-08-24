import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetAppointments, dbGetAllPatients, dbExportFullDatabaseBackup } from '@/lib/db';
import { getServicePrice } from '@/types/admin';

function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return String(val);

  let str = String(val);
  // Neutralize CSV formula injection if string starts with =, +, -, @, \t, or \r
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'appointments';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (type === 'backup' || type === 'json') {
    const backupData = await dbExportFullDatabaseBackup();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="ryma_crm_full_backup_${dateStr}.json"`,
      },
    });
  }

  if (type === 'patients') {
    const patients = await dbGetAllPatients();
    
    let csv = 'ID;Nome Utente;Telefone;Email;Regime Cobertura;Prestador Seguro;Numero Beneficiario;Medico Assistente;Sessoes Prescritas;Sessoes Concluidas;Patologias;Data Criacao\n';
    
    patients.forEach(p => {
      const completed = p.sessions?.length ?? 0;
      const row = [
        sanitizeCsvField(p.id),
        sanitizeCsvField(p.patientName),
        sanitizeCsvField(p.phone),
        sanitizeCsvField(p.email ?? ''),
        sanitizeCsvField(p.coverageType ?? 'PARTICULAR'),
        sanitizeCsvField(p.coverageProvider ?? ''),
        sanitizeCsvField(p.coverageNumber ?? ''),
        sanitizeCsvField(p.referringDoctor ?? ''),
        sanitizeCsvField(p.totalPrescribedSessions ?? 10),
        sanitizeCsvField(completed),
        sanitizeCsvField(p.pathologyTags ?? ''),
        sanitizeCsvField(p.createdAt),
      ];
      csv += row.join(';') + '\n';
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ryma_utentes_${new Date().toISOString().split('T')[0]}.csv"`,
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

  let csv = 'ID;Data;Hora;Nome Utente;Telefone;Tratamento;Regime Cobertura;Prestador;Numero;Estado;Valor EUR;Notas\n';

  appointments.forEach(a => {
    const price = getServicePrice(a.service);
    const row = [
      sanitizeCsvField(a.id),
      sanitizeCsvField(a.date),
      sanitizeCsvField(a.startTime),
      sanitizeCsvField(a.patientName),
      sanitizeCsvField(a.phone),
      sanitizeCsvField(a.service),
      sanitizeCsvField(a.coverageType ?? 'PARTICULAR'),
      sanitizeCsvField(a.coverageProvider ?? ''),
      sanitizeCsvField(a.coverageNumber ?? ''),
      sanitizeCsvField(a.status),
      sanitizeCsvField(price),
      sanitizeCsvField(a.notes ?? ''),
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
