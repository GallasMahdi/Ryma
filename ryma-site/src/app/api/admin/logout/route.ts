import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_OPTIONS } from '@/lib/session';

export async function POST() {
  const cookieStore = await cookies();
  // Delete the session cookie directly to destroy the session
  cookieStore.delete(SESSION_OPTIONS.cookieName);

  return NextResponse.json({ success: true }, { status: 200 });
}
