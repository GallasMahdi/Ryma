import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetInvoices } from '@/lib/db';

function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return String(val);

  let str = String(val);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const status   = searchParams.get('status') ?? undefined;
  const search   = searchParams.get('search') ?? undefined;
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo   = searchParams.get('dateTo') ?? undefined;

  const invoices = await dbGetInvoices({ status, search, dateFrom, dateTo });

  let csv = 'Numero Fatura-Recibo;Data Emissao;Nome Utente;NIF;Telefone;Email;Servico;Valor Total EUR;Taxa IVA;Motivo Isencao;Metodo Pagamento;Estado Pagamento;Data Pagamento;Seguro / Mutuelle;Numero Beneficiario;Notas\n';

  invoices.forEach(inv => {
    const row = [
      sanitizeCsvField(inv.invoiceNumber),
      sanitizeCsvField(inv.createdAt.split('T')[0]),
      sanitizeCsvField(inv.patientName),
      sanitizeCsvField(inv.patientNif),
      sanitizeCsvField(inv.patientPhone),
      sanitizeCsvField(inv.patientEmail ?? ''),
      sanitizeCsvField(inv.serviceName),
      sanitizeCsvField(inv.amount),
      sanitizeCsvField(`${inv.vatRate}%`),
      sanitizeCsvField(inv.vatExemptionReason ?? ''),
      sanitizeCsvField(inv.paymentMethod),
      sanitizeCsvField(inv.paymentStatus),
      sanitizeCsvField(inv.paidAt ? inv.paidAt.split('T')[0] : ''),
      sanitizeCsvField(inv.coverageProvider || inv.coverageType),
      sanitizeCsvField(inv.coverageNumber ?? ''),
      sanitizeCsvField(inv.notes ?? ''),
    ];
    csv += row.join(';') + '\n';
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="faturacao_digital_clinica_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
