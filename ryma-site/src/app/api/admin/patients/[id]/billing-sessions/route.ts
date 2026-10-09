import { localizeApiError, requestLanguage } from '@/lib/api-i18n';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { isCalendarDate } from '@/lib/admin-validation';
import { BillingError, getPatientBillingSessions } from '@/lib/session-billing';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, { params }: { params: Promise<{id:string}> }) {
  const auth = await requireAdmin(request); if ('status' in auth) return auth;
  const { id } = await params, query = request.nextUrl.searchParams;
  const page = Number(query.get('page') ?? 1), limit = Number(query.get('limit') ?? 50);
  const dateFrom = query.get('dateFrom') || undefined, dateTo = query.get('dateTo') || undefined;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || (dateFrom && !isCalendarDate(dateFrom)) || (dateTo && !isCalendarDate(dateTo)) || (dateFrom && dateTo && dateFrom > dateTo)) return NextResponse.json({error:localizeApiError('Invalid session filters.', request)},{status:422});
  try { return NextResponse.json(await getPatientBillingSessions(id,{page,limit,dateFrom,dateTo},requestLanguage(request)),{headers:{'Cache-Control':'no-store'}}); }
  catch (error) {
    if (error instanceof BillingError) return NextResponse.json({error:localizeApiError(error.message, request),code:error.code},{status:error.status});
    console.error('[Billing sessions lookup failed]');
    return NextResponse.json({error:localizeApiError('Unable to load billing sessions.', request)},{status:500});
  }
}
