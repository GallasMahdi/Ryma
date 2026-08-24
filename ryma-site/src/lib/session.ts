import type { SessionOptions } from 'iron-session';
import { env } from './env';

export interface SessionData {
  isAdmin: boolean;
  loginAt: number;
  analyticsUnlockedUntil?: number; // Epoch timestamp (ms) until which owner analytics step-up is valid
}

export const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'ryma_admin_session',
  password: env.SESSION_SECRET,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  },
};
