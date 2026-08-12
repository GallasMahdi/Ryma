import { unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_OPTIONS, type SessionData } from './session';

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
