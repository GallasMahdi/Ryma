// Verify route collection works without runtime credentials; never alter deployed secrets.
const { spawnSync } = require('node:child_process');
// Load dotenv first so the child does not restore local credentials over these blanks.
require('@next/env').loadEnvConfig(process.cwd(), false);
const env = {
  ...process.env,
  SESSION_SECRET: '',
  ADMIN_PASSWORD_HASH: '',
  OWNER_ANALYTICS_PASSWORD_HASH: '',
};
const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {env, stdio: 'inherit'});
process.exit(result.status ?? 1);
