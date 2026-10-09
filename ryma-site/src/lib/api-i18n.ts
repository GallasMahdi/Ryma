import { ERRORS_ES } from '@/data/translations/errors-es';
import { isLanguage, type Lang } from '@/lib/locales';

export function requestLanguage(request?: Pick<Request, 'headers'>): Lang {
  const cookie = request?.headers?.get('cookie')?.match(/(?:^|;\s*)ryma_lang=([^;]+)/)?.[1];
  if (isLanguage(cookie)) return cookie;
  const preferred = request?.headers?.get('accept-language')?.split(',')[0]?.split('-')[0];
  return isLanguage(preferred) ? preferred : 'pt';
}

export function localizeApiError(message: unknown, request?: Pick<Request, 'headers'>): unknown {
  if (requestLanguage(request) !== 'es' || typeof message !== 'string') return message;
  return spanishError(message);
}

export function spanishError(message: string): string {
  if (ERRORS_ES[message]) return ERRORS_ES[message];
  const fields: Record<string,string> = {Name:'Nombre',Summary:'Resumen',Description:'Descripción',Question:'Pregunta',Answer:'Respuesta',Indications:'Indicaciones',Contraindications:'Contraindicaciones','Session steps':'Pasos de la sesión','Search terms':'Términos de búsqueda','Care goals':'Objetivos','Body zones':'Zonas corporales',patientAddress:'dirección de facturación',patientNif:'NIF',externalReference:'referencia oficial',notes:'notas'};
  const invalid = message.match(/^(.+): invalid (translations|list|selection)\.$/);
  if (invalid && fields[invalid[1]]) return `${fields[invalid[1]]}: ${invalid[2] === 'translations' ? 'traducciones no válidas' : invalid[2] === 'list' ? 'lista no válida' : 'selección no válida'}.`;
  const maximum = message.match(/^(.+): maximum (\d+) characters\.$/);
  if (maximum && fields[maximum[1]]) return `${fields[maximum[1]]}: máximo ${maximum[2]} caracteres.`;
  const required = message.match(/^(.+) is required in at least one language\.$/);
  if (required && fields[required[1]]) return `${fields[required[1]]}: obligatorio en al menos un idioma.`;
  const field = message.match(/^Invalid (\w+)\.$/);
  if (field && fields[field[1]]) return `Campo no válido: ${fields[field[1]]}.`;
  return message;
}
