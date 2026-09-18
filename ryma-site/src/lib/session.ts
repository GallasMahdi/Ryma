import type { SessionOptions } from 'iron-session';
import { SESSION_TTL_SECONDS } from './session-policy';
import { env } from './env';

export interface SessionData {
  sessionId: string; // Cryptographically random UUID per active login session
  isAdmin: boolean;
  loginAt: number;
  analyticsUnlockedUntil?: number; // Epoch timestamp (ms) until which owner analytics step-up is valid
}

export const SESSION_OPTIONS: SessionOptions = {
  ttl: SESSION_TTL_SECONDS,
  cookieName: 'ryma_admin_session',
  get password() { return env.SESSION_SECRET; },
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  },
};
