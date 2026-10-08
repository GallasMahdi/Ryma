import { after, NextRequest } from 'next/server';
import { secretMatches, validWebhookSignature, whatsappConfig } from '@/lib/whatsapp/config';
import { parseWhatsappMessages } from '@/lib/whatsapp/webhook';
import { enqueueMessages } from '@/lib/whatsapp/store';
import { runWhatsappWorker } from '@/lib/whatsapp/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get('hub.mode') !== 'subscribe' || !secretMatches(params.get('hub.verify_token') ?? '', whatsappConfig().verifyToken)) return new Response('Forbidden', {status: 403});
  const challenge = params.get('hub.challenge');
  return challenge ? new Response(challenge, {headers: {'Cache-Control': 'no-store'}}) : new Response('Missing challenge', {status: 400});
}

export async function POST(request: NextRequest) {
  const config = whatsappConfig();
  if (!config.ready) return Response.json({error: 'WhatsApp is not configured'}, {status: 503});
  if (Number(request.headers.get('content-length')) > 65536) return new Response('Payload too large', {status: 413});
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65536) return new Response('Payload too large', {status: 413});
  if (!validWebhookSignature(raw, request.headers.get('x-hub-signature-256'), config.appSecret)) return new Response('Forbidden', {status: 403});
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return new Response('Invalid JSON', {status: 400}); }
  try {
    await enqueueMessages(parseWhatsappMessages(payload, config.phoneId, config.allowedSenders));
  } catch {
    // Acknowledge only after durable storage, so Meta can retry a failed write.
    return Response.json({error: 'Temporary storage failure'}, {status: 503});
  }
  after(async () => { try { await runWhatsappWorker(); } catch { console.error('[WhatsApp] Background processing failed; queued work will retry.'); } });
  return Response.json({received: true});
}
