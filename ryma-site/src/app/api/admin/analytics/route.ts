import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import { dbGetAnalyticsStats } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth; // 401 or 403

  const lang = request.nextUrl.searchParams.get('lang') || 'fr';

  // High-performance database-level SQL aggregate calculation
  const { stats, analyticsData } = await dbGetAnalyticsStats(lang);

  return NextResponse.json(
    {
      stats,
      analyticsData,
      expiresAt: auth.session.analyticsUnlockedUntil,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}
