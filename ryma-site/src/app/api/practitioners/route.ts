import { isKnownTreatment, getTreatments } from '@/lib/treatments';
import { NextRequest, NextResponse } from 'next/server';
import { getSchedulingConfiguration } from '@/lib/scheduling';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest) {
  const service=request.nextUrl.searchParams.get('service');
  try {
    if(service&&!(await isKnownTreatment(service, true)))return NextResponse.json({error:'Invalid service'},{status:400});
    const config=await getSchedulingConfiguration();
    const practitioners=config.practitioners.filter(p=>p.active&&p.bookable&&(!service||config.services.some(s=>s.practitionerId===p.id&&s.service===service))).map(p=>({id:p.id,name:p.name,profession:p.profession,color:p.color}));
    return NextResponse.json({practitioners},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    console.error('[Public practitioners read]');
    return NextResponse.json({error:'Unable to load practitioners. Please retry.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'1'}});
  }
}
