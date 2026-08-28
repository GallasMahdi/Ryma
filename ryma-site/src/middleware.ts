import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware.
 *
 * Protects all /admin/* routes (except /admin/login itself):
 *  - Unauthenticated (no session cookie) → immediate 307 redirect to /admin/login
 *  - Authenticated (cookie present) → allow through to server component
 *
 * NOTE: Full cryptographic unsealing and session TTL validation is enforced
 * inside each protected API route handler via requireAdmin() / requireOwnerAnalytics().
 * This edge middleware ensures unauthenticated users never download or render the /admin HTML/JS bundle.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the login page through with no-store headers
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return res;
  }

  // Check for the session cookie presence
  const sessionCookie = request.cookies.get('ryma_admin_session');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    redirectRes.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return redirectRes;
  }

  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
