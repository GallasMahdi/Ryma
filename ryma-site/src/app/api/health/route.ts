import { NextResponse } from 'next/server';
import { dbHealthCheck } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Coalesce probes per process for five seconds; monitoring must not become a
// source of continuous writes and lock contention itself.
let probe: ReturnType<typeof dbHealthCheck> | undefined;
let checkedAt = 0;
function readiness() {
  if (!probe || Date.now() - checkedAt > 5000) {
    checkedAt = Date.now();
    probe = dbHealthCheck().catch(error => { probe = undefined; throw error; });
  }
  return probe;
}

/**
 * GET /api/health
 * Public healthcheck endpoint for 24/7 uptime monitors (e.g. UptimeRobot, BetterStack).
 * Tests database read and write readiness and server vitality.
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const dbStatus = await readiness();
    const memory = process.memoryUsage();

    return NextResponse.json(
      {
        status: dbStatus.writable ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: dbStatus,
        memory: {
          heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
          rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        },
        environment: process.env.NODE_ENV || 'development',
      },
      {
        status: dbStatus.writable ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[Healthcheck Failure]:');

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'disconnected',
          latencyMs,
          error: 'Database unavailable',
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
