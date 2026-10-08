const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['dashboard-audit.md','feature-matrix.md','api-inventory.md','ui-controls.md'];
const missing=[];let links=0;for(const name of files){const t=fs.readFileSync(path.join(root,name),'utf8');for(const m of t.matchAll(/\]\(([^)]+)\)/g)){const p=m[1].split('#')[0];if(!p||/^[a-z]+:\/\//i.test(p))continue;links++;if(!fs.existsSync(path.resolve(root,p)))missing.push({file:name,target:p});}}
const report=fs.readFileSync(path.join(root,files[0]),'utf8');
const issues=[...report.matchAll(/^### (QA-\d+) — .+ — (P\d)$/gm)].map(m=>({id:m[1],severity:m[2]}));
const count=p=>issues.filter(x=>x.severity===p).length;
const result={localLinksChecked:links,missing,issueCount:issues.length,severities:{P0:count('P0'),P1:count('P1'),P2:count('P2'),P3:count('P3')},featureRows:fs.readFileSync(path.join(root,'feature-matrix.md'),'utf8').split('\n').filter(l=>l.startsWith('|')).length-2};
fs.writeFileSync(path.join(root,'evidence/report-integrity.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(missing.length||issues.length!==19)process.exitCode=1;
