const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const runId = process.env.AUDIT_RUN_ID || `audit-${new Date().toISOString().replace(/[:.]/g,'-')}`;
const out = path.join(root,'performance-results',runId);
if(fs.existsSync(out)) throw Error('Refusing to overwrite an existing run');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(__dirname,'latest.json'),JSON.stringify({runId,out,root}));
const app = path.join(out,'sandbox'); fs.mkdirSync(app);
for(const name of ['src','public','package.json','package-lock.json','tsconfig.json','next.config.ts','postcss.config.mjs','next-env.d.ts']) {
  fs.cpSync(path.join(root,name),path.join(app,name),{recursive:true});
}
fs.symlinkSync(path.join(root,'node_modules'),path.join(app,'node_modules'),'junction');
const originalEnv = {...process.env};
require(path.join(root,'node_modules/@next/env')).loadEnvConfig(root,false,{info(){},error(){}});
let configuredDatabase = {backend:'SQLite',path:process.env.DATABASE_PATH||'data/ryma.db'};
if(process.env.TURSO_DATABASE_URL) { const u = new URL(process.env.TURSO_DATABASE_URL.replace(/["']/g,'')); configuredDatabase={backend:'remote Turso/libSQL',protocol:u.protocol,hostname:u.hostname}; }
const env = Object.fromEntries(Object.entries(originalEnv).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|COMSPEC|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(k)));
const password = crypto.randomBytes(24).toString('hex');
const ownerPassword = crypto.randomBytes(24).toString('hex');
const bcrypt = require(path.join(root,'node_modules/bcryptjs'));
Object.assign(env,{NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',ALLOW_SQLITE_FALLBACK:'true',DATABASE_PATH:path.join(out,'isolated.sqlite'),SESSION_SECRET:crypto.randomBytes(48).toString('hex'),ADMIN_PASSWORD_HASH:bcrypt.hashSync(password,12),OWNER_ANALYTICS_PASSWORD_HASH:bcrypt.hashSync(ownerPassword,12),SMTP_USER:'',SMTP_PASS:'',ADMIN_NOTIFICATION_EMAIL:'',RECAPTCHA_SECRET_KEY:'',NEXT_PUBLIC_RECAPTCHA_SITE_KEY:'',NEXT_PUBLIC_GA_ID:'',NEXT_PUBLIC_META_PIXEL_ID:'',WHATSAPP_API_TOKEN:'',NEXT_PUBLIC_SITE_URL:'http://localhost:3217'});
fs.writeFileSync(path.join(out,'private-config.json'),JSON.stringify({env,password,ownerPassword},null,2));
fs.writeFileSync(path.join(out,'.gitignore'),'sandbox/\nprivate-config.json\n*.sqlite*\n');
const files=[];
function hashTree(dir,relative='') {for(const d of fs.readdirSync(dir,{withFileTypes:true})){const r=path.join(relative,d.name),p=path.join(dir,d.name);if(d.isDirectory()) hashTree(p,r);else files.push({file:r,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}
hashTree(path.join(root,'src'),'src');
const manifest={runId,startedAt:new Date().toISOString(),commit:spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim(),initialGitStatus:spawnSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'}).stdout,runtime:process.version,versions:Object.fromEntries(['next','react','better-sqlite3','@libsql/client','bcryptjs'].map(n=>[n,JSON.parse(fs.readFileSync(path.join(root,'node_modules',n,'package.json'))).version])),hardware:{cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,totalMemory:os.totalmem(),freeMemory:os.freemem(),os:os.version(),release:os.release(),arch:os.arch()},configuredDatabase,auditDatabase:{backend:'SQLite',path:env.DATABASE_PATH,emptyBeforeStart:!fs.existsSync(env.DATABASE_PATH)},isolation:{noEnvFilesCopied:true,allowlistedChildEnvironment:true,notifications:'SMTP credentials absent; WhatsApp/analytics tokens absent; no external message buttons exercised',recaptcha:'No token; application existing human-fallback contract. No code bypass.'},network:{server:'127.0.0.1',port:3217,transport:'HTTP loopback',CDN:false,remoteDatabase:false},files};
fs.writeFileSync(path.join(out,'environment.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({runId,out,hardware:manifest.hardware,configuredDatabase,versions:manifest.versions},null,2));
