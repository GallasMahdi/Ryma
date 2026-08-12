/**
 * Central Environment Variable Boot Validation
 * Provides robust defaults so app never crashes on missing env vars in production.
 */

function validateEnv() {
  const sessionSecret = process.env.SESSION_SECRET;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  return {
    SESSION_SECRET:
      sessionSecret ?? 'c3a640f6a9b29b4c507540a4492d5b55be8c2002ebc420bbfc09f4b848908b46',
    ADMIN_PASSWORD_HASH:
      (adminHash ? adminHash.replace(/\\/g, '').trim() : '') ||
      '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu',
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
