import { Invoice, calculateVatBreakdown } from '@/types/admin';
import { SITE } from '@/lib/site';

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a standalone, pristine HTML document for an official Portuguese Medical Invoice / Receipt.
 * Designed for perfect A4 vector rendering with zero background bleed-through.
 */
export function generateInvoiceHtml(invoice: Invoice): string {
  const isPaid = invoice.paymentStatus === 'PAID';
  const issueDate = invoice.createdAt ? invoice.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
  const paidDate = invoice.paidAt ? invoice.paidAt.split('T')[0] : issueDate;

  const totalAmount = Number(invoice.amount) || 0;
  const { vatRate, vatAmount, incidence, isExempt } = calculateVatBreakdown(totalAmount, invoice.vatRate);

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(invoice.invoiceNumber)} - ${escapeHtml(invoice.patientName)} - Digital Clínica</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-container {
      max-width: 100%;
      margin: 0 auto;
      background: #FFFFFF;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0F172A;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .clinic-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .logo-badge {
      width: 32px;
      height: 32px;
      background: #1A1412;
      color: #C49A3C;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
    .clinic-title {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
    }
    .clinic-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
    }
    .clinic-address {
      font-size: 10px;
      color: #64748B;
      margin-top: 2px;
    }
    .clinic-identifiers {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 9.5px;
      color: #334155;
      margin-top: 6px;
      font-family: 'Courier New', Courier, monospace;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 800;
      font-size: 13px;
      color: #0F172A;
      margin-bottom: 4px;
    }
    .doc-type {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
    }
    .doc-dates {
      font-size: 9.5px;
      color: #64748B;
      margin-top: 4px;
      line-height: 1.4;
    }
    .recipient-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .recipient-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94A3B8;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .recipient-name {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
    }
    .recipient-detail {
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
    }
    .nif-pill {
      display: inline-block;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }
    table.items-table th {
      background: #0F172A;
      color: #FFFFFF;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      text-align: left;
    }
    table.items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 10.5px;
    }
    .service-title {
      font-weight: 700;
      color: #0F172A;
    }
    .service-sub {
      font-size: 9.5px;
      color: #64748B;
      margin-top: 2px;
    }
    .service-exemption {
      font-size: 9px;
      color: #9A7428;
      font-weight: 600;
      margin-top: 3px;
    }
    .totals-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      margin-bottom: 24px;
    }
    .legal-notice {
      max-width: 58%;
      font-size: 9px;
      color: #64748B;
      line-height: 1.45;
    }
    .legal-notice strong {
      color: #0F172A;
      text-transform: uppercase;
      font-size: 8.5px;
    }
    .totals-box {
      width: 200px;
      text-align: right;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: #475569;
      margin-bottom: 4px;
    }
    .totals-row.grand-total {
      border-top: 2px solid #0F172A;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
    }
    .stamp-signature {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 18px;
      border-top: 1px dashed #CBD5E1;
      margin-top: 18px;
    }
    .stamp-paid {
      display: inline-flex;
      align-items: center;
      border: 2px solid #16A34A;
      background: #F0FDF4;
      color: #166534;
      padding: 6px 14px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stamp-pending {
      display: inline-flex;
      align-items: center;
      border: 2px solid #F59E0B;
      background: #FFFBEB;
      color: #92400E;
      padding: 6px 14px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 10.5px;
      text-transform: uppercase;
    }
    .signature-block {
      text-align: center;
      width: 180px;
      border-top: 1px solid #475569;
      padding-top: 4px;
    }
    .signature-name {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 11px;
      color: #0F172A;
    }
    .signature-sub {
      font-size: 8.5px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="clinic-logo">
          <div class="logo-badge">DC</div>
          <span class="clinic-title">${escapeHtml(SITE.name)}</span>
        </div>
        <p class="clinic-subtitle">Clínica de Fisioterapia & Estética Médica Avançada</p>
        <p class="clinic-address">Avenida da Liberdade 120, 1250-146 Lisboa, Portugal</p>
        <div class="clinic-identifiers">
          ${SITE.clinicNif ? `<span><strong>NIF:</strong> ${escapeHtml(SITE.clinicNif)}</span>` : ''}
          ${SITE.ersRegistration ? `<span><strong>Registo ERS:</strong> ${escapeHtml(SITE.ersRegistration)}</span>` : ''}
          ${SITE.professionalLicense ? `<span><strong>Ordem Fisio:</strong> ${escapeHtml(SITE.professionalLicense)}</span>` : ''}
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-badge">${escapeHtml(invoice.invoiceNumber)}</div>
        <div class="doc-type">${isPaid ? 'Fatura-Recibo de Quitação' : 'Fatura / Aviso de Cobrança'}</div>
        <div class="doc-dates">
          <div><strong>Emissão:</strong> ${escapeHtml(issueDate)}</div>
          <div><strong>Liquidação:</strong> ${escapeHtml(paidDate)}</div>
          <div><strong>Meio:</strong> ${escapeHtml(invoice.paymentMethod)}</div>
        </div>
      </div>
    </div>

    <!-- Recipient -->
    <div class="recipient-box">
      <div>
        <div class="recipient-label">Exmo.(a) Senhor(a) (Destinatário):</div>
        <div class="recipient-name">${escapeHtml(invoice.patientName)}</div>
        <div class="recipient-detail">${escapeHtml(invoice.patientAddress || 'Lisboa, Portugal')}</div>
        <div class="recipient-detail" style="font-family: monospace;">Tel: ${escapeHtml(invoice.patientPhone)}</div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 11px; font-weight: bold;">
          NIF: <span class="nif-pill">${escapeHtml(invoice.patientNif || '999999990')}</span>
        </div>
        ${
          invoice.coverageProvider
            ? `<div style="font-size: 10px; color: #475569; margin-top: 6px;">
                <strong>Seguro / Subsistema:</strong> ${escapeHtml(invoice.coverageProvider)}
                ${invoice.coverageNumber ? `<br><span style="font-family: monospace;">Nº Beneficiário: ${escapeHtml(invoice.coverageNumber)}</span>` : ''}
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Descrição do Ato Clínico / Tratamento</th>
          <th style="text-align: center; width: 50px;">Qtd</th>
          <th style="text-align: right; width: 85px;">Preço s/ IVA</th>
          <th style="text-align: center; width: 60px;">Taxa IVA</th>
          <th style="text-align: right; width: 90px;">Total c/ IVA</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="service-title">${escapeHtml(invoice.serviceName)}</div>
            <div class="service-sub">Praticante: ${escapeHtml(invoice.practitioner || SITE.professionalName)}</div>
            ${
              invoice.vatExemptionReason
                ? `<div class="service-exemption">* ${escapeHtml(invoice.vatExemptionReason)}</div>`
                : ''
            }
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">1</td>
          <td style="text-align: right; font-family: monospace;">${incidence.toFixed(2)} €</td>
          <td style="text-align: center; font-family: monospace;">${vatRate}%</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold;">${totalAmount.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals & Legal Notice -->
    <div class="totals-section">
      <div class="legal-notice">
        <strong>Enquadramento Legal & Fiscal</strong><br>
        ${
          isExempt
            ? 'Serviço de saúde e fisioterapia isento de IVA nos termos do Artigo 9.º do Código do IVA (CIVA).'
            : `Taxa de IVA a ${vatRate}% incluída (${vatAmount.toFixed(2)} € de imposto sobre incidência tributável de ${incidence.toFixed(2)} €).`
        }<br>
        Documento processado por programa certificado. Válido para efeitos de dedução em IRS e reembolso junto de seguradoras de saúde e subsistemas (ADSE, Médis, Multicare, AdvanceCare).
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Incidência (Base Tributável):</span>
          <span style="font-family: monospace;">${incidence.toFixed(2)} €</span>
        </div>
        <div class="totals-row">
          <span>IVA (${vatRate}%):</span>
          <span style="font-family: monospace;">${vatAmount.toFixed(2)} €</span>
        </div>
        <div class="totals-row grand-total">
          <span>TOTAL:</span>
          <span style="font-family: monospace;">${totalAmount.toFixed(2)} €</span>
        </div>
      </div>
    </div>

    <!-- Stamp and Signature -->
    <div class="stamp-signature">
      <div>
        ${
          isPaid
            ? `<div class="stamp-paid">
                ✓ QUITADO / PAGO &nbsp;•&nbsp; ${escapeHtml(paidDate)}
              </div>`
            : `<div class="stamp-pending">
                ⏱ AGUARDA LIQUIDAÇÃO
              </div>`
        }
      </div>

      <div class="signature-block">
        <div class="signature-name">${escapeHtml(SITE.professionalName)}</div>
        <div class="signature-sub">Fisioterapeuta Licenciado</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;
}

/**
 * Print or download an invoice PDF in complete isolation.
 * Uses an invisible iframe to avoid any dashboard/background page bleed-through.
 */
export function printInvoicePdf(invoice: Invoice) {
  const html = generateInvoiceHtml(invoice);

  // Create or reuse hidden iframe
  let iframe = document.getElementById('invoice-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  } else {
    // Fallback: open popup window
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
}
