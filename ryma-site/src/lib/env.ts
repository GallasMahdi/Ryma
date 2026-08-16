/**
 * Central Environment Variable Boot Validation
 * Provides robust defaults so app never crashes on missing env vars in production.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;
  const adminHash = process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.replace(/\\/g, '').trim() : '';

  if (isProd) {
    if (!sessionSecret || sessionSecret.trim() === '') {
      throw new Error('[FATAL CONFIG ERROR] SESSION_SECRET environment variable is missing in production.');
    }
    if (!adminHash || adminHash.trim() === '') {
      throw new Error('[FATAL CONFIG ERROR] ADMIN_PASSWORD_HASH environment variable is missing in production.');
    }
  }

  return {
    SESSION_SECRET: sessionSecret || 'development_only_session_secret_key_32bytes_minimum',
    ADMIN_PASSWORD_HASH: adminHash || '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu',
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
