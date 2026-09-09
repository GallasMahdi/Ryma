import { unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_OPTIONS, type SessionData } from './session';
import { getClientIp } from './validation';
import { dbLogSecurityAudit, dbIsSessionRevoked, dbIsOwnerStepUpActive } from './db';

/**
 * Server-side admin authorization guard.
 * Call at the top of every protected API route handler.
 *
 * Returns { ok: true, session: SessionData } if the request carries a valid, unrevoked admin session.
 * Returns a 401 NextResponse if not authenticated or session was revoked.
 */
export async function requireAdmin(
  request?: NextRequest
): Promise<{ ok: true; session: SessionData } | NextResponse> {
  try {
    const cookieStore = await cookies();
    const cookieValue =
      request?.cookies.get(SESSION_OPTIONS.cookieName)?.value ||
      cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

    if (!cookieValue) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });

    if (!session || !session.isAdmin || !session.sessionId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Stateful revocation check: ensure session was not revoked via logout
    const isRevoked = await dbIsSessionRevoked(session.sessionId);
    if (isRevoked) {
      return NextResponse.json(
        { error: 'Session has been revoked. Please log in again.' },
        { status: 401 }
      );
    }

    return { ok: true, session };
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
 * 1. Admin session is valid and unrevoked (isAdmin === true, dbIsSessionRevoked === false)
 * 2. analyticsUnlockedUntil exists and Date.now() < analyticsUnlockedUntil (15-min TTL)
 * 3. Server-side step-up grant is active (dbIsOwnerStepUpActive === true)
 *
 * If not authenticated as admin: returns 401 Unauthorized.
 * If admin but analytics step-up not completed, expired, or revoked: returns 403 Forbidden with code 'OWNER_AUTH_REQUIRED'.
 */
export async function requireOwnerAnalytics(
  request?: NextRequest
): Promise<{ ok: true; session: SessionData } | NextResponse> {
  const ip = request ? getClientIp(request) : 'unknown';
  const userAgent = request ? request.headers.get('user-agent') : null;

  try {
    const cookieStore = await cookies();
    const cookieValue =
      request?.cookies.get(SESSION_OPTIONS.cookieName)?.value ||
      cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

    if (!cookieValue) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });

    if (!session || !session.isAdmin || !session.sessionId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    // Stateful revocation check
    const isRevoked = await dbIsSessionRevoked(session.sessionId);
    if (isRevoked) {
      return NextResponse.json(
        { error: 'Session has been revoked. Please log in again.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const now = Date.now();
    const isStepUpActive = await dbIsOwnerStepUpActive(session.sessionId);
    const isUnlocked = Boolean(
      session.analyticsUnlockedUntil &&
      now < session.analyticsUnlockedUntil &&
      isStepUpActive
    );

    if (!isUnlocked) {
      // Log security audit for denied attempt
      await dbLogSecurityAudit(
        session.analyticsUnlockedUntil ? 'ANALYTICS_SESSION_EXPIRED' : 'ANALYTICS_ACCESS_DENIED',
        ip,
        userAgent,
        { reason: session.analyticsUnlockedUntil ? 'Step-up session expired or manually locked' : 'Step-up authorization not provided' }
      );

      return NextResponse.json(
        {
          error: 'Autorisation Propriétaire requise pour accéder aux statistiques.',
          code: 'OWNER_AUTH_REQUIRED',
          expired: Boolean(session.analyticsUnlockedUntil && (now >= session.analyticsUnlockedUntil || !isStepUpActive)),
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
