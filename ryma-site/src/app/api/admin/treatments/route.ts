import { localizeApiError } from '@/lib/api-i18n';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { getSchedulingConfiguration, SchedulingError } from '@/lib/scheduling';
import { getTreatments, saveTreatment } from '@/lib/treatments';
import { isJsonObject } from '@/lib/admin-validation';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  try { return NextResponse.json(request.nextUrl.searchParams.get('catalogueOnly')==='1'?{treatments:await getTreatments()}:await getSchedulingConfiguration(),{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:localizeApiError('Unable to load treatments.', request)},{status:503}); }
}
export async function POST(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  const origin=request.headers.get('origin');
  if(origin) {
    // Next may normalize nextUrl to localhost; the request Host is the browser's target.
    let sameHost=false;
    try {const parsed=new URL(origin);sameHost=['http:','https:'].includes(parsed.protocol)&&parsed.host===(request.headers.get('host')??request.nextUrl.host);} catch { /* Reject malformed origins. */ }
    if(!sameHost)return NextResponse.json({error:localizeApiError('Cross-origin changes are not allowed.', request)},{status:403});
  }
  let body:unknown;
  try {
    const raw=await request.text();
    if(Buffer.byteLength(raw)>64000)return NextResponse.json({error:localizeApiError('Treatment is too large.', request)},{status:413});
    body=JSON.parse(raw);
  } catch { return NextResponse.json({error:localizeApiError('Invalid JSON', request)},{status:400}); }
  if(!isJsonObject(body))return NextResponse.json({error:localizeApiError('JSON object required', request)},{status:400});
  try {
    const actor=createHash('sha256').update(auth.session.sessionId).digest('hex');
    const treatment=await saveTreatment(body,actor);
    return NextResponse.json({treatment},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    if(error instanceof SchedulingError)return NextResponse.json({error:localizeApiError(error.message, request),code:error.code,conflicts:error.conflicts},{status:error.code==='INVALID_INPUT'?422:409});
    console.error('[Treatment save failed]');
    return NextResponse.json({error:localizeApiError('Unable to save the treatment. Reload to verify its current state before retrying.', request)},{status:503});
  }
}
