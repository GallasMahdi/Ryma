import { NextRequest, NextResponse } from 'next/server';
import { sealData } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';
import { dbCheckRateLimit, dbRecordRateLimitAttempt } from '@/lib/db';
import { getClientIp } from '@/lib/validation';
import { env } from '@/lib/env';

// Constant-time generic error — never reveals whether username or password is wrong
const GENERIC_ERROR = { error: 'Invalid credentials' };

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limiting: 10 attempts in prod (100 in dev) per 15 minutes per IP
  const isDev = process.env.NODE_ENV !== 'production';
  const maxAttempts = isDev ? 100 : 10;
  const allowed = await dbCheckRateLimit(ip, 'login', maxAttempts, 15 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Veuillez attendre 15 minutes.' },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  const { password } = body;

  if (!password || typeof password !== 'string' || password.length > 128) {
    await dbRecordRateLimitAttempt(ip, 'login');
    return NextResponse.json(GENERIC_ERROR, { status: 401 });
  }

  const storedHash = (env.ADMIN_PASSWORD_HASH ?? '').replace(/\\/g, '').trim();
  if (!storedHash) {
    // Server is misconfigured — do not reveal details to client
    console.error('[SECURITY] ADMIN_PASSWORD_HASH environment variable is not set.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const valid = await bcrypt.compare(password, storedHash);

  if (!valid) {
    await dbRecordRateLimitAttempt(ip, 'login');
    // Add a small delay to further slow brute-force attempts
    await new Promise(r => setTimeout(r, 500));
    return NextResponse.json(GENERIC_ERROR, { status: 401 });
  }

  // Valid — seal the session data and set it as an HTTP-only cookie.
  // Uses sealData() directly to avoid iron-session's CookieStore type incompatibility
  // with Next.js 15+'s ReadonlyRequestCookies.
  const sessionData: SessionData = { isAdmin: true, loginAt: Date.now() };
  const sealed = await sealData(sessionData, {
    password: SESSION_OPTIONS.password as string,
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_OPTIONS.cookieName,
    value: sealed,
    httpOnly: SESSION_OPTIONS.cookieOptions?.httpOnly ?? true,
    secure: SESSION_OPTIONS.cookieOptions?.secure ?? (process.env.NODE_ENV === 'production'),
    sameSite: (SESSION_OPTIONS.cookieOptions?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
    maxAge: SESSION_OPTIONS.cookieOptions?.maxAge ?? 8 * 60 * 60,
    path: SESSION_OPTIONS.cookieOptions?.path ?? '/',
  });

  return NextResponse.json({ success: true }, { status: 200 });
}
