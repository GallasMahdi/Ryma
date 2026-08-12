#!/usr/bin/env node
/**
 * Ryma Kiné — Password Hash Generator
 *
 * Usage:
 *   node scripts/hash-password.mjs YOUR_PASSWORD
 *
 * Output:
 *   Paste the printed hash into your .env.local as ADMIN_PASSWORD_HASH
 */

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('\nUsage: node scripts/hash-password.mjs YOUR_PASSWORD\n');
  process.exit(1);
}

if (password.length < 8) {
  console.error('\nError: Password must be at least 8 characters.\n');
  process.exit(1);
}

console.log('\nHashing password (cost factor 12) — this takes a few seconds...\n');

const hash = await bcrypt.hash(password, 12);

console.log('─'.repeat(80));
console.log('ADMIN_PASSWORD_HASH=' + hash);
console.log('─'.repeat(80));
console.log('\nCopy the line above into your .env.local file.\n');
