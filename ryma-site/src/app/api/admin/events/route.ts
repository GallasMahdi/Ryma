import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbIsSessionRevoked, executeQuery } from '@/lib/db';
import { isAdminSessionValid } from '@/lib/session-policy';
import { adminEventBus, type AdminEventPayload } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Revalidate open streams as well as initial connections; always release timers. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;
  let revision = Number((await executeQuery<{revision: number}>('SELECT revision FROM booking_sync WHERE id = 1'))[0]?.revision ?? 0);
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let ping: ReturnType<typeof setInterval> | undefined;
      let sync: ReturnType<typeof setInterval> | undefined;
      let syncing = false;
      const authorized = async () => isAdminSessionValid(auth.session) && !(await dbIsSessionRevoked(auth.session.sessionId));
      const send = (message: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(message)); } catch { cleanup(); }
      };
      const onEvent = async (payload: AdminEventPayload) => {
        try {
          if (!(await authorized())) { cleanup(); return; }
          send(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch { cleanup(); }
      };
      cleanup = () => {
        if (closed) return;
        closed = true;
        if (ping) clearInterval(ping);
        if (sync) clearInterval(sync);
        adminEventBus.off('admin_event', onEvent);
        request.signal.removeEventListener('abort', cleanup);
        try { controller.close(); } catch { /* already closed */ }
      };
      if (request.signal.aborted) { cleanup(); return; }
      adminEventBus.on('admin_event', onEvent);
      request.signal.addEventListener('abort', cleanup, { once: true });
      send(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
      // Database revision survives process boundaries and serverless instances.
      sync = setInterval(async () => {
        if (syncing || closed) return;
        syncing = true;
        try {
          const next = Number((await executeQuery<{revision: number}>('SELECT revision FROM booking_sync WHERE id = 1'))[0]?.revision ?? 0);
          if (next !== revision) {
            revision = next;
            await onEvent({type: 'appointments:changed', timestamp: new Date().toISOString(), data: {revision}});
          }
        } catch { /* The dashboard's fallback polling remains available. */ }
        finally { syncing = false; }
      }, 3000);
      ping = setInterval(async () => {
        try {
          if (!(await authorized())) { cleanup(); return; }
          send(': ping\n\n');
        } catch { cleanup(); }
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
