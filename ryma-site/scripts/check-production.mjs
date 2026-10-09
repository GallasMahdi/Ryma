// Read-only release checks. Prints check names, never credentials or patient records.
import nextEnv from '@next/env';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
nextEnv.loadEnvConfig(process.cwd(), false);
const checks=[];
const check=(name,ok)=>checks.push({name,ok:Boolean(ok)});
for(const key of ['ADMIN_PASSWORD_HASH','OWNER_ANALYTICS_PASSWORD_HASH']) {
  const value=(process.env[key]||'').replace(/\\/g,'').trim();
  const valid=/^\$2[aby]\$(1[2-9]|2\d|3[01])\$[./A-Za-z0-9]{53}$/.test(value);
  check(key+' is configured with bcrypt cost >= 12',valid);
  check(key+' does not use a published demo password',valid&&!['ryma2024admin','ryma2024owner'].some(password=>bcrypt.compareSync(password,value)));
}
check('SESSION_SECRET is unique and at least 32 characters',(process.env.SESSION_SECRET||'').length>=32&&process.env.SESSION_SECRET!=='c3a640f6a9b29b4c507540a4492d5b55be8c2002ebc420bbfc09f4b848908b46');
const cloud=Boolean(process.env.TURSO_DATABASE_URL),serverless=Boolean(process.env.VERCEL||process.env.AWS_LAMBDA_FUNCTION_NAME||process.env.NETLIFY);
check('Database is explicitly persistent',cloud ? /^libsql:\/\//.test(process.env.TURSO_DATABASE_URL)&&Boolean(process.env.TURSO_AUTH_TOKEN) : !serverless&&process.env.ALLOW_SQLITE_FALLBACK==='true'&&path.isAbsolute(process.env.DATABASE_PATH||'')&&!/[\\/]\.demo[\\/]|ryma-demo|fixture\.db/i.test(process.env.DATABASE_PATH));
check('Booking reCAPTCHA has both keys',process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY&&process.env.RECAPTCHA_SECRET_KEY);
check('SMTP and notification recipient are configured',process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.ADMIN_NOTIFICATION_EMAIL);
for(const key of ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_CLINIC_PHONE','NEXT_PUBLIC_CLINIC_EMAIL','NEXT_PUBLIC_CLINIC_ADDRESS'])check(key+' is configured',process.env[key]);
check('Canonical origin uses HTTPS',/^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL||''));
if(process.env.WHATSAPP_ENABLED==='true')for(const key of ['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_ACCESS_TOKEN','WHATSAPP_APP_SECRET','WHATSAPP_VERIFY_TOKEN','WHATSAPP_GRAPH_VERSION','WHATSAPP_JOB_SECRET'])check(key+' is configured',process.env[key]);
if(process.argv.includes('--database')) {
  let client;
  try {
    if(cloud){const {createClient}=await import('@libsql/client');client=createClient({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});}
    else {const {default:Database}=await import('better-sqlite3');const local=new Database(process.env.DATABASE_PATH,{readonly:true,fileMustExist:true});client={execute:async sql=>({rows:local.prepare(sql).all()}),close:()=>local.close()};}
    const tables=(await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(r=>r.name);
    check('Configured database is reachable',true);
    check('Configured database has no demo-generator or hosted-import marker',!tables.includes('ryma_demo_seed')&&!tables.includes('ryma_demo_imports'));
    const counts={};for(const t of ['patients','appointments','invoices','reviews','treatment_catalog'])if(tables.includes(t))counts[t]=Number((await client.execute(`SELECT COUNT(*) n FROM ${t}`)).rows[0].n);
    console.log(JSON.stringify({configuredDatabaseCounts:counts}));
  } catch {check('Configured database is reachable',false);}finally{client?.close();}
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),ready:checks.every(c=>c.ok),checks},null,2));
process.exitCode=checks.every(c=>c.ok)?0:1;
