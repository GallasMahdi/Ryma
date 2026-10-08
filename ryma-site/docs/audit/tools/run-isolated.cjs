const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),project=path.resolve(root,'../tmp/dashboard-audit-20261007/project'),out=path.join(root,'docs/audit/evidence');
const env={...process.env};
for(const key of Object.keys(env))if(/^(TURSO|SMTP|WHATSAPP|RECAPTCHA|NEXT_PUBLIC_RECAPTCHA|ADMIN_|OWNER_|SESSION_|VERCEL|AWS_|NETLIFY|DATABASE_|NODE_OPTIONS)/.test(key))delete env[key];
Object.assign(env,{__NEXT_PROCESSED_ENV:'true',DATABASE_PATH:path.join(project,'fixture.db'),ALLOW_SQLITE_FALLBACK:'true',SESSION_SECRET:crypto.randomBytes(32).toString('hex'),ADMIN_PASSWORD_HASH:require(path.join(root,'node_modules/bcryptjs')).hashSync('audit-admin-only',4),OWNER_ANALYTICS_PASSWORD_HASH:require(path.join(root,'node_modules/bcryptjs')).hashSync('audit-owner-only',4),SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',WHATSAPP_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'});
const mode=process.argv[2];let args;
if(!['build','start'].includes(mode))delete env.ALLOW_SQLITE_FALLBACK;
if(mode==='build')args=[path.join(project,'node_modules/next/dist/bin/next'),'build','--webpack'];
else if(mode==='start')args=[path.join(project,'node_modules/next/dist/bin/next'),'start','-p','3117','-H','127.0.0.1'];
else if(mode==='suite')args=['--test','scripts/test-phone-validation.cjs','scripts/test-review-submission.cjs','scripts/test-whatsapp-booking.cjs','scripts/test-scheduling.cjs','scripts/test-reset-db.mjs'];
else if(mode==='libsql'){env.RYMA_TEST_ADAPTER='libsql';args=['--test','scripts/test-whatsapp-booking.cjs','scripts/test-scheduling.cjs'];}
else if(mode==='dashboard')args=['scripts/audit-dashboard.cjs'];
else if(mode==='typecheck')args=[path.join(project,'node_modules/typescript/bin/tsc'),'--noEmit','--incremental','false'];
else throw Error('Unknown mode');
const log=fs.createWriteStream(path.join(out,mode+'.log'));
const child=spawn(process.execPath,args,{cwd:project,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
child.stdout.on('data',b=>{log.write(b);process.stdout.write(b);});child.stderr.on('data',b=>{log.write(b);process.stderr.write(b);});
child.on('exit',code=>{log.end();process.exitCode=code||0;});
