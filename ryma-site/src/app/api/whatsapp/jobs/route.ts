import { secretMatches, whatsappConfig } from '@/lib/whatsapp/config';
import { runWhatsappWorker } from '@/lib/whatsapp/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Schedule this endpoint every minute. Jobs recover crashes and transient send errors.
export async function POST(request: Request) {
  const config = whatsappConfig();
  if (!secretMatches(request.headers.get('authorization') ?? '', `Bearer ${config.jobSecret}`) || !config.jobSecret) return Response.json({error: 'Unauthorized'}, {status: 401});
  if (!config.ready) return Response.json({error: 'WhatsApp is not configured'}, {status: 503});
  return Response.json(await runWhatsappWorker(), {headers: {'Cache-Control': 'no-store'}});
}
