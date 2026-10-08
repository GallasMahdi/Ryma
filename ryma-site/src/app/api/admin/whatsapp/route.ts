import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { whatsappConfig } from '@/lib/whatsapp/config';
import { ensureWhatsappSchema } from '@/lib/whatsapp/store';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;
  const config = whatsappConfig();
  await ensureWhatsappSchema();
  const inbox = await executeQuery<{count: number}>('SELECT COUNT(*) AS count FROM whatsapp_inbox WHERE processedAt IS NULL');
  const outbox = await executeQuery<{status: string; count: number}>('SELECT status, COUNT(*) AS count FROM whatsapp_outbox GROUP BY status');
  return Response.json({enabled: config.enabled, configured: config.ready, bookingStatus: config.autoConfirm ? 'CONFIRMED' : 'PENDING', retryJobConfigured: Boolean(config.jobSecret), pendingIncoming: Number(inbox[0]?.count ?? 0), outgoing: outbox}, {headers: {'Cache-Control': 'no-store'}});
}
