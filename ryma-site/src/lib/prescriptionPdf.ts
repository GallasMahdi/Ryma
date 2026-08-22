import { PatientPrescription } from '@/types/admin';
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
 * Generate a standalone, pristine HTML document for an official Recommendation / Prescription Pad.
 * Formatted for A4 portrait printing without any background app bleed-through.
 */
export function generatePrescriptionHtml(prescription: PatientPrescription): string {
  const careProducts = prescription.items.filter(it => it.category === 'care_product');
  const equipment = prescription.items.filter(it => it.category === 'ergonomic_equipment');
  const habits = prescription.items.filter(it => it.category === 'lifestyle_habit');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Recomendações Clínicas - ${escapeHtml(prescription.patientName)} - Digital Clínica</title>
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
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .container {
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
      margin-bottom: 16px;
    }
    .clinic-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
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
    }
    .clinic-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #475569;
    }
    .clinic-address {
      font-size: 9.5px;
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
    .doc-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
    }
    .doc-subtitle {
      font-size: 10px;
      color: #C49A3C;
      font-weight: 700;
      margin-top: 2px;
    }
    .doc-date {
      font-size: 10px;
      color: #64748B;
      margin-top: 4px;
    }
    .patient-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .patient-name {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
    }
    .patient-phone {
      font-size: 10px;
      color: #64748B;
      font-family: monospace;
    }
    .category-section {
      margin-bottom: 16px;
    }
    .category-header {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F172A;
      background: #F1F5F9;
      border-left: 4px solid #C49A3C;
      padding: 6px 10px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    }
    .item-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }
    .item-title {
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }
    .item-instructions {
      font-size: 10px;
      color: #334155;
      margin-top: 3px;
    }
    .item-instructions strong {
      color: #0F172A;
    }
    .notes-box {
      background: #FAF8F5;
      border: 1px solid #E8E2D8;
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 10px;
      color: #475569;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 20px;
      border-top: 1px dashed #CBD5E1;
      margin-top: 20px;
    }
    .footer-note {
      max-width: 60%;
      font-size: 8.5px;
      color: #94A3B8;
      line-height: 1.4;
    }
    .signature-block {
      text-align: center;
      width: 190px;
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
  <div class="container">
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
          <span><strong>NIF:</strong> ${escapeHtml(SITE.clinicNif || '518 923 456')}</span>
          <span><strong>Registo ERS:</strong> ${escapeHtml(SITE.ersRegistration || 'E164321')}</span>
          <span><strong>Ordem Fisio:</strong> ${escapeHtml(SITE.professionalLicense || 'C-054321')}</span>
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-title">Recomendações Clínicas</div>
        <div class="doc-subtitle">Cuidados & Material Domiciliário</div>
        <div class="doc-date">Data: <strong>${escapeHtml(prescription.date)}</strong></div>
      </div>
    </div>

    <!-- Patient Details -->
    <div class="patient-box">
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94A3B8;">Utente:</div>
        <div class="patient-name">${escapeHtml(prescription.patientName)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94A3B8;">Contacto:</div>
        <div class="patient-phone">${escapeHtml(prescription.patientPhone)}</div>
      </div>
    </div>

    ${
      prescription.diagnosisOrGoal
        ? `<div style="margin-bottom: 14px; font-size: 10.5px; color: #334155;">
            <strong>Objetivo Clínico / Enquadramento:</strong> ${escapeHtml(prescription.diagnosisOrGoal)}
          </div>`
        : ''
    }

    <!-- 1. Cuidados & Produtos Tópicos -->
    ${
      careProducts.length > 0
        ? `<div class="category-section">
            <div class="category-header">🧴 1. Produtos & Cuidados Tópicos Recomendados</div>
            ${careProducts
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>Posologia / Aplicação:</strong> ${escapeHtml(it.instructions)}</div>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }

    <!-- 2. Material Ergonómico & Reabilitação -->
    ${
      equipment.length > 0
        ? `<div class="category-section">
            <div class="category-header">🧘 2. Material Ergonómico & Auto-Reabilitação</div>
            ${equipment
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>Utilização Recomendada:</strong> ${escapeHtml(it.instructions)}</div>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }

    <!-- 3. Hábitos & Ergonomia de Vida -->
    ${
      habits.length > 0
        ? `<div class="category-section">
            <div class="category-header">💡 3. Hábitos & Higiene Postural de Vida</div>
            ${habits
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>Conselho Clínico:</strong> ${escapeHtml(it.instructions)}</div>
              </div>`
              )
              .join('')}
          </div>`
        : ''
    }

    <!-- Notes -->
    ${
      prescription.generalNotes
        ? `<div class="notes-box">
            <strong>Observações Adicionais do Fisioterapeuta:</strong><br>
            ${escapeHtml(prescription.generalNotes).replace(/\n/g, '<br>')}
          </div>`
        : ''
    }

    <!-- Footer & Signatures -->
    <div class="footer">
      <div class="footer-note">
        Este documento contém orientações terapêuticas personalizadas para apoio e continuidade do plano de tratamento em domicílio. Em caso de dor persistente ou dúvida, contacte a equipa clínica.
      </div>
      <div class="signature-block">
        <div class="signature-name">${escapeHtml(prescription.practitioner || SITE.professionalName)}</div>
        <div class="signature-sub">Fisioterapeuta Licenciado / Assinatura</div>
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
 * Print or export the prescription pad using an isolated iframe.
 */
export function printPrescriptionPdf(prescription: PatientPrescription) {
  const html = generatePrescriptionHtml(prescription);

  let iframe = document.getElementById('prescription-print-frame') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'prescription-print-frame';
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
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  }
}

/**
 * Build preformatted WhatsApp message with the personalized recommendations.
 */
export function formatPrescriptionWhatsAppMessage(prescription: PatientPrescription): string {
  const careProducts = prescription.items.filter(it => it.category === 'care_product');
  const equipment = prescription.items.filter(it => it.category === 'ergonomic_equipment');
  const habits = prescription.items.filter(it => it.category === 'lifestyle_habit');

  let text = `Olá ${prescription.patientName}! 👋\n\n`;
  text += `Aqui estão as suas *Recomendações e Cuidados Personalizados* da sua sessão na *Digital Clínica* (${prescription.date}):\n\n`;

  if (prescription.diagnosisOrGoal) {
    text += `🎯 *Objetivo:* ${prescription.diagnosisOrGoal}\n\n`;
  }

  if (careProducts.length > 0) {
    text += `🧴 *PRODUTOS & CUIDADOS TÓPICOS:*\n`;
    careProducts.forEach(it => {
      text += `• *${it.title}*\n  👉 ${it.instructions}\n`;
    });
    text += `\n`;
  }

  if (equipment.length > 0) {
    text += `🧘 *MATERIAL RECOMENDADO:*\n`;
    equipment.forEach(it => {
      text += `• *${it.title}*\n  👉 ${it.instructions}\n`;
    });
    text += `\n`;
  }

  if (habits.length > 0) {
    text += `💡 *HÁBITOS & POSTURA:*\n`;
    habits.forEach(it => {
      text += `• *${it.title}*\n  👉 ${it.instructions}\n`;
    });
    text += `\n`;
  }

  if (prescription.generalNotes) {
    text += `📝 *Nota do Fisioterapeuta:* ${prescription.generalNotes}\n\n`;
  }

  text += `Estamos à sua total disposição em caso de dúvida!\n*Digital Clínica — Lisboa* 🇵🇹`;

  return text;
}
