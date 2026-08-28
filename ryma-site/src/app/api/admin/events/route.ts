import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { adminEventBus, type AdminEventPayload } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/events
 * Server-Sent Events (SSE) stream for real-time admin dashboard updates.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401 Unauthorized

  const encoder = new TextEncoder();

  let onAdminEvent: ((payload: AdminEventPayload) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial handshake
      const initialMessage = `event: connected\ndata: ${JSON.stringify({
        status: 'connected',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(encoder.encode(initialMessage));

      // Event listener for all admin bus events
      onAdminEvent = (payload: AdminEventPayload) => {
        try {
          const message = `event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Stream might be closed
        }
      };

      adminEventBus.on('admin_event', onAdminEvent);

      // Keepalive ping every 20 seconds to prevent proxy/browser timeout
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 20000);

      // Clean up when client disconnects
      let cleanedUp = false;
      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;
        clearInterval(pingInterval);
        if (onAdminEvent) adminEventBus.off('admin_event', onAdminEvent);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      // Called when consumer closes stream
      if (onAdminEvent) adminEventBus.off('admin_event', onAdminEvent);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
