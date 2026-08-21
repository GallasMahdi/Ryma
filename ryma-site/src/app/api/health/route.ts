import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * Public healthcheck endpoint for 24/7 uptime monitors (e.g. UptimeRobot, BetterStack).
 * Tests database read readiness and server vitality.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verify Database connectivity and read readiness
    await executeQuery('SELECT 1 as ok');
    const latencyMs = Date.now() - startTime;

    const isTurso = Boolean(process.env.TURSO_DATABASE_URL);

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'connected',
          engine: isTurso ? 'turso_cloud' : 'local_sqlite',
          latencyMs,
        },
        environment: process.env.NODE_ENV || 'development',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[Healthcheck Failure]:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'disconnected',
          latencyMs,
          error: error instanceof Error ? error.message : 'Database query failed',
        },
        environment: process.env.NODE_ENV || 'development',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
