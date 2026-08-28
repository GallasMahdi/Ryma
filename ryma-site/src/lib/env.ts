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
    if (!sessionSecret || sessionSecret.trim() === '') {
      console.warn('[CONFIG WARNING] SESSION_SECRET environment variable is missing in production runtime.');
    }
    if (!adminHash || adminHash.trim() === '') {
      console.warn('[CONFIG WARNING] ADMIN_PASSWORD_HASH environment variable is missing in production runtime.');
    }
    if (!ownerHash || ownerHash.trim() === '') {
      console.warn('[CONFIG WARNING] OWNER_ANALYTICS_PASSWORD_HASH environment variable is missing in production runtime.');
    }
  }

  return {
    SESSION_SECRET: sessionSecret || (isProd ? 'default_fallback_secret_32_chars_min_for_build' : 'development_only_session_secret_key_32bytes_minimum'),
    ADMIN_PASSWORD_HASH: adminHash || (isProd ? '' : '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu'),
    OWNER_ANALYTICS_PASSWORD_HASH: ownerHash || (isProd ? '' : '$2b$12$o9xduoDVUtaft5YD4d7hfuyVMNKI.NXxCOUmcttbn16L52/TCbE5W'),
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
