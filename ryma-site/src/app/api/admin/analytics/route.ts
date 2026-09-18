import { isCalendarDate } from '@/lib/admin-validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import { dbGetFilteredAnalyticsStats } from '@/lib/db';
import type { Lang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth; // 401 or 403

  const { searchParams } = request.nextUrl;
  const lang = (searchParams.get('lang') || 'fr') as Lang;
  const range = searchParams.get('range') || '30d';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const pole = searchParams.get('pole') || 'all';

  if (!['today','7d','month','30d','90d','year','all','custom'].includes(range) || !['all','kinesitherapie','minceur','bilan'].includes(pole) || (range === 'custom' && (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate || Date.parse(endDate) - Date.parse(startDate) > 3660 * 86400000))) return NextResponse.json({ error: 'Invalid analytics filters' }, { status: 422 });
  // Multi-dimensional filtered database aggregate calculation
  const result = await dbGetFilteredAnalyticsStats({
    lang,
    range,
    startDate,
    endDate,
    pole,
  });

  return NextResponse.json(
    {
      ...result,
      expiresAt: auth.session.analyticsUnlockedUntil,
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    }
  );
}
