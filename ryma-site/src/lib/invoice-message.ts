import type { Invoice } from '@/types/admin';
import { invoiceDisplayTotals } from '@/lib/invoice-display';

/** Patient-entered and issued document fields retain their original wording. */
export function spanishInvoiceMessage(invoice: Invoice): string {
  const status = { PAID: 'PAGADO', PENDING: 'Pendiente', CANCELLED: 'Anulado', REFUNDED: 'Reembolsado' };
  const { quantity } = invoiceDisplayTotals(invoice);
  return `Hola, ${invoice.patientName}: 👋\n\nDocumento interno de facturación de *Digital Clínica*:\n\n`
    + `🧾 *Documento:* ${invoice.invoiceNumber}\n🩺 *Tratamiento:* ${invoice.serviceName}\n`
    + `💰 *Importe:* ${invoice.amount.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2})} €\n`
    + `📌 *NIF:* ${invoice.patientNif || '—'}\n`
    + (invoice.coverageProvider ? `🏥 *Seguro / subsistema:* ${invoice.coverageProvider} (${invoice.coverageNumber || '—'})\n` : '')
    + `✅ *Estado:* ${status[invoice.paymentStatus]}\n*Sesiones:* ${quantity}\n\n`
    + 'Documento interno sin validez fiscal. La factura fiscal se emite por separado.\n\n¡Gracias por su confianza!\n*Digital Clínica — Lisboa* 🇵🇹';
}
