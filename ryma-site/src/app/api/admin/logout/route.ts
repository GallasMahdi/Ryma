import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { unsealData } from 'iron-session';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';
import { dbRevokeSession } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const cookieValue =
    request.cookies.get(SESSION_OPTIONS.cookieName)?.value ||
    cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

  if (cookieValue) {
    try {
      const session = await unsealData<SessionData>(cookieValue, {
        password: SESSION_OPTIONS.password as string,
      });

      if (session?.sessionId) {
        const maxAgeMs = (SESSION_OPTIONS.cookieOptions?.maxAge ?? 8 * 3600) * 1000;
        const expiresAt = (session.loginAt || Date.now()) + maxAgeMs;
        await dbRevokeSession(session.sessionId, expiresAt);
      }
    } catch (err) {
      console.error('[Logout Session Unseal/Revoke Error]:', err);
    }
  }

  // Delete the session cookie from the client
  cookieStore.delete(SESSION_OPTIONS.cookieName);

  return NextResponse.json({ success: true }, { status: 200 });
}
