// Build verification only: ephemeral credentials never change deployed passwords.
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { spawnSync } = require('node:child_process');
// Load dotenv first: Next expands dollar signs in bcrypt hashes while loading it.
require('@next/env').loadEnvConfig(process.cwd(), false);
const env = {
  ...process.env,
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  ADMIN_PASSWORD_HASH: bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10),
  OWNER_ANALYTICS_PASSWORD_HASH: bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10),
};
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {env, stdio: 'inherit'});
process.exit(result.status ?? 1);
