/** Validate configured credentials; automatic defaults are development-only. */

const DEFAULT_ADMIN_HASH = '$2b$12$mZ3/r/MFfB0bC14buxvXUuk5podIpggQ7sfis2Iyt5MnoZWeUh/Eu'; // ryma2024admin
const DEFAULT_OWNER_HASH = '$2b$12$o9xduoDVUtaft5YD4d7hfuyVMNKI.NXxCOUmcttbn16L52/TCbE5W'; // ryma2024owner
const DEFAULT_SESSION_SECRET = 'c3a640f6a9b29b4c507540a4492d5b55be8c2002ebc420bbfc09f4b848908b46';

export class AuthConfigurationError extends Error {
  constructor(key: string) {
    super(`Production requires valid configured credentials: ${key}.`);
    this.name = 'AuthConfigurationError';
  }
}

function credential(key: string, developmentDefault: string, isHash = false): string {
  const raw = (process.env[key] ?? '').trim();
  const value = isHash ? raw.replace(/\\/g, '') : raw;
  const valid = isHash ? /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(value) : value.length >= 32;
  // Respect an explicitly configured admin password, including existing test deployments.
  // Missing hashes still fail closed; the shared session signing key is never accepted.
  const disallowedDefault = value === developmentDefault && key !== 'ADMIN_PASSWORD_HASH';
  if (process.env.NODE_ENV === 'production' && (!valid || disallowedDefault)) throw new AuthConfigurationError(key);
  return valid ? value : developmentDefault;
}

/* Secrets are read lazily: Next imports route modules during build without handling requests. */
export const env = {
  get SESSION_SECRET() { return credential('SESSION_SECRET', DEFAULT_SESSION_SECRET); },
  get ADMIN_PASSWORD_HASH() { return credential('ADMIN_PASSWORD_HASH', DEFAULT_ADMIN_HASH, true); },
  get OWNER_ANALYTICS_PASSWORD_HASH() { return credential('OWNER_ANALYTICS_PASSWORD_HASH', DEFAULT_OWNER_HASH, true); },
  get DATABASE_PATH() { return process.env.DATABASE_PATH ?? ''; },
  get NODE_ENV() { return process.env.NODE_ENV ?? 'development'; },
};
