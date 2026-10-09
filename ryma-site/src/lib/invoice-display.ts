import type { Invoice } from '@/types/admin';
import { toCents } from './money';

export function invoiceDisplayLines(invoice: Invoice) {
  const source = invoice.items?.length ? invoice.items : [{serviceSlug:invoice.serviceSlug,serviceName:invoice.serviceName,practitioner:invoice.practitioner||'',unitPriceCents:invoice.amountCents??toCents(invoice.amount),quantity:1,vatRate:invoice.vatRate,vatExemptionReason:invoice.vatExemptionReason||null,date:'',startTime:null,priceAdjustmentReason:null}];
  const groups = new Map<string,{serviceName:string;practitioner:string;quantity:number;unitPriceCents:number;netUnitCents:number;totalCents:number;netCents:number;vatCents:number;vatRate:number;vatExemptionReason:string|null;dates:string[];priceAdjustmentReason:string|null}>();
  for (const item of source) {
    const key = JSON.stringify([item.serviceSlug,item.serviceName,item.practitioner,item.unitPriceCents,item.vatRate,item.vatExemptionReason,item.priceAdjustmentReason]);
    const netUnitCents = Math.round(item.unitPriceCents*100/(100+item.vatRate));
    const group = groups.get(key) ?? {serviceName:item.serviceName,practitioner:item.practitioner,quantity:0,unitPriceCents:item.unitPriceCents,netUnitCents,totalCents:0,netCents:0,vatCents:0,vatRate:item.vatRate,vatExemptionReason:item.vatExemptionReason,dates:[],priceAdjustmentReason:item.priceAdjustmentReason};
    group.quantity += item.quantity;
    group.totalCents += item.unitPriceCents*item.quantity;
    group.netCents += netUnitCents*item.quantity;
    group.vatCents += (item.unitPriceCents-netUnitCents)*item.quantity;
    if (item.date) group.dates.push(item.date+(item.startTime?' '+item.startTime:''));
    groups.set(key,group);
  }
  return [...groups.values()];
}

export function invoiceDisplayTotals(invoice: Invoice) {
  const lines = invoiceDisplayLines(invoice);
  return { lines, quantity:lines.reduce((sum,line)=>sum+line.quantity,0),
    incidence:lines.reduce((sum,line)=>sum+line.netCents,0)/100,
    vatAmount:lines.reduce((sum,line)=>sum+line.vatCents,0)/100,
    totalAmount:lines.reduce((sum,line)=>sum+line.totalCents,0)/100,
    vatRates:[...new Set(lines.map(line=>line.vatRate))].join(' / ') };
}
