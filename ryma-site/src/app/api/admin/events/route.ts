import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbIsSessionRevoked } from '@/lib/db';
import { isAdminSessionValid } from '@/lib/session-policy';
import { adminEventBus, type AdminEventPayload } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Revalidate open streams as well as initial connections; always release timers. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let ping: ReturnType<typeof setInterval> | undefined;
      const authorized = async () => isAdminSessionValid(auth.session) && !(await dbIsSessionRevoked(auth.session.sessionId));
      const send = (message: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(message)); } catch { cleanup(); }
      };
      const onEvent = async (payload: AdminEventPayload) => {
        if (!(await authorized())) { cleanup(); return; }
        send(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
      };
      cleanup = () => {
        if (closed) return;
        closed = true;
        if (ping) clearInterval(ping);
        adminEventBus.off('admin_event', onEvent);
        request.signal.removeEventListener('abort', cleanup);
        try { controller.close(); } catch { /* already closed */ }
      };
      if (request.signal.aborted) { cleanup(); return; }
      adminEventBus.on('admin_event', onEvent);
      request.signal.addEventListener('abort', cleanup, { once: true });
      send(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
      ping = setInterval(async () => {
        if (!(await authorized())) { cleanup(); return; }
        send(': ping\n\n');
      }, 20000);
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform, no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  } });
}
