import { NextResponse } from 'next/server';
import { getPublicServices } from '@/lib/treatments';
export const dynamic='force-dynamic';
export async function GET() {
  try { return NextResponse.json({services:await getPublicServices()},{headers:{'Cache-Control':'no-store'}}); }
  catch { return NextResponse.json({error:'Catalogue temporarily unavailable'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'5'}}); }
}
