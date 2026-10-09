import { NextResponse } from 'next/server';
import { localizeApiError } from '@/lib/api-i18n';
import { getPublicServices } from '@/lib/treatments';
export const dynamic='force-dynamic';
export async function GET(request?: Request) {
  try { return NextResponse.json({services:await getPublicServices()},{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:localizeApiError('Catalogue temporarily unavailable', request)},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'5'}}); }
}
