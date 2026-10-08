const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),area=path.resolve(root,'../tmp/dashboard-remediation-20261007'),project=path.resolve(root,'../tmp/dashboard-fixes-20261007/project');
const out=path.join(root,'docs/audit/reaudit');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(project,{recursive:true});
const mode=process.argv[2];
if(mode==='prepare'){
  for(const name of ['src','scripts','public'])fs.cpSync(path.join(root,name),path.join(project,name),{recursive:true});
  for(const name of ['package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs','next-env.d.ts'])fs.copyFileSync(path.join(root,name),path.join(project,name));
  if(!fs.existsSync(path.join(project,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'junction');
  console.log('Isolated source copy prepared without real data or .env');process.exit();
}
const env={...process.env};for(const key of Object.keys(env))if(/^(TURSO|SMTP|WHATSAPP|RECAPTCHA|NEXT_PUBLIC_RECAPTCHA|ADMIN_|OWNER_|SESSION_|VERCEL|AWS_|NETLIFY|DATABASE_|NODE_OPTIONS)/.test(key))delete env[key];
Object.assign(env,{__NEXT_PROCESSED_ENV:'true',DATABASE_PATH:path.join(project,'reaudit-fixture.db'),SESSION_SECRET:crypto.randomBytes(32).toString('hex'),ADMIN_PASSWORD_HASH:require(path.join(root,'node_modules/bcryptjs')).hashSync('fix-admin-test',4),OWNER_ANALYTICS_PASSWORD_HASH:require(path.join(root,'node_modules/bcryptjs')).hashSync('fix-owner-test',4),SMTP_HOST:'',WHATSAPP_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'});
let args;
if(mode==='scheduling-libsql'){env.RYMA_TEST_ADAPTER='libsql';args=['--test','--test-reporter=tap','scripts/test-scheduling.cjs'];}
else if(mode==='remediation'||mode==='remediation-libsql'){if(mode.endsWith('libsql'))env.RYMA_TEST_ADAPTER='libsql';args=['--test','scripts/test-audit-remediation.cjs'];}
else if(mode==='focused'||mode==='focused-libsql'){if(mode.endsWith('libsql'))env.RYMA_TEST_ADAPTER='libsql';args=['--test','scripts/test-patient-integrity.cjs'];}
else if(mode==='suite')args=['--test','scripts/test-modal.cjs','scripts/test-audit-remediation.cjs','scripts/test-patient-integrity.cjs','scripts/test-phone-validation.cjs','scripts/test-review-submission.cjs','scripts/test-whatsapp-booking.cjs','scripts/test-scheduling.cjs','scripts/test-reset-db.mjs'];
else if(mode==='libsql'){env.RYMA_TEST_ADAPTER='libsql';args=['--test','--test-concurrency=1','scripts/test-audit-remediation.cjs','scripts/test-patient-integrity.cjs','scripts/test-whatsapp-booking.cjs','scripts/test-scheduling.cjs'];}
else if(mode==='dashboard')args=['scripts/audit-dashboard.cjs'];
else if(mode==='typecheck')args=[path.join(project,'node_modules/typescript/bin/tsc'),'--noEmit','--incremental','false'];
else if(mode==='build'){env.ALLOW_SQLITE_FALLBACK='true';args=[path.join(project,'node_modules/next/dist/bin/next'),'build','--webpack'];}
else if(mode==='start'){env.ALLOW_SQLITE_FALLBACK='true';args=[path.join(project,'node_modules/next/dist/bin/next'),'start','-p','3119','-H','127.0.0.1'];}
else if(mode==='dev'){args=[path.join(project,'node_modules/next/dist/bin/next'),'dev','--webpack','-p','3119','-H','127.0.0.1'];}
else throw Error('Unknown mode');
const log=fs.createWriteStream(path.join(out,mode+'.log'));
const child=spawn(process.execPath,args,{cwd:project,env,stdio:['ignore','pipe','pipe'],windowsHide:true});
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{log.write(b);process.stdout.write(b)});
child.on('exit',(code,signal)=>{if(signal)console.error('Child terminated by',signal);log.end();process.exitCode=code??1});
