import { localizeApiError } from '@/lib/api-i18n';
import { dbLogSecurityAudit } from '@/lib/db';
import { getClientIp } from '@/lib/validation';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { isJsonObject } from '@/lib/admin-validation';
import { getSchedulingConfiguration, saveSchedulingConfiguration, SchedulingError } from '@/lib/scheduling';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  try {
    return NextResponse.json(await getSchedulingConfiguration(),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    console.error('[Schedule configuration read]');
    return NextResponse.json({error:localizeApiError('Unable to load the team. Please retry.', request)},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'1'}});
  }
}
export async function POST(request:NextRequest) {
  const auth=await requireAdmin(request);if('status' in auth)return auth;
  let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({error:localizeApiError('Invalid JSON', request)},{status:400});}
  if(!isJsonObject(body))return NextResponse.json({error:localizeApiError('JSON object required', request)},{status:400});
  try{const configuration=await saveSchedulingConfiguration(body);await dbLogSecurityAudit('SCHEDULE_UPDATED',getClientIp(request),request.headers.get('user-agent'),{action:body.action,revision:configuration.revision,sessionId:auth.session.sessionId});return NextResponse.json(configuration);}
  catch(error){
    if(error instanceof SchedulingError)return NextResponse.json({error:localizeApiError(error.message, request),code:error.code,conflicts:error.conflicts},{status:error.code==='INVALID_INPUT'?422:409});
    console.error('[Schedule configuration]');
    return NextResponse.json({error:localizeApiError('Unable to save the schedule.', request)},{status:500});
  }
}
