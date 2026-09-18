import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';
import { dbLogSecurityAudit, dbRevokeOwnerStepUp } from '@/lib/db';
import { getClientIp } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('status' in auth) return auth;
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  const cookieStore = await cookies();
  const cookieValue =
    request.cookies.get(SESSION_OPTIONS.cookieName)?.value ||
    cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

  if (!cookieValue) {
    return NextResponse.json({ success: true });
  }

  try {
    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    ttl: SESSION_OPTIONS.ttl,
    });

    if (session.isAdmin) {
      if (session.sessionId) {
        await dbRevokeOwnerStepUp(session.sessionId);
      }

      const updatedSession: SessionData = {
        sessionId: session.sessionId,
        isAdmin: true,
        loginAt: session.loginAt,
        analyticsUnlockedUntil: undefined,
      };

      const sealed = await sealData(updatedSession, {
        password: SESSION_OPTIONS.password as string,
    ttl: SESSION_OPTIONS.ttl,
      });

      cookieStore.set({
        name: SESSION_OPTIONS.cookieName,
        value: sealed,
        httpOnly: SESSION_OPTIONS.cookieOptions?.httpOnly ?? true,
        secure: SESSION_OPTIONS.cookieOptions?.secure ?? (process.env.NODE_ENV === 'production'),
        sameSite: (SESSION_OPTIONS.cookieOptions?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
        maxAge: SESSION_OPTIONS.cookieOptions?.maxAge ?? 8 * 60 * 60,
        path: SESSION_OPTIONS.cookieOptions?.path ?? '/',
      });

      await dbLogSecurityAudit('ANALYTICS_LOCKED', ip, userAgent, {
        action: 'Manual lock by user',
      });
    }
  } catch {
    return NextResponse.json({ error: 'Unable to lock analytics' }, { status: 503 });
  }

  return NextResponse.json({ success: true, message: 'Statistiques verrouillées' });
}
