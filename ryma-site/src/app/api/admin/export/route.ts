import { getTreatments, validateTreatment, treatmentFromRow } from '@/lib/treatments';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import { dbGetAppointments, dbGetAllPatients, dbGetInvoices, dbExportFullDatabaseBackup, dbAssertInvoiceAmountsReviewed, DocumentError } from '@/lib/db';
import { getServicePrice, getServicePole } from '@/types/admin';
import { invoiceFilters, isCalendarDate } from '@/lib/admin-validation';
import { completedSessions } from '@/lib/clinical';

function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return String(val);

  let str = String(val);
  // Neutralize CSV formula injection even if preceded by whitespace, tabs, or control chars
  if (/^\s*[=\+\-@\t\r]/.test(str)) {
    str = `'${str.trimStart()}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const catalogue=await getTreatments();
  // Block top-level cross-site GET link hijacking for database/CSV downloads
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Cross-site request forbidden' }, { status: 403 });
  }

  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'appointments';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if ((startDate && !isCalendarDate(startDate)) || (endDate && !isCalendarDate(endDate)) || (startDate && endDate && startDate>endDate)) return NextResponse.json({error:'Invalid export dates'},{status:422});

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
      const completed = completedSessions(p.sessions).length;
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

  if (type === 'invoices') {
    let filters;
    try {filters=invoiceFilters(searchParams);}catch{return NextResponse.json({error:'Invalid invoice filters'},{status:422});}
    try {await dbAssertInvoiceAmountsReviewed();}catch(error){if(error instanceof DocumentError)return NextResponse.json({error:error.message},{status:409});throw error;}
    const invoices = await dbGetInvoices(filters);
    let csv = 'Numero Fatura;Data;Nome Utente;NIF;Telefone;Servico;Profissional;Valor EUR;Metodo Pagamento;Estado;Data Pagamento\n';
    invoices.forEach(inv => {
      const row = [
        sanitizeCsvField(inv.invoiceNumber),
        sanitizeCsvField(inv.createdAt),
        sanitizeCsvField(inv.patientName),
        sanitizeCsvField(inv.patientNif),
        sanitizeCsvField(inv.patientPhone),
        sanitizeCsvField(inv.serviceName),
        sanitizeCsvField(inv.practitioner),
        sanitizeCsvField(inv.amount.toFixed(2)),
        sanitizeCsvField(inv.paymentMethod),
        sanitizeCsvField(inv.paymentStatus),
        sanitizeCsvField(inv.paidAt ?? ''),
      ];
      csv += row.join(';') + '\n';
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ryma_faturas_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  // Default: Appointments & Financial Export
  let appointments = await dbGetAppointments({practitionerId:searchParams.get('practitionerId')||undefined});
  const pole=searchParams.get('pole');
  if (pole && pole!=='all') appointments=appointments.filter(a=>(a.servicePole as 'kinesitherapie'|'minceur'|'bilan' || getServicePole(a.service, catalogue))===pole);

  if (startDate) {
    appointments = appointments.filter(a => a.date >= startDate);
  }
  if (endDate) {
    appointments = appointments.filter(a => a.date <= endDate);
  }

  let csv = 'ID;Data;Hora;Nome Utente;Telefone;Tratamento;Profissional;Duracao Min;Regime Cobertura;Prestador;Numero;Estado;Valor EUR;Notas\n';

  appointments.forEach(a => {
    const price = (a.servicePriceCents!=null?a.servicePriceCents/100:getServicePrice(a.service, catalogue));
    const row = [
      sanitizeCsvField(a.id),
      sanitizeCsvField(a.date),
      sanitizeCsvField(a.startTime),
      sanitizeCsvField(a.patientName),
      sanitizeCsvField(a.phone),
      sanitizeCsvField(a.service),
      sanitizeCsvField(a.practitionerName),
      sanitizeCsvField(a.durationMinutes),
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
