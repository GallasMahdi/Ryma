// Isolated local verification: no production database, email or WhatsApp traffic.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const mode=process.argv[2]||'build';
if(!['build','start'].includes(mode))throw Error('Use build or start');
const port=Number(process.env.RYMA_PREVIEW_PORT||3007);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
const fixture=process.env.RYMA_PREVIEW_DB||path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ryma-team-preview-')),'fixture.db');
if(!path.resolve(fixture).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Preview DB must be temporary');
const env={...process.env,__NEXT_PROCESSED_ENV:'true',DATABASE_PATH:fixture,TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',ALLOW_SQLITE_FALLBACK:'true',SESSION_SECRET:crypto.randomBytes(32).toString('hex'),ADMIN_PASSWORD_HASH:require('bcryptjs').hashSync('team-preview-only',4),OWNER_ANALYTICS_PASSWORD_HASH:require('bcryptjs').hashSync('owner-preview-only',4),SMTP_HOST:'',SMTP_USER:'',SMTP_PASS:'',ADMIN_NOTIFICATION_EMAIL:'',WHATSAPP_ENABLED:'false',RECAPTCHA_SECRET_KEY:'',NEXT_PUBLIC_RECAPTCHA_SITE_KEY:'',NEXT_TELEMETRY_DISABLED:'1'};
console.log('Isolated fixture:',fixture);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),mode,...(mode==='start'?['-p',String(port),'-H','127.0.0.1']:[])],{env,stdio:'inherit',windowsHide:true});
child.on('exit',code=>{process.exitCode=code||0;});
