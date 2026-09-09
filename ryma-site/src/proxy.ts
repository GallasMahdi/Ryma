import { NextRequest, NextResponse } from 'next/server';
import { unsealData } from 'iron-session';
import type { SessionData } from '@/lib/session';

/**
 * Next.js Edge Proxy (migrated from deprecated middleware convention in Next.js 16).
 *
 * Protects all /admin/* routes (except /admin/login itself):
 *  - Unauthenticated, forged, or expired session → immediate 307 redirect to /admin/login
 *  - Authenticated (cryptographically valid session) → allow through to server component
 *
 * NOTE: Full cryptographic unsealing and session TTL validation is enforced here
 * at the Edge to prevent unauthenticated users from downloading the /admin client bundle.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the login page through with no-store headers
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // Check for the session cookie
  const sessionCookie = request.cookies.get('ryma_admin_session');
  if (!sessionCookie?.value) {
    return redirectToLogin(request, pathname);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return redirectToLogin(request, pathname);
  }

  try {
    const session = await unsealData<SessionData>(sessionCookie.value, {
      password: secret,
    });

    if (!session || !session.isAdmin) {
      return redirectToLogin(request, pathname);
    }
  } catch {
    // Cookie was forged, tampered with, or expired
    return redirectToLogin(request, pathname);
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

function redirectToLogin(request: NextRequest, from: string) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('from', from);
  const redirectRes = NextResponse.redirect(loginUrl);
  redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  redirectRes.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return redirectRes;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};

