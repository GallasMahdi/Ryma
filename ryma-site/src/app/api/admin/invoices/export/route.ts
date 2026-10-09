import { exportLabel, exportHeader } from '@/lib/export-i18n';
import { requestLanguage } from '@/lib/api-i18n';
import { localizeApiError } from '@/lib/api-i18n';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import { dbGetInvoices, dbAssertInvoiceAmountsReviewed, DocumentError } from '@/lib/db';
import { invoiceFilters } from '@/lib/admin-validation';
import { invoiceDisplayTotals } from '@/lib/invoice-display';

function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return String(val);

  let str = String(val);
  if (/^\s*[=\+\-@\t\r]/.test(str)) {
    str = `'${str.trimStart()}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const lang = requestLanguage(request);
  // Block top-level cross-site GET link hijacking for billing CSV downloads
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: localizeApiError('Cross-site request forbidden', request) }, { status: 403 });
  }

  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;

  let filters;
  try { filters=invoiceFilters(searchParams); } catch { return NextResponse.json({error:localizeApiError('Invalid invoice filters', request)},{status:422}); }
  try { await dbAssertInvoiceAmountsReviewed(); } catch(error) { if(error instanceof DocumentError)return NextResponse.json({error:localizeApiError(error.message, request)},{status:409});throw error; }
  const invoices = await dbGetInvoices(filters);

  let csv = exportHeader('Numero Documento;Data Emissao;Nome Utente;NIF;Telefone;Email;Servico;Profissional;Incidencia Base EUR;Taxa IVA;Valor IVA EUR;Valor Total EUR;Motivo Isencao;Metodo Pagamento;Estado Pagamento;Data Pagamento;Seguro / Mutuelle;Numero Beneficiario;Notas;Numero Sessoes;Datas Sessoes;Referencia Fatura Fiscal;Tipo Documento\n', lang);

  invoices.forEach(inv => {
    const { incidence, vatAmount, vatRates, quantity, lines, totalAmount } = invoiceDisplayTotals(inv);
    const row = [
      sanitizeCsvField(inv.invoiceNumber),
      sanitizeCsvField(inv.createdAt.split('T')[0]),
      sanitizeCsvField(inv.patientName),
      sanitizeCsvField(inv.patientNif),
      sanitizeCsvField(inv.patientPhone),
      sanitizeCsvField(inv.patientEmail ?? ''),
      sanitizeCsvField(inv.serviceName),
      sanitizeCsvField(inv.practitioner),
      sanitizeCsvField(incidence.toFixed(2)),
      sanitizeCsvField(`${vatRates}%`),
      sanitizeCsvField(vatAmount.toFixed(2)),
      sanitizeCsvField(totalAmount.toFixed(2)),
      sanitizeCsvField([...new Set(lines.map(line => line.vatExemptionReason).filter(Boolean))].join(' | ')),
      sanitizeCsvField(exportLabel(inv.paymentMethod, lang)),
      sanitizeCsvField(exportLabel(inv.paymentStatus, lang)),
      sanitizeCsvField(inv.paidAt ? inv.paidAt.split('T')[0] : ''),
      sanitizeCsvField(inv.coverageProvider || inv.coverageType),
      sanitizeCsvField(inv.coverageNumber ?? ''),
      sanitizeCsvField(inv.notes ?? ''),
      sanitizeCsvField(quantity),
      sanitizeCsvField(lines.flatMap(line => line.dates).join(' | ')),
      sanitizeCsvField(inv.externalReference ?? ''),
      sanitizeCsvField(exportLabel('INTERNO - SEM VALOR FISCAL',lang)),
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
