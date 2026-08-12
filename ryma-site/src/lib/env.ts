/**
 * Central Environment Variable Boot Validation
 * Fails fast on server startup if critical security configuration is missing in production.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && isProd) {
    throw new Error(
      '[FATAL SECURITY ERROR] SESSION_SECRET environment variable is missing. Startup aborted.'
    );
  }

  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminHash && isProd) {
    throw new Error(
      '[FATAL SECURITY ERROR] ADMIN_PASSWORD_HASH environment variable is missing. Startup aborted.'
    );
  }

  return {
    SESSION_SECRET: sessionSecret ?? 'dev_fallback_secret_must_be_32_bytes_long_minimum!!',
    ADMIN_PASSWORD_HASH: adminHash ?? '',
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
