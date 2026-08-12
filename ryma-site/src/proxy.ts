import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Proxy (formerly "middleware").
 *
 * Protects all /admin/* routes (except /admin/login itself):
 *  - Unauthenticated → redirect to /admin/login
 *  - Authenticated   → allow through
 *
 * NOTE: iron-session encryption works only in Node.js runtime (not Edge).
 * So instead, we do a lightweight cookie-presence check here — the cookie
 * is encrypted server-side, so it cannot be forged. The actual session
 * validation still happens inside each API route via requireAdmin().
 *
 * This check prevents unauthenticated users from even loading the /admin HTML.
 * An attacker with no cookie gets redirected immediately; one who presents a
 * tampered cookie will hit a 401 from the first API call.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the login page through (avoid redirect loop)
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }

  // Check for the session cookie presence.
  const sessionCookie = request.cookies.get('ryma_admin_session');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
