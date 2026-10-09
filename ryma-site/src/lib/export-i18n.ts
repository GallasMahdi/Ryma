const labels: Record<string,string> = {
  'ID':'ID','Nome Utente':'Nombre del paciente','Telefone':'Teléfono','Email':'Correo electrónico',
  'Regime Cobertura':'Tipo de cobertura','Prestador Seguro':'Aseguradora','Numero Beneficiario':'Número de beneficiario',
  'Medico Assistente':'Médico responsable','Sessoes Prescritas':'Sesiones prescritas','Sessoes Concluidas':'Sesiones completadas',
  'Patologias':'Patologías','Data Criacao':'Fecha de creación','Numero Fatura':'Número de factura','Data':'Fecha',
  'Servico':'Servicio','Profissional':'Profesional','Valor EUR':'Importe EUR','Metodo Pagamento':'Método de pago',
  'Estado':'Estado','Data Pagamento':'Fecha de pago','Hora':'Hora','Tratamento':'Tratamiento','Duracao Min':'Duración min',
  'Prestador':'Entidad','Numero':'Número','Notas':'Notas','Numero Documento':'Número de documento','Data Emissao':'Fecha de emisión',
  'Incidencia Base EUR':'Base imponible EUR','Taxa IVA':'Tipo de IVA','Valor IVA EUR':'Importe IVA EUR',
  'Valor Total EUR':'Importe total EUR','Motivo Isencao':'Motivo de exención','Estado Pagamento':'Estado del pago',
  'Seguro / Mutuelle':'Seguro / mutualidad','Numero Sessoes':'Número de sesiones','Datas Sessoes':'Fechas de sesiones',
  'Referencia Fatura Fiscal':'Referencia de factura fiscal','Tipo Documento':'Tipo de documento',
  'CASH':'Efectivo','CARD':'Tarjeta','TRANSFER':'Transferencia','PAID':'Pagado','PENDING':'Pendiente',
  'CANCELLED':'Anulado','REFUNDED':'Reembolsado','CONFIRMED':'Confirmado','COMPLETED':'Completado','NO_SHOW':'No presentado',
  'PARTICULAR':'Particular','PRIVATE_INSURANCE':'Seguro privado','SNS':'SNS','ADSE':'ADSE','OTHER':'Otro',
  'INTERNO - SEM VALOR FISCAL':'INTERNO - SIN VALIDEZ FISCAL',
};
export function exportLabel(value: string, lang: string): string { return lang === 'es' ? labels[value] ?? value : value; }
export function exportHeader(value: string, lang: string): string {
  return value.trimEnd().split(';').map(label => exportLabel(label,lang)).join(';')+'\n';
}
