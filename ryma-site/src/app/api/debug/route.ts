import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const dynamic = 'force-dynamic';

/**
 * Temporary diagnostic endpoint — REMOVE BEFORE PUBLIC LAUNCH
 * GET /api/debug → returns env var status and Turso connectivity check
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    TURSO_DATABASE_URL_set: Boolean(process.env.TURSO_DATABASE_URL),
    TURSO_DATABASE_URL_prefix: process.env.TURSO_DATABASE_URL?.slice(0, 30) ?? 'NOT_SET',
    TURSO_AUTH_TOKEN_set: Boolean(process.env.TURSO_AUTH_TOKEN),
    TURSO_AUTH_TOKEN_length: process.env.TURSO_AUTH_TOKEN?.length ?? 0,
    SESSION_SECRET_set: Boolean(process.env.SESSION_SECRET),
    SESSION_SECRET_length: process.env.SESSION_SECRET?.length ?? 0,
    ADMIN_PASSWORD_HASH_set: Boolean(process.env.ADMIN_PASSWORD_HASH),
  };

  // Test Turso connection
  try {
    const rawUrl = (process.env.TURSO_DATABASE_URL ?? '').trim();
    diagnostics.raw_url_full = rawUrl;
    const client = createClient({
      url: rawUrl,
      authToken: (process.env.TURSO_AUTH_TOKEN ?? '').trim(),
    });
    const res = await client.execute('SELECT 1 as ok');
    diagnostics.turso_connection = 'SUCCESS';
    diagnostics.turso_result = res.rows[0];
  } catch (err: unknown) {
    diagnostics.turso_connection = 'FAILED';
    diagnostics.turso_error = String(err instanceof Error ? (err.stack || err.message) : err);
  }

  // Test env module
  try {
    const { env } = await import('@/lib/env');
    diagnostics.env_module = 'loaded_ok';
    diagnostics.env_session_secret_length = env.SESSION_SECRET.length;
    diagnostics.env_admin_hash_length = env.ADMIN_PASSWORD_HASH.length;
  } catch (err: unknown) {
    diagnostics.env_module = 'FAILED: ' + String(err instanceof Error ? err.message : err);
  }

  // Test db module load
  try {
    const db = await import('@/lib/db');
    diagnostics.db_module = 'loaded_ok';
    diagnostics.db_exports = Object.keys(db).join(', ');
  } catch (err: unknown) {
    diagnostics.db_module = 'FAILED: ' + String(err instanceof Error ? err.message : err);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
