import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetBackupStatus, dbGetNoShowCounts } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedData: {
  backupStatus: any;
  noShowCounts: Record<string, number>;
  cachedAt: number;
} | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  const now = Date.now();
  if (!cachedData || now - cachedData.cachedAt > CACHE_TTL_MS) {
    const [backupStatus, noShowCounts] = await Promise.all([
      dbGetBackupStatus(),
      dbGetNoShowCounts(),
    ]);
    cachedData = { backupStatus, noShowCounts, cachedAt: now };
  }

  return NextResponse.json(
    {
      authenticated: true,
      backupStatus: cachedData.backupStatus,
      noShowCounts: cachedData.noShowCounts,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}
