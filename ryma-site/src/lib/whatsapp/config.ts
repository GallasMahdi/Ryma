import { timingSafeEqual, createHmac } from 'node:crypto';

export function secretMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function validWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature?.match(/^sha256=[a-f0-9]{64}$/)) return false;
  return secretMatches(signature, `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
}

export function whatsappConfig() {
  const config = {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    token: process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? '',
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? '',
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? '',
    version: process.env.WHATSAPP_GRAPH_VERSION?.trim() ?? '',
    jobSecret: process.env.WHATSAPP_JOB_SECRET?.trim() ?? '',
    autoConfirm: process.env.WHATSAPP_AUTO_CONFIRM === 'true',
    allowedSenders: (process.env.WHATSAPP_ALLOWED_SENDERS ?? '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean),
  };
  return {...config, ready: Boolean(config.enabled && config.token && /^\d+$/.test(config.phoneId) && config.appSecret && config.verifyToken && /^v\d+\.\d+$/.test(config.version))};
}
