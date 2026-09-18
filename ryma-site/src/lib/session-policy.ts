/** Absolute lifetime applies even when an owner grant refreshes the cookie. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export function isAdminSessionValid(session: unknown, now = Date.now()): boolean {
  if (!session || typeof session !== 'object') return false;
  const value = session as Record<string, unknown>;
  return value.isAdmin === true && typeof value.sessionId === 'string' && value.sessionId.length > 0 &&
    typeof value.loginAt === 'number' && Number.isFinite(value.loginAt) &&
    value.loginAt <= now && now - value.loginAt < SESSION_TTL_SECONDS * 1000;
}
