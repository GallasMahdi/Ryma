import { NextRequest, NextResponse } from 'next/server';
import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SESSION_OPTIONS, type SessionData } from '@/lib/session';
import {
  dbCheckRateLimit,
  dbRecordRateLimitAttempt,
  dbResetRateLimit,
  dbGetOwnerAnalyticsPasswordHash,
  dbLogSecurityAudit,
} from '@/lib/db';
import { getClientIp } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STEP_UP_DURATION_MS = 15 * 60 * 1000; // 15 minutes TTL

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // 1. Verify that user is already an authenticated Admin
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_OPTIONS.cookieName)?.value;

  if (!cookieValue) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let session: SessionData;
  try {
    session = await unsealData<SessionData>(cookieValue, {
      password: SESSION_OPTIONS.password as string,
    });
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // 2. Rate Limiting: Max 10 failed attempts per 15 minutes per IP
  const allowed = await dbCheckRateLimit(ip, 'owner_analytics_auth', 10, 15 * 60);
  if (!allowed) {
    await dbLogSecurityAudit('ANALYTICS_AUTH_BLOCKED_RATELIMIT', ip, userAgent, {
      reason: 'Too many failed attempts in 15m window',
    });
    return NextResponse.json(
      { error: 'Trop de tentatives infructueuses. Veuillez attendre 15 minutes avant de réessayer.' },
      { status: 429 }
    );
  }

  // 3. Parse and validate body
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { password } = body;
  if (!password || typeof password !== 'string' || password.length > 128) {
    await dbRecordRateLimitAttempt(ip, 'owner_analytics_auth');
    await dbLogSecurityAudit('ANALYTICS_AUTH_FAILURE', ip, userAgent, { reason: 'Empty or invalid format' });
    return NextResponse.json({ error: 'Mot de passe propriétaire invalide' }, { status: 401 });
  }

  // 4. Verify Owner Password Hash
  const storedHash = await dbGetOwnerAnalyticsPasswordHash();
  const cleanHash = (storedHash ?? '').replace(/\\/g, '').trim();

  if (!cleanHash) {
    console.error('[SECURITY] No owner analytics password hash configured.');
    return NextResponse.json({ error: 'Erreur de configuration serveur' }, { status: 500 });
  }

  const isValid = await bcrypt.compare(password, cleanHash);

  if (!isValid) {
    await dbRecordRateLimitAttempt(ip, 'owner_analytics_auth');
    await dbLogSecurityAudit('ANALYTICS_AUTH_FAILURE', ip, userAgent, { reason: 'Incorrect owner password' });
    // Add delay to defend against timing / brute force attacks
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: 'Mot de passe propriétaire incorrect' }, { status: 401 });
  }

  // Reset rate limit on success
  await dbResetRateLimit(ip, 'owner_analytics_auth');

  // 5. Grant 15-Minute Step-Up Authorization in Server-Sealed Session Cookie
  const expiresAt = Date.now() + STEP_UP_DURATION_MS;
  const updatedSession: SessionData = {
    ...session,
    analyticsUnlockedUntil: expiresAt,
  };

  const sealed = await sealData(updatedSession, {
    password: SESSION_OPTIONS.password as string,
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

  await dbLogSecurityAudit('ANALYTICS_AUTH_SUCCESS', ip, userAgent, {
    expiresAt: new Date(expiresAt).toISOString(),
  });

  return NextResponse.json({
    success: true,
    expiresAt,
    message: 'Autorisation propriétaire confirmée pour 15 minutes',
  });
}
