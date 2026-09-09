/**
 * Central Environment Variable Boot Validation
 * Provides robust defaults so app never crashes on missing env vars in production.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const isBuildPhase =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    Boolean(process.env.NEXT_IS_EXPORT_WORKER);

  const sessionSecret = process.env.SESSION_SECRET;
  const adminHash = process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.replace(/\\/g, '').trim() : '';
  const ownerHash = process.env.OWNER_ANALYTICS_PASSWORD_HASH ? process.env.OWNER_ANALYTICS_PASSWORD_HASH.replace(/\\/g, '').trim() : '';

  if (isProd && !isBuildPhase) {
    if (!sessionSecret || sessionSecret.trim().length < 32) {
      throw new Error('[FATAL SECURITY CONFIG] SESSION_SECRET must be set and at least 32 characters long in production runtime.');
    }
    if (!adminHash || adminHash.trim() === '') {
      throw new Error('[FATAL SECURITY CONFIG] ADMIN_PASSWORD_HASH environment variable is required in production runtime.');
    }
    if (!ownerHash || ownerHash.trim() === '') {
      throw new Error('[FATAL SECURITY CONFIG] OWNER_ANALYTICS_PASSWORD_HASH environment variable is required in production runtime.');
    }
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    if (!tursoUrl || tursoUrl.trim() === '' || !tursoToken || tursoToken.trim() === '') {
      throw new Error('[FATAL DB CONFIG] TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required in production runtime to prevent data loss.');
    }
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecret || recaptchaSecret.trim() === '') {
      throw new Error('[FATAL SECURITY CONFIG] RECAPTCHA_SECRET_KEY is required in production runtime to protect booking endpoints.');
    }
  }

  return {
    SESSION_SECRET: sessionSecret || (isProd ? '' : 'development_only_session_secret_key_32bytes_minimum'),
    ADMIN_PASSWORD_HASH: adminHash || (isProd ? '' : '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu'),
    OWNER_ANALYTICS_PASSWORD_HASH: ownerHash || (isProd ? '' : '$2b$12$o9xduoDVUtaft5YD4d7hfuyVMNKI.NXxCOUmcttbn16L52/TCbE5W'),
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
