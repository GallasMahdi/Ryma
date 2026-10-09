import { legacyText } from '@/data/translations/legacy-es';
import type { Lang } from './locales';
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

function cssText(value:string):string {
  return '"'+value.replace(/[\\"\r\n<>]/g,c=>'\\'+c.charCodeAt(0).toString(16)+' ')+'"';
}

/**
 * Generate a standalone, pristine HTML document for an official Recommendation / Prescription Pad.
 * Formatted for A4 portrait printing without any background app bleed-through.
 */
export function generatePrescriptionHtml(prescription: PatientPrescription, lang: Lang = 'pt'): string {
  const careProducts = prescription.items.filter(it => it.category === 'care_product');
  const equipment = prescription.items.filter(it => it.category === 'ergonomic_equipment');
  const habits = prescription.items.filter(it => it.category === 'lifestyle_habit');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <title>${legacyText("Recomendações Clínicas", lang)} - ${escapeHtml(prescription.patientName)} - Digital Clínica</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 22mm 15mm 18mm;
      @top-left {
        content: ${cssText(prescription.patientName+' | '+prescription.id)};
        font: 8pt Arial, sans-serif;
        color: #334155;
        vertical-align: middle;
        white-space: normal;
      }
      @bottom-right {
        content: "Página " counter(page) " / " counter(pages);
        font: 8pt Arial, sans-serif;
        color: #475569;
      }
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
      break-inside: avoid;
      overflow-wrap: anywhere;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }
    .item-title {
      break-after: avoid;
      font-size: 11px;
      font-weight: 700;
      color: #0F172A;
    }
    .item-instructions {
      orphans: 3;
      widows: 3;
      white-space: pre-wrap;
      font-size: 10px;
      color: #334155;
      margin-top: 3px;
    }
    .item-instructions strong {
      color: #0F172A;
    }
    .notes-box {
      orphans: 3;
      widows: 3;
      overflow-wrap: anywhere;
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
        <p class="clinic-subtitle">${legacyText("Clínica de Fisioterapia & Estética Médica Avançada", lang)}</p>
        <p class="clinic-address">${escapeHtml(SITE.address[lang] || SITE.address.pt || '')}</p>
        <div class="clinic-identifiers">
          ${SITE.clinicNif ? `<span><strong>NIF:</strong> ${escapeHtml(SITE.clinicNif)}</span>` : ''}
          ${SITE.ersRegistration ? `<span><strong>${legacyText("Registo ERS:", lang)}</strong> ${escapeHtml(SITE.ersRegistration)}</span>` : ''}
          ${SITE.professionalLicense ? `<span><strong>${legacyText("Ordem Fisio:", lang)}</strong> ${escapeHtml(SITE.professionalLicense)}</span>` : ''}
        </div>
      </div>

      <div class="doc-meta">
        <div class="doc-title">${legacyText("Recomendações Clínicas", lang)}</div>
        <div class="doc-subtitle">${legacyText("Cuidados & Material Domiciliário", lang)}</div>
        <div class="doc-date">${legacyText("Data:", lang)} <strong>${escapeHtml(prescription.date)}</strong></div>
      </div>
    </div>

    <!-- Patient Details -->
    <div class="patient-box">
      <div>
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94A3B8;">${legacyText("Utente:", lang)}</div>
        <div class="patient-name">${escapeHtml(prescription.patientName)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #94A3B8;">${legacyText("Contacto:", lang)}</div>
        <div class="patient-phone">${escapeHtml(prescription.patientPhone)}</div>
      </div>
    </div>

    ${
      prescription.diagnosisOrGoal
        ? `<div style="margin-bottom: 14px; font-size: 10.5px; color: #334155;">
            <strong>${legacyText("Objetivo Clínico / Enquadramento:", lang)}</strong> ${escapeHtml(prescription.diagnosisOrGoal)}
          </div>`
        : ''
    }

    <!-- 1. Cuidados & Produtos Tópicos -->
    ${
      careProducts.length > 0
        ? `<div class="category-section">
            <div class="category-header">${legacyText("🧴 1. Produtos & Cuidados Tópicos Recomendados", lang)}</div>
            ${careProducts
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>${legacyText("Posologia / Aplicação:", lang)}</strong> ${escapeHtml(it.instructions)}</div>
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
            <div class="category-header">${legacyText("🧘 2. Material Ergonómico & Auto-Reabilitação", lang)}</div>
            ${equipment
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>${legacyText("Utilização Recomendada:", lang)}</strong> ${escapeHtml(it.instructions)}</div>
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
            <div class="category-header">${legacyText("💡 3. Hábitos & Higiene Postural de Vida", lang)}</div>
            ${habits
              .map(
                it => `
              <div class="item-card">
                <div class="item-title">${escapeHtml(it.title)}</div>
                <div class="item-instructions"><strong>${legacyText("Conselho Clínico:", lang)}</strong> ${escapeHtml(it.instructions)}</div>
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
            <strong>${legacyText("Observações Adicionais do Fisioterapeuta:", lang)}</strong><br>
            ${escapeHtml(prescription.generalNotes).replace(/\n/g, '<br>')}
          </div>`
        : ''
    }

    <!-- Footer & Signatures -->
    <div class="footer">
      <div class="footer-note">
        ${legacyText("Este documento contém orientações terapêuticas personalizadas para apoio e continuidade do plano de tratamento em domicílio. Em caso de dor persistente ou dúvida, contacte a equipa clínica.", lang)}
      </div>
      <div class="signature-block">
        <div class="signature-name">${escapeHtml(prescription.practitioner || SITE.professionalName)}</div>
        <div class="signature-sub">${legacyText("Fisioterapeuta Licenciado / Assinatura", lang)}</div>
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
export function printPrescriptionPdf(prescription: PatientPrescription, lang: Lang = 'pt') {
  const html = generatePrescriptionHtml(prescription, lang);

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
export function formatPrescriptionWhatsAppMessage(prescription: PatientPrescription, lang: Lang = 'pt'): string {
  const careProducts = prescription.items.filter(it => it.category === 'care_product');
  const equipment = prescription.items.filter(it => it.category === 'ergonomic_equipment');
  const habits = prescription.items.filter(it => it.category === 'lifestyle_habit');

  if (lang === 'es') {
    const section = (title: string, items: typeof prescription.items) => items.length
      ? `${title}\n${items.map(it => `• *${it.title}*\n  👉 ${it.instructions}`).join('\n')}\n\n` : '';
    return `Hola, ${prescription.patientName}: 👋\n\nEstas son sus *recomendaciones y cuidados personalizados* de su sesión en *Digital Clínica* (${prescription.date}):\n\n`
      + (prescription.diagnosisOrGoal ? `🎯 *Objetivo:* ${prescription.diagnosisOrGoal}\n\n` : '')
      + section('🧴 *PRODUCTOS Y CUIDADOS TÓPICOS:*', careProducts)
      + section('🧘 *MATERIAL RECOMENDADO:*', equipment)
      + section('💡 *HÁBITOS Y POSTURA:*', habits)
      + (prescription.generalNotes ? `📝 *Nota del fisioterapeuta:* ${prescription.generalNotes}\n\n` : '')
      + '¡Estamos a su disposición si tiene alguna duda!\n*Digital Clínica — Lisboa* 🇵🇹';
  }

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
