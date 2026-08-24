import { unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_OPTIONS, type SessionData } from './session';
import { getClientIp } from './validation';
import { dbLogSecurityAudit } from './db';

/**
 * Server-side admin authorization guard.
 * Call at the top of every protected API route handler.
 *
 * Returns { ok: true } if the request carries a valid admin session.
 * Returns a 401 NextResponse if not authenticated — return this directly.
 *
 * Usage:
 *   const auth = await requireAdmin(request);
 *   if ('status' in auth) return auth; // 401
 *   // proceed with admin logic
 *
 * NOTE: Uses unsealData() directly instead of getIronSession() to avoid
 * a type incompatibility between iron-session v8's CookieStore interface
 * and Next.js 15+'s ReadonlyRequestCookies.
 */
export async function requireAdmin(
  _request?: NextRequest
): Promise<{ ok: true } | NextResponse> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

    if (!cookieValue) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });

    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return { ok: true };
  } catch {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

/**
 * Server-side Owner Analytics Step-Up authorization guard.
 * Call at the top of every sensitive analytics and business reporting API route.
 *
 * Verifies:
 * 1. Admin session is valid (isAdmin === true)
 * 2. analyticsUnlockedUntil exists and Date.now() < analyticsUnlockedUntil (15-min TTL)
 *
 * If not authenticated as admin: returns 401 Unauthorized.
 * If admin but analytics step-up not completed/expired: returns 403 Forbidden with code 'OWNER_AUTH_REQUIRED'.
 */
export async function requireOwnerAnalytics(
  request?: NextRequest
): Promise<{ ok: true; session: SessionData } | NextResponse> {
  const ip = request ? getClientIp(request) : 'unknown';
  const userAgent = request ? request.headers.get('user-agent') : null;

  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

    if (!cookieValue) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });

    if (!session.isAdmin) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const isUnlocked = Boolean(session.analyticsUnlockedUntil && now < session.analyticsUnlockedUntil);

    if (!isUnlocked) {
      // Log security audit for denied attempt
      await dbLogSecurityAudit(
        session.analyticsUnlockedUntil ? 'ANALYTICS_SESSION_EXPIRED' : 'ANALYTICS_ACCESS_DENIED',
        ip,
        userAgent,
        { reason: session.analyticsUnlockedUntil ? 'Step-up session expired' : 'Step-up authorization not provided' }
      );

      return NextResponse.json(
        {
          error: 'Autorisation Propriétaire requise pour accéder aux statistiques.',
          code: 'OWNER_AUTH_REQUIRED',
          expired: Boolean(session.analyticsUnlockedUntil && now >= session.analyticsUnlockedUntil),
        },
        { status: 403 }
      );
    }

    return { ok: true, session };
  } catch {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }
}

/**
 * Get the current session (read-only).
 * Returns null if not authenticated.
 */
export async function getAdminSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

    if (!cookieValue) return null;

    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });

    return session.isAdmin ? session : null;
  } catch {
    return null;
  }
}
