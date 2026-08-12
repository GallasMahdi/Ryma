import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbGetBackupStatus, dbGetNoShowCounts } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth; // 401

  const backupStatus = await dbGetBackupStatus();
  const noShowCounts = await dbGetNoShowCounts();

  return NextResponse.json({
    authenticated: true,
    backupStatus,
    noShowCounts,
  }, { status: 200 });
}
