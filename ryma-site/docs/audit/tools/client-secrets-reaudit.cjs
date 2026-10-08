const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),project=path.resolve(root,'../tmp/dashboard-fixes-20261007/project');
const env=fs.readFileSync(path.join(root,'src/lib/env.ts'),'utf8');
const candidates=[...env.matchAll(/const (DEFAULT_[A-Z_]+) = '([^']+)'/g)].map(m=>({name:m[1],value:m[2]}));
candidates.push({name:'AUDIT_ADMIN_PASSWORD',value:'fix-admin-test'},{name:'AUDIT_OWNER_PASSWORD',value:'fix-owner-test'});
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|map)$/.test(e.name))files.push(p)}}walk(path.join(project,'.next/static'));
const results=candidates.map(c=>({name:c.name,matches:files.filter(p=>fs.readFileSync(p,'utf8').includes(c.value)).length}));
const out={method:'Exact string scan of isolated production .next/static JS and maps for known development constants and synthetic audit passwords; no real environment secrets were read. Not a proof concerning unknown production credentials.',filesScanned:files.length,results,status:results.every(r=>r.matches===0)?'PASS':'FAIL'};
fs.writeFileSync(path.join(root,'docs/audit/reaudit/client-secret-scan.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out));
