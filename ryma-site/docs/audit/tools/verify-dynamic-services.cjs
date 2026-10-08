const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),out=path.join(root,'docs/audit/dynamic-services');
const preview=path.resolve(root,'../tmp/dashboard-fixes-20261007/project');
const before=path.resolve(root,'../tmp/dynamic-services-20261008/before');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const baseline=JSON.parse(fs.readFileSync(path.join(out,'data-before.json'),'utf8'));
const changedData=baseline.filter(e=>!fs.existsSync(path.join(root,e.file))||hash(path.join(root,e.file))!==e.sha256).map(e=>e.file);
const newData=files(path.join(root,'data')).map(f=>path.relative(root,f)).filter(f=>!baseline.some(e=>e.file===f));
const source=files(path.join(root,'src')).map(f=>({file:path.relative(root,f),sha256:hash(f)}));
const previewMismatches=source.filter(e=>!fs.existsSync(path.join(preview,e.file))||hash(path.join(preview,e.file))!==e.sha256).map(e=>e.file);
const previewExtras=files(path.join(preview,'src')).map(f=>path.relative(preview,f)).filter(f=>!source.some(e=>e.file===f));
const changedSources=[...new Set([...files(path.join(before,'src')).map(f=>path.relative(before,f)),...source.map(e=>e.file)])].filter(f=>!fs.existsSync(path.join(before,f))||!fs.existsSync(path.join(root,f))||hash(path.join(before,f))!==hash(path.join(root,f)));
const tests={};
for(const name of ['suite','libsql','treatments','treatments-libsql','treatments-ui']){
  const log=fs.readFileSync(path.join(out,name+'.log'),'utf8');
  const count=label=>Number([...log.matchAll(new RegExp('(?:ℹ|#) '+label+' (\\d+)','g'))].at(-1)?.[1]);
  tests[name]={tests:count('tests'),pass:count('pass'),fail:count('fail')};
  assert(tests[name].pass>0&&tests[name].fail===0,name);
}
const dashboard=fs.readFileSync(path.join(out,'dashboard.log'),'utf8');
assert(dashboard.includes('36 dashboard regression checks passed.'));tests.dashboard={pass:36,fail:0};
const http=JSON.parse(fs.readFileSync(path.join(out,'http-results.json'),'utf8'));
tests.http={pass:http.filter(t=>t.status==='PASS').length,fail:http.filter(t=>t.status!=='PASS').length};assert.equal(tests.http.fail,0);
assert(fs.readFileSync(path.join(out,'build.log'),'utf8').includes('Compiled successfully'));
assert.deepEqual(changedData,[]);assert.deepEqual(newData,[]);assert.deepEqual(previewMismatches,[]);assert.deepEqual(previewExtras,[]);
const result={checkedAt:new Date().toISOString(),realData:{files:baseline.length,changed:changedData,added:newData},previewSourceMatches:true,tests,changedSources};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(out,'source-sha256.json'),JSON.stringify(source,null,2));
console.log(JSON.stringify({realDataFilesUnchanged:baseline.length,previewSourceMatches:true,tests},null,2));
