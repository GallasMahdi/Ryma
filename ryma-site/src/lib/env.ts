/** Validate deployment secrets; shared defaults are allowed only in development. */

const DEFAULT_ADMIN_HASH = '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu'; // ryma2024admin
const DEFAULT_OWNER_HASH = '$2b$12$o9xduoDVUtaft5YD4d7hfuyVMNKI.NXxCOUmcttbn16L52/TCbE5W'; // ryma2024owner
const DEFAULT_SESSION_SECRET = 'c3a640f6a9b29b4c507540a4492d5b55be8c2002ebc420bbfc09f4b848908b46';

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';

  const rawSessionSecret = process.env.SESSION_SECRET?.trim();
  const rawAdminHash = process.env.ADMIN_PASSWORD_HASH ? process.env.ADMIN_PASSWORD_HASH.replace(/\\/g, '').trim() : '';
  const rawOwnerHash = process.env.OWNER_ANALYTICS_PASSWORD_HASH ? process.env.OWNER_ANALYTICS_PASSWORD_HASH.replace(/\\/g, '').trim() : '';

  // Never use public development credentials in a production deployment.
  const invalidCredentials = [
    (!rawSessionSecret || rawSessionSecret.length < 32 || rawSessionSecret === DEFAULT_SESSION_SECRET) && 'SESSION_SECRET',
    (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(rawAdminHash) || rawAdminHash === DEFAULT_ADMIN_HASH) && 'ADMIN_PASSWORD_HASH',
    (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(rawOwnerHash) || rawOwnerHash === DEFAULT_OWNER_HASH) && 'OWNER_ANALYTICS_PASSWORD_HASH',
  ].filter(Boolean);
  if (isProd && invalidCredentials.length) {
    throw new Error(`Production requires unique, valid credentials: ${invalidCredentials.join(', ')}.`);
  }
  // Development fallback resolution
  const sessionSecret = rawSessionSecret && rawSessionSecret.length >= 32 ? rawSessionSecret : DEFAULT_SESSION_SECRET;
  const adminHash = rawAdminHash && rawAdminHash.length >= 20 ? rawAdminHash : DEFAULT_ADMIN_HASH;
  const ownerHash = rawOwnerHash && rawOwnerHash.length >= 20 ? rawOwnerHash : DEFAULT_OWNER_HASH;

  return {
    SESSION_SECRET: sessionSecret,
    ADMIN_PASSWORD_HASH: adminHash,
    OWNER_ANALYTICS_PASSWORD_HASH: ownerHash,
    DATABASE_PATH: process.env.DATABASE_PATH ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export const env = validateEnv();
