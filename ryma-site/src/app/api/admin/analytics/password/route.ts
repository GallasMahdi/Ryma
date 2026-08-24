import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireOwnerAnalytics } from '@/lib/requireAdmin';
import {
  dbGetOwnerAnalyticsPasswordHash,
  dbSetOwnerAnalyticsPasswordHash,
  dbLogSecurityAudit,
  dbCheckRateLimit,
  dbRecordRateLimitAttempt,
} from '@/lib/db';
import { getClientIp } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await requireOwnerAnalytics(request);
  if ('status' in auth) return auth;

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');

  // Rate limiting on password changes
  const allowed = await dbCheckRateLimit(ip, 'owner_password_change', 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Veuillez patienter 15 minutes.' },
      { status: 429 }
    );
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!currentPassword || typeof currentPassword !== 'string') {
    return NextResponse.json({ error: 'Le mot de passe actuel est requis.' }, { status: 400 });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Le nouveau mot de passe doit comporter au moins 8 caractères.' },
      { status: 422 }
    );
  }

  if (newPassword.length > 128) {
    return NextResponse.json({ error: 'Mot de passe trop long (max 128 caractères).' }, { status: 422 });
  }

  // Verify current owner password
  const storedHash = await dbGetOwnerAnalyticsPasswordHash();
  const cleanHash = (storedHash ?? '').replace(/\\/g, '').trim();

  const isCurrentValid = await bcrypt.compare(currentPassword, cleanHash);
  if (!isCurrentValid) {
    await dbRecordRateLimitAttempt(ip, 'owner_password_change');
    await dbLogSecurityAudit('ANALYTICS_PASSWORD_CHANGE_FAILED', ip, userAgent, {
      reason: 'Current password verification failed',
    });
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 401 });
  }

  // Hash new password using bcrypt cost factor 12
  const newHash = await bcrypt.hash(newPassword, 12);
  await dbSetOwnerAnalyticsPasswordHash(newHash);

  await dbLogSecurityAudit('ANALYTICS_PASSWORD_CHANGED', ip, userAgent, {
    action: 'Owner analytics password updated successfully',
  });

  return NextResponse.json({
    success: true,
    message: 'Mot de passe propriétaire mis à jour avec succès.',
  });
}
