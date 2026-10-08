const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..');
const project=path.resolve(root,'../tmp/dashboard-audit-20261007/project');
const out=path.resolve(root,'docs/audit/evidence');
fs.mkdirSync(project,{recursive:true});fs.mkdirSync(out,{recursive:true});
const hashes={};
function record(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())record(p);else hashes[path.relative(root,p).replaceAll('\\','/')]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}
record(path.join(root,'src'));record(path.join(root,'data'));
for(const name of ['src','scripts','public'])fs.cpSync(path.join(root,name),path.join(project,name),{recursive:true});
for(const name of ['package.json','package-lock.json','next.config.ts','tsconfig.json','postcss.config.mjs','next-env.d.ts','AGENTS.md'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(path.join(root,name),path.join(project,name));
if(!fs.existsSync(path.join(project,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(project,'node_modules'),'junction');
fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify({date:'2026-10-07',node:process.version,platform:process.platform,source:root,project,hashes},null,2));
const routes=[];
function inventory(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())inventory(p);else if(ent.name==='route.ts'){const code=fs.readFileSync(p,'utf8');routes.push({file:path.relative(root,p).replaceAll('\\','/'),methods:[...code.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)/g)].map(m=>m[1]),guard:code.includes('requireOwnerAnalytics')?'owner':code.includes('requireAdmin')?'admin':'public/custom'});}}}
inventory(path.join(root,'src/app/api'));
fs.writeFileSync(path.join(out,'routes.json'),JSON.stringify(routes,null,2));
console.log(JSON.stringify({project,filesHashed:Object.keys(hashes).length,routes:routes.length,methods:routes.reduce((n,r)=>n+r.methods.length,0)}));
